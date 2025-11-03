import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface OrderProcessRequest {
  orderId: string;
  action: 'confirm' | 'ship' | 'cancel' | 'complete';
  trackingNumber?: string;
  carrier?: string;
  cancelReason?: string;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Get user from auth header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      throw new Error('No authorization header');
    }

    const { data: { user }, error: userError } = await supabaseClient.auth.getUser(
      authHeader.replace('Bearer ', '')
    );

    if (userError || !user) {
      throw new Error('Unauthorized');
    }

    const { orderId, action, trackingNumber, carrier, cancelReason }: OrderProcessRequest = await req.json();

    // Get order details
    const { data: order, error: orderError } = await supabaseClient
      .from('orders')
      .select('*')
      .eq('id', orderId)
      .eq('user_id', user.id)
      .single();

    if (orderError) throw orderError;
    if (!order) throw new Error('Order not found');

    let newStatus = order.status;
    let updateData: any = { updated_at: new Date().toISOString() };

    // Process action
    switch (action) {
      case 'confirm':
        if (order.status !== 'pending') {
          throw new Error('Order cannot be confirmed');
        }
        newStatus = 'processing';
        updateData.status = newStatus;
        break;

      case 'ship':
        if (order.status !== 'processing') {
          throw new Error('Order must be in processing status to ship');
        }
        if (!trackingNumber) {
          throw new Error('Tracking number required for shipping');
        }
        newStatus = 'shipped';
        updateData.status = newStatus;
        updateData.tracking_number = trackingNumber;
        updateData.carrier = carrier || 'Standard';
        updateData.shipped_at = new Date().toISOString();
        break;

      case 'cancel':
        if (order.status === 'delivered' || order.status === 'completed') {
          throw new Error('Cannot cancel completed orders');
        }
        newStatus = 'cancelled';
        updateData.status = newStatus;
        updateData.cancelled_at = new Date().toISOString();
        updateData.cancel_reason = cancelReason;
        break;

      case 'complete':
        if (order.status !== 'shipped') {
          throw new Error('Only shipped orders can be marked as delivered');
        }
        newStatus = 'delivered';
        updateData.status = newStatus;
        updateData.delivered_at = new Date().toISOString();
        break;

      default:
        throw new Error('Invalid action');
    }

    // Update order in database
    const { error: updateError } = await supabaseClient
      .from('orders')
      .update(updateData)
      .eq('id', orderId);

    if (updateError) throw updateError;

    // Sync order status to platform
    const { data: cred } = await supabaseClient
      .from('platform_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('platform', order.platform)
      .eq('is_active', true)
      .single();

    if (cred) {
      if (order.platform === 'shopee') {
        await updateShopeeOrderStatus(cred, order, action, updateData);
      } else if (order.platform === 'tiktokshop') {
        await updateTikTokShopOrderStatus(cred, order, action, updateData);
      }
    }

    // Create notification
    await supabaseClient.from('notifications').insert({
      user_id: user.id,
      type: 'order_update',
      title: `Order ${action}ed`,
      message: `Order #${order.order_number} has been ${action}ed`,
      is_read: false,
    });

    return new Response(
      JSON.stringify({ 
        success: true, 
        order: { ...order, ...updateData } 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function updateShopeeOrderStatus(cred: any, order: any, action: string, updateData: any) {
  // Real Shopee API integration for order status update
  // In production, implement actual Shopee API calls:
  
  // Example: Ship order
  // if (action === 'ship') {
  //   const shopeeApiUrl = 'https://partner.shopeemobile.com/api/v2/logistics/ship_order';
  //   await fetch(shopeeApiUrl, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'Authorization': `Bearer ${cred.access_token}`,
  //     },
  //     body: JSON.stringify({
  //       shop_id: parseInt(cred.shop_id),
  //       order_sn: order.platform_order_id,
  //       tracking_number: updateData.tracking_number,
  //     }),
  //   });
  // }

  console.log(`Would update Shopee order ${order.platform_order_id} with action: ${action}`);
}

async function updateTikTokShopOrderStatus(cred: any, order: any, action: string, updateData: any) {
  // Real TikTok Shop API integration for order status update
  // In production, implement actual TikTok Shop API calls:
  
  // Example: Ship order
  // if (action === 'ship') {
  //   const tiktokApiUrl = 'https://open-api.tiktokglobalshop.com/api/orders/ship';
  //   await fetch(tiktokApiUrl, {
  //     method: 'POST',
  //     headers: {
  //       'Content-Type': 'application/json',
  //       'x-tts-access-token': cred.access_token,
  //     },
  //     body: JSON.stringify({
  //       order_id: order.platform_order_id,
  //       tracking_number: updateData.tracking_number,
  //       shipping_provider: updateData.carrier,
  //     }),
  //   });
  // }

  console.log(`Would update TikTok Shop order ${order.platform_order_id} with action: ${action}`);
}

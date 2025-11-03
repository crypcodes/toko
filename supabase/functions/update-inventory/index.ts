import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface InventoryUpdate {
  productId: string;
  newQuantity: number;
  syncToPlatforms: boolean;
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

    const { productId, newQuantity, syncToPlatforms }: InventoryUpdate = await req.json();

    // Get product details
    const { data: product, error: productError } = await supabaseClient
      .from('products')
      .select('*')
      .eq('id', productId)
      .eq('user_id', user.id)
      .single();

    if (productError) throw productError;
    if (!product) throw new Error('Product not found');

    // Update local inventory
    const { error: updateError } = await supabaseClient
      .from('products')
      .update({
        stock_quantity: newQuantity,
        updated_at: new Date().toISOString(),
      })
      .eq('id', productId);

    if (updateError) throw updateError;

    // Create inventory history record
    await supabaseClient.from('inventory_history').insert({
      product_id: productId,
      user_id: user.id,
      quantity_change: newQuantity - product.stock_quantity,
      old_quantity: product.stock_quantity,
      new_quantity: newQuantity,
      change_type: 'manual_update',
    });

    // Sync to platforms if requested
    if (syncToPlatforms) {
      const { data: cred } = await supabaseClient
        .from('platform_credentials')
        .select('*')
        .eq('user_id', user.id)
        .eq('platform', product.platform)
        .eq('is_active', true)
        .single();

      if (cred) {
        if (product.platform === 'shopee') {
          await updateShopeeInventory(cred, product, newQuantity);
        } else if (product.platform === 'tiktokshop') {
          await updateTikTokShopInventory(cred, product, newQuantity);
        }
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        product: { ...product, stock_quantity: newQuantity } 
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

async function updateShopeeInventory(cred: any, product: any, newQuantity: number) {
  // Real Shopee API integration for inventory update
  // In production, implement actual Shopee API call:
  
  // const shopeeApiUrl = 'https://partner.shopeemobile.com/api/v2/product/update_stock';
  // const response = await fetch(shopeeApiUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${cred.access_token}`,
  //   },
  //   body: JSON.stringify({
  //     shop_id: parseInt(cred.shop_id),
  //     item_id: parseInt(product.platform_product_id.replace('shopee_', '')),
  //     stock: newQuantity,
  //   }),
  // });

  console.log(`Would update Shopee inventory for product ${product.platform_product_id} to ${newQuantity}`);
}

async function updateTikTokShopInventory(cred: any, product: any, newQuantity: number) {
  // Real TikTok Shop API integration for inventory update
  // In production, implement actual TikTok Shop API call:
  
  // const tiktokApiUrl = 'https://open-api.tiktokglobalshop.com/api/products/stocks/update';
  // const response = await fetch(tiktokApiUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-tts-access-token': cred.access_token,
  //   },
  //   body: JSON.stringify({
  //     product_id: product.platform_product_id.replace('tiktok_', ''),
  //     skus: [{
  //       sku_id: product.sku,
  //       available_stock: newQuantity,
  //     }],
  //   }),
  // });

  console.log(`Would update TikTok Shop inventory for product ${product.platform_product_id} to ${newQuantity}`);
}

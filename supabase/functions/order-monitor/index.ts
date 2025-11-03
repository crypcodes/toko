/**
 * Real-time Order Monitoring Edge Function
 * 
 * Purpose: Monitors new orders across platforms and sends alerts/notifications
 * Features:
 * - Real-time order tracking and status updates
 * - Automated notifications for new orders
 * - Order status synchronization between platforms
 * - Support for order fulfillment workflows
 * - Comprehensive error handling and logging
 * 
 * Usage:
 * - Runs as a cron job for continuous monitoring
 * - Triggers on new order webhooks from platforms
 * - Manually callable for order status verification
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

// CORS headers for cross-origin requests
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, PUT, DELETE, PATCH',
  'Access-Control-Max-Age': '86400',
  'Access-Control-Allow-Credentials': 'false'
};

// Types for order monitoring operations
interface Order {
  id: string;
  platform_order_id: string;
  platform: 'shopee' | 'tiktokshop';
  customer_name: string;
  customer_email: string;
  total_amount: number;
  currency: string;
  status: 'pending' | 'paid' | 'shipped' | 'delivered' | 'cancelled' | 'refunded';
  created_at: Date;
  updated_at: Date;
  shipping_address: {
    name: string;
    phone: string;
    address: string;
    city: string;
    postal_code: string;
    country: string;
  };
  items: OrderItem[];
  payment_method: string;
  tracking_number?: string;
}

interface OrderItem {
  id: string;
  product_id: string;
  sku: string;
  name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface OrderAlert {
  type: 'new_order' | 'status_change' | 'high_value' | 'bulk_order' | 'shipping_update';
  order_id: string;
  platform: 'shopee' | 'tiktokshop';
  priority: 'low' | 'medium' | 'high' | 'urgent';
  title: string;
  message: string;
  metadata?: Record<string, any>;
  timestamp: Date;
}

interface MonitoringRequest {
  platform?: 'shopee' | 'tiktokshop' | 'all';
  check_interval?: number; // minutes
  alert_threshold?: number; // minimum order value for high-value alerts
  bulk_order_size?: number; // minimum quantity for bulk order alerts
}

// Mock API endpoints - replace with actual platform APIs
const API_ENDPOINTS = {
  shopee: {
    base: 'https://api.shopee.com',
    orders: '/orders',
    order_status: '/orders/status'
  },
  tiktokshop: {
    base: 'https://open-api.tiktokshop.com',
    orders: '/orders',
    order_status: '/orders/status'
  }
};

// Alert configuration
const ALERT_THRESHOLDS = {
  HIGH_VALUE_ORDER: 1000, // USD
  BULK_ORDER_SIZE: 10, // items
  MONITORING_INTERVAL: 5 // minutes
};

/**
 * Log order monitoring event
 */
async function logMonitoringEvent(
  db: any,
  type: string,
  order_id: string,
  platform: string,
  message: string,
  metadata?: Record<string, any>
): Promise<void> {
  try {
    const { error } = await db
      .from('monitoring_logs')
      .insert({
        event_type: type,
        order_id: order_id,
        platform: platform,
        message: message,
        metadata: metadata,
        timestamp: new Date().toISOString()
      });

    if (error) {
      console.error('Failed to log monitoring event:', error);
    }
  } catch (error) {
    console.error('Error logging monitoring event:', error);
  }
}

/**
 * Send order notification
 */
async function sendOrderNotification(db: any, alert: OrderAlert): Promise<void> {
  try {
    // Insert notification into database
    const { error } = await db
      .from('notifications')
      .insert({
        type: alert.type,
        title: alert.title,
        message: alert.message,
        severity: alert.priority,
        order_id: alert.order_id,
        platform: alert.platform,
        metadata: alert.metadata,
        read: false,
        created_at: alert.timestamp.toISOString()
      });

    if (error) {
      console.error('Failed to send notification:', error);
      return;
    }

    // Here you could add additional notification methods:
    // - Email notifications
    // - Slack/Discord webhooks
    // - SMS notifications
    // - Push notifications
    
    console.log(`Notification sent: ${alert.type} for order ${alert.order_id}`);
  } catch (error) {
    console.error('Error sending notification:', error);
  }
}

/**
 * Fetch orders from Shopee platform
 */
async function fetchShopeeOrders(since?: Date): Promise<Order[]> {
  try {
    const apiKey = Deno.env.get('SHOPEE_API_KEY');
    const shopId = Deno.env.get('SHOPEE_SHOP_ID');

    if (!apiKey || !shopId) {
      throw new Error('Shopee API credentials not configured');
    }

    const params = new URLSearchParams();
    if (since) {
      params.append('created_after', since.toISOString());
    }
    params.append('limit', '100');

    const response = await fetch(`${API_ENDPOINTS.shopee.base}${API_ENDPOINTS.shopee.orders}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Shop-Id': shopId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Shopee API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Transform Shopee order format to our Order interface
    return data.orders?.map((order: any) => ({
      id: `shopee_${order.order_id}`,
      platform_order_id: order.order_id,
      platform: 'shopee' as const,
      customer_name: order.buyer_name,
      customer_email: order.buyer_email || '',
      total_amount: parseFloat(order.total_amount),
      currency: order.currency || 'USD',
      status: mapShopeeStatus(order.order_status),
      created_at: new Date(order.create_time * 1000),
      updated_at: new Date(order.update_time * 1000),
      shipping_address: {
        name: order.shipping_address?.name || '',
        phone: order.shipping_address?.phone || '',
        address: order.shipping_address?.address || '',
        city: order.shipping_address?.city || '',
        postal_code: order.shipping_address?.postal_code || '',
        country: order.shipping_address?.country || ''
      },
      items: order.items?.map((item: any) => ({
        id: item.item_id,
        product_id: item.product_id,
        sku: item.sku,
        name: item.name,
        quantity: item.quantity,
        unit_price: parseFloat(item.price),
        total_price: parseFloat(item.price) * item.quantity
      })) || [],
      payment_method: order.payment_method || 'unknown',
      tracking_number: order.tracking_number
    })) || [];

  } catch (error) {
    console.error('Failed to fetch Shopee orders:', error);
    return [];
  }
}

/**
 * Fetch orders from TikTok Shop platform
 */
async function fetchTikTokShopOrders(since?: Date): Promise<Order[]> {
  try {
    const apiKey = Deno.env.get('TIKTOKSHOP_API_KEY');
    const shopId = Deno.env.get('TIKTOKSHOP_SHOP_ID');

    if (!apiKey || !shopId) {
      throw new Error('TikTok Shop API credentials not configured');
    }

    const params = new URLSearchParams();
    if (since) {
      params.append('created_after', since.toISOString());
    }
    params.append('limit', '100');

    const response = await fetch(`${API_ENDPOINTS.tiktokshop.base}${API_ENDPOINTS.tiktokshop.orders}?${params}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'X-Shop-Id': shopId
      }
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`TikTok Shop API error: ${errorData.message || response.statusText}`);
    }

    const data = await response.json();
    
    // Transform TikTok Shop order format to our Order interface
    return data.orders?.map((order: any) => ({
      id: `tiktokshop_${order.order_id}`,
      platform_order_id: order.order_id,
      platform: 'tiktokshop' as const,
      customer_name: order.buyer_name,
      customer_email: order.buyer_email || '',
      total_amount: parseFloat(order.total_amount),
      currency: order.currency || 'USD',
      status: mapTikTokStatus(order.order_status),
      created_at: new Date(order.created_at),
      updated_at: new Date(order.updated_at),
      shipping_address: {
        name: order.shipping_address?.name || '',
        phone: order.shipping_address?.phone || '',
        address: order.shipping_address?.address || '',
        city: order.shipping_address?.city || '',
        postal_code: order.shipping_address?.postal_code || '',
        country: order.shipping_address?.country || ''
      },
      items: order.line_items?.map((item: any) => ({
        id: item.line_item_id,
        product_id: item.product_id,
        sku: item.sku,
        name: item.title,
        quantity: item.quantity,
        unit_price: parseFloat(item.unit_price),
        total_price: parseFloat(item.total_price)
      })) || [],
      payment_method: order.payment_method || 'unknown',
      tracking_number: order.tracking_number
    })) || [];

  } catch (error) {
    console.error('Failed to fetch TikTok Shop orders:', error);
    return [];
  }
}

/**
 * Map Shopee status to our status enum
 */
function mapShopeeStatus(shopeeStatus: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    'UNPAID': 'pending',
    'PAID': 'paid',
    'PROCESSING': 'paid',
    'SHIPPED': 'shipped',
    'COMPLETED': 'delivered',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded'
  };
  return statusMap[shopeeStatus] || 'pending';
}

/**
 * Map TikTok Shop status to our status enum
 */
function mapTikTokStatus(tiktokStatus: string): Order['status'] {
  const statusMap: Record<string, Order['status']> = {
    'CREATED': 'pending',
    'UNPAID': 'pending',
    'PAID': 'paid',
    'PROCESSING': 'paid',
    'SHIPPED': 'shipped',
    'DELIVERED': 'delivered',
    'CANCELLED': 'cancelled',
    'REFUNDED': 'refunded'
  };
  return statusMap[tiktokStatus] || 'pending';
}

/**
 * Check for new orders and generate alerts
 */
async function checkForNewOrders(
  db: any,
  existingOrders: Order[],
  newOrders: Order[]
): Promise<Order[]> {
  const newOrderIds = new Set(existingOrders.map(o => o.platform_order_id));
  const actualNewOrders = newOrders.filter(order => !newOrderIds.has(order.platform_order_id));
  
  const alerts: OrderAlert[] = [];

  for (const order of actualNewOrders) {
    // Basic new order alert
    alerts.push({
      type: 'new_order',
      order_id: order.id,
      platform: order.platform,
      priority: 'medium',
      title: 'New Order Received',
      message: `New ${order.platform} order #${order.platform_order_id} from ${order.customer_name} for $${order.total_amount}`,
      metadata: {
        customer_name: order.customer_name,
        total_amount: order.total_amount,
        currency: order.currency,
        item_count: order.items.length
      },
      timestamp: new Date()
    });

    // High value order alert
    if (order.total_amount >= (ALERT_THRESHOLDS.HIGH_VALUE_ORDER)) {
      alerts.push({
        type: 'high_value',
        order_id: order.id,
        platform: order.platform,
        priority: 'high',
        title: 'High Value Order',
        message: `High value order $${order.total_amount} received from ${order.customer_name}`,
        metadata: {
          order_value: order.total_amount,
          threshold: ALERT_THRESHOLDS.HIGH_VALUE_ORDER
        },
        timestamp: new Date()
      });
    }

    // Bulk order alert
    const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);
    if (totalQuantity >= ALERT_THRESHOLDS.BULK_ORDER_SIZE) {
      alerts.push({
        type: 'bulk_order',
        order_id: order.id,
        platform: order.platform,
        priority: 'medium',
        title: 'Bulk Order',
        message: `Bulk order with ${totalQuantity} items received from ${order.customer_name}`,
        metadata: {
          total_quantity: totalQuantity,
          items: order.items.length
        },
        timestamp: new Date()
      });
    }
  }

  // Send all alerts
  for (const alert of alerts) {
    await sendOrderNotification(db, alert);
  }

  return actualNewOrders;
}

/**
 * Check for order status changes
 */
async function checkOrderStatusChanges(
  db: any,
  existingOrders: Order[],
  currentOrders: Order[]
): Promise<void> {
  const existingOrderMap = new Map(existingOrders.map(o => [o.platform_order_id, o]));
  const alerts: OrderAlert[] = [];

  for (const currentOrder of currentOrders) {
    const existingOrder = existingOrderMap.get(currentOrder.platform_order_id);
    
    if (existingOrder && existingOrder.status !== currentOrder.status) {
      alerts.push({
        type: 'status_change',
        order_id: currentOrder.id,
        platform: currentOrder.platform,
        priority: 'medium',
        title: 'Order Status Updated',
        message: `Order #${currentOrder.platform_order_id} status changed from ${existingOrder.status} to ${currentOrder.status}`,
        metadata: {
          old_status: existingOrder.status,
          new_status: currentOrder.status,
          order_date: currentOrder.created_at.toISOString()
        },
        timestamp: new Date()
      });

      // Special alert for shipped orders
      if (currentOrder.status === 'shipped') {
        alerts.push({
          type: 'shipping_update',
          order_id: currentOrder.id,
          platform: currentOrder.platform,
          priority: 'low',
          title: 'Order Shipped',
          message: `Order #${currentOrder.platform_order_id} has been shipped${currentOrder.tracking_number ? ` (Tracking: ${currentOrder.tracking_number})` : ''}`,
          metadata: {
            tracking_number: currentOrder.tracking_number
          },
          timestamp: new Date()
        });
      }
    }
  }

  // Send status change alerts
  for (const alert of alerts) {
    await sendOrderNotification(db, alert);
  }
}

/**
 * Store orders in database (upsert operation)
 */
async function storeOrders(db: any, orders: Order[]): Promise<void> {
  try {
    for (const order of orders) {
      const { error } = await db
        .from('orders')
        .upsert({
          id: order.id,
          platform_order_id: order.platform_order_id,
          platform: order.platform,
          customer_name: order.customer_name,
          customer_email: order.customer_email,
          total_amount: order.total_amount,
          currency: order.currency,
          status: order.status,
          shipping_address: order.shipping_address,
          payment_method: order.payment_method,
          tracking_number: order.tracking_number,
          created_at: order.created_at.toISOString(),
          updated_at: order.updated_at.toISOString()
        });

      if (error) {
        console.error(`Failed to store order ${order.id}:`, error);
      }

      // Store order items
      for (const item of order.items) {
        const { error: itemError } = await db
          .from('order_items')
          .upsert({
            id: `${order.id}_${item.id}`,
            order_id: order.id,
            product_id: item.product_id,
            sku: item.sku,
            name: item.name,
            quantity: item.quantity,
            unit_price: item.unit_price,
            total_price: item.total_price
          });

        if (itemError) {
          console.error(`Failed to store order item ${item.id}:`, itemError);
        }
      }
    }
  } catch (error) {
    console.error('Error storing orders:', error);
  }
}

/**
 * Main order monitoring function
 */
async function performOrderMonitoring(
  requestData: MonitoringRequest,
  db: any
): Promise<{ success: boolean; message: string; data?: any }> {
  try {
    const platform = requestData.platform || 'all';
    const checkInterval = requestData.check_interval || ALERT_THRESHOLDS.MONITORING_INTERVAL;
    
    // Calculate the date to check from (default to monitoring interval)
    const checkFrom = new Date(Date.now() - (checkInterval * 60 * 1000));

    console.log(`Starting order monitoring for platform: ${platform}, checking from: ${checkFrom.toISOString()}`);

    // Fetch existing orders from database
    const { data: existingOrders, error: fetchError } = await db
      .from('orders')
      .select('*')
      .gte('created_at', checkFrom.toISOString());

    if (fetchError) {
      console.error('Failed to fetch existing orders:', fetchError);
    }

    const existingOrdersList = existingOrders || [];

    let allCurrentOrders: Order[] = [];

    // Fetch orders from Shopee if monitoring all or specifically Shopee
    if (platform === 'all' || platform === 'shopee') {
      const shopeeOrders = await fetchShopeeOrders(checkFrom);
      allCurrentOrders = allCurrentOrders.concat(shopeeOrders);
      
      // Log monitoring event
      await logMonitoringEvent(
        db,
        'shopee_fetch',
        'system',
        'shopee',
        `Fetched ${shopeeOrders.length} Shopee orders`
      );
    }

    // Fetch orders from TikTok Shop if monitoring all or specifically TikTok Shop
    if (platform === 'all' || platform === 'tiktokshop') {
      const tiktokOrders = await fetchTikTokShopOrders(checkFrom);
      allCurrentOrders = allCurrentOrders.concat(tiktokOrders);
      
      // Log monitoring event
      await logMonitoringEvent(
        db,
        'tiktokshop_fetch',
        'system',
        'tiktokshop',
        `Fetched ${tiktokOrders.length} TikTok Shop orders`
      );
    }

    // Check for new orders
    const newOrders = await checkForNewOrders(db, existingOrdersList, allCurrentOrders);

    // Check for status changes
    await checkOrderStatusChanges(db, existingOrdersList, allCurrentOrders);

    // Store current orders in database
    await storeOrders(db, allCurrentOrders);

    const result = {
      success: true,
      message: 'Order monitoring completed successfully',
      data: {
        total_orders_checked: allCurrentOrders.length,
        new_orders_found: newOrders.length,
        platforms_monitored: platform,
        check_interval_minutes: checkInterval,
        timestamp: new Date().toISOString()
      }
    };

    return result;

  } catch (error) {
    console.error('Order monitoring failed:', error);
    await logMonitoringEvent(db, 'monitoring_error', 'system', 'system', error.message);
    
    return {
      success: false,
      message: `Order monitoring failed: ${error.message}`
    };
  }
}

/**
 * Edge function request handler
 */
serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    // Initialize Supabase client (simplified for this example)
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      throw new Error('Supabase credentials not configured');
    }

    // Mock database client for this example
    const db = {
      from: (table: string) => ({
        select: (columns?: string) => ({
          gte: (column: string, value: any) => Promise.resolve({
            data: [],
            error: null
          }),
          data: [],
          error: null
        }),
        upsert: (data: any) => Promise.resolve({
          data: data,
          error: null
        }),
        insert: (data: any) => Promise.resolve({
          data: data,
          error: null
        }),
        data: [],
        error: null
      })
    };

    let requestData: MonitoringRequest = {};

    if (req.method === 'POST') {
      try {
        requestData = await req.json();
      } catch (error) {
        console.log('No JSON body provided, using default parameters');
      }
    }

    // Perform order monitoring
    const monitoringResult = await performOrderMonitoring(requestData, db);

    return new Response(
      JSON.stringify({
        success: monitoringResult.success,
        message: monitoringResult.message,
        data: monitoringResult.data,
        timestamp: new Date().toISOString()
      }),
      {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: monitoringResult.success ? 200 : 500
      }
    );

  } catch (error) {
    console.error('Order monitor error:', error);
    
    const errorResponse = {
      success: false,
      error: {
        code: 'ORDER_MONITOR_ERROR',
        message: error.message
      },
      timestamp: new Date().toISOString()
    };

    return new Response(JSON.stringify(errorResponse), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
});

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface SyncRequest {
  syncType: 'full' | 'incremental';
  platform: 'shopee' | 'tiktokshop' | 'all';
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

    const { syncType, platform }: SyncRequest = await req.json();

    // Get user's platform credentials
    const { data: credentials, error: credError } = await supabaseClient
      .from('platform_credentials')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_active', true);

    if (credError) throw credError;

    const results = {
      synced: 0,
      errors: 0,
      platforms: [] as string[],
    };

    // Process each platform credential
    for (const cred of credentials || []) {
      if (platform !== 'all' && cred.platform !== platform) continue;

      try {
        if (cred.platform === 'shopee') {
          await syncShopee(supabaseClient, user.id, cred, syncType);
        } else if (cred.platform === 'tiktokshop') {
          await syncTikTokShop(supabaseClient, user.id, cred, syncType);
        }
        
        results.synced++;
        results.platforms.push(cred.platform);
      } catch (error) {
        console.error(`Sync error for ${cred.platform}:`, error);
        results.errors++;
      }
    }

    // Update last sync timestamp
    await supabaseClient
      .from('user_settings')
      .update({ last_sync_at: new Date().toISOString() })
      .eq('user_id', user.id);

    return new Response(
      JSON.stringify({ success: true, results }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error: any) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});

async function syncShopee(supabaseClient: any, userId: string, cred: any, syncType: string) {
  // Real Shopee API integration structure
  // In production, replace this with actual Shopee API calls
  
  const accessToken = cred.access_token;
  const shopId = cred.shop_id;
  
  if (!accessToken) {
    console.log('No access token - skipping Shopee sync');
    return;
  }

  // Example: Fetch products from Shopee API
  // const shopeeApiUrl = 'https://partner.shopeemobile.com/api/v2/product/get_item_list';
  // const response = await fetch(shopeeApiUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'Authorization': `Bearer ${accessToken}`,
  //   },
  //   body: JSON.stringify({
  //     shop_id: parseInt(shopId),
  //     offset: 0,
  //     page_size: 100,
  //   }),
  // });
  // const data = await response.json();

  // For now, generate sample data for testing
  const sampleProducts = [
    {
      platform: 'shopee',
      platform_product_id: `shopee_${Date.now()}_1`,
      name: 'Shopee Product Sample 1',
      sku: `SKU-SHOPEE-${Math.random().toString(36).substring(7)}`,
      price: 29.99,
      stock_quantity: 100,
      category: 'Electronics',
      image_url: 'https://via.placeholder.com/150',
      user_id: userId,
      shop_id: shopId,
    }
  ];

  // Upsert products to database
  for (const product of sampleProducts) {
    await supabaseClient.from('products').upsert(product, {
      onConflict: 'platform_product_id',
    });
  }

  console.log(`Synced ${sampleProducts.length} products from Shopee shop ${shopId}`);
}

async function syncTikTokShop(supabaseClient: any, userId: string, cred: any, syncType: string) {
  // Real TikTok Shop API integration structure
  // In production, replace this with actual TikTok Shop API calls
  
  const accessToken = cred.access_token;
  const shopId = cred.shop_id;
  
  if (!accessToken) {
    console.log('No access token - skipping TikTok Shop sync');
    return;
  }

  // Example: Fetch products from TikTok Shop API
  // const tiktokApiUrl = 'https://open-api.tiktokglobalshop.com/api/products/search';
  // const response = await fetch(tiktokApiUrl, {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json',
  //     'x-tts-access-token': accessToken,
  //   },
  //   body: JSON.stringify({
  //     page_size: 100,
  //     page_number: 1,
  //   }),
  // });
  // const data = await response.json();

  // For now, generate sample data for testing
  const sampleProducts = [
    {
      platform: 'tiktokshop',
      platform_product_id: `tiktok_${Date.now()}_1`,
      name: 'TikTok Shop Product Sample 1',
      sku: `SKU-TIKTOK-${Math.random().toString(36).substring(7)}`,
      price: 39.99,
      stock_quantity: 75,
      category: 'Fashion',
      image_url: 'https://via.placeholder.com/150',
      user_id: userId,
      shop_id: shopId,
    }
  ];

  // Upsert products to database
  for (const product of sampleProducts) {
    await supabaseClient.from('products').upsert(product, {
      onConflict: 'platform_product_id',
    });
  }

  console.log(`Synced ${sampleProducts.length} products from TikTok Shop ${shopId}`);
}

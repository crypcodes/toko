import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { TrendingUp, DollarSign, Package, ShoppingCart } from 'lucide-react';

export default function AnalyticsPage() {
  const { user } = useAuth();
  const [analytics, setAnalytics] = useState({
    totalRevenue: 0,
    shopeeRevenue: 0,
    tiktokRevenue: 0,
    totalOrders: 0,
    shopeeOrders: 0,
    tiktokOrders: 0,
    totalProducts: 0,
    avgOrderValue: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadAnalytics();
    }
  }, [user]);

  async function loadAnalytics() {
    if (!user) return;

    try {
      // Load orders
      const { data: orders } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id);

      // Load products
      const { data: products } = await supabase
        .from('products')
        .select('*')
        .eq('user_id', user.id);

      if (orders && products) {
        const totalRevenue = orders.reduce((sum, o) => sum + Number(o.total_amount), 0);
        const shopeeOrders = orders.filter(o => o.platform === 'shopee');
        const tiktokOrders = orders.filter(o => o.platform === 'tiktokshop');

        setAnalytics({
          totalRevenue,
          shopeeRevenue: shopeeOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          tiktokRevenue: tiktokOrders.reduce((sum, o) => sum + Number(o.total_amount), 0),
          totalOrders: orders.length,
          shopeeOrders: shopeeOrders.length,
          tiktokOrders: tiktokOrders.length,
          totalProducts: products.length,
          avgOrderValue: orders.length > 0 ? totalRevenue / orders.length : 0,
        });
      }
    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-4 border-gray-900 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Analytics Overview</h3>
        <p className="text-sm text-gray-600">Track your business performance</p>
      </div>

      {/* Overall Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-green-500 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
            <TrendingUp className="w-5 h-5 text-green-600" />
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Revenue</h4>
          <p className="text-2xl font-bold text-gray-900">
            ${analytics.totalRevenue.toFixed(2)}
          </p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-blue-500 p-3 rounded-lg">
              <ShoppingCart className="w-6 h-6 text-white" />
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Orders</h4>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalOrders}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-purple-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Total Products</h4>
          <p className="text-2xl font-bold text-gray-900">{analytics.totalProducts}</p>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="bg-gray-900 p-3 rounded-lg">
              <DollarSign className="w-6 h-6 text-white" />
            </div>
          </div>
          <h4 className="text-sm font-medium text-gray-600 mb-1">Avg Order Value</h4>
          <p className="text-2xl font-bold text-gray-900">
            ${analytics.avgOrderValue.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Platform Comparison */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shopee Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-orange-500 p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">Shopee Performance</h4>
              <p className="text-sm text-gray-600">Sales and orders from Shopee</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="text-xl font-bold text-gray-900">
                ${analytics.shopeeRevenue.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Orders</span>
              <span className="text-xl font-bold text-gray-900">
                {analytics.shopeeOrders}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Order Value</span>
              <span className="text-xl font-bold text-gray-900">
                ${analytics.shopeeOrders > 0
                  ? (analytics.shopeeRevenue / analytics.shopeeOrders).toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>
        </div>

        {/* TikTok Shop Stats */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="bg-black p-3 rounded-lg">
              <Package className="w-6 h-6 text-white" />
            </div>
            <div>
              <h4 className="text-lg font-semibold text-gray-900">TikTok Shop Performance</h4>
              <p className="text-sm text-gray-600">Sales and orders from TikTok Shop</p>
            </div>
          </div>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Revenue</span>
              <span className="text-xl font-bold text-gray-900">
                ${analytics.tiktokRevenue.toFixed(2)}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Orders</span>
              <span className="text-xl font-bold text-gray-900">
                {analytics.tiktokOrders}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-600">Avg Order Value</span>
              <span className="text-xl font-bold text-gray-900">
                ${analytics.tiktokOrders > 0
                  ? (analytics.tiktokRevenue / analytics.tiktokOrders).toFixed(2)
                  : '0.00'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

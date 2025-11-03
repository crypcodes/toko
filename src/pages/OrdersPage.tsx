import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase, Order } from '@/lib/supabase';
import { ShoppingCart, Search, Truck, CheckCircle, XCircle, Package } from 'lucide-react';

export default function OrdersPage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPlatform, setFilterPlatform] = useState('all');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      loadOrders();
    }
  }, [user]);

  useEffect(() => {
    filterOrders();
  }, [orders, searchQuery, filterStatus, filterPlatform]);

  async function loadOrders() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('user_id', user.id)
        .order('order_date', { ascending: false});

      if (error) throw error;
      setOrders(data || []);
    } catch (error) {
      console.error('Error loading orders:', error);
    } finally {
      setLoading(false);
    }
  }

  function filterOrders() {
    let filtered = [...orders];

    if (searchQuery) {
      filtered = filtered.filter(
        (o) =>
          o.order_number.toLowerCase().includes(searchQuery.toLowerCase()) ||
          o.customer_name.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus !== 'all') {
      filtered = filtered.filter((o) => o.status === filterStatus);
    }

    if (filterPlatform !== 'all') {
      filtered = filtered.filter((o) => o.platform === filterPlatform);
    }

    setFilteredOrders(filtered);
  }

  async function handleProcessOrder(orderId: string, action: string) {
    let trackingNumber = null;
    let carrier = null;

    if (action === 'ship') {
      trackingNumber = prompt('Enter tracking number:');
      if (!trackingNumber) return;
      carrier = prompt('Enter carrier name (e.g., USPS, FedEx, UPS):');
      if (!carrier) return;
    }

    if (action === 'cancel') {
      if (!confirm('Are you sure you want to cancel this order?')) return;
    }

    setProcessing(orderId);
    try {
      const { data, error } = await supabase.functions.invoke('process-order', {
        body: {
          orderId,
          action,
          trackingNumber,
          carrier
        }
      });

      if (error) throw error;
      
      // Check if there was an error in the response data
      if (data?.error) {
        throw new Error(data.error.message || 'Unknown error occurred');
      }

      // Reload orders to reflect changes
      await loadOrders();
      
      // Show success message
      alert(`Order ${action}ed successfully!`);
    } catch (error: any) {
      console.error('Error processing order:', error);
      alert('Failed to process order: ' + (error.message || 'Unknown error'));
    } finally {
      setProcessing(null);
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
      {/* Header */}
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Order Management</h3>
        <p className="text-sm text-gray-600">Track and manage customer orders</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-xl border border-gray-200 p-4">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="w-5 h-5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search orders..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            />
          </div>
          <select
            value={filterPlatform}
            onChange={(e) => setFilterPlatform(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Platforms</option>
            <option value="shopee">Shopee</option>
            <option value="tiktokshop">TikTok Shop</option>
          </select>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="confirmed">Confirmed</option>
            <option value="processing">Processing</option>
            <option value="shipped">Shipped</option>
            <option value="delivered">Delivered</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Orders List */}
      {filteredOrders.length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-12 text-center">
          <ShoppingCart className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-500">No orders found</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Order
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Customer
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Platform
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Amount
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Status
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredOrders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.order_number}</p>
                        <p className="text-sm text-gray-600">
                          {new Date(order.order_date).toLocaleDateString()}
                        </p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div>
                        <p className="font-medium text-gray-900">{order.customer_name}</p>
                        <p className="text-sm text-gray-600">{order.customer_email}</p>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          order.platform === 'shopee'
                            ? 'bg-orange-100 text-orange-700'
                            : 'bg-black text-white'
                        }`}
                      >
                        {order.platform}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <p className="font-semibold text-gray-900">
                        ${Number(order.total_amount).toFixed(2)}
                      </p>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2 py-1 text-xs font-medium rounded ${
                          order.status === 'delivered'
                            ? 'bg-green-100 text-green-700'
                            : order.status === 'shipped'
                            ? 'bg-blue-100 text-blue-700'
                            : order.status === 'cancelled'
                            ? 'bg-red-100 text-red-700'
                            : order.status === 'confirmed'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-gray-100 text-gray-700'
                        }`}
                      >
                        {order.status}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex gap-2">
                        {order.status === 'pending' && (
                          <button
                            onClick={() => handleProcessOrder(order.id, 'confirm')}
                            disabled={processing === order.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Confirm Order"
                          >
                            {processing === order.id ? (
                              <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <CheckCircle className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        {order.status === 'confirmed' && (
                          <button
                            onClick={() => handleProcessOrder(order.id, 'ship')}
                            disabled={processing === order.id}
                            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition disabled:opacity-50"
                            title="Mark as Shipped"
                          >
                            {processing === order.id ? (
                              <div className="w-5 h-5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Truck className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        {order.status === 'shipped' && (
                          <button
                            onClick={() => handleProcessOrder(order.id, 'deliver')}
                            disabled={processing === order.id}
                            className="p-2 text-green-600 hover:bg-green-50 rounded-lg transition disabled:opacity-50"
                            title="Mark as Delivered"
                          >
                            {processing === order.id ? (
                              <div className="w-5 h-5 border-2 border-green-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <Package className="w-5 h-5" />
                            )}
                          </button>
                        )}
                        {(order.status === 'pending' || order.status === 'confirmed') && (
                          <button
                            onClick={() => handleProcessOrder(order.id, 'cancel')}
                            disabled={processing === order.id}
                            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition disabled:opacity-50"
                            title="Cancel Order"
                          >
                            {processing === order.id ? (
                              <div className="w-5 h-5 border-2 border-red-600 border-t-transparent rounded-full animate-spin" />
                            ) : (
                              <XCircle className="w-5 h-5" />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

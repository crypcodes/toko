import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { Save, RefreshCw, Key, Eye, EyeOff, Plus, Trash2 } from 'lucide-react';

interface PlatformCredential {
  id: string;
  platform: string;
  shop_id: string;
  shop_name: string;
  is_active: boolean;
}

export default function SettingsPage() {
  const { user } = useAuth();
  const [settings, setSettings] = useState({
    auto_sync_enabled: true,
    sync_interval_minutes: 30,
    low_stock_alerts: true,
    new_order_alerts: true,
    email_notifications: true,
  });
  const [credentials, setCredentials] = useState<PlatformCredential[]>([]);
  const [showAddCredential, setShowAddCredential] = useState(false);
  const [newCredential, setNewCredential] = useState({
    platform: 'shopee',
    shop_id: '',
    shop_name: '',
    partner_id: '',
    partner_key: '',
    access_token: '',
    refresh_token: '',
  });
  const [showSecrets, setShowSecrets] = useState<Record<string, boolean>>({});
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (user) {
      loadSettings();
      loadCredentials();
    }
  }, [user]);

  async function loadSettings() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setSettings({
          auto_sync_enabled: data.auto_sync_enabled,
          sync_interval_minutes: data.sync_interval_minutes,
          low_stock_alerts: data.low_stock_alerts,
          new_order_alerts: data.new_order_alerts,
          email_notifications: data.email_notifications,
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
    }
  }

  async function loadCredentials() {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('platform_credentials')
        .select('id, platform, shop_id, shop_name, is_active')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCredentials(data || []);
    } catch (error) {
      console.error('Error loading credentials:', error);
    }
  }

  async function handleSaveSettings() {
    if (!user) return;

    setSaving(true);
    try {
      const { error } = await supabase
        .from('user_settings')
        .update({
          ...settings,
          updated_at: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) throw error;
      alert('Settings saved successfully!');
    } catch (error: any) {
      console.error('Error saving settings:', error);
      alert('Failed to save settings: ' + error.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddCredential() {
    if (!user || !newCredential.shop_id || !newCredential.partner_id) {
      alert('Please fill in all required fields');
      return;
    }

    try {
      const { error } = await supabase
        .from('platform_credentials')
        .insert({
          user_id: user.id,
          platform: newCredential.platform,
          shop_id: newCredential.shop_id,
          shop_name: newCredential.shop_name,
          access_token: newCredential.access_token,
          refresh_token: newCredential.refresh_token,
          is_active: true,
        });

      if (error) throw error;

      setNewCredential({
        platform: 'shopee',
        shop_id: '',
        shop_name: '',
        partner_id: '',
        partner_key: '',
        access_token: '',
        refresh_token: '',
      });
      setShowAddCredential(false);
      await loadCredentials();
      alert('Platform credentials added successfully!');
    } catch (error: any) {
      console.error('Error adding credential:', error);
      alert('Failed to add credential: ' + error.message);
    }
  }

  async function handleDeleteCredential(id: string) {
    if (!confirm('Are you sure you want to delete this credential?')) return;

    try {
      const { error } = await supabase
        .from('platform_credentials')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await loadCredentials();
    } catch (error) {
      console.error('Error deleting credential:', error);
      alert('Failed to delete credential');
    }
  }

  async function handleManualSync() {
    setSyncing(true);
    try {
      const { error } = await supabase.functions.invoke('sync-platforms', {
        body: { syncType: 'full', platform: 'all' }
      });

      if (error) throw error;
      alert('Sync completed successfully!');
    } catch (error: any) {
      console.error('Sync error:', error);
      alert('Sync failed: ' + error.message);
    } finally {
      setSyncing(false);
    }
  }

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h3 className="text-lg font-semibold text-gray-900">Settings</h3>
        <p className="text-sm text-gray-600">Manage your account preferences and platform integrations</p>
      </div>

      {/* Platform Credentials */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h4 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
              <Key className="w-5 h-5" />
              Platform Credentials
            </h4>
            <p className="text-sm text-gray-600 mt-1">
              Connect your Shopee and TikTokShop accounts for real-time synchronization
            </p>
          </div>
          <button
            onClick={() => setShowAddCredential(!showAddCredential)}
            className="flex items-center gap-2 px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
          >
            <Plus className="w-4 h-4" />
            Add Platform
          </button>
        </div>

        {/* Add Credential Form */}
        {showAddCredential && (
          <div className="mb-4 p-4 bg-gray-50 rounded-lg border border-gray-200 space-y-3">
            <h5 className="font-medium text-gray-900">Add New Platform</h5>
            
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Platform *
                </label>
                <select
                  value={newCredential.platform}
                  onChange={(e) => setNewCredential({ ...newCredential, platform: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                >
                  <option value="shopee">Shopee</option>
                  <option value="tiktokshop">TikTok Shop</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop ID *
                </label>
                <input
                  type="text"
                  value={newCredential.shop_id}
                  onChange={(e) => setNewCredential({ ...newCredential, shop_id: e.target.value })}
                  placeholder="Enter shop ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Shop Name
                </label>
                <input
                  type="text"
                  value={newCredential.shop_name}
                  onChange={(e) => setNewCredential({ ...newCredential, shop_name: e.target.value })}
                  placeholder="Enter shop name"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Partner ID *
                </label>
                <input
                  type="text"
                  value={newCredential.partner_id}
                  onChange={(e) => setNewCredential({ ...newCredential, partner_id: e.target.value })}
                  placeholder="Enter partner ID"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>

              <div className="col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Access Token
                </label>
                <input
                  type="password"
                  value={newCredential.access_token}
                  onChange={(e) => setNewCredential({ ...newCredential, access_token: e.target.value })}
                  placeholder="Enter access token (optional - can be obtained via OAuth)"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent text-sm"
                />
              </div>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setShowAddCredential(false)}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition text-sm"
              >
                Cancel
              </button>
              <button
                onClick={handleAddCredential}
                className="px-4 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition text-sm"
              >
                Add Credential
              </button>
            </div>
          </div>
        )}

        {/* Credentials List */}
        {credentials.length === 0 ? (
          <div className="text-center py-8 text-gray-500 text-sm">
            No platform credentials configured. Add your Shopee or TikTokShop credentials to enable synchronization.
          </div>
        ) : (
          <div className="space-y-2">
            {credentials.map((cred) => (
              <div key={cred.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    cred.platform === 'shopee' ? 'bg-orange-100' : 'bg-black'
                  }`}>
                    <Key className={`w-5 h-5 ${
                      cred.platform === 'shopee' ? 'text-orange-700' : 'text-white'
                    }`} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">
                      {cred.platform === 'shopee' ? 'Shopee' : 'TikTok Shop'} - {cred.shop_name || cred.shop_id}
                    </p>
                    <p className="text-sm text-gray-600">Shop ID: {cred.shop_id}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-1 text-xs rounded ${
                    cred.is_active ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-700'
                  }`}>
                    {cred.is_active ? 'Active' : 'Inactive'}
                  </span>
                  <button
                    onClick={() => handleDeleteCredential(cred.id)}
                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg text-sm text-blue-700">
          <p className="font-medium mb-1">How to get your credentials:</p>
          <ul className="list-disc list-inside space-y-1 ml-2">
            <li><strong>Shopee:</strong> Register at <a href="https://open.shopee.com/" target="_blank" rel="noopener noreferrer" className="underline">open.shopee.com</a></li>
            <li><strong>TikTok Shop:</strong> Register at <a href="https://partner.tiktokshop.com/" target="_blank" rel="noopener noreferrer" className="underline">partner.tiktokshop.com</a></li>
            <li>Complete business verification to obtain Partner ID and API access</li>
          </ul>
        </div>
      </div>

      {/* Sync Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Synchronization</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Auto-sync enabled</p>
              <p className="text-sm text-gray-600">
                Automatically sync data from platforms
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.auto_sync_enabled}
                onChange={(e) =>
                  setSettings({ ...settings, auto_sync_enabled: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Sync interval (minutes)
            </label>
            <select
              value={settings.sync_interval_minutes}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  sync_interval_minutes: parseInt(e.target.value),
                })
              }
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-gray-900 focus:border-transparent"
            >
              <option value={15}>15 minutes</option>
              <option value={30}>30 minutes</option>
              <option value={60}>1 hour</option>
              <option value={120}>2 hours</option>
              <option value={360}>6 hours</option>
            </select>
          </div>

          <button
            onClick={handleManualSync}
            disabled={syncing}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 text-gray-900 rounded-lg hover:bg-gray-200 transition disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${syncing ? 'animate-spin' : ''}`} />
            {syncing ? 'Syncing...' : 'Manual Sync Now'}
          </button>
        </div>
      </div>

      {/* Notification Settings */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h4 className="text-lg font-semibold text-gray-900 mb-4">Notifications</h4>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Low stock alerts</p>
              <p className="text-sm text-gray-600">
                Get notified when products run low on stock
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.low_stock_alerts}
                onChange={(e) =>
                  setSettings({ ...settings, low_stock_alerts: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">New order alerts</p>
              <p className="text-sm text-gray-600">
                Get notified when new orders are received
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.new_order_alerts}
                onChange={(e) =>
                  setSettings({ ...settings, new_order_alerts: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <p className="font-medium text-gray-900">Email notifications</p>
              <p className="text-sm text-gray-600">
                Receive notifications via email
              </p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={settings.email_notifications}
                onChange={(e) =>
                  setSettings({ ...settings, email_notifications: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-gray-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-gray-900"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSaveSettings}
        disabled={saving}
        className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition disabled:opacity-50"
      >
        <Save className="w-5 h-5" />
        {saving ? 'Saving...' : 'Save Settings'}
      </button>
    </div>
  );
}

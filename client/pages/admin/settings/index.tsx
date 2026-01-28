import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import { toast } from 'react-hot-toast';
import AdminLayout from '@/components/admin/AdminLayout';
import AnimationPreferences from '@/components/admin/AnimationPreferences';
import api from '@/lib/api';
import { useSettingsSync } from '@/hooks/useSettingsSync';

export default function AdminSettingsPage() {
  const router = useRouter();
  const { tab } = router.query;
  const [activeTab, setActiveTab] = useState('general');
  const [hasChanges, setHasChanges] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Real-time settings sync (already imported)
  useSettingsSync();

  // Store Settings State
  const [storeSettings, setStoreSettings] = useState<any>(null);

  // Payment Settings State
  const [paymentSettings, setPaymentSettings] = useState<any>(null);

  // Shipping Settings State
  const [shippingSettings, setShippingSettings] = useState<any>(null);

  // Invoice Settings State
  const [invoiceSettings, setInvoiceSettings] = useState<any>(null);

  // Email Settings State
  const [emailSettings, setEmailSettings] = useState<any>(null);

  // Real-time WebSocket sync
  const { isConnected } = useSettingsSync({
    category: activeTab,
    onSettingsUpdate: (data) => {
      console.log('Real-time settings update received:', data);
      
      // Update the appropriate state based on category
      switch (data.category) {
        case 'store':
          if (activeTab === 'store') {
            setStoreSettings(data.settings);
          }
          break;
        case 'payment':
          if (activeTab === 'payment') {
            setPaymentSettings(data.settings);
          }
          break;
        case 'shipping':
          if (activeTab === 'shipping') {
            setShippingSettings(data.settings);
          }
          break;
        case 'invoice':
          if (activeTab === 'invoice') {
            setInvoiceSettings(data.settings);
          }
          break;
        case 'email':
          if (activeTab === 'email') {
            setEmailSettings(data.settings);
          }
          break;
      }
    }
  });

  // Update active tab based on URL query first
  useEffect(() => {
    if (tab === 'store') setActiveTab('store');
    else if (tab === 'payment') setActiveTab('payment');
    else if (tab === 'shipping') setActiveTab('shipping');
    else if (tab === 'invoice') setActiveTab('invoice');
    else if (tab === 'email') setActiveTab('email');
    else setActiveTab('store'); // Default to Store instead of General
  }, [tab]);

  // Set mounted state
  useEffect(() => {
    setMounted(true);
  }, []);

  // Load settings from API
  useEffect(() => {
    if (!mounted) return;

    const loadSettings = async () => {
      try {
        setLoading(true);
        
        // Load all settings based on active tab
        // Note: api interceptor returns response.data, so we get { success, settings } directly
        if (activeTab === 'store') {
          const storeRes = await api.get('/settings/store');
          setStoreSettings(storeRes.settings);
        }
        
        if (activeTab === 'payment') {
          const paymentRes = await api.get('/settings/payment');
          setPaymentSettings(paymentRes.settings);
        }
        
        if (activeTab === 'shipping') {
          const shippingRes = await api.get('/settings/shipping');
          setShippingSettings(shippingRes.settings);
        }
        
        if (activeTab === 'invoice') {
          const invoiceRes = await api.get('/settings/invoice');
          setInvoiceSettings(invoiceRes.settings);
        }
        
        if (activeTab === 'email') {
          const emailRes = await api.get('/settings/email');
          setEmailSettings(emailRes.settings);
        }
      } catch (error: any) {
        console.error('Load settings error:', error);
        toast.error(error.response?.data?.message || 'Failed to load settings');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, [mounted, activeTab]);

  // Prevent hydration mismatch - return null on server
  if (!mounted) {
    return null;
  }

  const tabs = [
    { id: 'store', name: 'Store', emoji: '🏪' },
    { id: 'payment', name: 'Payment', emoji: '💳' },
    { id: 'shipping', name: 'Shipping', emoji: '🚚' },
    { id: 'invoice', name: 'Invoice', emoji: '🧾' },
    { id: 'email', name: 'Email', emoji: '📧' },
    { id: 'animations', name: 'Animations', emoji: '🎨' },
  ];

  const handleTabChange = (tabId: string) => {
    setActiveTab(tabId);
    router.push(`/admin/settings?tab=${tabId}`, undefined, { shallow: true });
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      
      let endpoint = '';
      let data = {};
      
      switch (activeTab) {
        case 'store':
          endpoint = '/settings/store';
          data = storeSettings;
          break;
        case 'payment':
          endpoint = '/settings/payment';
          data = paymentSettings;
          break;
        case 'shipping':
          endpoint = '/settings/shipping';
          data = shippingSettings;
          break;
        case 'invoice':
          endpoint = '/settings/invoice';
          data = invoiceSettings;
          break;
        case 'email':
          endpoint = '/settings/email';
          data = emailSettings;
          break;
        case 'animations':
          // Animation preferences are stored locally, no API call needed
          toast.success('Animation preferences are saved locally!');
          setSaving(false);
          return;
      }
      
      await api.put(endpoint, data);
      toast.success('Settings saved successfully!');
      setHasChanges(false);
    } catch (error: any) {
      console.error('Save settings error:', error);
      toast.error(error.response?.data?.message || 'Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    try {
      setLoading(true);
      // Reload settings based on active tab
      if (activeTab === 'store') {
        const storeRes = await api.get('/settings/store');
        setStoreSettings(storeRes.settings);
      } else if (activeTab === 'payment') {
        const paymentRes = await api.get('/settings/payment');
        setPaymentSettings(paymentRes.settings);
      } else if (activeTab === 'shipping') {
        const shippingRes = await api.get('/settings/shipping');
        setShippingSettings(shippingRes.settings);
      } else if (activeTab === 'invoice') {
        const invoiceRes = await api.get('/settings/invoice');
        setInvoiceSettings(invoiceRes.settings);
      } else if (activeTab === 'email') {
        const emailRes = await api.get('/settings/email');
        setEmailSettings(emailRes.settings);
      }
      
      toast.success('Settings reset to saved values');
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to reset settings');
    } finally {
      setLoading(false);
    }
  };

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                Settings
                {isConnected && (
                  <span className="flex items-center gap-1 text-sm font-normal text-green-600">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    Live
                  </span>
                )}
              </h1>
              <p className="text-gray-600 mt-1">Manage your store configuration and preferences</p>
            </div>
            <div className="flex gap-3">
              {activeTab !== 'animations' && (
                <>
                  <button
                    onClick={handleReset}
                    className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm font-medium text-gray-700"
                  >
                    <span className="text-lg">🔄</span>
                    Reset
                  </button>
                  <button
                    onClick={handleSave}
                    disabled={!hasChanges || saving}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Saving...
                      </>
                    ) : (
                      <>
                        <span className="text-lg">💾</span>
                        Save Changes
                      </>
                    )}
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Tabs and Content */}
        <div className="grid grid-cols-12 gap-6">
          {/* Sidebar Tabs */}
          <div className="col-span-12 lg:col-span-3">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
              <nav className="space-y-1 p-2">
                {tabs.map((tab) => {
                  const isActive = activeTab === tab.id;
                  
                  return (
                    <button
                      key={tab.id}
                      onClick={() => handleTabChange(tab.id)}
                      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 text-left ${
                        isActive
                          ? 'bg-gradient-to-r from-primary-600 to-primary-700 text-white shadow-md'
                          : 'text-gray-700 hover:bg-gray-100'
                      }`}
                    >
                      <span className="text-xl">{tab.emoji}</span>
                      <span className="font-medium">{tab.name}</span>
                      {isActive && <span className="ml-auto text-lg">✓</span>}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content Area */}
          <div className="col-span-12 lg:col-span-9">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              {loading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
                    <p className="mt-4 text-gray-600">Loading settings...</p>
                  </div>
                </div>
              ) : (
                <>
                  {activeTab === 'store' && storeSettings && (
                    <StoreSettings
                      settings={storeSettings}
                      onChange={(updated) => {
                        setStoreSettings(updated);
                        setHasChanges(true);
                      }}
                    />
                  )}
                  
                  {activeTab === 'payment' && paymentSettings && (
                    <PaymentSettings
                      settings={paymentSettings}
                      onChange={(updated) => {
                        setPaymentSettings(updated);
                        setHasChanges(true);
                      }}
                    />
                  )}
                  
                  {activeTab === 'shipping' && shippingSettings && (
                    <ShippingSettings
                      settings={shippingSettings}
                      onChange={(updated) => {
                        setShippingSettings(updated);
                        setHasChanges(true);
                      }}
                    />
                  )}
                  
                  {activeTab === 'invoice' && invoiceSettings && (
                    <InvoiceSettings
                      settings={invoiceSettings}
                      onChange={(updated) => {
                        setInvoiceSettings(updated);
                        setHasChanges(true);
                      }}
                    />
                  )}
                  
                  {activeTab === 'email' && emailSettings && (
                    <EmailSettings
                      settings={emailSettings}
                      onChange={(updated) => {
                        setEmailSettings(updated);
                        setHasChanges(true);
                      }}
                    />
                  )}
                  
                  {activeTab === 'animations' && (
                    <AnimationPreferences />
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}

// Store Settings Component
function StoreSettings({ settings, onChange }: any) {
  const handleChange = (field: string, value: any) => {
    const updated = { ...settings };
    const keys = field.split('.');
    
    if (keys.length === 1) {
      updated[field] = value;
    } else if (keys.length === 2) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      updated[keys[0]][keys[1]] = value;
    } else if (keys.length === 3) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
      updated[keys[0]][keys[1]][keys[2]] = value;
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Store Settings</h2>
        <p className="text-sm text-gray-600">Configure your store information and details</p>
      </div>

      <div className="space-y-5">
        {/* Store Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Name *
          </label>
          <input
            type="text"
            value={settings.store?.name || ''}
            onChange={(e) => handleChange('store.name', e.target.value)}
            className="input w-full"
            placeholder="Your Store Name"
          />
        </div>

        {/* Tagline */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Tagline
          </label>
          <input
            type="text"
            value={settings.store?.tagline || ''}
            onChange={(e) => handleChange('store.tagline', e.target.value)}
            className="input w-full"
            placeholder="Your trusted shopping destination"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Store Description
          </label>
          <textarea
            value={settings.store?.description || ''}
            onChange={(e) => handleChange('store.description', e.target.value)}
            className="input w-full"
            rows={3}
            placeholder="Brief description of your store"
          />
        </div>

        {/* Contact Information */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Contact Information</h3>
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Email *
                </label>
                <input
                  type="email"
                  value={settings.store?.contactEmail || ''}
                  onChange={(e) => handleChange('store.contactEmail', e.target.value)}
                  className="input w-full"
                  placeholder="contact@store.com"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Contact Phone *
                </label>
                <input
                  type="tel"
                  value={settings.store?.contactPhone || ''}
                  onChange={(e) => handleChange('store.contactPhone', e.target.value)}
                  className="input w-full"
                  placeholder="+92 300 1234567"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                WhatsApp Number
              </label>
              <input
                type="tel"
                value={settings.store?.whatsappNumber || ''}
                onChange={(e) => handleChange('store.whatsappNumber', e.target.value)}
                className="input w-full"
                placeholder="+92 300 1234567"
              />
            </div>
          </div>
        </div>

        {/* Address */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Store Address</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Street Address
              </label>
              <input
                type="text"
                value={settings.store?.address?.street || ''}
                onChange={(e) => handleChange('store.address.street', e.target.value)}
                className="input w-full"
                placeholder="123 Main Street"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Area
                </label>
                <input
                  type="text"
                  value={settings.store?.address?.area || ''}
                  onChange={(e) => handleChange('store.address.area', e.target.value)}
                  className="input w-full"
                  placeholder="Downtown"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  City
                </label>
                <input
                  type="text"
                  value={settings.store?.address?.city || ''}
                  onChange={(e) => handleChange('store.address.city', e.target.value)}
                  className="input w-full"
                  placeholder="Karachi"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  State/Province
                </label>
                <input
                  type="text"
                  value={settings.store?.address?.state || ''}
                  onChange={(e) => handleChange('store.address.state', e.target.value)}
                  className="input w-full"
                  placeholder="Sindh"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Country
                </label>
                <input
                  type="text"
                  value={settings.store?.address?.country || 'Pakistan'}
                  onChange={(e) => handleChange('store.address.country', e.target.value)}
                  className="input w-full"
                  placeholder="Pakistan"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Postal Code
                </label>
                <input
                  type="text"
                  value={settings.store?.address?.postalCode || ''}
                  onChange={(e) => handleChange('store.address.postalCode', e.target.value)}
                  className="input w-full"
                  placeholder="75500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Maintenance Mode */}
        <div className="border-t pt-5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-medium text-gray-900">Maintenance Mode</h3>
              <p className="text-sm text-gray-500">Temporarily disable the storefront</p>
            </div>
            <button
              onClick={() => handleChange('store.maintenance.enabled', !settings.store?.maintenance?.enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.store?.maintenance?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.store?.maintenance?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Payment Settings Component
function PaymentSettings({ settings, onChange }: any) {
  const handleChange = (field: string, value: any) => {
    const updated = { ...settings };
    const keys = field.split('.');
    
    if (keys.length === 1) {
      updated[field] = value;
    } else if (keys.length === 2) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      updated[keys[0]][keys[1]] = value;
    } else if (keys.length === 3) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
      updated[keys[0]][keys[1]][keys[2]] = value;
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Payment Settings</h2>
        <p className="text-sm text-gray-600">Configure payment methods and gateways</p>
      </div>

      <div className="space-y-6">
        {/* Cash on Delivery */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Cash on Delivery (COD)</h3>
              <p className="text-sm text-gray-500">Allow customers to pay upon delivery</p>
            </div>
            <button
              onClick={() => handleChange('methods.cashOnDelivery.enabled', !settings.methods?.cashOnDelivery?.enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.methods?.cashOnDelivery?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.methods?.cashOnDelivery?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>

        {/* Stripe */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Stripe</h3>
              <p className="text-sm text-gray-500">Accept credit and debit card payments</p>
            </div>
            <button
              onClick={() => handleChange('methods.stripe.enabled', !settings.methods?.stripe?.enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.methods?.stripe?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.methods?.stripe?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {settings.methods?.stripe?.enabled && (
            <div className="space-y-3 mt-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Publishable Key
                </label>
                <input
                  type="text"
                  value={settings.methods?.stripe?.publishableKey || ''}
                  onChange={(e) => handleChange('methods.stripe.publishableKey', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="pk_test_..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Secret Key
                </label>
                <input
                  type="password"
                  value={settings.methods?.stripe?.secretKey || ''}
                  onChange={(e) => handleChange('methods.stripe.secretKey', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="sk_test_..."
                />
              </div>
            </div>
          )}
        </div>

        {/* PayPal */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">PayPal</h3>
              <p className="text-sm text-gray-500">Accept PayPal payments</p>
            </div>
            <button
              onClick={() => handleChange('methods.paypal.enabled', !settings.methods?.paypal?.enabled)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.methods?.paypal?.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.methods?.paypal?.enabled ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {settings.methods?.paypal?.enabled && (
            <div className="space-y-3 mt-4 pt-4 border-t">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Client ID
                </label>
                <input
                  type="text"
                  value={settings.methods?.paypal?.clientId || ''}
                  onChange={(e) => handleChange('methods.paypal.clientId', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="AYSq3RDGsmBLJE..."
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Secret
                </label>
                <input
                  type="password"
                  value={settings.methods?.paypal?.clientSecret || ''}
                  onChange={(e) => handleChange('methods.paypal.clientSecret', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="EGnHDxD_qRPdaL..."
                />
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// Invoice Settings Component
function InvoiceSettings({ settings, onChange }: any) {
  const handleChange = (field: string, value: any) => {
    const updated = { ...settings };
    const keys = field.split('.');
    
    if (keys.length === 1) {
      updated[field] = value;
    } else if (keys.length === 2) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      updated[keys[0]][keys[1]] = value;
    } else if (keys.length === 3) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
      updated[keys[0]][keys[1]][keys[2]] = value;
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Invoice Settings</h2>
        <p className="text-sm text-gray-600">Configure invoice generation and display settings</p>
      </div>

      <div className="space-y-5">
        {/* Invoice Numbering */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Invoice Prefix
            </label>
            <input
              type="text"
              value={settings.invoicePrefix}
              onChange={(e) => handleChange('invoicePrefix', e.target.value)}
              className="input w-full"
              placeholder="INV"
            />
            <p className="text-xs text-gray-500 mt-1">e.g., INV-001</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Starting Number
            </label>
            <input
              type="number"
              value={settings.invoiceNumberStart}
              onChange={(e) => handleChange('invoiceNumberStart', parseInt(e.target.value) || 1000)}
              className="input w-full"
              placeholder="1000"
            />
            <p className="text-xs text-gray-500 mt-1">First invoice number</p>
          </div>
        </div>

        {/* Company Information */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Company Information</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Name *
              </label>
              <input
                type="text"
                value={settings.companyName}
                onChange={(e) => handleChange('companyName', e.target.value)}
                className="input w-full"
                placeholder="Your Company Name"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Address
              </label>
              <textarea
                value={settings.companyAddress}
                onChange={(e) => handleChange('companyAddress', e.target.value)}
                className="input w-full"
                rows={2}
                placeholder="Full company address"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Phone
                </label>
                <input
                  type="tel"
                  value={settings.companyPhone}
                  onChange={(e) => handleChange('companyPhone', e.target.value)}
                  className="input w-full"
                  placeholder="+92 300 1234567"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Email
                </label>
                <input
                  type="email"
                  value={settings.companyEmail}
                  onChange={(e) => handleChange('companyEmail', e.target.value)}
                  className="input w-full"
                  placeholder="info@company.com"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Tax Settings */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Tax Settings</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tax Registration Number
              </label>
              <input
                type="text"
                value={settings.taxNumber}
                onChange={(e) => handleChange('taxNumber', e.target.value)}
                className="input w-full"
                placeholder="Tax ID / NTN"
              />
            </div>

            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-sm font-medium text-gray-900">Show Tax on Invoice</h3>
                <p className="text-sm text-gray-500">Display tax calculation</p>
              </div>
              <button
                onClick={() => handleChange('showTax', !settings.showTax)}
                className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                  settings.showTax ? 'bg-primary-600' : 'bg-gray-200'
                }`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                    settings.showTax ? 'translate-x-5' : 'translate-x-0'
                  }`}
                />
              </button>
            </div>

            {settings.showTax && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tax Rate (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={settings.taxRate}
                  onChange={(e) => handleChange('taxRate', parseFloat(e.target.value) || 0)}
                  className="input w-full"
                  placeholder="0.00"
                />
              </div>
            )}
          </div>
        </div>

        {/* Invoice Notes */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Invoice Footer</h3>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Invoice Notes
              </label>
              <textarea
                value={settings.invoiceNotes}
                onChange={(e) => handleChange('invoiceNotes', e.target.value)}
                className="input w-full"
                rows={2}
                placeholder="Thank you message"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Terms & Conditions
              </label>
              <textarea
                value={settings.termsAndConditions}
                onChange={(e) => handleChange('termsAndConditions', e.target.value)}
                className="input w-full"
                rows={3}
                placeholder="Payment terms, return policy, etc."
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Shipping Settings Component
function ShippingSettings({ settings, onChange }: any) {
  const handleChange = (field: string, value: any) => {
    const updated = { ...settings };
    const keys = field.split('.');
    
    if (keys.length === 1) {
      updated[field] = value;
    } else if (keys.length === 2) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      updated[keys[0]][keys[1]] = value;
    } else if (keys.length === 3) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
      updated[keys[0]][keys[1]][keys[2]] = value;
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Shipping Settings</h2>
        <p className="text-sm text-gray-600">Configure shipping methods and rates</p>
      </div>

      <div className="space-y-6">
        {/* Free Shipping */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Free Shipping</h3>
              <p className="text-sm text-gray-500">Offer free shipping for orders above threshold</p>
            </div>
            <button
              onClick={() => handleChange('enableFreeShipping', !settings.enableFreeShipping)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.enableFreeShipping ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.enableFreeShipping ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {settings.enableFreeShipping && (
            <div className="mt-4 pt-4 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Minimum Order Amount (PKR)
              </label>
              <input
                type="number"
                value={settings.freeShippingThreshold}
                onChange={(e) => handleChange('freeShippingThreshold', parseInt(e.target.value) || 0)}
                className="input w-full text-sm"
                placeholder="5000"
              />
            </div>
          )}
        </div>

        {/* Flat Rate Shipping */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Flat Rate Shipping</h3>
              <p className="text-sm text-gray-500">Charge a fixed shipping fee</p>
            </div>
            <button
              onClick={() => handleChange('flatRateShipping', !settings.flatRateShipping)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.flatRateShipping ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.flatRateShipping ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
          {settings.flatRateShipping && (
            <div className="mt-4 pt-4 border-t">
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Shipping Fee (PKR)
              </label>
              <input
                type="number"
                value={settings.flatRatePrice}
                onChange={(e) => handleChange('flatRatePrice', parseInt(e.target.value) || 0)}
                className="input w-full text-sm"
                placeholder="150"
              />
            </div>
          )}
        </div>

        {/* Local Pickup */}
        <div className="border rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-sm font-semibold text-gray-900">Local Pickup</h3>
              <p className="text-sm text-gray-500">Allow customers to pick up orders</p>
            </div>
            <button
              onClick={() => handleChange('enableLocalPickup', !settings.enableLocalPickup)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                settings.enableLocalPickup ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow transition duration-200 ${
                  settings.enableLocalPickup ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// Email Settings Component
function EmailSettings({ settings, onChange }: any) {
  const handleChange = (field: string, value: any) => {
    const updated = { ...settings };
    const keys = field.split('.');
    
    if (keys.length === 1) {
      updated[field] = value;
    } else if (keys.length === 2) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      updated[keys[0]][keys[1]] = value;
    } else if (keys.length === 3) {
      if (!updated[keys[0]]) updated[keys[0]] = {};
      if (!updated[keys[0]][keys[1]]) updated[keys[0]][keys[1]] = {};
      updated[keys[0]][keys[1]][keys[2]] = value;
    }
    
    onChange(updated);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-bold text-gray-900 mb-1">Email Settings</h2>
        <p className="text-sm text-gray-600">Configure email provider and notifications</p>
      </div>

      <div className="space-y-5">
        {/* Email Provider */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Email Provider
          </label>
          <select
            value={settings.provider || 'smtp'}
            onChange={(e) => handleChange('provider', e.target.value)}
            className="input w-full"
          >
            <option value="smtp">SMTP</option>
            <option value="sendgrid">SendGrid</option>
            <option value="mailgun">Mailgun</option>
          </select>
        </div>

        {/* From Email & Name */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Email *
            </label>
            <input
              type="email"
              value={settings.fromEmail || ''}
              onChange={(e) => handleChange('fromEmail', e.target.value)}
              className="input w-full"
              placeholder="noreply@store.com"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              From Name
            </label>
            <input
              type="text"
              value={settings.fromName || ''}
              onChange={(e) => handleChange('fromName', e.target.value)}
              className="input w-full"
              placeholder="My Store"
            />
          </div>
        </div>

        {/* SMTP Settings */}
        {settings.provider === 'smtp' && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">SMTP Configuration</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  SMTP Host
                </label>
                <input
                  type="text"
                  value={settings.smtp?.host || ''}
                  onChange={(e) => handleChange('smtp.host', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="smtp.gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Port
                </label>
                <input
                  type="number"
                  value={settings.smtp?.port || 587}
                  onChange={(e) => handleChange('smtp.port', parseInt(e.target.value))}
                  className="input w-full text-sm"
                  placeholder="587"
                />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Username
                </label>
                <input
                  type="text"
                  value={settings.smtp?.user || ''}
                  onChange={(e) => handleChange('smtp.user', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="your-email@gmail.com"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 mb-1">
                  Password
                </label>
                <input
                  type="password"
                  value={settings.smtp?.password || ''}
                  onChange={(e) => handleChange('smtp.password', e.target.value)}
                  className="input w-full text-sm"
                  placeholder="••••••••"
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={settings.smtp?.secure || false}
                onChange={(e) => handleChange('smtp.secure', e.target.checked)}
                className="rounded border-gray-300"
              />
              <label className="text-sm text-gray-700">Use SSL/TLS</label>
            </div>
          </div>
        )}

        {/* SendGrid Settings */}
        {settings.provider === 'sendgrid' && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">SendGrid Configuration</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.sendgrid?.apiKey || ''}
                onChange={(e) => handleChange('sendgrid.apiKey', e.target.value)}
                className="input w-full text-sm"
                placeholder="SG.••••••••"
              />
            </div>
          </div>
        )}

        {/* Mailgun Settings */}
        {settings.provider === 'mailgun' && (
          <div className="border rounded-lg p-4 space-y-4">
            <h3 className="text-sm font-semibold text-gray-900">Mailgun Configuration</h3>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Domain
              </label>
              <input
                type="text"
                value={settings.mailgun?.domain || ''}
                onChange={(e) => handleChange('mailgun.domain', e.target.value)}
                className="input w-full text-sm"
                placeholder="mg.yourdomain.com"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                API Key
              </label>
              <input
                type="password"
                value={settings.mailgun?.apiKey || ''}
                onChange={(e) => handleChange('mailgun.apiKey', e.target.value)}
                className="input w-full text-sm"
                placeholder="key-••••••••"
              />
            </div>
          </div>
        )}

        {/* Email Notifications */}
        <div className="border-t pt-5">
          <h3 className="text-sm font-semibold text-gray-900 mb-4">Email Notifications</h3>
          <div className="space-y-3">
            {[
              { key: 'orderPlaced', label: 'Order Placed' },
              { key: 'orderConfirmed', label: 'Order Confirmed' },
              { key: 'orderShipped', label: 'Order Shipped' },
              { key: 'orderDelivered', label: 'Order Delivered' },
              { key: 'orderCancelled', label: 'Order Cancelled' },
              { key: 'lowStockAlert', label: 'Low Stock Alert' },
              { key: 'newReview', label: 'New Review' },
            ].map((notification) => (
              <div key={notification.key} className="flex items-center justify-between py-2">
                <span className="text-sm text-gray-700">{notification.label}</span>
                <button
                  onClick={() => handleChange(`notifications.${notification.key}`, !settings.notifications?.[notification.key])}
                  className={`relative inline-flex h-5 w-9 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
                    settings.notifications?.[notification.key] ? 'bg-primary-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow transition duration-200 ${
                      settings.notifications?.[notification.key] ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin'])),
    },
  };
};

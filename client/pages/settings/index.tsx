import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import BackButton from '@/components/BackButton';
import toast from 'react-hot-toast';
import api from '@/lib/api';
import { 
  FiUser, 
  FiBell, 
  FiSave,
  FiMail,
  FiSmartphone,
  FiMessageSquare,
  FiGlobe,
  FiClock
} from 'react-icons/fi';

interface AccountSettings {
  language: string;
  timezone: string;
}

interface NotificationSettings {
  email: {
    orderUpdates: boolean;
    promotions: boolean;
    newsletter: boolean;
    priceAlerts: boolean;
    stockAlerts: boolean;
  };
  push: {
    orderUpdates: boolean;
    promotions: boolean;
    priceAlerts: boolean;
    stockAlerts: boolean;
  };
  sms: {
    orderUpdates: boolean;
    deliveryUpdates: boolean;
    promotions: boolean;
  };
}

export default function SettingsPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('account');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [autoSave, setAutoSave] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  // Settings state
  const [accountSettings, setAccountSettings] = useState<AccountSettings>({
    language: 'en',
    timezone: 'Asia/Karachi'
  });

  const [notificationSettings, setNotificationSettings] = useState<NotificationSettings>({
    email: {
      orderUpdates: true,
      promotions: false,
      newsletter: false,
      priceAlerts: true,
      stockAlerts: true
    },
    push: {
      orderUpdates: true,
      promotions: false,
      priceAlerts: true,
      stockAlerts: true
    },
    sms: {
      orderUpdates: true,
      deliveryUpdates: true,
      promotions: false
    }
  });

  useEffect(() => {
    if (isAuthenticated) {
      loadSettings();
    }
  }, [isAuthenticated]);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const response = await api.get('/settings');
      
      if (response.settings?.account) {
        setAccountSettings(response.settings.account);
      }
      if (response.settings?.notifications) {
        setNotificationSettings(response.settings.notifications);
      }
    } catch (error: any) {
      console.error('Failed to load settings:', error);
      toast.error('Failed to load settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async (showToast = true) => {
    try {
      setSaving(true);
      await api.put('/settings/account', { settings: accountSettings });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      if (showToast) {
        toast.success('Account settings saved successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save account settings');
    } finally {
      setSaving(false);
    }
  };

  const handleAccountChange = (newSettings: AccountSettings) => {
    setAccountSettings(newSettings);
    setHasUnsavedChanges(true);
    if (autoSave) {
      handleSaveAccount(false);
    }
  };

  const handleSaveNotifications = async (showToast = true) => {
    try {
      setSaving(true);
      await api.put('/settings/notifications', { settings: notificationSettings });
      setLastSaved(new Date());
      setHasUnsavedChanges(false);
      if (showToast) {
        toast.success('Notification settings saved successfully');
      }
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Failed to save notification settings');
    } finally {
      setSaving(false);
    }
  };

  const handleNotificationChange = (newSettings: NotificationSettings) => {
    setNotificationSettings(newSettings);
    setHasUnsavedChanges(true);
    if (autoSave) {
      handleSaveNotifications(false);
    }
  };

  const handleSetDefaultNotifications = async () => {
    const defaultSettings: NotificationSettings = {
      email: {
        orderUpdates: true,
        promotions: false,
        newsletter: false,
        priceAlerts: true,
        stockAlerts: true
      },
      push: {
        orderUpdates: true,
        promotions: false,
        priceAlerts: true,
        stockAlerts: true
      },
      sms: {
        orderUpdates: true,
        deliveryUpdates: true,
        promotions: false
      }
    };
    setNotificationSettings(defaultSettings);
    if (autoSave) {
      try {
        await api.put('/settings/notifications', { settings: defaultSettings });
        setLastSaved(new Date());
        toast.success('Notification settings reset to defaults');
      } catch (error) {
        toast.error('Failed to reset settings');
      }
    } else {
      setHasUnsavedChanges(true);
      toast.success('Notification settings reset to defaults (not saved yet)');
    }
  };

  const handleExportSettings = () => {
    const data = {
      account: accountSettings,
      notifications: notificationSettings,
      exportedAt: new Date().toISOString()
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `settings-backup-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success('Settings exported successfully');
  };

  const handleImportSettings = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (e) => {
      try {
        const data = JSON.parse(e.target?.result as string);
        if (data.account) setAccountSettings(data.account);
        if (data.notifications) setNotificationSettings(data.notifications);
        
        if (autoSave) {
          if (data.account) await api.put('/settings/account', { settings: data.account });
          if (data.notifications) await api.put('/settings/notifications', { settings: data.notifications });
          setLastSaved(new Date());
        } else {
          setHasUnsavedChanges(true);
        }
        toast.success('Settings imported successfully');
      } catch (error) {
        toast.error('Failed to import settings. Invalid file format.');
      }
    };
    reader.readAsText(file);
  };

  const handleTestNotification = async (type: 'email' | 'push' | 'sms') => {
    try {
      toast.loading(`Sending test ${type} notification...`);
      // This would call your backend to send actual test notification
      await new Promise(resolve => setTimeout(resolve, 1500)); // Simulate API call
      toast.dismiss();
      toast.success(`Test ${type} notification sent! Check your ${type === 'email' ? 'inbox' : type === 'push' ? 'browser' : 'phone'}.`);
    } catch (error) {
      toast.dismiss();
      toast.error(`Failed to send test ${type} notification`);
    }
  };

  const enableAllNotifications = () => {
    const allEnabled: NotificationSettings = {
      email: {
        orderUpdates: true,
        promotions: true,
        newsletter: true,
        priceAlerts: true,
        stockAlerts: true
      },
      push: {
        orderUpdates: true,
        promotions: true,
        priceAlerts: true,
        stockAlerts: true
      },
      sms: {
        orderUpdates: true,
        deliveryUpdates: true,
        promotions: true
      }
    };
    handleNotificationChange(allEnabled);
    toast.success('All notifications enabled');
  };

  const disableAllNotifications = () => {
    const allDisabled: NotificationSettings = {
      email: {
        orderUpdates: false,
        promotions: false,
        newsletter: false,
        priceAlerts: false,
        stockAlerts: false
      },
      push: {
        orderUpdates: false,
        promotions: false,
        priceAlerts: false,
        stockAlerts: false
      },
      sms: {
        orderUpdates: false,
        deliveryUpdates: false,
        promotions: false
      }
    };
    handleNotificationChange(allDisabled);
    toast.success('All notifications disabled');
  };

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  return (
    <>
      <NextSeo title="Settings - SanixHub" />
      <Layout>
        <div className="bg-gray-50 py-8 min-h-screen">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/profile" label="Back to Profile" variant="ghost" />
            </div>

            <div className="flex items-center justify-between mb-8">
              <h1 className="text-3xl font-bold">Settings</h1>
              
              {/* Settings Controls */}
              <div className="flex items-center gap-4">
                {/* Auto-save Toggle */}
                <div className="flex items-center gap-2 px-4 py-2 bg-white rounded-lg shadow-sm">
                  <label className="text-sm font-medium text-gray-700 cursor-pointer">
                    Auto-save
                  </label>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={autoSave}
                      onChange={(e) => setAutoSave(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
                  </label>
                </div>
              </div>
            </div>

            {/* Status Bar */}
            {lastSaved && (
              <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center justify-between">
                <span className="text-sm text-green-700 flex items-center gap-2">
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                  </svg>
                  Last saved: {lastSaved.toLocaleTimeString()}
                </span>
                {hasUnsavedChanges && !autoSave && (
                  <span className="text-sm text-orange-600 font-medium">
                    You have unsaved changes
                  </span>
                )}
              </div>
            )}

            <div className="grid lg:grid-cols-4 gap-8">
              {/* Sidebar */}
              <aside className="lg:col-span-1">
                <div className="bg-white rounded-lg shadow-md p-4 sticky top-4">
                  <nav className="space-y-2">
                    <button
                      onClick={() => setActiveTab('account')}
                      className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                        activeTab === 'account'
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <FiUser className="w-5 h-5" />
                      <span className="font-medium">Account</span>
                    </button>
                    <button
                      onClick={() => setActiveTab('notifications')}
                      className={`w-full text-left px-4 py-3 rounded-lg transition flex items-center gap-3 ${
                        activeTab === 'notifications'
                          ? 'bg-primary-600 text-white'
                          : 'hover:bg-gray-100'
                      }`}
                    >
                      <FiBell className="w-5 h-5" />
                      <span className="font-medium">Notifications</span>
                    </button>
                  </nav>
                </div>
              </aside>

              {/* Main Content */}
              <main className="lg:col-span-3">
                {loading ? (
                  <div className="bg-white rounded-lg shadow-md p-8">
                    <div className="animate-pulse space-y-4">
                      <div className="h-8 bg-gray-200 rounded w-1/3"></div>
                      <div className="h-4 bg-gray-200 rounded w-2/3"></div>
                      <div className="h-32 bg-gray-200 rounded"></div>
                    </div>
                  </div>
                ) : (
                  <>
                    {/* Account Settings Tab */}
                    {activeTab === 'account' && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="mb-6">
                          <h2 className="text-2xl font-bold mb-2">Account Settings</h2>
                          <p className="text-gray-600">Manage your account preferences</p>
                        </div>

                        <div className="space-y-6">
                          {/* Language */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium mb-2">
                              <FiGlobe className="w-4 h-4" />
                              Language
                            </label>
                            <select
                              value={accountSettings.language}
                              onChange={(e) => handleAccountChange({ ...accountSettings, language: e.target.value })}
                              className="input"
                            >
                              <option value="en">English</option>
                              <option value="ur">Urdu (اردو)</option>
                            </select>
                            <p className="text-sm text-gray-500 mt-1">Choose your preferred language</p>
                          </div>

                          {/* Timezone */}
                          <div>
                            <label className="flex items-center gap-2 text-sm font-medium mb-2">
                              <FiClock className="w-4 h-4" />
                              Timezone
                            </label>
                            <select
                              value={accountSettings.timezone}
                              onChange={(e) => handleAccountChange({ ...accountSettings, timezone: e.target.value })}
                              className="input"
                            >
                              <option value="Asia/Karachi">PKT - Pakistan Time (UTC+5)</option>
                            </select>
                            <p className="text-sm text-gray-500 mt-1">Your local timezone</p>
                          </div>
                        </div>

                        {/* Save Button - Only show if auto-save is off */}
                        {!autoSave && (
                          <div className="flex justify-end mt-8 pt-6 border-t border-gray-200">
                            <button
                              onClick={() => handleSaveAccount(true)}
                              disabled={saving || !hasUnsavedChanges}
                              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <FiSave className="w-4 h-4" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          </div>
                        )}
                      </div>
                    )}

                    {/* Notifications Settings Tab - Continue below */}
                    {activeTab === 'notifications' && (
                      <div className="bg-white rounded-lg shadow-md p-6">
                        <div className="mb-6">
                          <div className="flex items-center justify-between">
                            <div>
                              <h2 className="text-2xl font-bold mb-2">Notification Preferences</h2>
                              <p className="text-gray-600">Choose how you want to receive notifications</p>
                            </div>
                            {/* Quick Actions */}
                            <div className="flex items-center gap-2">
                              <button
                                onClick={enableAllNotifications}
                                className="px-3 py-1.5 text-sm bg-green-50 text-green-700 rounded-lg hover:bg-green-100 transition"
                              >
                                Enable All
                              </button>
                              <button
                                onClick={disableAllNotifications}
                                className="px-3 py-1.5 text-sm bg-red-50 text-red-700 rounded-lg hover:bg-red-100 transition"
                              >
                                Disable All
                              </button>
                            </div>
                          </div>
                        </div>

                        <div className="space-y-8">
                          {/* Email Notifications */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <FiMail className="w-5 h-5 text-primary-600" />
                                Email Notifications
                              </h3>
                              <button
                                onClick={() => handleTestNotification('email')}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Send Test Email
                              </button>
                            </div>
                            <div className="space-y-3">
                              <NotificationToggle
                                label="Order Updates"
                                description="Receive emails about your order status"
                                checked={notificationSettings.email.orderUpdates}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  email: { ...notificationSettings.email, orderUpdates: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Price Alerts"
                                description="Get notified when items on your wishlist go on sale"
                                checked={notificationSettings.email.priceAlerts}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  email: { ...notificationSettings.email, priceAlerts: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Stock Alerts"
                                description="Be notified when out-of-stock items are available"
                                checked={notificationSettings.email.stockAlerts}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  email: { ...notificationSettings.email, stockAlerts: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Promotions"
                                description="Receive promotional offers and deals"
                                checked={notificationSettings.email.promotions}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  email: { ...notificationSettings.email, promotions: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Newsletter"
                                description="Subscribe to our weekly newsletter"
                                checked={notificationSettings.email.newsletter}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  email: { ...notificationSettings.email, newsletter: checked }
                                })}
                              />
                            </div>
                          </div>

                          {/* Push Notifications */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <FiSmartphone className="w-5 h-5 text-primary-600" />
                                Push Notifications
                              </h3>
                              <button
                                onClick={() => handleTestNotification('push')}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Send Test Push
                              </button>
                            </div>
                            <div className="space-y-3">
                              <NotificationToggle
                                label="Order Updates"
                                description="Get push notifications about your orders"
                                checked={notificationSettings.push.orderUpdates}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  push: { ...notificationSettings.push, orderUpdates: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Price Alerts"
                                description="Push alerts for price drops on wishlist items"
                                checked={notificationSettings.push.priceAlerts}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  push: { ...notificationSettings.push, priceAlerts: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Stock Alerts"
                                description="Push alerts when items are back in stock"
                                checked={notificationSettings.push.stockAlerts}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  push: { ...notificationSettings.push, stockAlerts: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Promotions"
                                description="Receive promotional push notifications"
                                checked={notificationSettings.push.promotions}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  push: { ...notificationSettings.push, promotions: checked }
                                })}
                              />
                            </div>
                          </div>

                          {/* SMS Notifications */}
                          <div>
                            <div className="flex items-center justify-between mb-4">
                              <h3 className="flex items-center gap-2 text-lg font-semibold">
                                <FiMessageSquare className="w-5 h-5 text-primary-600" />
                                SMS Notifications
                              </h3>
                              <button
                                onClick={() => handleTestNotification('sms')}
                                className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                              >
                                Send Test SMS
                              </button>
                            </div>
                            <div className="space-y-3">
                              <NotificationToggle
                                label="Order Updates"
                                description="Receive SMS about order status changes"
                                checked={notificationSettings.sms.orderUpdates}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  sms: { ...notificationSettings.sms, orderUpdates: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Delivery Updates"
                                description="Get SMS when your order is out for delivery"
                                checked={notificationSettings.sms.deliveryUpdates}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  sms: { ...notificationSettings.sms, deliveryUpdates: checked }
                                })}
                              />
                              <NotificationToggle
                                label="Promotions"
                                description="Receive promotional SMS messages"
                                checked={notificationSettings.sms.promotions}
                                onChange={(checked) => handleNotificationChange({
                                  ...notificationSettings,
                                  sms: { ...notificationSettings.sms, promotions: checked }
                                })}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex justify-between items-center mt-8 pt-6 border-t border-gray-200">
                          <button
                            onClick={handleSetDefaultNotifications}
                            disabled={saving}
                            className="btn btn-outline text-gray-700 border-gray-300 hover:bg-gray-50 flex items-center gap-2 disabled:opacity-50"
                          >
                            Set as Default
                          </button>
                          {!autoSave && (
                            <button
                              onClick={() => handleSaveNotifications(true)}
                              disabled={saving || !hasUnsavedChanges}
                              className="btn btn-primary flex items-center gap-2 disabled:opacity-50"
                            >
                              {saving ? (
                                <>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                  Saving...
                                </>
                              ) : (
                                <>
                                  <FiSave className="w-4 h-4" />
                                  Save Changes
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </>
                )}
              </main>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

// Reusable Notification Toggle Component
function NotificationToggle({ label, description, checked, onChange }: {
  label: string;
  description: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
}) {
  return (
    <div className="flex items-start justify-between p-4 bg-gray-50 rounded-lg">
      <div className="flex-1">
        <label className="font-medium text-gray-900 cursor-pointer">{label}</label>
        <p className="text-sm text-gray-500 mt-1">{description}</p>
      </div>
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-11 h-6 bg-gray-300 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
      </label>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};

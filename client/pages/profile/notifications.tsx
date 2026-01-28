import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import Head from 'next/head';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationPreferencesStore, shouldPlaySound, getSoundFilePath } from '@/store/useNotificationPreferencesStore';
import { notificationPreferencesAPI } from '@/lib/notificationPreferencesAPI';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { 
  FiBell, 
  FiMail, 
  FiSmartphone, 
  FiVolume2, 
  FiVolumeX,
  FiMoon,
  FiSun,
  FiCheck,
  FiX,
  FiRefreshCw,
  FiSave,
  FiPlay
} from 'react-icons/fi';
import { motion } from 'framer-motion';

const NotificationsSettingsPage = () => {
  const { isAuthenticated, user, isInitialized } = useAuthStore();
  const { 
    preferences, 
    setPreferences, 
    updateChannel, 
    updateSound,
    updateDoNotDisturb,
    toggleNotification,
    setLoading,
    setSyncing,
    resetToDefaults,
    isLoading,
    isSyncing
  } = useNotificationPreferencesStore();

  const [hasChanges, setHasChanges] = useState(false);
  const [activeTab, setActiveTab] = useState<'email' | 'inApp' | 'push' | 'sound' | 'dnd'>('inApp');
  const socket = getSocket();

  // Load preferences on mount
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      loadPreferences();
      subscribeToUpdates();
    }
  }, [isAuthenticated, isInitialized]);

  const loadPreferences = async () => {
    setLoading(true);
    try {
      const response = await notificationPreferencesAPI.getPreferences();
      setPreferences(response.data.preferences);
      setHasChanges(false);
    } catch (error: any) {
      toast.error('Failed to load notification preferences');
      console.error('Error loading preferences:', error);
    } finally {
      setLoading(false);
    }
  };

  const subscribeToUpdates = () => {
    if (!socket) return;

    socket.on('notifications:preferences-updated', (data: any) => {
      console.log('🔔 Preferences updated via WebSocket:', data);
      setPreferences(data.preferences);
      setHasChanges(false);
    });

    socket.on('notifications:sound-updated', (data: any) => {
      console.log('🔊 Sound settings updated via WebSocket:', data);
      if (preferences) {
        updateSound(data.sound);
      }
    });

    return () => {
      socket.off('notifications:preferences-updated');
      socket.off('notifications:sound-updated');
    };
  };

  const handleSavePreferences = async () => {
    if (!preferences) return;

    setSyncing(true);
    try {
      await notificationPreferencesAPI.updatePreferences(preferences);
      toast.success('Preferences saved successfully!', { icon: '✅' });
      setHasChanges(false);
    } catch (error: any) {
      toast.error('Failed to save preferences');
      console.error('Error saving preferences:', error);
    } finally {
      setSyncing(false);
    }
  };

  const handleToggle = (channel: 'email' | 'inApp' | 'push', type: string) => {
    toggleNotification(channel, type);
    setHasChanges(true);
  };

  const handleChannelToggle = (channel: 'email' | 'inApp' | 'push') => {
    if (!preferences) return;
    updateChannel(channel, { enabled: !preferences[channel].enabled });
    setHasChanges(true);
  };

  const handleSoundToggle = () => {
    if (!preferences) return;
    updateSound({ enabled: !preferences.sound.enabled });
    setHasChanges(true);
  };

  const handleVolumeChange = (volume: number) => {
    updateSound({ volume });
    setHasChanges(true);
  };

  const handleSoundTypeChange = (soundType: string) => {
    updateSound({ soundType: soundType as any });
    setHasChanges(true);
  };

  const handleDNDToggle = () => {
    if (!preferences) return;
    updateDoNotDisturb({ enabled: !preferences.doNotDisturb.enabled });
    setHasChanges(true);
  };

  const handleDNDTimeChange = (field: 'startTime' | 'endTime', value: string) => {
    updateDoNotDisturb({ [field]: value });
    setHasChanges(true);
  };

  const handleTestSound = async () => {
    if (!preferences) return;

    if (shouldPlaySound(preferences)) {
      try {
        const soundPath = getSoundFilePath(preferences.sound.soundType);
        const audio = new Audio(soundPath);
        audio.volume = preferences.sound.volume;
        await audio.play();
        toast.success('Playing notification sound', { icon: '🔊' });
      } catch (error) {
        toast.error('Could not play sound. Make sure sound files are available.');
      }
    } else {
      toast('Sound is disabled or Do Not Disturb is active', { icon: '🔕' });
    }
  };

  const handleTestNotification = async () => {
    try {
      await notificationPreferencesAPI.testNotification('orderStatusUpdate', 'inApp');
      toast.success('Test notification sent!', { icon: '🔔' });
    } catch (error) {
      toast.error('Failed to send test notification');
    }
  };

  const handleReset = async () => {
    if (!confirm('Are you sure you want to reset all notification preferences to defaults?')) {
      return;
    }

    setSyncing(true);
    try {
      await notificationPreferencesAPI.resetPreferences();
      await loadPreferences();
      toast.success('Preferences reset to defaults', { icon: '🔄' });
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to reset preferences');
    } finally {
      setSyncing(false);
    }
  };

  if (!isAuthenticated) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <FiBell className="w-16 h-16 mx-auto text-gray-400 mb-4" />
            <h2 className="text-2xl font-bold mb-2">Login Required</h2>
            <p className="text-gray-600">Please login to manage notification preferences</p>
          </div>
        </div>
      </Layout>
    );
  }

  if (isLoading || !preferences) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading preferences...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <Head>
        <title>Notification Preferences - SanixHub</title>
      </Head>

      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-6xl mx-auto px-4">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                  <FiBell className="text-primary-600" />
                  Notification Preferences
                </h1>
                <p className="text-gray-600 mt-2">
                  Customize how and when you receive notifications
                </p>
              </div>
              
              <div className="flex gap-3">
                <button
                  onClick={handleTestNotification}
                  className="btn btn-outline flex items-center gap-2"
                >
                  <FiBell className="w-4 h-4" />
                  Test Notification
                </button>
                
                {hasChanges && (
                  <motion.button
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    onClick={handleSavePreferences}
                    disabled={isSyncing}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isSyncing ? (
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
                  </motion.button>
                )}
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="bg-white rounded-lg shadow-sm mb-6">
            <div className="border-b border-gray-200">
              <nav className="flex -mb-px">
                {[
                  { id: 'inApp', label: 'In-App', icon: FiBell },
                  { id: 'email', label: 'Email', icon: FiMail },
                  { id: 'push', label: 'Push', icon: FiSmartphone },
                  { id: 'sound', label: 'Sound', icon: FiVolume2 },
                  { id: 'dnd', label: 'Do Not Disturb', icon: FiMoon }
                ].map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id as any)}
                      className={`flex-1 flex items-center justify-center gap-2 px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                        activeTab === tab.id
                          ? 'border-primary-600 text-primary-600'
                          : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                      {tab.label}
                    </button>
                  );
                })}
              </nav>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white rounded-lg shadow-sm p-6">
            {/* In-App Notifications Tab */}
            {activeTab === 'inApp' && (
              <NotificationChannelSettings
                channel="inApp"
                channelName="In-App Notifications"
                description="Receive notifications within the application"
                preferences={preferences.inApp}
                onToggle={(type) => handleToggle('inApp', type)}
                onChannelToggle={() => handleChannelToggle('inApp')}
                showTypes={[
                  { key: 'orderPlaced', label: 'Order Placed', description: 'When you place a new order' },
                  { key: 'orderStatusUpdate', label: 'Order Status Updates', description: 'When your order status changes' },
                  { key: 'orderReady', label: 'Order Ready', description: 'When your order is ready for pickup' },
                  { key: 'orderPickedUp', label: 'Order Picked Up', description: 'When you pick up your order' },
                  { key: 'orderCancelled', label: 'Order Cancelled', description: 'When an order is cancelled' },
                  { key: 'wishlistPriceDrop', label: 'Wishlist Price Drop', description: 'When wishlist items go on sale' },
                  { key: 'wishlistBackInStock', label: 'Wishlist Back in Stock', description: 'When wishlist items are restocked' },
                  { key: 'promotions', label: 'Promotions & Offers', description: 'Special deals and promotions' },
                  { key: 'lowStockAlert', label: 'Low Stock Alerts', description: 'When items are running low (Admin)' }
                ]}
              />
            )}

            {/* Email Notifications Tab */}
            {activeTab === 'email' && (
              <NotificationChannelSettings
                channel="email"
                channelName="Email Notifications"
                description="Receive notifications via email"
                preferences={preferences.email}
                onToggle={(type) => handleToggle('email', type)}
                onChannelToggle={() => handleChannelToggle('email')}
                showTypes={[
                  { key: 'orderPlaced', label: 'Order Placed', description: 'Confirmation email when you place an order' },
                  { key: 'orderStatusUpdate', label: 'Order Status Updates', description: 'Email updates on order status' },
                  { key: 'orderReady', label: 'Order Ready', description: 'Email when order is ready' },
                  { key: 'orderPickedUp', label: 'Order Picked Up', description: 'Confirmation email after pickup' },
                  { key: 'orderCancelled', label: 'Order Cancelled', description: 'Email when order is cancelled' },
                  { key: 'wishlistPriceDrop', label: 'Wishlist Price Drop', description: 'Email when wishlist items drop in price' },
                  { key: 'wishlistBackInStock', label: 'Wishlist Back in Stock', description: 'Email when items are back' },
                  { key: 'promotions', label: 'Promotions', description: 'Marketing emails about sales' },
                  { key: 'newsletter', label: 'Newsletter', description: 'Weekly newsletter' }
                ]}
              />
            )}

            {/* Push Notifications Tab */}
            {activeTab === 'push' && (
              <div>
                <NotificationChannelSettings
                  channel="push"
                  channelName="Push Notifications"
                  description="Receive push notifications on your devices (Coming Soon)"
                  preferences={preferences.push}
                  onToggle={(type) => handleToggle('push', type)}
                  onChannelToggle={() => handleChannelToggle('push')}
                  showTypes={[
                    { key: 'orderPlaced', label: 'Order Placed', description: 'Push notification for new orders' },
                    { key: 'orderStatusUpdate', label: 'Order Status Updates', description: 'Push updates on order status' },
                    { key: 'orderReady', label: 'Order Ready', description: 'Push when order is ready' },
                    { key: 'wishlistPriceDrop', label: 'Wishlist Price Drop', description: 'Push for price drops' },
                    { key: 'promotions', label: 'Promotions', description: 'Push for special offers' }
                  ]}
                />
                <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <p className="text-sm text-blue-800">
                    <strong>Coming Soon:</strong> Push notifications will be available in a future update. Configure your preferences now for when this feature launches!
                  </p>
                </div>
              </div>
            )}

            {/* Sound Settings Tab */}
            {activeTab === 'sound' && (
              <SoundSettings
                sound={preferences.sound}
                onToggle={handleSoundToggle}
                onVolumeChange={handleVolumeChange}
                onSoundTypeChange={handleSoundTypeChange}
                onTestSound={handleTestSound}
              />
            )}

            {/* Do Not Disturb Tab */}
            {activeTab === 'dnd' && (
              <DoNotDisturbSettings
                dnd={preferences.doNotDisturb}
                onToggle={handleDNDToggle}
                onTimeChange={handleDNDTimeChange}
              />
            )}
          </div>

          {/* Footer Actions */}
          <div className="mt-6 flex justify-between items-center">
            <button
              onClick={handleReset}
              disabled={isSyncing}
              className="btn btn-outline text-red-600 hover:bg-red-50 flex items-center gap-2"
            >
              <FiRefreshCw className="w-4 h-4" />
              Reset to Defaults
            </button>

            {hasChanges && (
              <p className="text-sm text-gray-600">
                You have unsaved changes
              </p>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
};

// Notification Channel Settings Component
const NotificationChannelSettings = ({ 
  channel, 
  channelName, 
  description, 
  preferences, 
  onToggle, 
  onChannelToggle,
  showTypes 
}: any) => {
  return (
    <div>
      {/* Channel Master Toggle */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200 mb-6">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">{channelName}</h3>
          <p className="text-sm text-gray-600 mt-1">{description}</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={preferences.enabled}
            onChange={onChannelToggle}
            className="sr-only peer"
          />
          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      {/* Individual Notification Types */}
      <div className={`space-y-4 ${!preferences.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {showTypes.map((type: any) => (
          <div key={type.key} className="flex items-center justify-between py-3">
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-900">{type.label}</p>
              <p className="text-xs text-gray-500 mt-0.5">{type.description}</p>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={preferences[type.key] !== false}
                onChange={() => onToggle(type.key)}
                disabled={!preferences.enabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-600"></div>
            </label>
          </div>
        ))}
      </div>
    </div>
  );
};

// Sound Settings Component
const SoundSettings = ({ sound, onToggle, onVolumeChange, onSoundTypeChange, onTestSound }: any) => {
  return (
    <div className="space-y-6">
      {/* Master Sound Toggle */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">Sound Settings</h3>
          <p className="text-sm text-gray-600 mt-1">Configure notification sound preferences</p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={sound.enabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-primary-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-primary-600"></div>
        </label>
      </div>

      <div className={`space-y-6 ${!sound.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Volume Control */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <label className="text-sm font-medium text-gray-900">Volume</label>
            <span className="text-sm text-gray-600">{Math.round(sound.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={sound.volume}
            onChange={(e) => onVolumeChange(parseFloat(e.target.value))}
            disabled={!sound.enabled}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
        </div>

        {/* Sound Type */}
        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Notification Sound</label>
          <div className="grid grid-cols-5 gap-3">
            {['default', 'chime', 'bell', 'ding', 'pop'].map((type) => (
              <button
                key={type}
                onClick={() => onSoundTypeChange(type)}
                disabled={!sound.enabled}
                className={`px-4 py-3 rounded-lg border-2 text-sm font-medium transition-all ${
                  sound.soundType === type
                    ? 'border-primary-600 bg-primary-50 text-primary-700'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                }`}
              >
                {type.charAt(0).toUpperCase() + type.slice(1)}
              </button>
            ))}
          </div>
        </div>

        {/* Test Sound Button */}
        <div>
          <button
            onClick={onTestSound}
            disabled={!sound.enabled}
            className="w-full btn btn-outline flex items-center justify-center gap-2"
          >
            <FiPlay className="w-4 h-4" />
            Test Sound
          </button>
        </div>
      </div>
    </div>
  );
};

// Do Not Disturb Settings Component
const DoNotDisturbSettings = ({ dnd, onToggle, onTimeChange }: any) => {
  return (
    <div className="space-y-6">
      {/* DND Master Toggle */}
      <div className="flex items-center justify-between pb-6 border-b border-gray-200">
        <div>
          <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
            <FiMoon className="text-indigo-600" />
            Do Not Disturb
          </h3>
          <p className="text-sm text-gray-600 mt-1">
            Silence notifications during specific hours
          </p>
        </div>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={dnd.enabled}
            onChange={onToggle}
            className="sr-only peer"
          />
          <div className="w-14 h-8 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-indigo-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[4px] after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-indigo-600"></div>
        </label>
      </div>

      <div className={`space-y-6 ${!dnd.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
        {/* Time Range */}
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              Start Time
            </label>
            <input
              type="time"
              value={dnd.startTime}
              onChange={(e) => onTimeChange('startTime', e.target.value)}
              disabled={!dnd.enabled}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-2">
              End Time
            </label>
            <input
              type="time"
              value={dnd.endTime}
              onChange={(e) => onTimeChange('endTime', e.target.value)}
              disabled={!dnd.enabled}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Info Box */}
        <div className="p-4 bg-indigo-50 border border-indigo-200 rounded-lg">
          <div className="flex items-start gap-3">
            <FiMoon className="w-5 h-5 text-indigo-600 mt-0.5" />
            <div>
              <p className="text-sm font-medium text-indigo-900 mb-1">
                Do Not Disturb Active
              </p>
              <p className="text-xs text-indigo-700">
                Notifications will be silenced from {dnd.startTime} to {dnd.endTime}. 
                You'll still receive notifications but without sound or visual alerts.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {}
  };
};

export default NotificationsSettingsPage;

import { useState, useEffect } from 'react';
import { useNotificationPreferencesStore, shouldPlaySound, getSoundFilePath } from '@/store/useNotificationPreferencesStore';
import { notificationPreferencesAPI } from '@/lib/notificationPreferencesAPI';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { FiBell, FiVolume2, FiVolumeX, FiMoon, FiSun, FiSave, FiPlay, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';

interface NotificationSettingsProps {
  onClose?: () => void;
  compact?: boolean;
}

export default function NotificationSettings({ onClose, compact = false }: NotificationSettingsProps) {
  const {
    preferences,
    setPreferences,
    updateSound,
    updateDoNotDisturb,
    setSyncing,
    isSyncing
  } = useNotificationPreferencesStore();

  const [localPrefs, setLocalPrefs] = useState(preferences);
  const [hasChanges, setHasChanges] = useState(false);
  const socket = getSocket();

  useEffect(() => {
    setLocalPrefs(preferences);
  }, [preferences]);

  useEffect(() => {
    if (!socket) return;

    socket.on('notifications:sound-updated', (data: any) => {
      console.log('🔊 Sound settings updated via WebSocket');
      updateSound(data.sound);
      setLocalPrefs((prev: any) => prev ? { ...prev, sound: data.sound } : prev);
    });

    return () => {
      socket.off('notifications:sound-updated');
    };
  }, [socket, updateSound]);

  const handleSoundToggle = () => {
    if (!localPrefs) return;
    const newPrefs = {
      ...localPrefs,
      sound: { ...localPrefs.sound, enabled: !localPrefs.sound.enabled }
    };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleVolumeChange = (volume: number) => {
    if (!localPrefs) return;
    const newPrefs = {
      ...localPrefs,
      sound: { ...localPrefs.sound, volume }
    };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleSoundTypeChange = (soundType: string) => {
    if (!localPrefs) return;
    const newPrefs = {
      ...localPrefs,
      sound: { ...localPrefs.sound, soundType: soundType as any }
    };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleDNDToggle = () => {
    if (!localPrefs) return;
    const newPrefs = {
      ...localPrefs,
      doNotDisturb: { ...localPrefs.doNotDisturb, enabled: !localPrefs.doNotDisturb.enabled }
    };
    setLocalPrefs(newPrefs);
    setHasChanges(true);
  };

  const handleTestSound = async () => {
    if (!localPrefs) return;

    if (shouldPlaySound(localPrefs)) {
      try {
        const soundPath = getSoundFilePath(localPrefs.sound.soundType);
        const audio = new Audio(soundPath);
        audio.volume = localPrefs.sound.volume;
        await audio.play();
        toast.success('Playing test sound', { icon: '🔊' });
      } catch (error) {
        toast.error('Sound file not found. Add notification.mp3 to /public/');
      }
    } else {
      toast('Sound is disabled or Do Not Disturb is active', { icon: '🔕' });
    }
  };

  const handleSave = async () => {
    if (!localPrefs) return;

    setSyncing(true);
    try {
      await notificationPreferencesAPI.updatePreferences(localPrefs);
      setPreferences(localPrefs);
      toast.success('Settings saved!', { icon: '✅' });
      setHasChanges(false);
    } catch (error) {
      toast.error('Failed to save settings');
    } finally {
      setSyncing(false);
    }
  };

  if (!localPrefs) {
    return (
      <div className="p-4 text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto"></div>
        <p className="text-sm text-gray-600 mt-2">Loading preferences...</p>
      </div>
    );
  }

  if (compact) {
    return (
      <div className="p-4 space-y-4">
        {/* Quick Sound Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {localPrefs.sound.enabled ? (
              <FiVolume2 className="w-5 h-5 text-primary-600" />
            ) : (
              <FiVolumeX className="w-5 h-5 text-gray-400" />
            )}
            <span className="text-sm font-medium">Notification Sound</span>
          </div>
          <button
            onClick={handleSoundToggle}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
              localPrefs.sound.enabled ? 'bg-primary-600' : 'bg-gray-200'
            }`}
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                localPrefs.sound.enabled ? 'translate-x-6' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {/* Volume Slider */}
        <div className={localPrefs.sound.enabled ? '' : 'opacity-50 pointer-events-none'}>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-gray-600">Volume</span>
            <span className="text-xs font-medium">{Math.round(localPrefs.sound.volume * 100)}%</span>
          </div>
          <input
            type="range"
            min="0"
            max="1"
            step="0.1"
            value={localPrefs.sound.volume}
            onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
            className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
          />
        </div>

        {/* Test Sound Button */}
        <button
          onClick={handleTestSound}
          disabled={!localPrefs.sound.enabled}
          className="w-full btn btn-outline btn-sm flex items-center justify-center gap-2"
        >
          <FiPlay className="w-3 h-3" />
          Test Sound
        </button>

        {/* Save Button */}
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            onClick={handleSave}
            disabled={isSyncing}
            className="w-full btn btn-primary btn-sm flex items-center justify-center gap-2"
          >
            {isSyncing ? (
              <>
                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                Saving...
              </>
            ) : (
              <>
                <FiSave className="w-3 h-3" />
                Save Changes
              </>
            )}
          </motion.button>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-lg max-w-md w-full">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <FiBell className="text-primary-600" />
          Quick Settings
        </h3>
        {onClose && (
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition"
          >
            <FiX className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Content */}
      <div className="p-4 space-y-6">
        {/* Sound Settings */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              {localPrefs.sound.enabled ? (
                <FiVolume2 className="w-5 h-5 text-primary-600" />
              ) : (
                <FiVolumeX className="w-5 h-5 text-gray-400" />
              )}
              <span className="font-medium">Sound</span>
            </div>
            <button
              onClick={handleSoundToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localPrefs.sound.enabled ? 'bg-primary-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localPrefs.sound.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          <div className={`space-y-3 ${!localPrefs.sound.enabled ? 'opacity-50 pointer-events-none' : ''}`}>
            {/* Volume */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-600">Volume</span>
                <span className="text-sm font-medium">{Math.round(localPrefs.sound.volume * 100)}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="1"
                step="0.1"
                value={localPrefs.sound.volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-primary-600"
              />
            </div>

            {/* Sound Type */}
            <div>
              <span className="text-sm text-gray-600 block mb-2">Sound Type</span>
              <div className="grid grid-cols-3 gap-2">
                {['default', 'chime', 'bell'].map((type) => (
                  <button
                    key={type}
                    onClick={() => handleSoundTypeChange(type)}
                    className={`px-3 py-2 rounded-lg border text-xs font-medium transition-all ${
                      localPrefs.sound.soundType === type
                        ? 'border-primary-600 bg-primary-50 text-primary-700'
                        : 'border-gray-200 bg-white text-gray-700 hover:border-primary-300'
                    }`}
                  >
                    {type.charAt(0).toUpperCase() + type.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            {/* Test Button */}
            <button
              onClick={handleTestSound}
              className="w-full btn btn-outline btn-sm flex items-center justify-center gap-2"
            >
              <FiPlay className="w-4 h-4" />
              Test Sound
            </button>
          </div>
        </div>

        {/* Do Not Disturb */}
        <div className="pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <FiMoon className="w-5 h-5 text-indigo-600" />
              <div>
                <span className="font-medium block">Do Not Disturb</span>
                <span className="text-xs text-gray-500">
                  {localPrefs.doNotDisturb.startTime} - {localPrefs.doNotDisturb.endTime}
                </span>
              </div>
            </div>
            <button
              onClick={handleDNDToggle}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                localPrefs.doNotDisturb.enabled ? 'bg-indigo-600' : 'bg-gray-200'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  localPrefs.doNotDisturb.enabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-gray-200 flex gap-3">
        <button
          onClick={() => window.location.href = '/profile/notifications'}
          className="flex-1 btn btn-outline btn-sm"
        >
          Full Settings
        </button>
        {hasChanges && (
          <motion.button
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            onClick={handleSave}
            disabled={isSyncing}
            className="flex-1 btn btn-primary btn-sm"
          >
            {isSyncing ? 'Saving...' : 'Save'}
          </motion.button>
        )}
      </div>
    </div>
  );
}

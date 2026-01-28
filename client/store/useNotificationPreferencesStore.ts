import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface SoundSettings {
  enabled: boolean;
  volume: number;
  soundType: 'default' | 'chime' | 'bell' | 'ding' | 'pop';
}

interface NotificationChannel {
  enabled: boolean;
  orderPlaced?: boolean;
  orderStatusUpdate?: boolean;
  orderReady?: boolean;
  orderPickedUp?: boolean;
  orderCancelled?: boolean;
  wishlistPriceDrop?: boolean;
  wishlistBackInStock?: boolean;
  promotions?: boolean;
  newsletter?: boolean;
  lowStockAlert?: boolean;
}

interface DoNotDisturb {
  enabled: boolean;
  startTime: string;
  endTime: string;
  timezone: string;
}

interface AdminSettings {
  newOrderSound: boolean;
  lowStockAlert: boolean;
  newReviewAlert: boolean;
  newUserRegistration: boolean;
}

interface NotificationPreferences {
  _id?: string;
  user?: string;
  email: NotificationChannel;
  inApp: NotificationChannel;
  push: NotificationChannel;
  sound: SoundSettings;
  doNotDisturb: DoNotDisturb;
  admin?: AdminSettings;
}

interface NotificationPreferencesState {
  preferences: NotificationPreferences | null;
  isLoading: boolean;
  isSyncing: boolean;
  lastSyncedAt: Date | null;
  
  // Actions
  setPreferences: (preferences: NotificationPreferences) => void;
  updatePreferences: (updates: Partial<NotificationPreferences>) => void;
  updateChannel: (channel: keyof Pick<NotificationPreferences, 'email' | 'inApp' | 'push'>, updates: Partial<NotificationChannel>) => void;
  updateSound: (updates: Partial<SoundSettings>) => void;
  updateDoNotDisturb: (updates: Partial<DoNotDisturb>) => void;
  toggleNotification: (channel: keyof Pick<NotificationPreferences, 'email' | 'inApp' | 'push'>, type: string) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  resetToDefaults: () => void;
}

const defaultPreferences: NotificationPreferences = {
  email: {
    enabled: true,
    orderPlaced: true,
    orderStatusUpdate: true,
    orderReady: true,
    orderPickedUp: true,
    orderCancelled: true,
    wishlistPriceDrop: true,
    wishlistBackInStock: true,
    promotions: false,
    newsletter: false
  },
  inApp: {
    enabled: true,
    orderPlaced: true,
    orderStatusUpdate: true,
    orderReady: true,
    orderPickedUp: true,
    orderCancelled: true,
    wishlistPriceDrop: true,
    wishlistBackInStock: true,
    promotions: true,
    lowStockAlert: false
  },
  push: {
    enabled: false,
    orderPlaced: false,
    orderStatusUpdate: false,
    orderReady: false,
    orderPickedUp: false,
    orderCancelled: false,
    wishlistPriceDrop: false,
    wishlistBackInStock: false,
    promotions: false
  },
  sound: {
    enabled: true,
    volume: 0.5,
    soundType: 'default'
  },
  doNotDisturb: {
    enabled: false,
    startTime: '22:00',
    endTime: '08:00',
    timezone: 'Asia/Karachi'
  }
};

export const useNotificationPreferencesStore = create<NotificationPreferencesState>()(
  persist(
    (set, get) => ({
      preferences: null,
      isLoading: false,
      isSyncing: false,
      lastSyncedAt: null,

      setPreferences: (preferences) => 
        set({ 
          preferences, 
          lastSyncedAt: new Date() 
        }),

      updatePreferences: (updates) =>
        set((state) => ({
          preferences: state.preferences 
            ? { ...state.preferences, ...updates }
            : null,
          lastSyncedAt: new Date()
        })),

      updateChannel: (channel, updates) =>
        set((state) => {
          if (!state.preferences) return state;
          return {
            preferences: {
              ...state.preferences,
              [channel]: {
                ...state.preferences[channel],
                ...updates
              }
            },
            lastSyncedAt: new Date()
          };
        }),

      updateSound: (updates) =>
        set((state) => {
          if (!state.preferences) return state;
          return {
            preferences: {
              ...state.preferences,
              sound: {
                ...state.preferences.sound,
                ...updates
              }
            },
            lastSyncedAt: new Date()
          };
        }),

      updateDoNotDisturb: (updates) =>
        set((state) => {
          if (!state.preferences) return state;
          return {
            preferences: {
              ...state.preferences,
              doNotDisturb: {
                ...state.preferences.doNotDisturb,
                ...updates
              }
            },
            lastSyncedAt: new Date()
          };
        }),

      toggleNotification: (channel, type) =>
        set((state) => {
          if (!state.preferences) return state;
          const channelPrefs = state.preferences[channel];
          if (!channelPrefs || channelPrefs[type as keyof NotificationChannel] === undefined) {
            return state;
          }
          
          return {
            preferences: {
              ...state.preferences,
              [channel]: {
                ...channelPrefs,
                [type]: !channelPrefs[type as keyof NotificationChannel]
              }
            },
            lastSyncedAt: new Date()
          };
        }),

      setLoading: (loading) => set({ isLoading: loading }),
      
      setSyncing: (syncing) => set({ isSyncing: syncing }),

      resetToDefaults: () =>
        set({
          preferences: defaultPreferences,
          lastSyncedAt: new Date()
        })
    }),
    {
      name: 'notification-preferences-storage'
    }
  )
);

// Helper function to check if notification should play sound
export const shouldPlaySound = (preferences: NotificationPreferences | null): boolean => {
  if (!preferences) return true;
  
  // Check if sound is enabled
  if (!preferences.sound.enabled) return false;
  
  // Check Do Not Disturb
  if (preferences.doNotDisturb.enabled) {
    const now = new Date();
    const currentTime = now.getHours() * 60 + now.getMinutes();
    
    const [startHour, startMin] = preferences.doNotDisturb.startTime.split(':').map(Number);
    const [endHour, endMin] = preferences.doNotDisturb.endTime.split(':').map(Number);
    
    const startTime = startHour * 60 + startMin;
    const endTime = endHour * 60 + endMin;
    
    // Handle overnight periods
    if (startTime > endTime) {
      if (currentTime >= startTime || currentTime <= endTime) return false;
    } else {
      if (currentTime >= startTime && currentTime <= endTime) return false;
    }
  }
  
  return true;
};

// Helper to get sound file path
export const getSoundFilePath = (soundType: string): string => {
  const soundFiles: Record<string, string> = {
    default: '/notification.mp3',
    chime: '/sounds/chime.mp3',
    bell: '/sounds/bell.mp3',
    ding: '/sounds/ding.mp3',
    pop: '/sounds/pop.mp3'
  };
  
  return soundFiles[soundType] || soundFiles.default;
};

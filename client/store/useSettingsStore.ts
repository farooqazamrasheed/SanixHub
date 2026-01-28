import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '@/lib/api';

interface PrivacySettings {
  profileVisibility: 'public' | 'private' | 'friends';
  showEmail: boolean;
  showOrders: boolean;
  showWishlist: boolean;
  allowDataCollection: boolean;
  allowMarketing: boolean;
  twoFactorEnabled: boolean;
  sessionTimeout: number;
}

interface LanguageSettings {
  language: string;
  timezone: string;
  dateFormat: string;
  timeFormat: '12h' | '24h';
  currency: string;
  numberFormat: string;
}

interface AppearanceSettings {
  theme: 'light' | 'dark' | 'auto';
  colorScheme: string;
  fontSize: 'small' | 'medium' | 'large';
  compactMode: boolean;
  showAnimations: boolean;
  highContrast: boolean;
  layout: 'default' | 'comfortable' | 'compact';
}

interface SettingsStore {
  privacy: PrivacySettings | null;
  language: LanguageSettings | null;
  appearance: AppearanceSettings | null;
  loading: boolean;
  error: string | null;

  // Actions
  loadPrivacySettings: () => Promise<void>;
  updatePrivacySettings: (settings: PrivacySettings) => Promise<void>;
  
  loadLanguageSettings: () => Promise<void>;
  updateLanguageSettings: (settings: LanguageSettings) => Promise<void>;
  
  loadAppearanceSettings: () => Promise<void>;
  updateAppearanceSettings: (settings: AppearanceSettings) => Promise<void>;
  
  loadAllSettings: () => Promise<void>;
  clearSettings: () => void;
}

const useSettingsStore = create<SettingsStore>()(
  persist(
    (set, get) => ({
      privacy: null,
      language: null,
      appearance: null,
      loading: false,
      error: null,

      // Load Privacy Settings
      loadPrivacySettings: async () => {
        try {
          set({ loading: true, error: null });
          const response = await api.get('/settings/privacy');
          set({ privacy: response.settings, loading: false });
        } catch (error: any) {
          console.error('Failed to load privacy settings:', error);
          set({ error: error.response?.data?.message || 'Failed to load privacy settings', loading: false });
        }
      },

      // Update Privacy Settings
      updatePrivacySettings: async (settings: PrivacySettings) => {
        try {
          set({ loading: true, error: null });
          const response = await api.put('/settings/privacy', { settings });
          set({ privacy: response.settings, loading: false });
        } catch (error: any) {
          console.error('Failed to update privacy settings:', error);
          set({ error: error.response?.data?.message || 'Failed to update privacy settings', loading: false });
          throw error;
        }
      },

      // Load Language Settings
      loadLanguageSettings: async () => {
        try {
          set({ loading: true, error: null });
          const response = await api.get('/settings/language');
          set({ language: response.settings, loading: false });
        } catch (error: any) {
          console.error('Failed to load language settings:', error);
          set({ error: error.response?.data?.message || 'Failed to load language settings', loading: false });
        }
      },

      // Update Language Settings
      updateLanguageSettings: async (settings: LanguageSettings) => {
        try {
          set({ loading: true, error: null });
          const response = await api.put('/settings/language', { settings });
          set({ language: response.settings, loading: false });
        } catch (error: any) {
          console.error('Failed to update language settings:', error);
          set({ error: error.response?.data?.message || 'Failed to update language settings', loading: false });
          throw error;
        }
      },

      // Load Appearance Settings
      loadAppearanceSettings: async () => {
        try {
          set({ loading: true, error: null });
          const response = await api.get('/settings/appearance');
          set({ appearance: response.settings, loading: false });
        } catch (error: any) {
          console.error('Failed to load appearance settings:', error);
          set({ error: error.response?.data?.message || 'Failed to load appearance settings', loading: false });
        }
      },

      // Update Appearance Settings
      updateAppearanceSettings: async (settings: AppearanceSettings) => {
        try {
          set({ loading: true, error: null });
          const response = await api.put('/settings/appearance', { settings });
          set({ appearance: response.settings, loading: false });
          
          // Apply settings to DOM
          applyAppearanceSettings(settings);
        } catch (error: any) {
          console.error('Failed to update appearance settings:', error);
          set({ error: error.response?.data?.message || 'Failed to update appearance settings', loading: false });
          throw error;
        }
      },

      // Load All Settings
      loadAllSettings: async () => {
        try {
          set({ loading: true, error: null });
          const [privacyRes, languageRes, appearanceRes] = await Promise.all([
            api.get('/settings/privacy'),
            api.get('/settings/language'),
            api.get('/settings/appearance'),
          ]);
          
          const appearance = appearanceRes.settings;
          
          set({
            privacy: privacyRes.settings,
            language: languageRes.settings,
            appearance,
            loading: false,
          });

          // Apply appearance settings
          if (appearance) {
            applyAppearanceSettings(appearance);
          }
        } catch (error: any) {
          console.error('Failed to load all settings:', error);
          set({ error: error.response?.data?.message || 'Failed to load settings', loading: false });
        }
      },

      // Clear Settings
      clearSettings: () => {
        set({
          privacy: null,
          language: null,
          appearance: null,
          loading: false,
          error: null,
        });
      },
    }),
    {
      name: 'settings-storage',
      partialize: (state) => ({
        privacy: state.privacy,
        language: state.language,
        appearance: state.appearance,
      }),
    }
  )
);

// Helper function to apply appearance settings to DOM
function applyAppearanceSettings(settings: AppearanceSettings) {
  if (typeof window === 'undefined') return;

  const root = document.documentElement;

  // Apply theme
  if (settings.theme === 'dark') {
    root.classList.add('dark');
  } else if (settings.theme === 'light') {
    root.classList.remove('dark');
  } else {
    // Auto mode - check system preference
    if (window.matchMedia('(prefers-color-scheme: dark)').matches) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }

  // Apply font size
  const fontSizes = {
    small: '14px',
    medium: '16px',
    large: '18px',
  };
  root.style.fontSize = fontSizes[settings.fontSize] || fontSizes.medium;

  // Apply high contrast
  if (settings.highContrast) {
    root.classList.add('high-contrast');
  } else {
    root.classList.remove('high-contrast');
  }

  // Apply animations
  if (!settings.showAnimations) {
    root.classList.add('reduce-motion');
  } else {
    root.classList.remove('reduce-motion');
  }

  // Apply compact mode
  if (settings.compactMode) {
    root.classList.add('compact-mode');
  } else {
    root.classList.remove('compact-mode');
  }

  // Apply layout
  root.setAttribute('data-layout', settings.layout);
}

export default useSettingsStore;

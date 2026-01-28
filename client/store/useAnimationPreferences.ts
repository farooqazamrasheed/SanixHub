import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AnimationPreferences {
  // Global animation toggle
  animationsEnabled: boolean;
  
  // Specific animation types
  enableProductAnimations: boolean;
  enableOrderAnimations: boolean;
  enableCategoryAnimations: boolean;
  enableUserAnimations: boolean;
  
  // Animation intensity
  animationSpeed: 'slow' | 'normal' | 'fast';
  
  // Visual effects
  enableGlowEffects: boolean;
  enableBadges: boolean;
  enableToastAnimations: boolean;
  enableRowHighlights: boolean;
  
  // Notification preferences
  enableSoundEffects: boolean;
  soundVolume: number; // 0-100
  
  // Actions
  setAnimationsEnabled: (enabled: boolean) => void;
  setProductAnimations: (enabled: boolean) => void;
  setOrderAnimations: (enabled: boolean) => void;
  setCategoryAnimations: (enabled: boolean) => void;
  setUserAnimations: (enabled: boolean) => void;
  setAnimationSpeed: (speed: 'slow' | 'normal' | 'fast') => void;
  setGlowEffects: (enabled: boolean) => void;
  setBadges: (enabled: boolean) => void;
  setToastAnimations: (enabled: boolean) => void;
  setRowHighlights: (enabled: boolean) => void;
  setSoundEffects: (enabled: boolean) => void;
  setSoundVolume: (volume: number) => void;
  resetToDefaults: () => void;
}

const defaultPreferences = {
  animationsEnabled: true,
  enableProductAnimations: true,
  enableOrderAnimations: true,
  enableCategoryAnimations: true,
  enableUserAnimations: true,
  animationSpeed: 'normal' as const,
  enableGlowEffects: true,
  enableBadges: true,
  enableToastAnimations: true,
  enableRowHighlights: true,
  enableSoundEffects: false,
  soundVolume: 50,
};

export const useAnimationPreferences = create<AnimationPreferences>()(
  persist(
    (set) => ({
      ...defaultPreferences,

      setAnimationsEnabled: (enabled) => 
        set({ animationsEnabled: enabled }),

      setProductAnimations: (enabled) => 
        set({ enableProductAnimations: enabled }),

      setOrderAnimations: (enabled) => 
        set({ enableOrderAnimations: enabled }),

      setCategoryAnimations: (enabled) => 
        set({ enableCategoryAnimations: enabled }),

      setUserAnimations: (enabled) => 
        set({ enableUserAnimations: enabled }),

      setAnimationSpeed: (speed) => 
        set({ animationSpeed: speed }),

      setGlowEffects: (enabled) => 
        set({ enableGlowEffects: enabled }),

      setBadges: (enabled) => 
        set({ enableBadges: enabled }),

      setToastAnimations: (enabled) => 
        set({ enableToastAnimations: enabled }),

      setRowHighlights: (enabled) => 
        set({ enableRowHighlights: enabled }),

      setSoundEffects: (enabled) => 
        set({ enableSoundEffects: enabled }),

      setSoundVolume: (volume) => 
        set({ soundVolume: Math.min(100, Math.max(0, volume)) }),

      resetToDefaults: () => 
        set(defaultPreferences),
    }),
    {
      name: 'admin-animation-preferences',
    }
  )
);

// Helper hook to get animation class names based on preferences
export const useAnimationClasses = () => {
  const prefs = useAnimationPreferences();
  
  const getSpeedClass = () => {
    if (!prefs.animationsEnabled) return '';
    
    switch (prefs.animationSpeed) {
      case 'slow': return 'animation-slow';
      case 'fast': return 'animation-fast';
      default: return '';
    }
  };

  const getAnimationClass = (animationType: 'new' | 'updated' | 'deleted', pageType?: 'product' | 'order' | 'category' | 'user') => {
    if (!prefs.animationsEnabled) return '';
    
    // Check page-specific preferences
    if (pageType === 'product' && !prefs.enableProductAnimations) return '';
    if (pageType === 'order' && !prefs.enableOrderAnimations) return '';
    if (pageType === 'category' && !prefs.enableCategoryAnimations) return '';
    if (pageType === 'user' && !prefs.enableUserAnimations) return '';

    const speedClass = getSpeedClass();
    
    switch (animationType) {
      case 'new':
        return `animate-bounceIn ${speedClass}`;
      case 'updated':
        return `animate-fadeInScale ${speedClass}`;
      case 'deleted':
        return `animate-slideOutRight ${speedClass}`;
      default:
        return '';
    }
  };

  const getRowHighlightClass = (type: 'new' | 'updated' | 'deleted') => {
    if (!prefs.animationsEnabled || !prefs.enableRowHighlights) return '';
    
    switch (type) {
      case 'new': return 'row-highlight-new';
      case 'updated': return 'row-highlight-updated';
      case 'deleted': return 'row-highlight-deleted';
      default: return '';
    }
  };

  const getGlowClass = (type: 'new' | 'updated') => {
    if (!prefs.animationsEnabled || !prefs.enableGlowEffects) return '';
    
    return type === 'new' ? 'animate-glow' : 'animate-updateGlow';
  };

  const shouldShowBadge = () => {
    return prefs.animationsEnabled && prefs.enableBadges;
  };

  const shouldAnimateToast = () => {
    return prefs.animationsEnabled && prefs.enableToastAnimations;
  };

  return {
    getAnimationClass,
    getRowHighlightClass,
    getGlowClass,
    shouldShowBadge,
    shouldAnimateToast,
    getSpeedClass,
  };
};

import { useAnimationPreferences } from '@/store/useAnimationPreferences';

export default function AnimationPreferences() {
  const prefs = useAnimationPreferences();

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold mb-4">Animation Settings</h3>
        <p className="text-sm text-gray-600 mb-6">
          Customize how animations and visual effects appear throughout the admin panel.
        </p>
      </div>

      {/* Master Toggle */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="text-2xl">🎨</span>
            <div>
              <p className="font-semibold text-gray-900">Enable All Animations</p>
              <p className="text-sm text-gray-600">
                Master control for all animations and visual effects
              </p>
            </div>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.animationsEnabled}
              onChange={(e) => prefs.setAnimationsEnabled(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-14 h-7 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[4px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-6 after:w-6 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>
      </div>

      {/* Page-Specific Animations */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <h4 className="font-semibold text-gray-900">Page-Specific Animations</h4>
        
        <div className="space-y-3">
          {/* Products */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <span className="text-gray-700">Products Page</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enableProductAnimations}
                onChange={(e) => prefs.setProductAnimations(e.target.checked)}
                disabled={!prefs.animationsEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Orders */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📋</span>
              <span className="text-gray-700">Orders Page</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enableOrderAnimations}
                onChange={(e) => prefs.setOrderAnimations(e.target.checked)}
                disabled={!prefs.animationsEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Categories */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">📁</span>
              <span className="text-gray-700">Categories Page</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enableCategoryAnimations}
                onChange={(e) => prefs.setCategoryAnimations(e.target.checked)}
                disabled={!prefs.animationsEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>

          {/* Users */}
          <div className="flex items-center justify-between py-2">
            <div className="flex items-center gap-2">
              <span className="text-lg">👥</span>
              <span className="text-gray-700">Users Page</span>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={prefs.enableUserAnimations}
                onChange={(e) => prefs.setUserAnimations(e.target.checked)}
                disabled={!prefs.animationsEnabled}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
            </label>
          </div>
        </div>
      </div>

      {/* Animation Speed */}
      <div className="border border-gray-200 rounded-lg p-4">
        <h4 className="font-semibold text-gray-900 mb-4">Animation Speed</h4>
        <div className="flex gap-3">
          <button
            onClick={() => prefs.setAnimationSpeed('slow')}
            disabled={!prefs.animationsEnabled}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
              prefs.animationSpeed === 'slow'
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            } ${!prefs.animationsEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            🐌 Slow
          </button>
          <button
            onClick={() => prefs.setAnimationSpeed('normal')}
            disabled={!prefs.animationsEnabled}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
              prefs.animationSpeed === 'normal'
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            } ${!prefs.animationsEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            ⚡ Normal
          </button>
          <button
            onClick={() => prefs.setAnimationSpeed('fast')}
            disabled={!prefs.animationsEnabled}
            className={`flex-1 py-2 px-4 rounded-lg border-2 transition-all ${
              prefs.animationSpeed === 'fast'
                ? 'border-blue-600 bg-blue-50 text-blue-700 font-semibold'
                : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300'
            } ${!prefs.animationsEnabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
          >
            🚀 Fast
          </button>
        </div>
      </div>

      {/* Visual Effects */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-3">
        <h4 className="font-semibold text-gray-900">Visual Effects</h4>
        
        {/* Glow Effects */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">✨</span>
            <span className="text-gray-700">Glow Effects</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableGlowEffects}
              onChange={(e) => prefs.setGlowEffects(e.target.checked)}
              disabled={!prefs.animationsEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Live Badges */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🏷️</span>
            <span className="text-gray-700">Live Badges (NEW, LIVE)</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableBadges}
              onChange={(e) => prefs.setBadges(e.target.checked)}
              disabled={!prefs.animationsEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Row Highlights */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">🎨</span>
            <span className="text-gray-700">Row Highlights</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableRowHighlights}
              onChange={(e) => prefs.setRowHighlights(e.target.checked)}
              disabled={!prefs.animationsEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>

        {/* Toast Animations */}
        <div className="flex items-center justify-between py-2">
          <div className="flex items-center gap-2">
            <span className="text-lg">💬</span>
            <span className="text-gray-700">Toast Notifications</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableToastAnimations}
              onChange={(e) => prefs.setToastAnimations(e.target.checked)}
              disabled={!prefs.animationsEnabled}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 peer-disabled:opacity-50"></div>
          </label>
        </div>
      </div>

      {/* Sound Effects */}
      <div className="border border-gray-200 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-lg">🔊</span>
            <span className="font-semibold text-gray-900">Sound Effects</span>
          </div>
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={prefs.enableSoundEffects}
              onChange={(e) => prefs.setSoundEffects(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
          </label>
        </div>

        {prefs.enableSoundEffects && (
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Volume</span>
              <span className="text-sm font-semibold text-gray-900">{prefs.soundVolume}%</span>
            </div>
            <input
              type="range"
              min="0"
              max="100"
              value={prefs.soundVolume}
              onChange={(e) => prefs.setSoundVolume(Number(e.target.value))}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
          </div>
        )}
      </div>

      {/* Reset Button */}
      <div className="flex justify-end">
        <button
          onClick={prefs.resetToDefaults}
          className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Reset to Defaults
        </button>
      </div>

      {/* Preview Section */}
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200 rounded-lg p-4">
        <p className="text-sm text-gray-700">
          💡 <strong>Tip:</strong> Changes take effect immediately. Try creating or updating a product to see your animation preferences in action!
        </p>
      </div>
    </div>
  );
}

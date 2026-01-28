import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/router';
import { useTranslation } from 'next-i18next';
import { FiHeart, FiShoppingCart, FiPackage, FiHome, FiGrid, FiSearch, FiInfo, FiMail, FiUser, FiLogOut, FiSettings } from 'react-icons/fi';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useCartSync } from '@/hooks/useCartSync';
import { useWishlistSync } from '@/hooks/useWishlistSync';

export default function Header() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { user, isAuthenticated, isInitialized, logout } = useAuthStore();
  const { getTotalItems, lastUpdated } = useCartStore();
  const { getItemCount } = useWishlistStore();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [wishlistCount, setWishlistCount] = useState(0);

  // Real-time WebSocket sync for cart and wishlist
  useCartSync();
  useWishlistSync();
  
  // Update cart count when lastUpdated changes (Zustand state change)
  useEffect(() => {
    if (mounted) {
      const count = getTotalItems();
      console.log('🔄 Cart lastUpdated changed, new count:', count);
      setCartCount(count);
    }
  }, [lastUpdated, mounted, getTotalItems]);

  // Fix hydration issue - only show counts after client mount
  useEffect(() => {
    setMounted(true);
    setCartCount(getTotalItems());
  }, []);

  // Update cart count when cart changes
  useEffect(() => {
    if (!mounted) return;
    
    const updateCartCount = () => {
      const count = getTotalItems();
      console.log('🔄 Cart count updated:', count);
      setCartCount(count);
    };

    // Initial update
    updateCartCount();

    // Listen for cart updates
    if (typeof window !== 'undefined') {
      window.addEventListener('cartUpdated', updateCartCount);
      
      // Also listen for storage changes (cross-tab sync)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'cart-storage') {
          console.log('💾 Cart storage changed, updating count');
          updateCartCount();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('cartUpdated', updateCartCount);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [mounted, getTotalItems]);

  // Update wishlist count when store changes
  useEffect(() => {
    if (mounted) {
      const count = getItemCount();
      setWishlistCount(count);
    }
  }, [mounted, getItemCount]);

  // Listen for wishlist updates
  useEffect(() => {
    if (!mounted) return;
    
    const updateWishlistCount = () => {
      const count = getItemCount();
      console.log('❤️ Wishlist count updated:', count);
      setWishlistCount(count);
    };

    // Initial update
    updateWishlistCount();

    // Listen for wishlist updates
    if (typeof window !== 'undefined') {
      window.addEventListener('wishlistUpdated', updateWishlistCount);
      
      // Also listen for storage changes (cross-tab sync)
      const handleStorageChange = (e: StorageEvent) => {
        if (e.key === 'wishlist-storage') {
          console.log('💾 Wishlist storage changed, updating count');
          updateWishlistCount();
        }
      };
      
      window.addEventListener('storage', handleStorageChange);
      
      return () => {
        window.removeEventListener('wishlistUpdated', updateWishlistCount);
        window.removeEventListener('storage', handleStorageChange);
      };
    }
  }, [mounted, getItemCount]);

  // Refresh counts when route changes
  useEffect(() => {
    const handleRouteChange = () => {
      setCartCount(getTotalItems());
      setWishlistCount(getItemCount());
    };

    router.events.on('routeChangeComplete', handleRouteChange);
    
    return () => {
      router.events.off('routeChangeComplete', handleRouteChange);
    };
  }, [router.events, getTotalItems, getItemCount]);

  const changeLanguage = (locale: string) => {
    router.push(router.pathname, router.asPath, { locale });
  };

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <header className="bg-white shadow-lg sticky top-0 z-50 border-b border-gray-100">
      {/* Top bar */}
      <div className="bg-gradient-to-r from-primary-600 to-primary-700 text-white py-2.5">
        <div className="container-custom flex justify-between items-center text-sm">
          <div className="hidden sm:flex items-center gap-4">
            <span className="flex items-center gap-2">
              <span>📞</span>
              <span className="font-medium">{process.env.NEXT_PUBLIC_WHATSAPP_NUMBER}</span>
            </span>
            <span className="flex items-center gap-2">
              <span>✉️</span>
              <span className="font-medium">info@sanixhub.com</span>
            </span>
          </div>
          <div className="flex items-center gap-4 ml-auto">
            <span className="text-xs hidden sm:inline">Welcome to SanixHub!</span>
            <button
              onClick={() => changeLanguage(router.locale === 'en' ? 'ur' : 'en')}
              className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-md transition-all font-medium"
            >
              {router.locale === 'en' ? '🇵🇰 اردو' : '🇬🇧 English'}
            </button>
          </div>
        </div>
      </div>

      {/* Main header */}
      <div className="container-custom py-4 bg-white">
        <div className="flex items-center justify-between">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2 text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-700 bg-clip-text text-transparent hover:scale-105 transition-transform duration-200">
            <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-700 rounded-lg flex items-center justify-center text-white shadow-md">
              <span className="text-xl font-bold">S</span>
            </div>
            <span>SanixHub</span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <FiHome className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{t('nav.home')}</span>
            </Link>
            <Link href="/products" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <FiGrid className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{t('nav.products')}</span>
            </Link>
            <Link href="/categories" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <svg className="w-4 h-4 group-hover:scale-110 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">{t('nav.categories')}</span>
            </Link>
            <Link href="/orders" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <FiPackage className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{t('nav.orders')}</span>
            </Link>
            <Link href="/about" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <FiInfo className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{t('nav.about')}</span>
            </Link>
            <Link href="/contact" className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-primary-50 hover:text-primary-600 transition-all duration-200 group">
              <FiMail className="w-4 h-4 group-hover:scale-110 transition-transform" />
              <span className="font-medium">{t('nav.contact')}</span>
            </Link>
          </nav>

          {/* Right section */}
          <div className="flex items-center gap-2">
            {/* Advanced Search Link */}
            <Link 
              href="/search" 
              className="p-2.5 hover:bg-primary-50 hover:text-primary-600 rounded-full transition-all duration-200 group" 
              title="Advanced Search"
            >
              <FiSearch className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </Link>

            {/* Wishlist */}
            <Link 
              href="/wishlist" 
              className="relative p-2.5 hover:bg-red-50 hover:text-red-500 rounded-full transition-all duration-200 group" 
              title="Wishlist"
            >
              <FiHeart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {mounted && wishlistCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-lg animate-bounce">
                  {wishlistCount}
                </span>
              )}
            </Link>

            {/* Cart */}
            <Link 
              href="/cart" 
              className="relative p-2.5 hover:bg-primary-50 hover:text-primary-600 rounded-full transition-all duration-200 group" 
              title="Shopping Cart"
            >
              <FiShoppingCart className="w-5 h-5 group-hover:scale-110 transition-transform" />
              {mounted && cartCount > 0 && (
                <span className="absolute -top-1 -right-1 bg-primary-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-semibold shadow-lg animate-bounce">
                  {cartCount}
                </span>
              )}
            </Link>

            {/* User menu */}
            {isAuthenticated ? (
              <div className="relative group">
                <button className="flex items-center gap-2 px-3 py-2 hover:bg-primary-50 rounded-lg transition-all duration-200">
                  <div className="w-8 h-8 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
                    {user?.name?.charAt(0).toUpperCase() || <FiUser className="w-4 h-4" />}
                  </div>
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                <div className="absolute right-0 pt-2 w-56 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 ease-in-out">
                  <div className="bg-white rounded-xl shadow-2xl py-2 border border-gray-100">
                    <div className="px-4 py-3 border-b border-gray-100">
                      <p className="font-semibold text-gray-800">{user?.name}</p>
                      <p className="text-xs text-gray-500">{user?.email}</p>
                    </div>
                    <Link href="/profile" className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <FiUser className="w-4 h-4" />
                      <span>{t('nav.profile')}</span>
                    </Link>
                    <Link href="/orders" className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <FiPackage className="w-4 h-4" />
                      <span>{t('nav.orders')}</span>
                    </Link>
                    <Link href="/settings" className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                      <FiSettings className="w-4 h-4" />
                      <span>Settings</span>
                    </Link>
                    {user?.role === 'superadmin' && (
                      <Link href="/admin" className="flex items-center gap-3 px-4 py-2.5 hover:bg-primary-50 hover:text-primary-600 transition-colors">
                        <FiSettings className="w-4 h-4" />
                        <span>{t('nav.admin')}</span>
                      </Link>
                    )}
                    <hr className="my-2 border-gray-100" />
                    <button
                      onClick={handleLogout}
                      className="flex items-center gap-3 w-full text-left px-4 py-2.5 hover:bg-red-50 text-red-600 transition-colors"
                    >
                      <FiLogOut className="w-4 h-4" />
                      <span>{t('nav.logout')}</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <Link href="/login" className="btn btn-primary px-6 py-2 shadow-md hover:shadow-lg transition-all">
                {t('nav.login')}
              </Link>
            )}

            {/* Mobile menu button */}
            <button
              className="md:hidden p-2"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile menu */}
        {mobileMenuOpen && (
          <nav className="md:hidden mt-4 pb-4 border-t pt-4 space-y-1">
            <Link href="/" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiHome className="w-5 h-5" />
              <span className="font-medium">{t('nav.home')}</span>
            </Link>
            <Link href="/products" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiGrid className="w-5 h-5" />
              <span className="font-medium">{t('nav.products')}</span>
            </Link>
            <Link href="/categories" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
              <span className="font-medium">{t('nav.categories')}</span>
            </Link>
            <Link href="/orders" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiPackage className="w-5 h-5" />
              <span className="font-medium">{t('nav.orders')}</span>
            </Link>
            <Link href="/search" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiSearch className="w-5 h-5" />
              <span className="font-medium">Advanced Search</span>
            </Link>
            <Link href="/wishlist" className="flex items-center justify-between py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <div className="flex items-center gap-3">
                <FiHeart className="w-5 h-5" />
                <span className="font-medium">Wishlist</span>
              </div>
              {mounted && wishlistCount > 0 && (
                <span className="bg-red-500 text-white text-xs rounded-full px-2.5 py-1 font-semibold shadow-md">
                  {wishlistCount}
                </span>
              )}
            </Link>
            <Link href="/about" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiInfo className="w-5 h-5" />
              <span className="font-medium">{t('nav.about')}</span>
            </Link>
            <Link href="/contact" className="flex items-center gap-3 py-3 px-4 hover:bg-primary-50 hover:text-primary-600 rounded-lg transition-all">
              <FiMail className="w-5 h-5" />
              <span className="font-medium">{t('nav.contact')}</span>
            </Link>
          </nav>
        )}
      </div>
    </header>
  );
}

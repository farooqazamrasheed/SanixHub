import { useState, useEffect } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export const useWishlistCount = () => {
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [count, setCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const fetchCount = async () => {
    // Wait for auth to be initialized before making requests
    if (!isInitialized) {
      return;
    }

    if (!isAuthenticated) {
      setCount(0);
      return;
    }

    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;
    if (!token) {
      setCount(0);
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/wishlist`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        const itemCount = data.data?.wishlist?.items?.length || 0;
        setCount(itemCount);
      } else if (response.status === 401) {
        // Silently handle unauthorized - user is not logged in
        setCount(0);
      } else {
        setCount(0);
      }
    } catch (error) {
      // Only log non-authentication errors
      if (!error.message?.includes('401')) {
        console.error('Failed to fetch wishlist count:', error);
      }
      setCount(0);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isInitialized) {
      fetchCount();
    }
  }, [isAuthenticated, isInitialized]);

  // Listen for custom wishlist update events
  useEffect(() => {
    if (typeof window === 'undefined' || !isInitialized) return;
    
    const handleWishlistUpdate = () => {
      if (isInitialized) {
        fetchCount();
      }
    };

    window.addEventListener('wishlistUpdated', handleWishlistUpdate);
    return () => {
      window.removeEventListener('wishlistUpdated', handleWishlistUpdate);
    };
  }, [isAuthenticated, isInitialized]);

  return { count, isLoading, refresh: fetchCount };
};

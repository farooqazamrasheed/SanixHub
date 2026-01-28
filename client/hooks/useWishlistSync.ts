import { useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useSocket } from './useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { wishlistAPI } from '@/lib/api';
import toast from 'react-hot-toast';

interface WishlistUpdateData {
  userId: string;
  item?: any;
  productId?: string;
  itemCount: number;
  totalValue: number;
  timestamp: Date;
}

/**
 * Enhanced wishlist sync hook with real-time WebSocket updates
 * Syncs local Zustand store with backend and listens for real-time changes
 */
export const useWishlistSync = () => {
  const { socket, connected } = useSocket();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { setItems, setLoading, setSyncing, updateLastSync, clearWishlist } = useWishlistStore();
  const queryClient = useQueryClient();

  // Sync wishlist from backend on mount/auth change
  const syncFromBackend = useCallback(async () => {
    if (!isAuthenticated || !isInitialized) {
      clearWishlist();
      return;
    }

    try {
      setLoading(true);
      const response = await wishlistAPI.getWishlist();
      
      if (response.success && response.data.wishlist) {
        const items = response.data.wishlist.items.map((item: any) => ({
          productId: item.product._id,
          name: item.product.name?.en || item.product.name,
          price: item.product.price || item.product.pricing?.salePrice || item.product.pricing?.basePrice || 0,
          image: item.product.images?.[0]?.url || item.product.images?.[0] || '',
          slug: item.product.slug,
          stock: item.product.stock || item.product.inventory?.stockQuantity || 0,
          addedAt: new Date(item.addedAt).getTime(),
        }));
        
        setItems(items);
        updateLastSync();
        console.log('✅ Wishlist synced from backend:', items.length, 'items');
      }
    } catch (error: any) {
      console.error('❌ Failed to sync wishlist:', error);
      // Don't clear on error - keep local data
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated, isInitialized, setItems, setLoading, updateLastSync, clearWishlist]);

  // Initial sync on mount and when auth changes
  useEffect(() => {
    if (isAuthenticated && isInitialized) {
      syncFromBackend();
    } else {
      clearWishlist();
    }
  }, [isAuthenticated, isInitialized, syncFromBackend, clearWishlist]);

  // Setup WebSocket subscriptions for real-time updates
  useEffect(() => {
    if (!socket || !connected || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Subscribe to wishlist updates
    const subscribe = () => {
      if (socket.connected && socket.id) {
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('wishlist:subscribe');
            console.log('❤️ Subscribed to real-time wishlist updates');
          }
        }, 300);
      }
    };

    // Subscribe immediately if connected, otherwise wait
    if (socket.connected) {
      subscribe();
    } else {
      socket.once('connect', subscribe);
    }

    // Handle item added
    const handleItemAdded = (data: WishlistUpdateData) => {
      console.log('💖 Wishlist item added (WebSocket):', data);
      
      // Refresh from backend to get full updated data
      syncFromBackend();
      
      toast.success('Item added to wishlist', {
        icon: '❤️',
        duration: 2000,
      });
    };

    // Handle item removed
    const handleItemRemoved = (data: WishlistUpdateData) => {
      console.log('💔 Wishlist item removed (WebSocket):', data);
      
      // Refresh from backend
      syncFromBackend();
      
      toast.success('Item removed from wishlist', {
        icon: '🗑️',
        duration: 2000,
      });
    };

    // Handle wishlist cleared
    const handleCleared = (data: WishlistUpdateData) => {
      console.log('🗑️ Wishlist cleared (WebSocket):', data);
      
      clearWishlist();
      
      toast.success('Wishlist cleared', {
        icon: '🗑️',
        duration: 2000,
      });
    };

    // Attach listeners
    socket.on('wishlist:itemAdded', handleItemAdded);
    socket.on('wishlist:itemRemoved', handleItemRemoved);
    socket.on('wishlist:cleared', handleCleared);

    // Cleanup
    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('wishlist:itemAdded', handleItemAdded);
      socket.off('wishlist:itemRemoved', handleItemRemoved);
      socket.off('wishlist:cleared', handleCleared);
      socket.emit('wishlist:unsubscribe');
    };
  }, [socket, connected, isAuthenticated, isInitialized, syncFromBackend, clearWishlist]);

  // Manual sync function
  const manualSync = useCallback(async () => {
    setSyncing(true);
    await syncFromBackend();
    setSyncing(false);
  }, [syncFromBackend, setSyncing]);

  return {
    syncWishlist: manualSync,
    isConnected: connected,
  };
};

export default useWishlistSync;

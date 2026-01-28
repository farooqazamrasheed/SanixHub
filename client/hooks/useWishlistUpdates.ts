import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

interface WishlistUpdateData {
  userId: string;
  itemCount: number;
  totalValue: number;
  timestamp: Date;
}

interface AdminWishlistUpdateData {
  type: 'added' | 'removed' | 'cleared';
  userId: string;
  userName: string;
  userEmail: string;
  productName?: string;
  productId?: string;
  itemCount: number;
  totalValue: number;
  timestamp: Date;
}

export const useWishlistUpdates = (onUpdate?: (data: WishlistUpdateData) => void) => {
  const { socket, connected } = useSocket();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!socket || !socket.emit || !connected || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be fully connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        // Increased to 300ms to ensure authentication middleware has processed
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('wishlist:subscribe');
            console.log('❤️ Subscribed to wishlist updates');
          }
        }, 300);
      }
    };

    // If already connected, subscribe immediately
    if (socket.connected) {
      subscribe();
    } else {
      // Wait for connection
      socket.once('connect', subscribe);
      return;
    }

    // Original subscribe call removed - replaced by the above logic

    // Listen for item added
    const handleItemAdded = (data: WishlistUpdateData) => {
      console.log('Wishlist item added:', data);
      if (onUpdate) {
        onUpdate(data);
      }
    };

    // Listen for item removed
    const handleItemRemoved = (data: WishlistUpdateData) => {
      console.log('Wishlist item removed:', data);
      if (onUpdate) {
        onUpdate(data);
      }
    };

    // Listen for wishlist cleared
    const handleCleared = (data: WishlistUpdateData) => {
      console.log('Wishlist cleared:', data);
      if (onUpdate) {
        onUpdate(data);
      }
    };

    socket.on('wishlist:itemAdded', handleItemAdded);
    socket.on('wishlist:itemRemoved', handleItemRemoved);
    socket.on('wishlist:cleared', handleCleared);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.emit('wishlist:unsubscribe');
      socket.off('wishlist:itemAdded', handleItemAdded);
      socket.off('wishlist:itemRemoved', handleItemRemoved);
      socket.off('wishlist:cleared', handleCleared);
    };
  }, [socket, connected, onUpdate, isAuthenticated, isInitialized]);

  return socket;
};

export const useAdminWishlistUpdates = (onUpdate?: (data: AdminWishlistUpdateData) => void) => {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !socket.on || !socket.off || !connected) return;

    const handleAdminUpdate = (data: AdminWishlistUpdateData) => {
      console.log('Admin: Wishlist updated:', data);

      // Show toast notification for admin
      if (data.type === 'added') {
        toast.success(
          `${data.userName} added "${data.productName}" to wishlist`,
          { duration: 4000, position: 'top-right' }
        );
      } else if (data.type === 'removed') {
        toast.info(
          `${data.userName} removed "${data.productName}" from wishlist`,
          { duration: 4000, position: 'top-right' }
        );
      } else if (data.type === 'cleared') {
        toast.info(
          `${data.userName} cleared their wishlist`,
          { duration: 4000, position: 'top-right' }
        );
      }

      if (onUpdate) {
        onUpdate(data);
      }
    };

    socket.on('admin:wishlistUpdated', handleAdminUpdate);

    return () => {
      socket.off('admin:wishlistUpdated', handleAdminUpdate);
    };
  }, [socket, onUpdate]);

  return socket;
};

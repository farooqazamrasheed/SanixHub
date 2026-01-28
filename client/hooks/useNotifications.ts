import { useEffect, useState } from 'react';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationPreferencesStore, shouldPlaySound, getSoundFilePath } from '@/store/useNotificationPreferencesStore';
import toast from 'react-hot-toast';

interface Notification {
  id?: string;
  title: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  timestamp: Date;
  read?: boolean;
}

interface PriceDropAlert {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  discount: number;
  timestamp: Date;
}

interface BackInStockAlert {
  productId: string;
  productName: string;
  currentStock: number;
  timestamp: Date;
}

export const useNotifications = () => {
  const socket = getSocket();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { preferences } = useNotificationPreferencesStore();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        // Increased to 300ms to ensure authentication middleware has processed
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('user:subscribe-notifications');
            console.log('🔔 Subscribed to notifications');
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
    }

    // Handle general notifications
    const handleNotification = (data: Notification) => {
      console.log('🔔 Notification received:', data);
      
      // Check preferences
      if (preferences && !preferences.inApp.enabled) {
        console.log('🔕 In-app notifications disabled');
        return;
      }

      const notification = {
        ...data,
        id: data.id || Date.now().toString(),
        read: false
      };

      // Add to notifications list
      setNotifications(prev => [notification, ...prev].slice(0, 50)); // Keep last 50
      setUnreadCount(prev => prev + 1);

      // Show toast
      const icons: Record<string, string> = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      };

      toast(data.message, {
        icon: icons[data.type],
        duration: 4000,
        position: 'top-right'
      });

      // Play notification sound with preferences
      playNotificationSound();
    };

    // Handle price drop alerts
    const handlePriceDrop = (data: PriceDropAlert) => {
      console.log('💰 Price drop alert:', data);
      
      // Check preferences for wishlist price drops
      if (preferences && (!preferences.inApp.enabled || !preferences.inApp.wishlistPriceDrop)) {
        console.log('🔕 Wishlist price drop notifications disabled');
        return;
      }

      const notification: Notification = {
        id: `price-drop-${data.productId}-${Date.now()}`,
        title: 'Price Drop!',
        message: `${data.productName} is now ${data.discount}% off!`,
        type: 'success',
        timestamp: new Date(),
        read: false
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

      toast.success(
        `🎉 ${data.productName} dropped to ${data.newPrice}! Save ${data.discount}%`,
        {
          duration: 6000,
          position: 'top-right'
        }
      );

      playNotificationSound();
    };

    // Handle back in stock alerts
    const handleBackInStock = (data: BackInStockAlert) => {
      console.log('📦 Back in stock alert:', data);
      
      // Check preferences for back in stock alerts
      if (preferences && (!preferences.inApp.enabled || !preferences.inApp.wishlistBackInStock)) {
        console.log('🔕 Back in stock notifications disabled');
        return;
      }

      const notification: Notification = {
        id: `back-in-stock-${data.productId}-${Date.now()}`,
        title: 'Back in Stock!',
        message: `${data.productName} is available again!`,
        type: 'info',
        timestamp: new Date(),
        read: false
      };

      setNotifications(prev => [notification, ...prev].slice(0, 50));
      setUnreadCount(prev => prev + 1);

      toast(`📦 ${data.productName} is back in stock!`, {
        duration: 5000,
        position: 'top-right'
      });

      playNotificationSound();
    };

    // Handle wishlist updates
    const handleWishlistUpdate = (data: any) => {
      console.log('❤️ Wishlist updated:', data);
      
      if (data.type === 'price_drop' || data.type === 'back_in_stock') {
        const notification: Notification = {
          id: `wishlist-${Date.now()}`,
          title: 'Wishlist Update',
          message: data.message,
          type: 'info',
          timestamp: new Date(),
          read: false
        };

        setNotifications(prev => [notification, ...prev].slice(0, 50));
        setUnreadCount(prev => prev + 1);
      }
    };

    // Handle notification read confirmation
    const handleNotificationUpdated = (data: any) => {
      console.log('✓ Notification marked as read:', data.notificationId);
      
      setNotifications(prev =>
        prev.map(n =>
          n.id === data.notificationId ? { ...n, read: true } : n
        )
      );
      setUnreadCount(prev => Math.max(0, prev - 1));
    };

    // Subscription confirmation
    const handleSubscribed = () => {
      console.log('✅ Notifications subscription confirmed');
      setIsSubscribed(true);
    };

    socket.on('user:notification', handleNotification);
    socket.on('user:price-drop', handlePriceDrop);
    socket.on('user:back-in-stock', handleBackInStock);
    socket.on('user:wishlist-updated', handleWishlistUpdate);
    socket.on('user:notification-updated', handleNotificationUpdated);
    socket.on('user:subscribed-notifications', handleSubscribed);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('user:notification', handleNotification);
      socket.off('user:price-drop', handlePriceDrop);
      socket.off('user:back-in-stock', handleBackInStock);
      socket.off('user:wishlist-updated', handleWishlistUpdate);
      socket.off('user:notification-updated', handleNotificationUpdated);
      socket.off('user:subscribed-notifications', handleSubscribed);
      
      setIsSubscribed(false);
    };
  }, [socket, isAuthenticated, isInitialized]);

  // Mark notification as read
  const markAsRead = (notificationId: string) => {
    if (socket) {
      socket.emit('user:notification-read', { notificationId });
    }
  };

  // Mark all as read
  const markAllAsRead = () => {
    notifications.forEach(n => {
      if (!n.read && n.id) {
        markAsRead(n.id);
      }
    });
  };

  // Clear all notifications
  const clearAll = () => {
    setNotifications([]);
    setUnreadCount(0);
  };

  // Play notification sound with preferences
  const playNotificationSound = () => {
    if (!shouldPlaySound(preferences)) {
      console.log('🔕 Sound disabled by preferences or Do Not Disturb');
      return;
    }

    if (typeof Audio !== 'undefined') {
      try {
        const soundPath = getSoundFilePath(preferences?.sound.soundType || 'default');
        const audio = new Audio(soundPath);
        audio.volume = preferences?.sound.volume || 0.5;
        audio.play().catch(() => {
          console.log('Audio play prevented by browser');
        });
      } catch (error) {
        console.log('Failed to play notification sound');
      }
    }
  };

  return {
    notifications,
    unreadCount,
    isSubscribed,
    markAsRead,
    markAllAsRead,
    clearAll
  };
};

export default useNotifications;

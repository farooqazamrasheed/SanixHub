import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/store/useAuthStore';
import { useNotificationPreferencesStore, shouldPlaySound, getSoundFilePath } from '@/store/useNotificationPreferencesStore';

interface OrderUpdate {
  orderId: string;
  orderNumber: string;
  status?: string;
  timestamp: Date;
}

export const useOrderUpdates = (orderId?: string) => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [lastUpdate, setLastUpdate] = useState<OrderUpdate | null>(null);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('order:subscribe');
            console.log('📋 Subscribed to order updates');

            // Subscribe to specific order if provided
            if (orderId) {
              socket.emit('order:subscribe-single', { orderId });
              console.log(`📋 Subscribed to order ${orderId}`);
            }
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

    // Handle order status changes
    const handleStatusChange = (data: OrderUpdate) => {
      console.log('📋 Order status changed:', data);
      setLastUpdate(data);

      // Invalidate order queries
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
      queryClient.invalidateQueries({ queryKey: ['orders'] });

      // Show notification
      const statusMessages: Record<string, string> = {
        placed: 'Order placed successfully',
        confirmed: 'Order confirmed',
        preparing: 'Order is being prepared',
        ready: 'Order is ready for pickup',
        picked_up: 'Order picked up',
        cancelled: 'Order cancelled'
      };

      if (data.status) {
        toast.success(statusMessages[data.status] || `Order status: ${data.status}`, {
          icon: '📋',
          duration: 4000
        });
      }
    };

    // Handle new order creation
    const handleOrderCreated = (data: any) => {
      console.log('✅ Order created:', data);
      toast.success(`Order ${data.orderNumber} placed successfully!`, {
        icon: '✅',
        duration: 5000
      });
      queryClient.invalidateQueries({ queryKey: ['orders'] });
    };

    socket.on('order:status-changed', handleStatusChange);
    socket.on('order:created', handleOrderCreated);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('order:status-changed', handleStatusChange);
      socket.off('order:created', handleOrderCreated);
    };
  }, [socket, isAuthenticated, isInitialized, orderId, queryClient]);

  return {
    lastUpdate
  };
};

// Hook for admin to receive all order notifications
export const useAdminOrderUpdates = () => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { preferences } = useNotificationPreferencesStore();
  const [newOrderCount, setNewOrderCount] = useState(0);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('order:subscribe-all');
            console.log('📋 Admin subscribed to all orders');
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

    // Handle new orders
    const handleNewOrder = (data: any) => {
      console.log('📋 New order received:', data);
      setNewOrderCount(prev => prev + 1);

      // Show notification
      toast.success(
        `New order #${data.orderNumber} from ${data.customer.name || 'Customer'}`,
        {
          icon: '🔔',
          duration: 6000,
          position: 'top-right'
        }
      );

      // Play notification sound with preferences
      if (preferences?.admin?.newOrderSound && shouldPlaySound(preferences)) {
        if (typeof Audio !== 'undefined') {
          try {
            const soundPath = getSoundFilePath(preferences?.sound.soundType || 'default');
            const audio = new Audio(soundPath);
            audio.volume = preferences?.sound.volume || 0.5;
            audio.play().catch(() => console.log('Audio play prevented'));
          } catch (error) {
            console.log('Failed to play notification sound');
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    // Handle order status changes
    const handleStatusChange = (data: any) => {
      console.log('📋 Order status changed:', data);
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['order', data.orderId] });
    };

    socket.on('order:new', handleNewOrder);
    socket.on('order:status-changed', handleStatusChange);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('order:new', handleNewOrder);
      socket.off('order:status-changed', handleStatusChange);
    };
  }, [socket, isAuthenticated, isInitialized, queryClient]);

  return {
    newOrderCount,
    resetCount: () => setNewOrderCount(0)
  };
};

export default useOrderUpdates;

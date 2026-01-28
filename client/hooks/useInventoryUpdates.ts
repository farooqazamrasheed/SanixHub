import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

interface InventoryUpdate {
  productId: string;
  stock?: number;
  lowStockThreshold?: number;
  isLowStock?: boolean;
  timestamp: Date;
}

export const useInventoryUpdates = (productId?: string) => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [lastUpdate, setLastUpdate] = useState<InventoryUpdate | null>(null);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id && productId) {
        // Add delay to ensure server-side auth is complete
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('inventory:subscribe', { productId });
            console.log(`📦 Subscribed to inventory updates for product ${productId}`);
          }
        }, 300);
      }
    };

    // If already connected, subscribe immediately
    if (socket.connected && productId) {
      subscribe();
    } else if (productId) {
      // Wait for connection
      socket.once('connect', subscribe);
    }

    // Listen for inventory updates
    const handleInventoryUpdate = (data: InventoryUpdate) => {
      console.log('📦 Inventory update received:', data);
      setLastUpdate(data);

      // Invalidate product queries to refetch data
      queryClient.invalidateQueries({ queryKey: ['product', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });

      // Show toast notification
      if (data.stock !== undefined) {
        toast.success(`Stock updated to ${data.stock}`, {
          icon: '📦',
          duration: 3000
        });
      }
    };

    // Listen for low stock alerts
    const handleLowStock = (data: any) => {
      console.log('⚠️ Low stock alert:', data);
      toast.error(`Low stock alert: ${data.productName} (${data.currentStock} left)`, {
        icon: '⚠️',
        duration: 5000
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['product', data.productId] });
    };

    // Listen for out of stock
    const handleOutOfStock = (data: any) => {
      console.log('❌ Out of stock:', data);
      toast.error(`${data.productName} is now out of stock`, {
        icon: '❌',
        duration: 5000
      });

      // Invalidate queries
      queryClient.invalidateQueries({ queryKey: ['product', data.productId] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
    };

    socket.on('inventory:updated', handleInventoryUpdate);
    socket.on('inventory:low-stock', handleLowStock);
    socket.on('inventory:out-of-stock', handleOutOfStock);

    // Cleanup
    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('inventory:updated', handleInventoryUpdate);
      socket.off('inventory:low-stock', handleLowStock);
      socket.off('inventory:out-of-stock', handleOutOfStock);

      // Unsubscribe from product updates
      if (productId) {
        socket.emit('inventory:unsubscribe', { productId });
      }
    };
  }, [socket, isAuthenticated, isInitialized, productId, queryClient]);

  return {
    lastUpdate,
    subscribeToProduct: (pid: string) => {
      socket?.emit('inventory:subscribe', { productId: pid });
    },
    unsubscribeFromProduct: (pid: string) => {
      socket?.emit('inventory:unsubscribe', { productId: pid });
    }
  };
};

// Hook for admin to subscribe to all inventory updates
export const useAdminInventoryUpdates = () => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('inventory:subscribe-all');
            socket.emit('inventory:subscribe-low-stock');
            console.log('📦 Admin subscribed to all inventory updates');
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

    // Handle bulk update progress
    const handleBulkProgress = (data: any) => {
      console.log('📊 Bulk update progress:', data);
      toast.loading(`Updating: ${data.completed}/${data.total}`, {
        id: 'bulk-update',
        duration: 2000
      });

      if (data.completed === data.total) {
        toast.success(`Bulk update complete! ${data.updated} products updated`, {
          id: 'bulk-update',
          duration: 4000
        });
        queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      }
    };

    // Handle product updates
    const handleProductUpdate = (data: any) => {
      queryClient.invalidateQueries({ queryKey: ['admin-products-all'] });
      queryClient.invalidateQueries({ queryKey: ['admin-inventory-low-stock'] });
    };

    socket.on('inventory:bulk-progress', handleBulkProgress);
    socket.on('inventory:product-updated', handleProductUpdate);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('inventory:bulk-progress', handleBulkProgress);
      socket.off('inventory:product-updated', handleProductUpdate);
    };
  }, [socket, isAuthenticated, isInitialized, queryClient]);
};

export default useInventoryUpdates;

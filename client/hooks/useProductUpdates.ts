import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'react-hot-toast';

/**
 * Hook to handle real-time product updates
 * Listens for inventory changes, price changes, and product modifications
 */
interface ProductUpdateData {
  productId: string;
  stock?: number;
  price?: number;
  oldPrice?: number;
  lowStockThreshold?: number;
  isLowStock?: boolean;
  timestamp: Date;
}

export const useProductUpdates = (
  productId?: string,
  onUpdate?: (data: ProductUpdateData) => void
) => {
  const { socket, connected } = useSocket();

  // Subscribe to product updates
  useEffect(() => {
    if (!socket || !connected || !productId) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    const subscribe = () => {
      if (socket.connected && socket.id) {
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            // Subscribe to inventory updates
            socket.emit('inventory:subscribe', { productId });
            console.log(`📦 Subscribed to product updates for ${productId}`);
          }
        }, 300);
      }
    };

    if (socket.connected) {
      subscribe();
    } else {
      socket.once('connect', subscribe);
    }

    // Handle inventory updates
    const handleInventoryUpdate = (data: any) => {
      if (data.productId === productId) {
        console.log('📦 Product inventory updated:', data);
        onUpdate?.({
          productId: data.productId,
          stock: data.stock,
          lowStockThreshold: data.lowStockThreshold,
          isLowStock: data.isLowStock,
          timestamp: data.timestamp,
        });
      }
    };

    // Handle price changes
    const handlePriceChange = (data: any) => {
      if (data.productId === productId) {
        console.log('💰 Product price changed:', data);
        onUpdate?.({
          productId: data.productId,
          price: data.newPrice,
          oldPrice: data.oldPrice,
          timestamp: data.timestamp,
        });
      }
    };

    // Handle low stock alerts
    const handleLowStock = (data: any) => {
      if (data.productId === productId) {
        console.log('⚠️ Product low stock:', data);
        toast.error(`Only ${data.currentStock} left in stock!`, {
          icon: '⚠️',
          duration: 4000,
        });
      }
    };

    // Handle out of stock alerts
    const handleOutOfStock = (data: any) => {
      if (data.productId === productId) {
        console.log('❌ Product out of stock:', data);
        toast.error('This product is now out of stock', {
          icon: '❌',
          duration: 4000,
        });
      }
    };

    socket.on('inventory:updated', handleInventoryUpdate);
    socket.on('product:price-changed', handlePriceChange);
    socket.on('inventory:low-stock', handleLowStock);
    socket.on('inventory:out-of-stock', handleOutOfStock);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('inventory:updated', handleInventoryUpdate);
      socket.off('product:price-changed', handlePriceChange);
      socket.off('inventory:low-stock', handleLowStock);
      socket.off('inventory:out-of-stock', handleOutOfStock);
      
      if (productId) {
        socket.emit('inventory:unsubscribe', { productId });
      }
    };
  }, [socket, connected, productId, onUpdate]);

  return {
    connected,
  };
};

export default useProductUpdates;

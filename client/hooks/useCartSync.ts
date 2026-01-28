import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import toast from 'react-hot-toast';

interface CartUpdate {
  cart: any;
  itemCount?: number;
  timestamp: Date;
}

interface ItemUnavailable {
  productId: string;
  productName: string;
  reason: string;
  timestamp: Date;
}

interface PriceChange {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  timestamp: Date;
}

export const useCartSync = () => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { setCart } = useCartStore();
  const [lastUpdate, setLastUpdate] = useState<CartUpdate | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be fully connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        // Increased to 300ms to ensure authentication middleware has processed
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('cart:subscribe');
            console.log('🛒 Subscribed to cart updates');
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

    // Handle cart updates
    const handleCartUpdate = (data: CartUpdate) => {
      console.log('🛒 Cart updated:', data);
      setLastUpdate(data);

      // Update Zustand store if cart data provided
      if (data.cart) {
        setCart(data.cart.items || []);
      }

      // Invalidate cart queries
      queryClient.invalidateQueries({ queryKey: ['cart'] });

      // Show notification
      toast.success('Cart updated', {
        icon: '🛒',
        duration: 2000
      });
    };

    // Handle cart synced (from another device)
    const handleCartSynced = (data: CartUpdate) => {
      console.log('🔄 Cart synced from another device:', data);
      
      if (data.cart) {
        setCart(data.cart.items || []);
        queryClient.invalidateQueries({ queryKey: ['cart'] });
        
        toast('Cart synced from another device', {
          icon: '🔄',
          duration: 3000
        });
      }
    };

    // Handle item unavailable
    const handleItemUnavailable = (data: ItemUnavailable) => {
      console.log('⚠️ Cart item unavailable:', data);
      
      toast.error(`${data.productName} is no longer available`, {
        icon: '❌',
        duration: 5000
      });

      // Invalidate cart to remove unavailable item
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    };

    // Handle price change
    const handlePriceChange = (data: PriceChange) => {
      console.log('💰 Cart item price changed:', data);
      
      const priceDiff = data.newPrice - data.oldPrice;
      const message = priceDiff > 0 
        ? `${data.productName} price increased to ${data.newPrice}`
        : `${data.productName} price reduced to ${data.newPrice}`;
      
      toast(message, {
        icon: priceDiff > 0 ? '📈' : '📉',
        duration: 5000
      });

      // Invalidate cart to show new price
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    };

    // Handle cart cleared
    const handleCartCleared = () => {
      console.log('🛒 Cart cleared');
      setCart([]);
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    };

    // Handle stock validation result
    const handleStockValidated = (data: any) => {
      console.log('✓ Stock validated:', data);
      
      if (!data.available) {
        toast.error(`Only ${data.currentStock} available`, {
          icon: '⚠️',
          duration: 4000
        });
      }
    };

    socket.on('cart:updated', handleCartUpdate);
    socket.on('cart:synced', handleCartSynced);
    socket.on('cart:item-unavailable', handleItemUnavailable);
    socket.on('cart:price-changed', handlePriceChange);
    socket.on('cart:cleared', handleCartCleared);
    socket.on('cart:stock-validated', handleStockValidated);

    // Confirm subscription
    socket.on('cart:subscribed', () => {
      console.log('✅ Cart subscription confirmed');
    });

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('cart:updated', handleCartUpdate);
      socket.off('cart:synced', handleCartSynced);
      socket.off('cart:item-unavailable', handleItemUnavailable);
      socket.off('cart:price-changed', handlePriceChange);
      socket.off('cart:cleared', handleCartCleared);
      socket.off('cart:stock-validated', handleStockValidated);
      socket.off('cart:subscribed');
    };
  }, [socket, isAuthenticated, isInitialized, queryClient, setCart]);

  // Request cart sync
  const syncCart = () => {
    if (socket && isAuthenticated) {
      setIsSyncing(true);
      socket.emit('cart:sync');
      
      setTimeout(() => {
        setIsSyncing(false);
      }, 2000);
    }
  };

  // Validate stock before adding to cart
  const validateStock = (productId: string, quantity: number) => {
    if (socket && isAuthenticated) {
      socket.emit('cart:validate-stock', { productId, quantity });
    }
  };

  return {
    lastUpdate,
    isSyncing,
    syncCart,
    validateStock
  };
};

export default useCartSync;

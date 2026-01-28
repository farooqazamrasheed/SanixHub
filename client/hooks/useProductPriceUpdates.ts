import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'react-hot-toast';

/**
 * Hook to handle real-time product price updates for customers
 * Listens for price changes and updates product data in real-time
 */
export const useProductPriceUpdates = (onPriceChange?: (data: any) => void) => {
  const { socket, connected } = useSocket();

  useEffect(() => {
    if (!socket || !connected) {
      return;
    }

    // Listen for product price changes (broadcasted to all users)
    socket.on('product:price-changed', (data) => {
      console.log('💰 Product price changed:', data);
      
      // Call the callback if provided
      if (onPriceChange) {
        onPriceChange(data);
      }
      
      // Show toast notification (optional, can be commented out)
      // toast.info(`Price updated for product`, { duration: 2000 });
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.off('product:price-changed');
      }
    };
  }, [socket, connected, onPriceChange]);

  return {
    // Hook doesn't return anything, it just handles side effects
  };
};

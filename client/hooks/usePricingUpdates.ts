import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { usePricingStore } from '@/store/usePricingStore';
import { toast } from 'react-hot-toast';

/**
 * Hook to handle real-time pricing updates via WebSocket
 */
export const usePricingUpdates = () => {
  const { socket, connected } = useSocket();
  const {
    setOperationProgress,
    updateOperationStatus,
    addToHistory,
    loadStats
  } = usePricingStore();

  useEffect(() => {
    if (!socket || !connected) {
      console.log('⏳ Socket not ready yet, skipping pricing subscription');
      return;
    }

    console.log('✅ Subscribing to pricing updates...');
    
    // Subscribe to pricing updates
    socket.emit('pricing:subscribe');

    // Handle subscription confirmation
    socket.on('pricing:subscribed', (data) => {
      console.log('✅ Subscribed to pricing updates:', data.message);
    });

    // Handle bulk operation start
    socket.on('pricing:bulk-start', (data) => {
      console.log('📊 Bulk pricing operation started:', data);
      
      toast.loading(`Starting price update for ${data.totalProducts} products...`, {
        id: `pricing-${data.operationId}`
      });

      setOperationProgress({
        operationId: data.operationId,
        processed: 0,
        total: data.totalProducts,
        percentage: 0,
        currentProduct: '',
        isProcessing: true
      });
    });

    // Handle progress updates
    socket.on('pricing:bulk-progress', (data) => {
      console.log('📊 Progress:', data);
      
      toast.loading(
        `Updating prices: ${data.processed}/${data.total} (${data.percentage}%)`,
        { id: `pricing-${data.operationId}` }
      );

      setOperationProgress({
        operationId: data.operationId,
        processed: data.processed,
        total: data.total,
        percentage: data.percentage,
        currentProduct: data.currentProduct,
        isProcessing: true
      });
    });

    // Handle operation completion
    socket.on('pricing:bulk-complete', (data) => {
      console.log('✅ Bulk pricing operation completed:', data);
      
      toast.success(
        `Successfully updated ${data.totalUpdated} products!`,
        { id: `pricing-${data.operationId}`, duration: 5000 }
      );

      if (data.summary.canUndo) {
        toast.success(
          `You can undo this change within 15 minutes`,
          { duration: 10000 }
        );
      }

      setOperationProgress({
        operationId: data.operationId,
        processed: data.totalUpdated,
        total: data.totalUpdated,
        percentage: 100,
        currentProduct: '',
        isProcessing: false
      });

      updateOperationStatus(data.operationId, 'completed');
      
      // Reload stats
      loadStats();
    });

    // Handle operation failure
    socket.on('pricing:bulk-failed', (data) => {
      console.error('❌ Bulk pricing operation failed:', data);
      
      toast.error(
        `Price update failed: ${data.error}`,
        { id: `pricing-${data.operationId}`, duration: 5000 }
      );

      updateOperationStatus(data.operationId, 'failed');
    });

    // Handle single product price update
    socket.on('product:price-updated', (data) => {
      console.log('💰 Product price updated:', data);
      
      toast.success(
        `${data.productName}: $${data.oldPrice} → $${data.newPrice}`,
        { duration: 3000 }
      );
    });

    // Handle undo operation
    socket.on('pricing:undone', (data) => {
      console.log('↩️ Price change undone:', data);
      
      toast.success(
        `Successfully reverted ${data.productsReverted} products to original prices`,
        { duration: 5000 }
      );

      updateOperationStatus(data.operationId, 'undone');
      
      // Reload stats
      loadStats();
    });

    // Handle notifications
    socket.on('notification:price-change', (data) => {
      console.log('🔔 Price change notification:', data);
      
      if (data.type === 'bulk_price_change') {
        toast(data.message, {
          icon: '💰',
          duration: 4000
        });
      }
    });

    // Cleanup
    return () => {
      if (socket) {
        socket.emit('pricing:unsubscribe');
        socket.off('pricing:subscribed');
        socket.off('pricing:bulk-start');
        socket.off('pricing:bulk-progress');
        socket.off('pricing:bulk-complete');
        socket.off('pricing:bulk-failed');
        socket.off('product:price-updated');
        socket.off('pricing:undone');
        socket.off('notification:price-change');
      }
    };
  }, [socket, connected, setOperationProgress, updateOperationStatus, addToHistory, loadStats]);

  return {
    // Hook doesn't return anything, it just handles side effects
  };
};

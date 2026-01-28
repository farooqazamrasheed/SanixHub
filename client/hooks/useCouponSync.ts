import { useEffect } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'react-hot-toast';

interface UseCouponSyncProps {
  onCouponCreated?: (coupon: any) => void;
  onCouponUpdated?: (coupon: any) => void;
  onCouponDeleted?: (data: any) => void;
  onCouponUsed?: (data: any) => void;
}

export const useCouponSync = ({
  onCouponCreated,
  onCouponUpdated,
  onCouponDeleted,
  onCouponUsed
}: UseCouponSyncProps = {}) => {
  const { socket, isConnected } = useSocket();

  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to coupon updates (admin only)
    socket.emit('coupon:subscribe');

    // Listen for subscription confirmation
    socket.on('coupon:subscribed', () => {
      console.log('✅ Subscribed to coupon updates');
    });

    // Listen for coupon created
    socket.on('coupon:created', (data) => {
      console.log('🎟️ Coupon created:', data);
      
      if (onCouponCreated) {
        onCouponCreated(data.coupon);
      }
      
      toast.success(`New coupon created: ${data.coupon.code}`, {
        duration: 3000,
        icon: '🎟️'
      });
    });

    // Listen for coupon updated
    socket.on('coupon:updated', (data) => {
      console.log('🎟️ Coupon updated:', data);
      
      if (onCouponUpdated) {
        onCouponUpdated(data.coupon);
      }
      
      toast.success(`Coupon updated: ${data.coupon.code}`, {
        duration: 3000,
        icon: '🎟️'
      });
    });

    // Listen for coupon deleted
    socket.on('coupon:deleted', (data) => {
      console.log('🎟️ Coupon deleted:', data);
      
      if (onCouponDeleted) {
        onCouponDeleted(data);
      }
      
      toast.success(`Coupon deleted: ${data.code}`, {
        duration: 3000,
        icon: '🗑️'
      });
    });

    // Listen for coupon used
    socket.on('coupon:used', (data) => {
      console.log('🎟️ Coupon used:', data);
      
      if (onCouponUsed) {
        onCouponUsed(data);
      }
      
      toast.success(`Coupon ${data.code} was used`, {
        duration: 3000,
        icon: '✅'
      });
    });

    // Cleanup
    return () => {
      socket.emit('coupon:unsubscribe');
      socket.off('coupon:subscribed');
      socket.off('coupon:created');
      socket.off('coupon:updated');
      socket.off('coupon:deleted');
      socket.off('coupon:used');
    };
  }, [socket, isConnected, onCouponCreated, onCouponUpdated, onCouponDeleted, onCouponUsed]);

  return {
    isConnected
  };
};

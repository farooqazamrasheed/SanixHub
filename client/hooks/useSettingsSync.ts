import { useEffect, useCallback } from 'react';
import { useSocket } from './useSocket';
import { toast } from 'react-hot-toast';

interface UseSettingsSyncProps {
  onSettingsUpdate?: (data: any) => void;
  category?: string;
}

export const useSettingsSync = ({ onSettingsUpdate, category }: UseSettingsSyncProps = {}) => {
  const { socket, isConnected } = useSocket();

  // Subscribe to settings updates
  useEffect(() => {
    if (!socket || !isConnected) return;

    // Subscribe to settings updates
    socket.emit('settings:subscribe');

    // Listen for subscription confirmation
    socket.on('settings:subscribed', () => {
      console.log('✅ Subscribed to settings updates');
    });

    // Listen for settings updates
    socket.on('settings:updated', (data) => {
      console.log('⚙️ Settings updated:', data);
      
      // Only handle updates for the relevant category if specified
      if (!category || data.category === category) {
        if (onSettingsUpdate) {
          onSettingsUpdate(data);
        }
        
        toast.success(`${data.category} settings updated!`, {
          duration: 3000,
          icon: '⚙️'
        });
      }
    });

    // Listen for maintenance mode changes
    socket.on('settings:maintenance-mode', (data) => {
      console.log('🔧 Maintenance mode:', data.enabled ? 'enabled' : 'disabled');
      
      if (data.enabled) {
        toast.error('Maintenance mode has been enabled', {
          duration: 5000,
          icon: '🔧'
        });
      } else {
        toast.success('Maintenance mode has been disabled', {
          duration: 5000,
          icon: '✅'
        });
      }
    });

    // Listen for payment method changes
    socket.on('settings:payment-method-changed', (data) => {
      console.log('💳 Payment method changed:', data);
      
      if (!category || category === 'payment') {
        toast(`Payment method ${data.method} ${data.enabled ? 'enabled' : 'disabled'}`, {
          duration: 3000,
          icon: '💳'
        });
      }
    });

    // Listen for shipping updates
    socket.on('settings:shipping-updated', (data) => {
      console.log('🚚 Shipping updated:', data);
      
      if (!category || category === 'shipping') {
        toast('Shipping settings updated', {
          duration: 3000,
          icon: '🚚'
        });
      }
    });

    // Cleanup
    return () => {
      socket.emit('settings:unsubscribe');
      socket.off('settings:subscribed');
      socket.off('settings:updated');
      socket.off('settings:maintenance-mode');
      socket.off('settings:payment-method-changed');
      socket.off('settings:shipping-updated');
    };
  }, [socket, isConnected, onSettingsUpdate, category]);

  // Request current settings
  const requestSettings = useCallback((requestCategory: string) => {
    if (!socket || !isConnected) return;

    socket.emit('settings:request', { category: requestCategory });

    // Listen for settings data
    const handleSettingsData = (data: any) => {
      if (onSettingsUpdate && data.category === requestCategory) {
        onSettingsUpdate(data);
      }
    };

    socket.on('settings:data', handleSettingsData);

    return () => {
      socket.off('settings:data', handleSettingsData);
    };
  }, [socket, isConnected, onSettingsUpdate]);

  return {
    isConnected,
    requestSettings
  };
};

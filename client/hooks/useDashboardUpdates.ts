import { useEffect, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getSocket } from '@/lib/socket';
import { useAuthStore } from '@/store/useAuthStore';
import toast from 'react-hot-toast';

interface DashboardStats {
  orders?: number;
  users?: number;
  products?: number;
  lowStock?: number;
  revenue?: number;
  timestamp: Date;
}

interface UserActivity {
  userId: string;
  action: string;
  user?: any;
  timestamp: Date;
}

export const useDashboardUpdates = () => {
  const socket = getSocket();
  const queryClient = useQueryClient();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const [liveStats, setLiveStats] = useState<DashboardStats | null>(null);
  const [recentActivity, setRecentActivity] = useState<UserActivity[]>([]);
  const [isSubscribed, setIsSubscribed] = useState(false);

  useEffect(() => {
    if (!socket || !isAuthenticated || !isInitialized) return;

    let subscribeTimeout: NodeJS.Timeout | null = null;

    // Wait for socket to be connected before subscribing
    const subscribe = () => {
      if (socket.connected && socket.id) {
        // Add delay to ensure server-side auth is complete
        subscribeTimeout = setTimeout(() => {
          if (socket.connected) {
            socket.emit('admin:subscribe-dashboard');
            socket.emit('admin:subscribe-activity');
            console.log('📊 Subscribed to dashboard updates');
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

    // Handle dashboard updates
    const handleDashboardUpdate = (data: DashboardStats) => {
      console.log('📊 Dashboard update received:', data);
      setLiveStats(data);

      // Invalidate dashboard queries
      queryClient.invalidateQueries({ queryKey: ['dashboard-stats'] });
    };

    // Handle user activity
    const handleUserActivity = (data: UserActivity) => {
      console.log('👥 User activity:', data);
      
      // Add to recent activity (keep last 10)
      setRecentActivity(prev => [data, ...prev].slice(0, 10));

      // Show toast for important activities
      const importantActions = ['came_online', 'placed_order', 'registered'];
      if (importantActions.includes(data.action)) {
        toast(`User ${data.action.replace('_', ' ')}`, {
          icon: '👤',
          duration: 3000,
          position: 'top-right'
        });
      }
    };

    // Handle system alerts
    const handleSystemAlert = (data: any) => {
      console.log('⚠️ System alert:', data);
      
      toast.error(data.message, {
        icon: '⚠️',
        duration: 5000,
        position: 'top-center'
      });
    };

    // Handle admin announcements
    const handleAnnouncement = (data: any) => {
      console.log('📢 Announcement:', data);
      
      const icons: Record<string, string> = {
        info: 'ℹ️',
        success: '✅',
        warning: '⚠️',
        error: '❌'
      };

      toast(data.message, {
        icon: icons[data.type] || '📢',
        duration: 6000,
        position: 'top-center'
      });
    };

    // Subscription confirmations
    const handleSubscribedDashboard = () => {
      console.log('✅ Dashboard subscription confirmed');
      setIsSubscribed(true);
      
      // Request initial stats
      socket.emit('admin:get-stats');
    };

    const handleSubscribedActivity = () => {
      console.log('✅ Activity subscription confirmed');
    };

    // Handle stats response
    const handleStats = (data: DashboardStats) => {
      console.log('📊 Stats received:', data);
      setLiveStats(data);
    };

    socket.on('admin:dashboard-update', handleDashboardUpdate);
    socket.on('admin:user-activity', handleUserActivity);
    socket.on('admin:system-alert', handleSystemAlert);
    socket.on('admin:announcement', handleAnnouncement);
    socket.on('admin:subscribed-dashboard', handleSubscribedDashboard);
    socket.on('admin:subscribed-activity', handleSubscribedActivity);
    socket.on('admin:stats', handleStats);

    return () => {
      if (subscribeTimeout) {
        clearTimeout(subscribeTimeout);
      }
      socket.off('connect', subscribe);
      socket.off('admin:dashboard-update', handleDashboardUpdate);
      socket.off('admin:user-activity', handleUserActivity);
      socket.off('admin:system-alert', handleSystemAlert);
      socket.off('admin:announcement', handleAnnouncement);
      socket.off('admin:subscribed-dashboard', handleSubscribedDashboard);
      socket.off('admin:subscribed-activity', handleSubscribedActivity);
      socket.off('admin:stats', handleStats);
      
      setIsSubscribed(false);
    };
  }, [socket, isAuthenticated, isInitialized, queryClient]);

  // Broadcast message to all users
  const broadcastMessage = (message: string, type: 'info' | 'success' | 'warning' | 'error' = 'info') => {
    if (socket) {
      socket.emit('admin:broadcast', { message, type });
    }
  };

  // Request fresh stats
  const refreshStats = () => {
    if (socket) {
      socket.emit('admin:get-stats');
    }
  };

  return {
    liveStats,
    recentActivity,
    isSubscribed,
    broadcastMessage,
    refreshStats
  };
};

export default useDashboardUpdates;

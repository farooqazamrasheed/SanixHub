import { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence } from 'framer-motion';
import { FiShoppingCart, FiPackage, FiAlertCircle, FiCheck } from 'react-icons/fi';
import { useSocket } from '@/hooks/useSocket';

interface Notification {
  id: string;
  type: 'order' | 'inventory' | 'review' | 'alert';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  link?: string;
}

interface NotificationDropdownProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDropdown({ isOpen, onClose }: NotificationDropdownProps) {
  const [mounted, setMounted] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const { socket, isConnected } = useSocket();

  // Prevent hydration error
  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!mounted || !socket || !isConnected) return;

    // Listen for new order notifications
    const handleNewOrder = (data: any) => {
      const newNotification: Notification = {
        id: data.orderId || Date.now().toString(),
        type: 'order',
        title: 'New Order',
        message: `Order #${data.orderNumber} from ${data.customer?.name || 'Customer'}`,
        timestamp: new Date(),
        read: false,
        link: `/admin/orders/${data.orderId}`
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]); // Keep last 10
    };

    // Listen for low stock alerts
    const handleLowStock = (data: any) => {
      const newNotification: Notification = {
        id: Date.now().toString(),
        type: 'inventory',
        title: 'Low Stock Alert',
        message: `${data.productName} is running low (${data.quantity} left)`,
        timestamp: new Date(),
        read: false,
        link: `/admin/inventory`
      };
      
      setNotifications(prev => [newNotification, ...prev.slice(0, 9)]);
    };

    socket.on('order:new', handleNewOrder);
    socket.on('inventory:low-stock', handleLowStock);

    return () => {
      socket.off('order:new', handleNewOrder);
      socket.off('inventory:low-stock', handleLowStock);
    };
  }, [socket, isConnected, mounted]);

  // Don't render on server
  if (!mounted) {
    return null;
  }

  const markAsRead = (id: string) => {
    setNotifications(prev =>
      prev.map(n => (n.id === id ? { ...n, read: true } : n))
    );
  };

  const markAllAsRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const clearAll = () => {
    setNotifications([]);
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'order':
        return <FiShoppingCart className="w-5 h-5 text-blue-500" />;
      case 'inventory':
        return <FiPackage className="w-5 h-5 text-orange-500" />;
      case 'alert':
        return <FiAlertCircle className="w-5 h-5 text-red-500" />;
      default:
        return <FiCheck className="w-5 h-5 text-green-500" />;
    }
  };

  const formatTime = (date: Date) => {
    const now = new Date();
    const diff = now.getTime() - new Date(date).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return `${days}d ago`;
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <div
            className="fixed inset-0 z-40"
            onClick={onClose}
          />

          {/* Dropdown */}
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="absolute right-0 mt-2 w-96 bg-white rounded-lg shadow-xl border border-gray-200 z-50"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Notifications</h3>
              {notifications.length > 0 && (
                <div className="flex items-center gap-2">
                  <button
                    onClick={markAllAsRead}
                    className="text-xs text-primary-600 hover:text-primary-700"
                  >
                    Mark all read
                  </button>
                  <button
                    onClick={clearAll}
                    className="text-xs text-gray-500 hover:text-gray-700"
                  >
                    Clear all
                  </button>
                </div>
              )}
            </div>

            {/* Notifications List */}
            <div className="max-h-96 overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <FiCheck className="w-12 h-12 mb-2 text-gray-300" />
                  <p className="text-sm">No notifications</p>
                  <p className="text-xs text-gray-400">You're all caught up!</p>
                </div>
              ) : (
                notifications.map((notification) => (
                  <Link
                    key={notification.id}
                    href={notification.link || '#'}
                    onClick={() => {
                      markAsRead(notification.id);
                      onClose();
                    }}
                  >
                    <div
                      className={`px-4 py-3 border-b border-gray-100 hover:bg-gray-50 transition cursor-pointer ${
                        !notification.read ? 'bg-blue-50' : ''
                      }`}
                    >
                      <div className="flex gap-3">
                        <div className="flex-shrink-0 mt-1">
                          {getIcon(notification.type)}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-medium text-gray-900">
                              {notification.title}
                            </p>
                            {!notification.read && (
                              <span className="w-2 h-2 bg-blue-500 rounded-full flex-shrink-0"></span>
                            )}
                          </div>
                          <p className="text-sm text-gray-600 mt-1">
                            {notification.message}
                          </p>
                          <p className="text-xs text-gray-400 mt-1">
                            {formatTime(notification.timestamp)}
                          </p>
                        </div>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>

            {/* Footer */}
            {notifications.length > 0 && (
              <div className="px-4 py-3 border-t border-gray-200 text-center">
                <Link
                  href="/admin/notifications"
                  className="text-sm text-primary-600 hover:text-primary-700 font-medium"
                  onClick={onClose}
                >
                  View all notifications
                </Link>
              </div>
            )}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

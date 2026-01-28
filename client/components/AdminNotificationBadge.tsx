import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiBell } from 'react-icons/fi';
import { useAdminOrderUpdates } from '@/hooks/useOrderUpdates';
import NotificationDropdown from '@/components/NotificationDropdown';

interface AdminNotificationBadgeProps {
  className?: string;
}

export default function AdminNotificationBadge({ className = '' }: AdminNotificationBadgeProps) {
  const { newOrderCount, resetCount } = useAdminOrderUpdates();
  const [isOpen, setIsOpen] = useState(false);

  const handleClick = () => {
    setIsOpen(!isOpen);
    if (!isOpen && newOrderCount > 0) {
      // Reset count when opening dropdown
      setTimeout(resetCount, 500);
    }
  };

  return (
    <div className={`relative ${className}`}>
      <button
        onClick={handleClick}
        className="relative p-2 rounded-lg hover:bg-gray-100 transition-colors"
        title={`${newOrderCount} new ${newOrderCount === 1 ? 'order' : 'orders'}`}
      >
        <FiBell className="w-5 h-5 text-gray-700" />
        
        {newOrderCount > 0 && (
          <>
            {/* Badge */}
            <motion.span
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full min-w-[20px] h-5 px-1 flex items-center justify-center"
            >
              {newOrderCount > 99 ? '99+' : newOrderCount}
            </motion.span>

            {/* Pulse animation */}
            <motion.span
              animate={{
                scale: [1, 1.5, 1],
                opacity: [0.5, 0, 0.5]
              }}
              transition={{
                duration: 2,
                repeat: Infinity,
                ease: "easeInOut"
              }}
              className="absolute -top-1 -right-1 bg-red-500 rounded-full w-5 h-5"
            />
          </>
        )}
      </button>

      {/* Notification Dropdown */}
      <NotificationDropdown isOpen={isOpen} onClose={() => setIsOpen(false)} />
    </div>
  );
}

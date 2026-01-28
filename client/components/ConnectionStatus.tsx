import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiWifi, FiWifiOff, FiRefreshCw } from 'react-icons/fi';
import { useSocket } from '@/hooks/useSocket';
import { reconnectSocket } from '@/lib/socket';

export default function ConnectionStatus() {
  const { connected } = useSocket();
  const [showOffline, setShowOffline] = useState(false);
  const [isReconnecting, setIsReconnecting] = useState(false);

  useEffect(() => {
    let timeout: NodeJS.Timeout;
    
    if (!connected) {
      // Show offline message after 2 seconds of disconnect
      timeout = setTimeout(() => {
        setShowOffline(true);
      }, 2000);
    } else {
      setShowOffline(false);
      setIsReconnecting(false);
    }

    return () => clearTimeout(timeout);
  }, [connected]);

  const handleReconnect = () => {
    setIsReconnecting(true);
    reconnectSocket();
    
    setTimeout(() => {
      setIsReconnecting(false);
    }, 3000);
  };

  return (
    <AnimatePresence>
      {showOffline && (
        <motion.div
          initial={{ opacity: 0, y: -100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -100 }}
          className="fixed top-0 left-0 right-0 z-50 bg-red-500 text-white py-3 px-4 shadow-lg"
        >
          <div className="container mx-auto flex items-center justify-between">
            <div className="flex items-center gap-3">
              <FiWifiOff className="w-5 h-5" />
              <div>
                <p className="font-semibold">Connection Lost</p>
                <p className="text-sm text-red-100">
                  You're offline. Real-time updates paused.
                </p>
              </div>
            </div>

            <button
              onClick={handleReconnect}
              disabled={isReconnecting}
              className="flex items-center gap-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg transition-colors disabled:opacity-50"
            >
              <FiRefreshCw className={`w-4 h-4 ${isReconnecting ? 'animate-spin' : ''}`} />
              <span className="font-medium">
                {isReconnecting ? 'Reconnecting...' : 'Reconnect'}
              </span>
            </button>
          </div>
        </motion.div>
      )}

      {/* Connection restored notification */}
      <AnimatePresence>
        {connected && showOffline && (
          <motion.div
            initial={{ opacity: 0, y: -100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -100 }}
            className="fixed top-0 left-0 right-0 z-50 bg-green-500 text-white py-3 px-4 shadow-lg"
          >
            <div className="container mx-auto flex items-center gap-3">
              <FiWifi className="w-5 h-5" />
              <div>
                <p className="font-semibold">Connection Restored</p>
                <p className="text-sm text-green-100">
                  You're back online. Real-time updates resumed.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </AnimatePresence>
  );
}

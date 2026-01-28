import { useSocket } from '@/hooks/useSocket';
import { motion } from 'framer-motion';

interface LiveIndicatorProps {
  showText?: boolean;
  className?: string;
  position?: 'top-right' | 'top-left' | 'inline';
}

export default function LiveIndicator({ 
  showText = true, 
  className = '',
  position = 'inline'
}: LiveIndicatorProps) {
  const { connected } = useSocket();

  const positionClasses = {
    'top-right': 'fixed top-4 right-4 z-50',
    'top-left': 'fixed top-4 left-4 z-50',
    'inline': ''
  };

  return (
    <div className={`flex items-center gap-2 ${positionClasses[position]} ${className}`}>
      <motion.div
        className="relative"
        animate={{
          scale: connected ? [1, 1.2, 1] : 1
        }}
        transition={{
          duration: 2,
          repeat: connected ? Infinity : 0,
          ease: "easeInOut"
        }}
      >
        <div
          className={`w-3 h-3 rounded-full ${
            connected ? 'bg-green-500' : 'bg-gray-400'
          }`}
        />
        {connected && (
          <motion.div
            className="absolute inset-0 w-3 h-3 rounded-full bg-green-500"
            animate={{
              scale: [1, 1.5, 2],
              opacity: [0.8, 0.4, 0]
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: "easeOut"
            }}
          />
        )}
      </motion.div>
      
      {showText && (
        <span className={`text-sm font-medium ${
          connected ? 'text-green-600' : 'text-gray-500'
        }`}>
          {connected ? 'Live' : 'Offline'}
        </span>
      )}
    </div>
  );
}

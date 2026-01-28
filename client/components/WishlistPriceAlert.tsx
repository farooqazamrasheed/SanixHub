import { motion, AnimatePresence } from 'framer-motion';
import { FiTrendingDown, FiX } from 'react-icons/fi';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface PriceAlert {
  productId: string;
  productName: string;
  oldPrice: number;
  newPrice: number;
  discount: number;
  slug: string;
}

interface WishlistPriceAlertProps {
  alerts: PriceAlert[];
  onDismiss: (productId: string) => void;
}

export default function WishlistPriceAlert({ alerts, onDismiss }: WishlistPriceAlertProps) {
  const [visibleAlerts, setVisibleAlerts] = useState<PriceAlert[]>([]);

  useEffect(() => {
    setVisibleAlerts(alerts);
  }, [alerts]);

  if (visibleAlerts.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-50 space-y-3 max-w-md">
      <AnimatePresence>
        {visibleAlerts.map((alert) => (
          <motion.div
            key={alert.productId}
            initial={{ opacity: 0, x: 100, scale: 0.8 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 100, scale: 0.8 }}
            className="bg-gradient-to-r from-green-500 to-emerald-600 text-white rounded-xl shadow-2xl p-4 relative overflow-hidden"
          >
            {/* Animated background */}
            <div className="absolute inset-0 bg-white opacity-10">
              <motion.div
                className="absolute inset-0"
                animate={{
                  backgroundPosition: ['0% 0%', '100% 100%'],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  ease: 'linear',
                }}
                style={{
                  backgroundImage: 'linear-gradient(45deg, transparent 25%, rgba(255,255,255,0.1) 25%, rgba(255,255,255,0.1) 50%, transparent 50%, transparent 75%, rgba(255,255,255,0.1) 75%, rgba(255,255,255,0.1))',
                  backgroundSize: '20px 20px',
                }}
              />
            </div>

            {/* Content */}
            <div className="relative">
              {/* Header */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 bg-white bg-opacity-20 rounded-full flex items-center justify-center">
                    <FiTrendingDown className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-bold text-sm">Price Drop Alert!</h4>
                    <p className="text-xs text-green-100">{alert.discount}% OFF</p>
                  </div>
                </div>
                <button
                  onClick={() => onDismiss(alert.productId)}
                  className="p-1 hover:bg-white hover:bg-opacity-20 rounded transition-colors"
                >
                  <FiX className="w-4 h-4" />
                </button>
              </div>

              {/* Product Info */}
              <p className="text-sm font-medium mb-2 line-clamp-2">
                {alert.productName}
              </p>

              {/* Price Comparison */}
              <div className="flex items-center gap-3 mb-3">
                <div className="flex-1">
                  <p className="text-xs text-green-100">Was</p>
                  <p className="text-lg font-bold line-through opacity-80">
                    Rs {alert.oldPrice.toFixed(2)}
                  </p>
                </div>
                <div className="text-2xl">→</div>
                <div className="flex-1">
                  <p className="text-xs text-green-100">Now</p>
                  <p className="text-2xl font-bold">
                    Rs {alert.newPrice.toFixed(2)}
                  </p>
                </div>
              </div>

              {/* Action */}
              <Link
                href={`/products/${alert.slug}`}
                className="block w-full bg-white text-green-600 text-center py-2 rounded-lg font-semibold hover:bg-green-50 transition-colors"
              >
                View Product
              </Link>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

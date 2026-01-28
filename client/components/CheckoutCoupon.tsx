import { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { FiTag, FiCheck, FiX } from 'react-icons/fi';
import { motion, AnimatePresence } from 'framer-motion';
import api from '@/lib/api';
import { useCouponStore } from '@/store/useCouponStore';

interface CheckoutCouponProps {
  cartTotal: number;
  onCouponApplied: (discount: number, coupon: any) => void;
  onCouponRemoved: () => void;
}

export default function CheckoutCoupon({ cartTotal, onCouponApplied, onCouponRemoved }: CheckoutCouponProps) {
  const {
    couponCode: storeCouponCode,
    appliedCoupon: storeAppliedCoupon,
    discount: storeDiscount,
    setCouponCode: setStoreCouponCode,
    setAppliedCoupon: setStoreAppliedCoupon,
    removeCoupon
  } = useCouponStore();

  const [couponCode, setCouponCode] = useState(storeCouponCode);
  const [appliedCoupon, setAppliedCoupon] = useState<any>(storeAppliedCoupon);
  const [discount, setDiscount] = useState(storeDiscount);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Sync with store on mount and when store changes
  useEffect(() => {
    setCouponCode(storeCouponCode);
    setAppliedCoupon(storeAppliedCoupon);
    setDiscount(storeDiscount);
  }, [storeCouponCode, storeAppliedCoupon, storeDiscount]);

  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      setError('Please enter a coupon code');
      return;
    }

    setLoading(true);
    setError('');

    try {
      // api.ts interceptor returns response.data automatically
      // Server response: { success: true, data: { coupon: { code, type, value, discount } } }
      const response = await api.post('/coupons/validate', {
        code: couponCode.toUpperCase(),
        orderTotal: cartTotal
      });

      const { coupon } = response.data;

      // Update local state
      setAppliedCoupon(coupon);
      setDiscount(coupon.discount);
      
      // Update store (syncs across pages)
      setStoreAppliedCoupon(coupon, coupon.discount);
      
      // Call parent callback
      onCouponApplied(coupon.discount, coupon);

      toast.success(`Coupon applied! You saved ${coupon.discount} PKR`, {
        icon: '🎉',
        duration: 4000
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Invalid coupon code';
      setError(errorMessage);
      toast.error(errorMessage, {
        icon: '❌'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    // Update local state
    setAppliedCoupon(null);
    setDiscount(0);
    setCouponCode('');
    setError('');
    
    // Update store (syncs across pages)
    removeCoupon();
    
    // Call parent callback
    onCouponRemoved();
    
    toast.success('Coupon removed', {
      icon: 'ℹ️'
    });
  };

  // Update store when local coupon code changes
  const handleCouponCodeChange = (code: string) => {
    setCouponCode(code);
    setStoreCouponCode(code);
    setError('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleApplyCoupon();
    }
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-4">
      <div className="flex items-center gap-2 mb-3">
        <FiTag className="w-5 h-5 text-primary-600" />
        <h3 className="text-sm font-semibold text-gray-900">Have a coupon code?</h3>
      </div>

      {!appliedCoupon ? (
        <div className="space-y-2">
          <div className="flex gap-2">
            <div className="flex-1">
              <input
                type="text"
                value={couponCode}
                onChange={(e) => handleCouponCodeChange(e.target.value.toUpperCase())}
                onKeyPress={handleKeyPress}
                placeholder="Enter coupon code"
                className={`w-full px-3 py-2 border rounded-lg text-sm uppercase focus:outline-none focus:ring-2 focus:ring-primary-500 ${
                  error ? 'border-red-500' : 'border-gray-300'
                }`}
                disabled={loading}
              />
            </div>
            <button
              onClick={handleApplyCoupon}
              disabled={loading || !couponCode.trim()}
              className="px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-lg hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
            >
              {loading ? (
                <div className="flex items-center gap-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Applying...</span>
                </div>
              ) : (
                'Apply'
              )}
            </button>
          </div>

          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex items-center gap-2 text-xs text-red-600 bg-red-50 px-3 py-2 rounded"
              >
                <FiX className="w-4 h-4" />
                <span>{error}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      ) : (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-green-50 border border-green-200 rounded-lg p-3"
        >
          <div className="flex items-start justify-between gap-2">
            <div className="flex-1">
              <div className="flex items-center gap-2">
                <FiCheck className="w-5 h-5 text-green-600" />
                <span className="text-sm font-semibold text-green-900">
                  Coupon Applied: {appliedCoupon.code}
                </span>
              </div>
              {appliedCoupon.description && (
                <p className="text-xs text-green-700 mt-1 ml-7">
                  {appliedCoupon.description}
                </p>
              )}
              <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-green-700">
                <span>
                  Type: {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% off` : `PKR ${appliedCoupon.value} off`}
                </span>
                <span className="font-semibold">
                  You saved: PKR {discount}
                </span>
              </div>
            </div>
            <button
              onClick={handleRemoveCoupon}
              className="text-green-600 hover:text-green-800 transition"
              title="Remove coupon"
            >
              <FiX className="w-5 h-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Coupon Info */}
      <div className="mt-3 pt-3 border-t border-gray-200">
        <p className="text-xs text-gray-500">
          💡 Tip: Coupons are applied automatically at checkout based on your cart total
        </p>
      </div>
    </div>
  );
}

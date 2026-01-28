import { GetServerSideProps } from 'next';
import { useEffect, useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { motion, AnimatePresence } from 'framer-motion';
import { FiTrash2, FiShoppingBag, FiTag, FiShield, FiClock, FiTruck, FiArrowLeft, FiMinus, FiPlus, FiX } from 'react-icons/fi';
import Layout from '@/components/Layout';
import BackButton from '@/components/BackButton';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCouponStore } from '@/store/useCouponStore';
import { useProductPriceUpdates } from '@/hooks/useProductPriceUpdates';
import { useCartSync } from '@/hooks/useCartSync';
import { cartAPI } from '@/lib/api';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import { useQuery, useMutation } from '@tanstack/react-query';

export default function CartPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { isAuthenticated, user } = useAuthStore();
  const { items, setCart, updateQuantity, removeItem, clearCart, getTotalPrice } = useCartStore();
  
  // Enable real-time WebSocket cart sync
  useCartSync();
  const { 
    couponCode, 
    appliedCoupon, 
    discount: couponDiscount,
    setCouponCode: setStoreCouponCode,
    setAppliedCoupon: setStoreAppliedCoupon,
    removeCoupon
  } = useCouponStore();
  const [couponLoading, setCouponLoading] = useState(false);
  const [mounted, setMounted] = useState(false);

  // Local setter that syncs with store
  const setCouponCode = (code: string) => {
    setStoreCouponCode(code);
  };

  // Fix hydration - wait for client mount
  useEffect(() => {
    setMounted(true);
  }, []);
  
  // Real-time price updates for cart items
  useProductPriceUpdates((data) => {
    // Check if any cart item matches the updated product
    const hasProduct = items.some(item => item.product._id === data.productId);
    if (hasProduct) {
      console.log('💰 Cart item price updated, refetching cart...');
      // Refetch cart to get updated prices
      if (isAuthenticated) {
        cartQuery.refetch();
      } else {
        // For guest users, we need to update the local cart item
        // This is handled automatically by the cart store on next page load
        toast.info('Product price has been updated in your cart', {
          icon: '💰',
          duration: 3000
        });
      }
    }
  });

  // Debug logging
  console.log('🛒 Cart Page - Items:', items);
  console.log('🛒 Cart Page - isAuthenticated:', isAuthenticated);
  console.log('🛒 Cart Page - Mounted:', mounted);

  // Fetch cart from API if authenticated
  const cartQuery = useQuery({
    queryKey: ['cart'],
    queryFn: cartAPI.get,
    enabled: isAuthenticated,
  });
  const { data: cartData, refetch } = cartQuery;

  // Update cart item mutation
  const updateMutation = useMutation({
    mutationFn: ({ productId, quantity }: any) => cartAPI.updateItem(productId, { quantity }),
    onSuccess: () => {
      refetch();
      toast.success('Cart updated');
    },
  });

  // Remove cart item mutation
  const removeMutation = useMutation({
    mutationFn: (productId: string) => cartAPI.removeItem(productId),
    onSuccess: () => {
      refetch();
      toast.success('Item removed from cart');
    },
  });

  // Initial cart load from API (only on first mount)
  useEffect(() => {
    // Only sync on initial page load when cart is empty
    if (isAuthenticated && cartData?.data?.cart && !items.length && mounted) {
      const apiCartItems = cartData.data.cart.items;
      console.log('🔄 Initial cart load from API:', apiCartItems);
      console.log('📦 API cart items count:', apiCartItems.length);
      
      // Set cart from API only on initial load
      setCart(apiCartItems || []);
    }
    // Note: Real-time updates are handled by useCartSync hook
  }, [cartData, isAuthenticated, mounted]);

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    // Find the product to check stock
    const cartItem = items.find(item => item.product._id === productId);
    if (cartItem) {
      const maxStock = cartItem.product.inventory?.stockQuantity || 0;
      
      // Check if out of stock
      if (maxStock === 0) {
        toast.error('This product is currently out of stock');
        return;
      }
      
      // Check if exceeds available stock
      if (newQuantity > maxStock) {
        toast.error(`Only ${maxStock} items available in stock`);
        return;
      }
    }
    
    if (isAuthenticated) {
      updateMutation.mutate({ productId, quantity: newQuantity });
    } else {
      updateQuantity(productId, newQuantity);
    }
  };

  const handleRemoveItem = (productId: string) => {
    if (isAuthenticated) {
      removeMutation.mutate(productId);
    } else {
      removeItem(productId);
    }
  };

  const handleClearCart = () => {
    if (confirm('Are you sure you want to clear your cart?')) {
      clearCart();
      if (isAuthenticated) {
        cartAPI.clear().then(() => {
          refetch();
          toast.success('Cart cleared');
        });
      }
    }
  };

  const subtotal = getTotalPrice();
  const discount = couponDiscount;
  const tax = 0; // No tax for now
  const total = subtotal - discount + tax;

  // Apply coupon handler
  const handleApplyCoupon = async () => {
    if (!couponCode.trim()) {
      toast.error('Please enter a coupon code');
      return;
    }

    if (!isAuthenticated) {
      toast.error('Please login to apply coupons');
      return;
    }

    setCouponLoading(true);

    try {
      // api.ts interceptor returns response.data automatically
      // So response = { success: true, data: { coupon: {...} } }
      const response = await api.post('/coupons/validate', {
        code: couponCode.toUpperCase(),
        orderTotal: subtotal
      });

      const { coupon } = response.data;
      
      // Save to store (syncs across pages)
      setStoreAppliedCoupon(coupon, coupon.discount);
      
      toast.success(`Coupon applied! You saved PKR ${coupon.discount}`, {
        icon: '🎉',
        duration: 4000
      });
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Invalid coupon code';
      toast.error(errorMessage, {
        icon: '❌'
      });
    } finally {
      setCouponLoading(false);
    }
  };

  // Remove coupon handler
  const handleRemoveCoupon = () => {
    removeCoupon(); // Removes from store (syncs across pages)
    toast.success('Coupon removed', {
      icon: 'ℹ️'
    });
  };

  // Show loading state during hydration
  if (!mounted) {
    return (
      <>
        <NextSeo title="Shopping Cart - SanixHub" />
        <Layout>
          <div className="container-custom py-12">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
              <p className="mt-4 text-gray-600">Loading cart...</p>
            </div>
          </div>
        </Layout>
      </>
    );
  }

  if (items.length === 0) {
    return (
      <>
        <NextSeo title="Shopping Cart - SanixHub" />
        <Layout>
          <div className="container-custom py-12">
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="max-w-2xl mx-auto text-center"
            >
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-32 h-32 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-full flex items-center justify-center"
              >
                <FiShoppingBag className="w-16 h-16 text-gray-400" />
              </motion.div>
              <h1 className="text-3xl font-bold mb-4">Your cart is empty</h1>
              <p className="text-gray-600 mb-8">
                Looks like you haven't added any items to your cart yet.
              </p>
              <Link href="/products" className="btn btn-primary inline-flex items-center gap-2 px-8 py-3 shadow-lg hover:shadow-xl transition-all">
                <FiShoppingBag className="w-5 h-5" />
                Start Shopping
              </Link>
            </motion.div>
          </div>
        </Layout>
      </>
    );
  }

  return (
    <>
      <NextSeo title="Shopping Cart - SanixHub" />
      <Layout>
        <div className="bg-gradient-to-br from-gray-50 to-gray-100 py-8 min-h-screen">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/products" label="Continue Shopping" variant="ghost" />
            </div>

            {/* Header */}
            <motion.div 
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-8"
            >
              <div className="flex items-center justify-between">
                <div>
                  <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent mb-2">
                    Shopping Cart
                  </h1>
                  <p className="text-gray-600">
                    {items.length} {items.length === 1 ? 'item' : 'items'} in your cart
                  </p>
                </div>
              </div>
            </motion.div>

            <div className="grid lg:grid-cols-3 gap-8">
              {/* Cart Items */}
              <div className="lg:col-span-2 space-y-4">
                <motion.div 
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  className="bg-white rounded-2xl shadow-lg overflow-hidden"
                >
                  {/* Header */}
                  <div className="px-6 py-5 bg-gradient-to-r from-primary-50 to-primary-100 border-b border-primary-200 flex justify-between items-center">
                    <h2 className="font-bold text-lg text-primary-900 flex items-center gap-2">
                      <FiShoppingBag className="w-5 h-5" />
                      Cart Items ({items.length})
                    </h2>
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={handleClearCart}
                      className="flex items-center gap-2 text-red-600 hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-red-50 transition-all"
                    >
                      <FiTrash2 className="w-4 h-4" />
                      Clear Cart
                    </motion.button>
                  </div>

                  {/* Items */}
                  <AnimatePresence>
                    <div className="divide-y divide-gray-100">
                      {items.map((item, index) => (
                        <motion.div
                          key={item.product._id}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, x: -100 }}
                          transition={{ delay: index * 0.1 }}
                        >
                          <CartItem
                            item={item}
                            onUpdateQuantity={handleUpdateQuantity}
                            onRemove={handleRemoveItem}
                          />
                        </motion.div>
                      ))}
                    </div>
                  </AnimatePresence>
                </motion.div>

                {/* Continue Shopping - Mobile */}
                <Link href="/products" className="md:hidden flex items-center gap-2 text-primary-600 hover:text-primary-700 font-medium transition-colors">
                  <FiArrowLeft className="w-5 h-5" />
                  Continue Shopping
                </Link>
              </div>

              {/* Order Summary */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="lg:col-span-1"
              >
                <div className="bg-white rounded-2xl shadow-lg p-6 sticky top-24 border border-gray-100">
                  <h2 className="text-xl font-bold mb-6 flex items-center gap-2 text-primary-900">
                    <FiShoppingBag className="w-6 h-6" />
                    Order Summary
                  </h2>

                  {/* Coupon Code */}
                  <div className="mb-6 p-4 bg-gradient-to-r from-primary-50 to-primary-100 rounded-xl border border-primary-200">
                    {!appliedCoupon ? (
                      <>
                        <label className="block text-sm font-semibold mb-3 flex items-center gap-2 text-primary-900">
                          <FiTag className="w-4 h-4" />
                          Have a coupon code?
                        </label>
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={couponCode}
                            onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                            onKeyPress={(e) => e.key === 'Enter' && handleApplyCoupon()}
                            placeholder="Enter code"
                            disabled={couponLoading}
                            className="flex-1 input focus:ring-2 focus:ring-primary-500 disabled:opacity-50"
                          />
                          <motion.button 
                            whileHover={{ scale: 1.05 }}
                            whileTap={{ scale: 0.95 }}
                            onClick={handleApplyCoupon}
                            disabled={couponLoading || !couponCode.trim()}
                            className="btn btn-primary px-4 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {couponLoading ? (
                              <div className="flex items-center gap-2">
                                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                                <span>Applying...</span>
                              </div>
                            ) : (
                              'Apply'
                            )}
                          </motion.button>
                        </div>
                      </>
                    ) : (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              <span className="text-sm font-semibold text-green-900">
                                Coupon Applied: {appliedCoupon.code}
                              </span>
                            </div>
                            <div className="flex items-center gap-4 mt-2 ml-7 text-xs text-green-700">
                              <span>
                                Type: {appliedCoupon.type === 'percentage' ? `${appliedCoupon.value}% off` : `PKR ${appliedCoupon.value} off`}
                              </span>
                              <span className="font-semibold">
                                You saved: PKR {appliedCoupon.discount}
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
                      </div>
                    )}
                  </div>

                  {/* Price Breakdown */}
                  <div className="space-y-4 mb-6 p-4 bg-gray-50 rounded-xl">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Subtotal</span>
                      <span className="font-bold text-gray-900">PKR {subtotal.toLocaleString()}</span>
                    </div>

                    {discount > 0 && (
                      <div className="flex justify-between items-center text-green-600">
                        <span className="font-medium">Discount</span>
                        <span className="font-bold">-PKR {discount.toLocaleString()}</span>
                      </div>
                    )}

                    <div className="flex justify-between items-center">
                      <span className="text-gray-600 font-medium">Tax</span>
                      <span className="font-bold text-gray-900">PKR {tax.toLocaleString()}</span>
                    </div>

                    <div className="border-t-2 border-primary-200 pt-4 mt-4">
                      <div className="flex justify-between items-center">
                        <span className="text-lg font-bold text-gray-900">Total</span>
                        <span className="text-2xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                          PKR {total.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Account Deactivated Warning */}
                  {isAuthenticated && user && !(user as any).isActive && (
                    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
                      <div className="flex items-start gap-3">
                        <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                        </svg>
                        <div className="text-sm">
                          <p className="font-semibold text-red-800 mb-1">Account Deactivated</p>
                          <p className="text-red-700">
                            Your account has been deactivated by admin. Please contact admin to reactivate your account before placing orders.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Checkout Button */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => router.push('/checkout')}
                    disabled={isAuthenticated && user && !(user as any).isActive}
                    className="w-full btn btn-primary py-4 text-lg font-bold mb-4 disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl transition-all flex items-center justify-center gap-2"
                  >
                    <FiShoppingBag className="w-5 h-5" />
                    Proceed to Checkout
                  </motion.button>

                  {/* Payment Info */}
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 rounded-xl p-4 mb-4 border border-blue-200">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 bg-blue-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiTruck className="w-5 h-5 text-white" />
                      </div>
                      <div className="text-sm">
                        <p className="font-bold text-blue-900 mb-1">Cash on Pickup</p>
                        <p className="text-blue-700">
                          Pay when you collect your order from our store
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Benefits */}
                  <div className="space-y-3 p-4 bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl border border-green-200">
                    <p className="font-bold text-green-900 text-sm mb-3">Why Shop With Us?</p>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiShield className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-green-800 font-medium">Secure checkout</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.2 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <svg className="w-3.5 h-3.5 text-white" fill="currentColor" viewBox="0 0 20 20">
                          <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                        </svg>
                      </div>
                      <span className="text-green-800 font-medium">Quality guaranteed</span>
                    </motion.div>
                    <motion.div 
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.3 }}
                      className="flex items-center gap-3 text-sm"
                    >
                      <div className="w-6 h-6 bg-green-500 rounded-full flex items-center justify-center flex-shrink-0">
                        <FiClock className="w-3.5 h-3.5 text-white" />
                      </div>
                      <span className="text-green-800 font-medium">24/7 support</span>
                    </motion.div>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </Layout>
    </>
  );
}

function CartItem({ item, onUpdateQuantity, onRemove }: any) {
  const { product, quantity } = item;
  
  // Safety checks for undefined product data
  if (!product || !product.pricing) {
    return null;
  }
  
  const price = product.pricing.salePrice || product.pricing.basePrice;
  const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
  const subtotal = price * quantity;
  
  // Safe inventory access with defaults
  const maxQuantity = product.inventory?.stockQuantity ?? 999;
  const isOutOfStock = product.inventory ? maxQuantity === 0 : false;
  const exceedsStock = quantity > maxQuantity;
  
  const hasDiscount = product.pricing.salePrice && product.pricing.salePrice < product.pricing.basePrice;
  const discountPercent = hasDiscount 
    ? Math.round(((product.pricing.basePrice - product.pricing.salePrice) / product.pricing.basePrice) * 100)
    : 0;

  return (
    <div className="p-6 hover:bg-gray-50 transition-colors">
      <div className="flex gap-4 md:gap-6">
        {/* Product Image */}
        <Link href={`/products/${product.slug}`} className="flex-shrink-0 group">
          <div className="relative w-24 h-24 md:w-28 md:h-28 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl overflow-hidden shadow-md border border-gray-200 group-hover:shadow-lg transition-all">
            {primaryImage?.url && (
              <Image
                src={primaryImage.url}
                alt={product.name.en}
                fill
                className={`object-contain p-3 group-hover:scale-110 transition-transform duration-300 ${isOutOfStock ? 'blur-sm' : ''}`}
              />
            )}
            {hasDiscount && (
              <div className="absolute top-2 left-2 bg-red-500 text-white px-2 py-1 rounded-full text-xs font-bold shadow-md">
                -{discountPercent}%
              </div>
            )}
          </div>
        </Link>

        {/* Product Info */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-start mb-2">
            <div className="flex-1 pr-4">
              <Link href={`/products/${product.slug}`}>
                <h3 className="font-bold text-gray-900 hover:text-primary-600 transition mb-1 line-clamp-2">
                  {product.name.en}
                </h3>
              </Link>
              <p className="text-sm text-gray-500 font-mono">SKU: {product.sku}</p>
              {product.brand?.name && (
                <p className="text-xs text-primary-600 font-semibold mt-1">
                  Brand: {product.brand.name.en || product.brand.name}
                </p>
              )}
            </div>
            
            {/* Remove Button */}
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              onClick={() => onRemove(product._id)}
              className="text-red-500 hover:text-red-700 p-2 hover:bg-red-50 rounded-lg transition-all"
              title="Remove item"
            >
              <FiTrash2 className="w-5 h-5" />
            </motion.button>
          </div>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mt-4">
            {/* Price */}
            <div>
              <p className="text-xl font-bold bg-gradient-to-r from-primary-600 to-primary-800 bg-clip-text text-transparent">
                PKR {price.toLocaleString()}
              </p>
              {hasDiscount && (
                <p className="text-sm text-gray-400 line-through">
                  PKR {product.pricing.basePrice.toLocaleString()}
                </p>
              )}
            </div>

            {/* Quantity Controls */}
            <div className="flex items-center gap-4">
              <div className="flex items-center border-2 border-gray-200 rounded-lg overflow-hidden bg-white shadow-sm">
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onUpdateQuantity(product._id, quantity - 1)}
                  disabled={quantity <= 1 || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-primary-600 font-bold"
                >
                  <FiMinus className="w-4 h-4" />
                </motion.button>
                <input
                  type="number"
                  value={quantity}
                  onChange={(e) => {
                    const val = parseInt(e.target.value) || 1;
                    onUpdateQuantity(product._id, Math.min(maxQuantity, Math.max(1, val)));
                  }}
                  disabled={isOutOfStock}
                  className="w-14 text-center border-x-2 border-gray-200 py-2 font-bold text-gray-900 focus:outline-none focus:bg-primary-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  min="1"
                  max={maxQuantity}
                />
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => onUpdateQuantity(product._id, quantity + 1)}
                  disabled={quantity >= maxQuantity || isOutOfStock}
                  className="w-10 h-10 flex items-center justify-center hover:bg-primary-50 disabled:opacity-30 disabled:cursor-not-allowed transition-colors text-primary-600 font-bold"
                >
                  <FiPlus className="w-4 h-4" />
                </motion.button>
              </div>

              {/* Subtotal */}
              <div className="text-right min-w-[100px]">
                <p className="text-sm text-gray-500 font-medium">Subtotal</p>
                <p className="text-lg font-bold text-gray-900">PKR {subtotal.toLocaleString()}</p>
              </div>
            </div>
          </div>

          {/* Stock Warnings */}
          {isOutOfStock && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <p className="text-xs text-red-800 font-medium">
                  This product is currently out of stock
                </p>
              </div>
              <button
                onClick={() => onRemove(product._id)}
                className="text-xs text-red-600 hover:text-red-800 font-medium underline"
              >
                Remove
              </button>
            </motion.div>
          )}
          {!isOutOfStock && exceedsStock && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 bg-orange-50 border border-orange-200 rounded-lg flex items-center justify-between"
            >
              <div className="flex items-center gap-2">
                <svg className="w-5 h-5 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <p className="text-sm text-orange-800 font-semibold">
                  Only {maxQuantity} items available. Quantity adjusted to maximum.
                </p>
              </div>
              <button
                onClick={() => onUpdateQuantity(product._id, maxQuantity)}
                className="text-sm text-orange-600 hover:text-orange-800 font-medium underline"
              >
                Fix Now
              </button>
            </motion.div>
          )}
          {!isOutOfStock && !exceedsStock && quantity >= maxQuantity && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-2 bg-orange-50 border border-orange-200 rounded-lg flex items-center gap-2"
            >
              <svg className="w-4 h-4 text-orange-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
              <p className="text-sm text-orange-800 font-semibold">
                Maximum stock reached ({maxQuantity} items)
              </p>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};

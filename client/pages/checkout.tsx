import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import { useRouter } from 'next/router';
import { useForm } from 'react-hook-form';
import Layout from '@/components/Layout';
import BackButton from '@/components/BackButton';
import { useCartStore } from '@/store/useCartStore';
import { useAuthStore } from '@/store/useAuthStore';
import { useCouponStore } from '@/store/useCouponStore';
import { ordersAPI, couponsAPI, cartAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useMutation } from '@tanstack/react-query';
import { useEffect } from 'react';

interface CheckoutForm {
  customerName: string;
  phone: string;
  whatsapp: string;
  notes: string;
}

export default function CheckoutPage() {
  const router = useRouter();
  const { user, isAuthenticated } = useAuthStore();
  const { items, getTotalPrice, clearCart } = useCartStore();
  const { 
    couponCode, 
    appliedCoupon, 
    discount: couponDiscount,
    setCouponCode: setStoreCouponCode,
    setAppliedCoupon: setStoreAppliedCoupon,
    removeCoupon,
    clearCoupon
  } = useCouponStore();
  const [isValidatingCoupon, setIsValidatingCoupon] = useState(false);

  // Local setter that syncs with store
  const setCouponCode = (code: string) => {
    setStoreCouponCode(code);
  };

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<CheckoutForm>({
    defaultValues: {
      customerName: user ? `${user.profile.firstName} ${user.profile.lastName}` : '',
      phone: user?.profile.phone || '',
      whatsapp: user?.profile.whatsapp || '',
      notes: '',
    },
  });

  // Clear coupon after successful order
  useEffect(() => {
    // If we navigate away from checkout (order placed), clear the coupon
    return () => {
      // Don't clear if navigating back to cart
      if (!router.asPath.includes('/checkout') && !router.asPath.includes('/cart')) {
        clearCoupon();
      }
    };
  }, [router.asPath]);

  // Create order mutation
  const createOrderMutation = useMutation({
    mutationFn: ordersAPI.create,
    onSuccess: async (data) => {
      // Clear local cart
      clearCart();
      
      // Clear coupon after successful order
      clearCoupon();
      
      // Clear backend cart if authenticated
      if (isAuthenticated) {
        try {
          await cartAPI.clear();
        } catch (error) {
          console.error('Failed to clear backend cart:', error);
        }
      }
      
      toast.success('Order placed successfully!');
      router.push(`/orders/${data.data.order._id}`);
    },
    onError: (error: any) => {
      const errorCode = error.response?.data?.error?.code;
      const errorMessage = error.response?.data?.error?.message;
      
      // Handle deactivated account specifically
      if (errorCode === 'ACCOUNT_DEACTIVATED') {
        toast.error('Your account has been deactivated by admin. Please contact admin to reactivate your account.', {
          duration: 6000,
        });
      } else {
        toast.error(errorMessage || 'Failed to place order');
      }
    },
  });

  // Validate coupon
  const handleValidateCoupon = async () => {
    if (!couponCode) return;

    setIsValidatingCoupon(true);
    try {
      const response = await couponsAPI.validate({
        code: couponCode,
        orderTotal: subtotal,
      });
      
      const { coupon } = response.data;
      
      // Save to store (syncs across pages)
      setStoreAppliedCoupon(coupon, coupon.discount);
      
      toast.success('Coupon applied successfully!');
    } catch (error: any) {
      toast.error(error.response?.data?.error?.message || 'Invalid coupon code');
      removeCoupon();
    } finally {
      setIsValidatingCoupon(false);
    }
  };

  // Remove coupon handler
  const handleRemoveCoupon = () => {
    removeCoupon();
    toast.success('Coupon removed', { icon: 'ℹ️' });
  };

  const onSubmit = (data: CheckoutForm) => {
    if (!isAuthenticated) {
      toast.error('Please login to place an order');
      router.push('/login?redirect=/checkout');
      return;
    }

    if (items.length === 0) {
      toast.error('Your cart is empty');
      router.push('/products');
      return;
    }

    const orderData = {
      items: items.map((item) => ({
        product: item.product._id,
        quantity: item.quantity,
      })),
      couponCode: couponDiscount > 0 ? couponCode : undefined,
      pickupDetails: {
        customerName: data.customerName,
        phone: data.phone,
        whatsapp: data.whatsapp || data.phone,
        notes: data.notes,
      },
    };

    createOrderMutation.mutate(orderData);
  };

  // Redirect if cart is empty
  if (items.length === 0) {
    if (typeof window !== 'undefined') {
      router.push('/products');
    }
    return null;
  }

  // Redirect if not authenticated
  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/login?redirect=/checkout');
    }
    return null;
  }

  const subtotal = getTotalPrice();
  const tax = 0;
  const total = subtotal - couponDiscount + tax;

  return (
    <>
      <NextSeo title="Checkout - SanixHub" />
      <Layout>
        <div className="bg-gray-50 py-8">
          <div className="container-custom">
            {/* Back Button */}
            <div className="mb-4">
              <BackButton href="/cart" label="Back to Cart" variant="ghost" />
            </div>

            <h1 className="text-3xl font-bold mb-8">Checkout</h1>

            <form onSubmit={handleSubmit(onSubmit)}>
              <div className="grid lg:grid-cols-3 gap-8">
                {/* Checkout Form */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Customer Information */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">Customer Information</h2>

                    <div className="space-y-4">
                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Full Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register('customerName', {
                            required: 'Name is required',
                          })}
                          className={`input ${errors.customerName ? 'input-error' : ''}`}
                          placeholder="Enter your full name"
                        />
                        {errors.customerName && (
                          <p className="text-red-500 text-sm mt-1">
                            {errors.customerName.message}
                          </p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Phone Number <span className="text-red-500">*</span>
                        </label>
                        <input
                          {...register('phone', {
                            required: 'Phone number is required',
                            pattern: {
                              value: /^(\+92|0)?[0-9]{10}$/,
                              message: 'Invalid phone number',
                            },
                          })}
                          className={`input ${errors.phone ? 'input-error' : ''}`}
                          placeholder="+923001234567"
                        />
                        {errors.phone && (
                          <p className="text-red-500 text-sm mt-1">{errors.phone.message}</p>
                        )}
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          WhatsApp Number (Optional)
                        </label>
                        <input
                          {...register('whatsapp')}
                          className="input"
                          placeholder="+923001234567"
                        />
                        <p className="text-sm text-gray-500 mt-1">
                          We'll send order updates via WhatsApp
                        </p>
                      </div>

                      <div>
                        <label className="block text-sm font-medium mb-2">
                          Order Notes (Optional)
                        </label>
                        <textarea
                          {...register('notes')}
                          rows={4}
                          className="input"
                          placeholder="Any special instructions for your order..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Payment Method */}
                  <div className="bg-white rounded-lg shadow-md p-6">
                    <h2 className="text-xl font-bold mb-4">Payment Method</h2>

                    <div className="border-2 border-primary-600 rounded-lg p-4 bg-primary-50">
                      <div className="flex items-start gap-3">
                        <input
                          type="radio"
                          checked
                          readOnly
                          className="mt-1"
                        />
                        <div>
                          <h3 className="font-semibold text-lg mb-1">Cash on Pickup</h3>
                          <p className="text-gray-600">
                            Pay in cash when you collect your order from our store. We'll notify
                            you when your order is ready for pickup.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Summary */}
                <div className="lg:col-span-1">
                  <div className="bg-white rounded-lg shadow-md p-6 sticky top-24">
                    <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                    {/* Items List */}
                    <div className="space-y-3 mb-4 max-h-64 overflow-y-auto">
                      {items.map((item) => {
                        const price = item.product.pricing.salePrice || item.product.pricing.basePrice;
                        return (
                          <div key={item.product._id} className="flex gap-3 text-sm">
                            <div className="flex-1">
                              <p className="font-medium line-clamp-2">{item.product.name.en}</p>
                              <p className="text-gray-600">Qty: {item.quantity}</p>
                            </div>
                            <p className="font-semibold">
                              PKR {(price * item.quantity).toLocaleString()}
                            </p>
                          </div>
                        );
                      })}
                    </div>

                    {/* Coupon Code */}
                    <div className="border-t pt-4 mb-4">
                      {!appliedCoupon ? (
                        <>
                          <label className="block text-sm font-medium mb-2">Coupon Code</label>
                          <div className="flex gap-2">
                            <input
                              type="text"
                              value={couponCode}
                              onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                              onKeyPress={(e) => e.key === 'Enter' && handleValidateCoupon()}
                              placeholder="Enter code"
                              disabled={isValidatingCoupon}
                              className="flex-1 input text-sm disabled:opacity-50"
                            />
                            <button
                              type="button"
                              onClick={handleValidateCoupon}
                              disabled={isValidatingCoupon || !couponCode}
                              className="btn btn-outline text-sm disabled:opacity-50"
                            >
                              {isValidatingCoupon ? 'Validating...' : 'Apply'}
                            </button>
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
                                  {appliedCoupon.code}
                                </span>
                              </div>
                              <p className="text-xs text-green-700 mt-1 ml-7">
                                You saved: PKR {appliedCoupon.discount}
                              </p>
                            </div>
                            <button
                              type="button"
                              onClick={handleRemoveCoupon}
                              className="text-green-600 hover:text-green-800 transition"
                              title="Remove coupon"
                            >
                              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Price Breakdown */}
                    <div className="space-y-3 border-t pt-4 mb-6">
                      <div className="flex justify-between">
                        <span className="text-gray-600">Subtotal</span>
                        <span className="font-semibold">PKR {subtotal.toLocaleString()}</span>
                      </div>

                      {couponDiscount > 0 && (
                        <div className="flex justify-between text-green-600">
                          <span>Discount ({couponCode})</span>
                          <span>-PKR {couponDiscount.toLocaleString()}</span>
                        </div>
                      )}

                      <div className="flex justify-between">
                        <span className="text-gray-600">Tax</span>
                        <span className="font-semibold">PKR {tax.toLocaleString()}</span>
                      </div>

                      <div className="border-t pt-3">
                        <div className="flex justify-between text-xl font-bold">
                          <span>Total</span>
                          <span className="text-primary-600">PKR {total.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Place Order Button */}
                    <button
                      type="submit"
                      disabled={createOrderMutation.isPending}
                      className="w-full btn btn-primary mb-4 disabled:opacity-50"
                    >
                      {createOrderMutation.isPending ? 'Placing Order...' : 'Place Order'}
                    </button>

                    {/* Terms */}
                    <p className="text-xs text-gray-600 text-center">
                      By placing this order, you agree to our{' '}
                      <a href="/terms" className="text-primary-600 hover:underline">
                        Terms & Conditions
                      </a>
                    </p>
                  </div>
                </div>
              </div>
            </form>
          </div>
        </div>
      </Layout>
    </>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CouponState {
  couponCode: string;
  appliedCoupon: any | null;
  discount: number;
  setCouponCode: (code: string) => void;
  setAppliedCoupon: (coupon: any, discount: number) => void;
  removeCoupon: () => void;
  clearCoupon: () => void;
}

export const useCouponStore = create<CouponState>()(
  persist(
    (set) => ({
      couponCode: '',
      appliedCoupon: null,
      discount: 0,

      setCouponCode: (code) => set({ couponCode: code }),

      setAppliedCoupon: (coupon, discount) =>
        set({
          appliedCoupon: coupon,
          discount: discount,
          couponCode: coupon.code,
        }),

      removeCoupon: () =>
        set({
          appliedCoupon: null,
          discount: 0,
          couponCode: '',
        }),

      clearCoupon: () =>
        set({
          appliedCoupon: null,
          discount: 0,
          couponCode: '',
        }),
    }),
    {
      name: 'coupon-storage',
    }
  )
);

import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface CartItem {
  product: any;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  lastUpdated: number;
  setCart: (items: CartItem[]) => void;
  addItem: (item: CartItem) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  getTotalItems: () => number;
  getTotalPrice: () => number;
}

export const useCartStore = create<CartState>()(
  persist(
    (set, get) => ({
      items: [],
      lastUpdated: Date.now(),
  
  setCart: (items) => set({ items, lastUpdated: Date.now() }),
  
  addItem: (item) => {
    console.log('🛒 Adding to cart (local store):', item);
    set((state) => {
      const existingIndex = state.items.findIndex(
        i => i.product._id === item.product._id
      );
      
      let newItems;
      if (existingIndex > -1) {
        newItems = [...state.items];
        newItems[existingIndex].quantity += item.quantity;
        console.log('✅ Updated existing item (local), new cart:', newItems);
      } else {
        newItems = [...state.items, item];
        console.log('✅ Added new item (local), new cart:', newItems);
      }
      
      // Dispatch browser event as fallback for non-authenticated users
      if (typeof window !== 'undefined') {
        window.dispatchEvent(new Event('cartUpdated'));
      }
      
      return { items: newItems, lastUpdated: Date.now() };
    });
  },
  
  removeItem: (productId) => set((state) => ({
    items: state.items.filter(item => item.product._id !== productId),
    lastUpdated: Date.now()
  })),
  
  updateQuantity: (productId, quantity) => set((state) => ({
    items: state.items.map(item =>
      item.product._id === productId ? { ...item, quantity } : item
    ),
    lastUpdated: Date.now()
  })),
  
  clearCart: () => set({ items: [], lastUpdated: Date.now() }),
  
  getTotalItems: () => {
    return get().items.reduce((total, item) => total + item.quantity, 0);
  },
  
  getTotalPrice: () => {
    return get().items.reduce((total, item) => {
      const price = item.product.pricing.salePrice || item.product.pricing.basePrice;
      return total + (price * item.quantity);
    }, 0);
  },
    }),
    {
      name: 'cart-storage',
      skipHydration: false,
    }
  )
);

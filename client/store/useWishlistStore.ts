import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WishlistItem {
  productId: string;
  name: string;
  price: number;
  image: string;
  slug: string;
  stock: number;
  addedAt: number;
}

interface WishlistState {
  items: WishlistItem[];
  isLoading: boolean;
  isSyncing: boolean;
  lastSync: number;
  addItem: (item: Omit<WishlistItem, 'addedAt'>) => void;
  removeItem: (productId: string) => void;
  isInWishlist: (productId: string) => boolean;
  clearWishlist: () => void;
  getItemCount: () => number;
  setItems: (items: WishlistItem[]) => void;
  setLoading: (loading: boolean) => void;
  setSyncing: (syncing: boolean) => void;
  updateLastSync: () => void;
}

export const useWishlistStore = create<WishlistState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isSyncing: false,
      lastSync: 0,

      addItem: (item) => {
        console.log('❤️ Adding to wishlist (local store):', item);
        const exists = get().items.find((i) => i.productId === item.productId);
        if (!exists) {
          set((state) => ({
            items: [...state.items, { ...item, addedAt: Date.now() }],
          }));
          console.log('✅ Added to wishlist (local), new count:', get().items.length);
          // Dispatch browser event
          if (typeof window !== 'undefined') {
            window.dispatchEvent(new Event('wishlistUpdated'));
          }
        } else {
          console.log('⚠️ Item already in wishlist (local)');
        }
      },

      removeItem: (productId) => {
        console.log('💔 Removing from wishlist (local store):', productId);
        set((state) => ({
          items: state.items.filter((item) => item.productId !== productId),
        }));
        console.log('✅ Removed from wishlist (local), new count:', get().items.length);
        // Dispatch browser event
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('wishlistUpdated'));
        }
      },

      isInWishlist: (productId) => {
        return get().items.some((item) => item.productId === productId);
      },

      clearWishlist: () => {
        set({ items: [] });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('wishlistUpdated'));
        }
      },

      getItemCount: () => get().items.length,

      setItems: (items) => {
        set({ items });
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new Event('wishlistUpdated'));
        }
      },

      setLoading: (loading) => set({ isLoading: loading }),

      setSyncing: (syncing) => set({ isSyncing: syncing }),

      updateLastSync: () => set({ lastSync: Date.now() }),
    }),
    {
      name: 'wishlist-storage',
      skipHydration: false,
    }
  )
);

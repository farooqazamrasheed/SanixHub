import { GetServerSideProps } from 'next';
import { useState, useEffect } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useTranslation } from 'next-i18next';
import Link from 'next/link';
import Image from 'next/image';
import { useMutation } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import { useCartStore } from '@/store/useCartStore';
import { useWishlistStore } from '@/store/useWishlistStore';
import { useWishlistSync } from '@/hooks/useWishlistSync';
import { wishlistAPI } from '@/lib/api';
import toast from 'react-hot-toast';

export default function WishlistPage() {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { isAuthenticated, isInitialized } = useAuthStore();
  const { addItem } = useCartStore();
  const { items, isLoading, getItemCount } = useWishlistStore();
  const { syncWishlist, isConnected } = useWishlistSync();
  const [selectedItems, setSelectedItems] = useState<string[]>([]);

  // Handle authentication redirect
  useEffect(() => {
    if (!isAuthenticated && isInitialized) {
      router.push('/login?redirect=/wishlist');
    }
  }, [isAuthenticated, isInitialized, router]);

  // Remove from wishlist mutation
  const removeMutation = useMutation({
    mutationFn: (productId: string) => wishlistAPI.removeFromWishlist(productId),
    onSuccess: () => {
      // WebSocket will handle the update
      syncWishlist();
    },
    onError: () => {
      toast.error('Failed to remove from wishlist');
    },
  });

  // Clear wishlist mutation
  const clearMutation = useMutation({
    mutationFn: () => wishlistAPI.clearWishlist(),
    onSuccess: () => {
      setSelectedItems([]);
      // WebSocket will handle the update
      syncWishlist();
    },
    onError: () => {
      toast.error('Failed to clear wishlist');
    },
  });

  // Show loading state while checking authentication
  if (!isAuthenticated || !isInitialized) {
    return (
      <Layout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </Layout>
    );
  }

  const handleAddToCart = (item: any) => {
    // Check stock before adding
    if (item.stock === 0) {
      toast.error('This product is out of stock');
      return;
    }
    
    addItem({
      product: {
        _id: item.productId,
        name: { en: item.name },
        slug: item.slug,
        pricing: { basePrice: item.price },
        images: [{ url: item.image }],
        inventory: { stockQuantity: item.stock },
      },
      quantity: 1,
    });
    toast.success('Added to cart');
  };

  const handleMoveToCart = (item: any) => {
    handleAddToCart(item);
    removeMutation.mutate(item.productId);
  };

  const handleToggleSelect = (productId: string) => {
    setSelectedItems(prev =>
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const handleSelectAll = () => {
    if (selectedItems.length === items.length) {
      setSelectedItems([]);
    } else {
      setSelectedItems(items.map((item) => item.productId));
    }
  };

  const handleMoveSelectedToCart = () => {
    let outOfStockCount = 0;
    let successCount = 0;
    
    selectedItems.forEach(productId => {
      const item = items.find((i) => i.productId === productId);
      if (item) {
        if (item.stock === 0) {
          outOfStockCount++;
        } else {
          handleAddToCart(item);
          removeMutation.mutate(productId);
          successCount++;
        }
      }
    });
    
    if (successCount > 0) {
      toast.success(`${successCount} item(s) added to cart`);
    }
    if (outOfStockCount > 0) {
      toast.error(`${outOfStockCount} item(s) are out of stock`);
    }
    
    setSelectedItems([]);
  };

  const handleRemoveSelected = () => {
    selectedItems.forEach(productId => {
      removeMutation.mutate(productId);
    });
    setSelectedItems([]);
  };

  if (isLoading) {
    return (
      <Layout>
        <div className="min-h-screen bg-gray-50 py-8">
          <div className="container mx-auto px-4">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading wishlist...</p>
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  const isEmpty = items.length === 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="container mx-auto px-4 max-w-6xl">
          {/* Header */}
          <div className="mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">My Wishlist</h1>
            <p className="text-gray-600">
              {isEmpty ? 'Your wishlist is empty' : `${items.length} item${items.length > 1 ? 's' : ''} in your wishlist`}
            </p>
          </div>

          {isEmpty ? (
            <div className="bg-white rounded-lg shadow-sm p-12 text-center">
              <div className="mb-6">
                <svg
                  className="w-24 h-24 mx-auto text-gray-300"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                  />
                </svg>
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">Your wishlist is empty</h2>
              <p className="text-gray-600 mb-6">Save your favorite products to view them later</p>
              <Link
                href="/products"
                className="inline-block bg-indigo-600 text-white px-6 py-3 rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Browse Products
              </Link>
            </div>
          ) : (
            <>
              {/* Bulk Actions */}
              <div className="bg-white rounded-lg shadow-sm p-4 mb-4 flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedItems.length === items.length}
                      onChange={handleSelectAll}
                      className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                    />
                    <span className="text-sm font-medium text-gray-700">
                      Select All ({selectedItems.length} selected)
                    </span>
                  </label>
                </div>
                
                {selectedItems.length > 0 && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={handleMoveSelectedToCart}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                      Add {selectedItems.length} to Cart
                    </button>
                    <button
                      onClick={handleRemoveSelected}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm font-medium"
                    >
                      Remove Selected
                    </button>
                  </div>
                )}

                {selectedItems.length === 0 && (
                  <button
                    onClick={() => clearMutation.mutate()}
                    className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm font-medium"
                  >
                    Clear All
                  </button>
                )}
              </div>

              {/* Wishlist Items */}
              <div className="space-y-4">
                {items.map((item) => {
                  const isSelected = selectedItems.includes(item.productId);

                  return (
                    <div
                      key={item.productId}
                      className={`bg-white rounded-lg shadow-sm p-4 transition-all ${
                        isSelected ? 'ring-2 ring-indigo-500' : ''
                      }`}
                    >
                      <div className="flex gap-4">
                        {/* Checkbox */}
                        <div className="flex items-start pt-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleSelect(item.productId)}
                            className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                          />
                        </div>

                        {/* Product Image */}
                        <Link href={`/products/${item.slug}`} className="flex-shrink-0">
                          <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden">
                            {item.image ? (
                              <Image
                                src={item.image}
                                alt={item.name}
                                fill
                                sizes="96px"
                                className="object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-gray-400">
                                No image
                              </div>
                            )}
                          </div>
                        </Link>

                        {/* Product Details */}
                        <div className="flex-1 min-w-0">
                          <Link
                            href={`/products/${item.slug}`}
                            className="block text-lg font-semibold text-gray-900 hover:text-indigo-600 transition-colors mb-1"
                          >
                            {item.name}
                          </Link>
                          
                          <div className="flex items-center gap-4 text-sm text-gray-600 mb-2">
                            <span className="text-xl font-bold text-gray-900">
                              Rs. {item.price.toFixed(2)}
                            </span>
                            {/* Stock Status Badge */}
                            {item.stock === 0 ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                                Out of Stock
                              </span>
                            ) : item.stock <= 5 ? (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                Only {item.stock} left
                              </span>
                            ) : (
                              <span className="px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                                In Stock
                              </span>
                            )}
                          </div>

                          <p className="text-sm text-gray-500 mb-3">
                            Added on {new Date(item.addedAt).toLocaleDateString()}
                          </p>

                          {/* Out of Stock Warning */}
                          {item.stock === 0 && (
                            <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg flex items-center gap-2">
                              <svg className="w-4 h-4 text-red-600 flex-shrink-0" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                              </svg>
                              <p className="text-xs text-red-800 font-medium">
                                This product is currently unavailable
                              </p>
                            </div>
                          )}

                          {/* Actions */}
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleMoveToCart(item)}
                              disabled={item.stock === 0}
                              className="px-4 py-2 rounded-lg text-sm font-medium transition-colors bg-indigo-600 text-white hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed disabled:text-gray-500"
                            >
                              {item.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                            </button>
                            <button
                              onClick={() => removeMutation.mutate(item.productId)}
                              disabled={removeMutation.isPending}
                              className="px-4 py-2 text-red-600 hover:text-red-700 transition-colors text-sm font-medium disabled:opacity-50"
                            >
                              Remove
                            </button>
                            <Link
                              href={`/products/${item.slug}`}
                              className="px-4 py-2 text-indigo-600 hover:text-indigo-700 transition-colors text-sm font-medium"
                            >
                              View Details
                            </Link>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale || 'en', ['common'])),
    },
  };
};

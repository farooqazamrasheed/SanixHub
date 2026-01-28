import { GetServerSideProps } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/router';
import AdminLayout from '@/components/admin/AdminLayout';
import { useAuthStore } from '@/store/useAuthStore';
import { useAdminWishlistUpdates } from '@/hooks/useWishlistUpdates';
import BackButton from '@/components/BackButton';
import Link from 'next/link';
import Image from 'next/image';
import { FiUser, FiMail, FiPhone, FiShoppingBag, FiDollarSign, FiPackage, FiExternalLink } from 'react-icons/fi';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';

export default function CustomerWishlistDetailPage() {
  const router = useRouter();
  const { userId } = router.query;
  const { token } = useAuthStore();
  const queryClient = useQueryClient();

  // Real-time wishlist updates
  useAdminWishlistUpdates((data) => {
    // Only refetch if this is the current user's wishlist
    if (data.userId === userId) {
      queryClient.invalidateQueries({ queryKey: ['admin-customer-wishlist', userId] });
    }
  });

  // Fetch specific customer wishlist
  const { data, isLoading } = useQuery({
    queryKey: ['admin-customer-wishlist', userId],
    queryFn: async () => {
      const res = await fetch(`${API_URL}/admin/wishlists/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error('Failed to fetch wishlist');
      return res.json();
    },
    enabled: !!token && !!userId,
  });

  const wishlist = data?.data?.wishlist;
  const stats = wishlist?.stats;
  const customer = wishlist?.user;
  const items = wishlist?.items || [];

  return (
    <AdminLayout>
      <div className="space-y-6">
        {/* Back Button */}
        <BackButton href="/admin/wishlists" label="Back to All Wishlists" variant="ghost" />

        {isLoading ? (
          <div className="p-12 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="text-gray-600 mt-4">Loading wishlist...</p>
          </div>
        ) : !wishlist ? (
          <div className="bg-white rounded-lg shadow-md p-12 text-center">
            <FiShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">No Wishlist Found</h3>
            <p className="text-gray-600">This customer doesn't have any items in their wishlist.</p>
          </div>
        ) : (
          <>
            {/* Customer Info Card */}
            <div className="bg-white rounded-lg shadow-md p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Customer Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="flex items-center gap-3">
                  <div className="bg-primary-100 p-3 rounded-lg">
                    <FiUser className="w-6 h-6 text-primary-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Customer Name</p>
                    <p className="font-semibold text-gray-900">
                      {customer?.profile?.firstName} {customer?.profile?.lastName}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-blue-100 p-3 rounded-lg">
                    <FiMail className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Email</p>
                    <p className="font-semibold text-gray-900">{customer?.email}</p>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="bg-green-100 p-3 rounded-lg">
                    <FiPhone className="w-6 h-6 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm text-gray-500">Phone</p>
                    <p className="font-semibold text-gray-900">{customer?.profile?.phone || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-gradient-to-br from-purple-500 to-indigo-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-purple-100 text-sm font-medium">Total Items</p>
                    <p className="text-4xl font-bold mt-2">{stats?.itemCount || 0}</p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-lg">
                    <FiShoppingBag className="w-8 h-8" />
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-500 to-teal-500 rounded-lg shadow-lg p-6 text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-green-100 text-sm font-medium">Total Wishlist Value</p>
                    <p className="text-4xl font-bold mt-2">₨{stats?.totalValue?.toLocaleString() || 0}</p>
                  </div>
                  <div className="bg-white/20 p-4 rounded-lg">
                    <FiDollarSign className="w-8 h-8" />
                  </div>
                </div>
              </div>
            </div>

            {/* Wishlist Items */}
            <div className="bg-white rounded-lg shadow-md overflow-hidden">
              <div className="p-6 border-b border-gray-200">
                <h2 className="text-xl font-bold text-gray-900">Wishlist Items</h2>
              </div>

              {items.length === 0 ? (
                <div className="p-12 text-center">
                  <FiPackage className="w-16 h-16 text-gray-300 mx-auto mb-4" />
                  <p className="text-gray-600">No items in wishlist</p>
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {items.map((item: any) => {
                    const product = item.product;
                    const primaryImage = product.images?.find((img: any) => img.isPrimary) || product.images?.[0];
                    const price = product.pricing?.salePrice || product.pricing?.basePrice;
                    const hasDiscount = product.pricing?.salePrice && product.pricing?.salePrice < product.pricing?.basePrice;
                    const discountPercent = hasDiscount
                      ? Math.round(((product.pricing.basePrice - product.pricing.salePrice) / product.pricing.basePrice) * 100)
                      : 0;

                    return (
                      <div key={item._id} className="p-6 hover:bg-gray-50 transition">
                        <div className="flex items-center gap-6">
                          {/* Product Image */}
                          <div className="relative w-24 h-24 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                            {primaryImage?.url && (
                              <Image
                                src={primaryImage.url}
                                alt={product.name?.en || 'Product'}
                                fill
                                className="object-contain p-2"
                              />
                            )}
                            {hasDiscount && (
                              <div className="absolute top-1 right-1 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded">
                                -{discountPercent}%
                              </div>
                            )}
                          </div>

                          {/* Product Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-semibold text-gray-900 mb-1">
                              {product.name?.en || 'Unknown Product'}
                            </h3>
                            <p className="text-sm text-gray-500 mb-2">
                              Category: {product.category?.name?.en || 'N/A'}
                            </p>
                            <div className="flex items-center gap-4">
                              <div>
                                {hasDiscount ? (
                                  <div className="flex items-center gap-2">
                                    <span className="text-lg font-bold text-gray-900">₨{price?.toLocaleString()}</span>
                                    <span className="text-sm text-gray-500 line-through">
                                      ₨{product.pricing?.basePrice?.toLocaleString()}
                                    </span>
                                  </div>
                                ) : (
                                  <span className="text-lg font-bold text-gray-900">₨{price?.toLocaleString()}</span>
                                )}
                              </div>
                              <div className="text-sm text-gray-500">
                                Stock: {product.inventory?.stockQuantity || 0}
                              </div>
                              {product.inventory?.stockQuantity === 0 && (
                                <span className="px-2 py-1 bg-red-100 text-red-700 text-xs font-semibold rounded">
                                  Out of Stock
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Actions */}
                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/products/${product.slug}`}
                              target="_blank"
                              className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition text-sm font-medium flex items-center gap-2"
                            >
                              <FiExternalLink className="w-4 h-4" />
                              View Product
                            </Link>
                            <div className="text-xs text-gray-500 text-center">
                              Added: {new Date(item.addedAt).toLocaleDateString()}
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common'])),
    },
  };
};

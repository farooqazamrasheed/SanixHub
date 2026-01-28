import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { NextSeo } from 'next-seo';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/router';
import { useQuery } from '@tanstack/react-query';
import Layout from '@/components/Layout';
import { useAuthStore } from '@/store/useAuthStore';
import { ordersAPI } from '@/lib/api';

export default function OrdersPage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);

  // Fetch orders
  const { data, isLoading } = useQuery({
    queryKey: ['my-orders', statusFilter, page],
    queryFn: () => ordersAPI.getMyOrders({ status: statusFilter, page, limit: 10 }),
    enabled: isAuthenticated,
  });

  const orders = data?.data?.orders || [];
  const pagination = data?.data?.pagination || {};

  if (!isAuthenticated) {
    if (typeof window !== 'undefined') {
      router.push('/login');
    }
    return null;
  }

  const statusColors = {
    placed: 'bg-blue-100 text-blue-800',
    ready: 'bg-green-100 text-green-800',
    picked_up: 'bg-gray-100 text-gray-800',
    cancelled: 'bg-red-100 text-red-800',
  };

  return (
    <>
      <NextSeo title="My Orders - SanixHub" />
      <Layout>
        <div className="bg-gray-50 py-8">
          <div className="container-custom">
            <h1 className="text-3xl font-bold mb-8">My Orders</h1>

            {/* Filter Tabs */}
            <div className="bg-white rounded-lg shadow-md mb-6">
              <div className="flex flex-wrap border-b">
                {[
                  { label: 'All Orders', value: '' },
                  { label: 'Placed', value: 'placed' },
                  { label: 'Ready', value: 'ready' },
                  { label: 'Picked Up', value: 'picked_up' },
                  { label: 'Cancelled', value: 'cancelled' },
                ].map((tab) => (
                  <button
                    key={tab.value}
                    onClick={() => {
                      setStatusFilter(tab.value);
                      setPage(1);
                    }}
                    className={`px-6 py-4 font-semibold ${
                      statusFilter === tab.value
                        ? 'border-b-2 border-primary-600 text-primary-600'
                        : 'text-gray-600 hover:text-gray-900'
                    }`}
                  >
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Loading State */}
            {isLoading && (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="bg-white rounded-lg shadow-md p-6 animate-pulse">
                    <div className="bg-gray-200 h-6 rounded w-1/3 mb-4"></div>
                    <div className="bg-gray-200 h-24 rounded"></div>
                  </div>
                ))}
              </div>
            )}

            {/* Orders List */}
            {!isLoading && orders.length > 0 && (
              <div className="space-y-4">
                {orders.map((order: any) => (
                  <div key={order._id} className="bg-white rounded-lg shadow-md p-6">
                    <div className="flex flex-wrap justify-between items-start gap-4 mb-4">
                      <div>
                        <Link
                          href={`/orders/${order._id}`}
                          className="text-xl font-bold hover:text-primary-600 transition"
                        >
                          Order {order.orderNumber}
                        </Link>
                        <p className="text-sm text-gray-600 mt-1">
                          Placed on {new Date(order.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span
                        className={`px-4 py-2 rounded-full font-semibold ${
                          statusColors[order.status as keyof typeof statusColors]
                        }`}
                      >
                        {order.status.toUpperCase().replace('_', ' ')}
                      </span>
                    </div>

                    {/* Order Items Preview */}
                    <div className="border-t border-b py-4 my-4">
                      <div className="flex flex-wrap gap-4">
                        {order.items.slice(0, 3).map((item: any) => {
                          // Get image URL - handle both relative and absolute URLs
                          // Remove /api from API_URL for uploads path
                          const baseUrl = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api').replace('/api', '');
                          const imageUrl = item.productSnapshot.image?.startsWith('http') 
                            ? item.productSnapshot.image 
                            : `${baseUrl}${item.productSnapshot.image}`;
                          
                          return (
                          <div key={item._id} className="flex gap-3 items-center">
                            <div className="w-16 h-16 bg-gray-100 rounded-lg overflow-hidden flex-shrink-0">
                              {item.productSnapshot.image ? (
                                <img
                                  src={imageUrl}
                                  alt={item.productSnapshot.name.en}
                                  className="w-full h-full object-cover"
                                  onError={(e) => {
                                    console.error('Orders list - Failed to load image:', item.productSnapshot.image);
                                    e.currentTarget.style.display = 'none';
                                    if (e.currentTarget.parentElement) {
                                      e.currentTarget.parentElement.innerHTML = `<div class="w-full h-full flex items-center justify-center text-gray-400"><svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path></svg></div>`;
                                    }
                                  }}
                                />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-gray-400">
                                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                  </svg>
                                </div>
                              )}
                            </div>
                            <div>
                              <p className="text-sm font-medium line-clamp-1">
                                {item.productSnapshot.name.en}
                              </p>
                              <p className="text-xs text-gray-600">Qty: {item.quantity}</p>
                            </div>
                          </div>
                          );
                        })}
                        {order.items.length > 3 && (
                          <div className="flex items-center text-gray-600">
                            +{order.items.length - 3} more items
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Order Summary */}
                    <div className="flex flex-wrap justify-between items-center gap-4">
                      <div>
                        <p className="text-sm text-gray-600">Total Amount</p>
                        <p className="text-2xl font-bold text-primary-600">
                          PKR {order.pricing.total.toLocaleString()}
                        </p>
                      </div>
                      <div className="flex gap-3">
                        <Link
                          href={`/orders/${order._id}`}
                          className="btn btn-outline"
                        >
                          View Details
                        </Link>
                        {order.status === 'picked_up' && (
                          <button className="btn btn-primary">
                            Reorder
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Empty State */}
            {!isLoading && orders.length === 0 && (
              <div className="bg-white rounded-lg shadow-md p-12 text-center">
                <svg
                  className="w-24 h-24 mx-auto text-gray-300 mb-4"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                  />
                </svg>
                <h3 className="text-xl font-bold mb-2">No orders found</h3>
                <p className="text-gray-600 mb-6">
                  {statusFilter
                    ? `You don't have any ${statusFilter.replace('_', ' ')} orders`
                    : "You haven't placed any orders yet"}
                </p>
                <Link href="/products" className="btn btn-primary">
                  Start Shopping
                </Link>
              </div>
            )}

            {/* Pagination */}
            {!isLoading && orders.length > 0 && pagination.pages > 1 && (
              <div className="flex justify-center items-center gap-2 mt-8">
                <button
                  onClick={() => setPage(page - 1)}
                  disabled={page === 1}
                  className="btn btn-outline disabled:opacity-50"
                >
                  Previous
                </button>

                <div className="flex gap-2">
                  {Array.from({ length: Math.min(5, pagination.pages) }, (_, i) => {
                    const pageNum = i + 1;
                    return (
                      <button
                        key={pageNum}
                        onClick={() => setPage(pageNum)}
                        className={`px-4 py-2 rounded-lg ${
                          page === pageNum
                            ? 'bg-primary-600 text-white'
                            : 'bg-white text-gray-700 hover:bg-gray-100'
                        }`}
                      >
                        {pageNum}
                      </button>
                    );
                  })}
                </div>

                <button
                  onClick={() => setPage(page + 1)}
                  disabled={page === pagination.pages}
                  className="btn btn-outline disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            )}
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

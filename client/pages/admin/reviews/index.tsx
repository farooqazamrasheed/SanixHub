import { GetServerSideProps } from 'next';
import { useState } from 'react';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import Link from 'next/link';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AdminLayout from '@/components/admin/AdminLayout';
import { adminAPI } from '@/lib/api';
import toast from 'react-hot-toast';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useProductUpdates } from '@/hooks/useProductUpdates';

export default function AdminReviewsPage() {
  const { isLoading: authLoading } = useAdminAuth();
  const [statusFilter, setStatusFilter] = useState('');
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  // Real-time updates for reviews
  useProductUpdates(() => {
    console.log('📦 Real-time update (reviews)');
    queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
  });

  // Fetch reviews
  const { data, isLoading } = useQuery({
    queryKey: ['admin-reviews', statusFilter, page],
    queryFn: () => adminAPI.getReviews({ status: statusFilter, page, limit: 20 }),
  });

  // Moderate review mutation
  const moderateMutation = useMutation({
    mutationFn: ({ id, approved }: any) =>
      adminAPI.moderateReview(id, approved),
    onSuccess: () => {
      toast.success('Review moderated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-reviews'] });
    },
    onError: () => {
      toast.error('Failed to moderate review');
    },
  });

  const reviews = data?.data?.reviews || [];
  const pagination = data?.data?.pagination || {};

  const handleModerate = (id: string, approved: boolean) => {
    const action = approved ? 'approve' : 'reject';
    if (confirm(`Are you sure you want to ${action} this review?`)) {
      moderateMutation.mutate({ id, approved });
    }
  };

  const statusColors: any = {
    pending: 'bg-yellow-100 text-yellow-800',
    approved: 'bg-green-100 text-green-800',
    rejected: 'bg-red-100 text-red-800',
  };

  const renderStars = (rating: number) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-5 h-5 ${
              star <= rating ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
      </div>
    );
  };

  // Show loading state for auth check
  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <AdminLayout>
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Reviews</h1>
        <p className="text-gray-600 mt-1">Manage and moderate product reviews</p>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow-md mb-6">
        <div className="flex flex-wrap border-b">
          {[
            { label: 'All Reviews', value: '' },
            { label: 'Pending', value: 'pending' },
            { label: 'Approved', value: 'approved' },
            { label: 'Rejected', value: 'rejected' },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => {
                setStatusFilter(tab.value);
                setPage(1);
              }}
              className={`px-6 py-3 font-medium transition ${
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

      {/* Reviews List */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 mx-auto"></div>
            <p className="mt-4 text-gray-600">Loading reviews...</p>
          </div>
        ) : reviews.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            <svg
              className="w-16 h-16 mx-auto mb-4 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
              />
            </svg>
            <p>No reviews found</p>
          </div>
        ) : (
          <div className="divide-y">
            {reviews.map((review: any) => (
              <div key={review._id} className="p-6 hover:bg-gray-50">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <Link
                        href={`/products/${review.product?.slug || review.product?._id}`}
                        className="font-semibold text-gray-900 hover:text-primary-600"
                      >
                        {review.product?.name?.en || 'Product'}
                      </Link>
                      <span
                        className={`px-3 py-1 text-xs font-semibold rounded-full ${
                          statusColors[review.status] || 'bg-gray-100 text-gray-800'
                        }`}
                      >
                        {review.status}
                      </span>
                    </div>
                    {renderStars(review.rating)}
                  </div>
                  <div className="text-sm text-gray-500">
                    {new Date(review.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="mb-4">
                  <p className="text-gray-700 font-medium mb-1">
                    {review.user?.profile?.firstName} {review.user?.profile?.lastName}
                  </p>
                  {review.title && (
                    <h3 className="font-semibold text-gray-900 mb-2">{review.title}</h3>
                  )}
                  <p className="text-gray-600">{review.comment}</p>
                </div>

                {review.status === 'pending' && (
                  <div className="flex gap-3">
                    <button
                      onClick={() => handleModerate(review._id, true)}
                      disabled={moderateMutation.isPending}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleModerate(review._id, false)}
                      disabled={moderateMutation.isPending}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50"
                    >
                      Reject
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="border-t p-4 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              Page {pagination.currentPage} of {pagination.totalPages}
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!pagination.hasPrevPage}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Previous
              </button>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={!pagination.hasNextPage}
                className="px-4 py-2 border rounded-lg hover:bg-gray-50 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  );
}

export const getServerSideProps: GetServerSideProps = async ({ locale }) => {
  return {
    props: {
      ...(await serverSideTranslations(locale ?? 'en', ['common', 'admin'])),
    },
  };
};

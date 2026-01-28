import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import { FiChevronDown, FiFilter, FiX } from 'react-icons/fi';
import ReviewCard from './ReviewCard';
import { reviewAPI } from '@/lib/api';

interface ReviewListProps {
  productId: string;
  onEditReview?: (review: any) => void;
  onDeleteReview?: (reviewId: string) => void;
  showActions?: boolean;
  filterByRating?: number | null;
  onFilterChange?: (rating: number | null) => void;
}

export default function ReviewList({ 
  productId, 
  onEditReview, 
  onDeleteReview, 
  showActions,
  filterByRating = null,
  onFilterChange 
}: ReviewListProps) {
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('-createdAt');

  const { data, isLoading, error } = useQuery({
    queryKey: ['product-reviews', productId, page, sortBy, filterByRating],
    queryFn: () => reviewAPI.getProductReviews(productId, { 
      page, 
      limit: 10, 
      sort: sortBy,
      ...(filterByRating && { rating: filterByRating })
    }),
  });

  const reviews = data?.data?.reviews || [];
  const pagination = data?.data?.pagination || {};

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="bg-white rounded-xl border border-gray-200 p-6 animate-pulse">
            <div className="flex items-start gap-3 mb-4">
              <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
              <div className="flex-1">
                <div className="h-4 bg-gray-200 rounded w-32 mb-2"></div>
                <div className="h-3 bg-gray-200 rounded w-24"></div>
              </div>
            </div>
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-full mb-2"></div>
            <div className="h-4 bg-gray-200 rounded w-2/3"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-xl p-6 text-center">
        <p className="text-red-600">Failed to load reviews. Please try again.</p>
      </div>
    );
  }

  if (reviews.length === 0) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-xl p-12 text-center h-full flex flex-col justify-center items-center">
        <p className="text-gray-600 text-lg mb-2">No reviews yet</p>
        <p className="text-gray-500 text-sm">Be the first to review this product!</p>
      </div>
    );
  }

  return (
    <div>
      {/* Filter and Sort Options */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-3">
          <h3 className="text-lg font-semibold text-gray-900">
            {pagination.total} Review{pagination.total !== 1 ? 's' : ''}
          </h3>
          {filterByRating && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              onClick={() => onFilterChange?.(null)}
              className="inline-flex items-center gap-1 px-3 py-1 bg-primary-100 text-primary-700 rounded-full text-sm font-medium hover:bg-primary-200 transition-colors"
            >
              <FiFilter className="w-3 h-3" />
              {filterByRating} star{filterByRating !== 1 ? 's' : ''}
              <FiX className="w-4 h-4" />
            </motion.button>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600">Sort by:</label>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
          >
            <option value="-createdAt">Most Recent</option>
            <option value="createdAt">Oldest First</option>
            <option value="-rating">Highest Rated</option>
            <option value="rating">Lowest Rated</option>
            <option value="-helpful.upvotes">Most Helpful</option>
          </select>
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {reviews.map((review: any) => (
          <ReviewCard
            key={review._id}
            review={review}
            onEdit={onEditReview}
            onDelete={onDeleteReview}
            showActions={showActions}
          />
        ))}
      </div>

      {/* Pagination */}
      {pagination.pages > 1 && (
        <div className="mt-8 flex items-center justify-center gap-2">
          <button
            onClick={() => setPage(page - 1)}
            disabled={page === 1}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Previous
          </button>
          
          <div className="flex items-center gap-1">
            {Array.from({ length: pagination.pages }, (_, i) => i + 1).map((pageNum) => (
              <button
                key={pageNum}
                onClick={() => setPage(pageNum)}
                className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                  page === pageNum
                    ? 'bg-primary-600 text-white'
                    : 'text-gray-700 hover:bg-gray-100'
                }`}
              >
                {pageNum}
              </button>
            ))}
          </div>

          <button
            onClick={() => setPage(page + 1)}
            disabled={page === pagination.pages}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

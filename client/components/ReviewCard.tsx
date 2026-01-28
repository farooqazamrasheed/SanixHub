import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiThumbsUp, FiThumbsDown, FiEdit2, FiTrash2, FiCheckCircle } from 'react-icons/fi';
import StarRating from './StarRating';
import { useAuthStore } from '@/store/useAuthStore';

interface ReviewCardProps {
  review: any;
  onEdit?: (review: any) => void;
  onDelete?: (reviewId: string) => void;
  showActions?: boolean;
}

export default function ReviewCard({ review, onEdit, onDelete, showActions = false }: ReviewCardProps) {
  const { user } = useAuthStore();
  const [isExpanded, setIsExpanded] = useState(false);
  
  const isOwnReview = user?._id === review.user?._id;
  const userName = review.user?.name || 'Anonymous';
  const userInitial = userName.charAt(0).toUpperCase();
  
  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const commentPreview = review.comment && review.comment.length > 200 
    ? review.comment.substring(0, 200) + '...' 
    : review.comment || '';

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-white rounded-xl border border-gray-200 p-6 hover:shadow-md transition-shadow"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-start gap-3">
          {/* User Avatar */}
          <div className="w-10 h-10 bg-gradient-to-br from-primary-500 to-primary-600 rounded-full flex items-center justify-center text-white font-semibold shadow-md">
            {userInitial}
          </div>
          
          {/* User Info */}
          <div>
            <div className="flex items-center gap-2">
              <h4 className="font-semibold text-gray-900">{userName}</h4>
              {review.isVerified && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                  <FiCheckCircle className="w-3 h-3" />
                  Verified Purchase
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 mt-1">
              <StarRating rating={review.rating} size="sm" />
              <span className="text-xs text-gray-500">{formatDate(review.createdAt)}</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        {showActions && isOwnReview && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => onEdit?.(review)}
              className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
              title="Edit Review"
            >
              <FiEdit2 className="w-4 h-4" />
            </button>
            <button
              onClick={() => onDelete?.(review._id)}
              className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              title="Delete Review"
            >
              <FiTrash2 className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Review Title */}
      {review.title && (
        <h5 className="font-semibold text-gray-900 mb-2">{review.title}</h5>
      )}

      {/* Review Comment */}
      {review.comment && (
        <p className="text-gray-700 leading-relaxed mb-4">
          {isExpanded ? review.comment : commentPreview}
          {review.comment.length > 200 && (
            <button
              onClick={() => setIsExpanded(!isExpanded)}
              className="ml-2 text-primary-600 hover:text-primary-700 font-medium text-sm"
            >
              {isExpanded ? 'Show less' : 'Read more'}
            </button>
          )}
        </p>
      )}

      {/* Review Images */}
      {review.images && review.images.length > 0 && (
        <div className="flex gap-2 mb-4 overflow-x-auto">
          {review.images.map((image: string, index: number) => (
            <img
              key={index}
              src={`${process.env.NEXT_PUBLIC_API_URL}${image}`}
              alt={`Review image ${index + 1}`}
              className="w-20 h-20 object-cover rounded-lg border border-gray-200 cursor-pointer hover:scale-105 transition-transform"
            />
          ))}
        </div>
      )}

      {/* Admin Response */}
      {review.adminResponse?.message && (
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-lg">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
              A
            </div>
            <span className="font-semibold text-blue-900">Admin Response</span>
          </div>
          <p className="text-blue-800 text-sm">{review.adminResponse.message}</p>
          {review.adminResponse.respondedAt && (
            <span className="text-xs text-blue-600 mt-1 block">
              {formatDate(review.adminResponse.respondedAt)}
            </span>
          )}
        </div>
      )}

      {/* Helpful Votes (Optional - can be implemented later) */}
      {/* <div className="flex items-center gap-4 mt-4 pt-4 border-t border-gray-100">
        <button className="flex items-center gap-2 text-gray-600 hover:text-primary-600 transition-colors">
          <FiThumbsUp className="w-4 h-4" />
          <span className="text-sm">Helpful ({review.helpful?.upvotes || 0})</span>
        </button>
        <button className="flex items-center gap-2 text-gray-600 hover:text-gray-700 transition-colors">
          <FiThumbsDown className="w-4 h-4" />
          <span className="text-sm">Not helpful ({review.helpful?.downvotes || 0})</span>
        </button>
      </div> */}
    </motion.div>
  );
}

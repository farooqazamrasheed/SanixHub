import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { FiX, FiStar } from 'react-icons/fi';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import StarRating from './StarRating';
import { reviewAPI } from '@/lib/api';

interface WriteReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  productId: string;
  productName: string;
  existingReview?: any;
}

export default function WriteReviewModal({
  isOpen,
  onClose,
  productId,
  productName,
  existingReview,
}: WriteReviewModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [title, setTitle] = useState('');
  const [comment, setComment] = useState('');
  const [errors, setErrors] = useState<any>({});

  useEffect(() => {
    if (existingReview) {
      setRating(existingReview.rating);
      setTitle(existingReview.title);
      setComment(existingReview.comment);
    } else {
      setRating(5);
      setTitle('');
      setComment('');
    }
    setErrors({});
  }, [existingReview, isOpen]);

  const createMutation = useMutation({
    mutationFn: (data: any) => reviewAPI.createReview(productId, data),
    onSuccess: (response, variables) => {
      // Check if it was a rating-only submission
      const isRatingOnly = !variables.title && !variables.comment;
      
      if (isRatingOnly) {
        toast.success('Rating submitted successfully! Thank you for your feedback.');
      } else {
        toast.success('Review submitted successfully! It will be visible after admin approval.');
      }
      
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      queryClient.invalidateQueries({ queryKey: ['product', productId] });
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to submit review';
      toast.error(message);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (data: any) => reviewAPI.updateReview(existingReview._id, data),
    onSuccess: () => {
      toast.success('Review updated successfully! It will be re-approved by admin.');
      queryClient.invalidateQueries({ queryKey: ['product-reviews', productId] });
      queryClient.invalidateQueries({ queryKey: ['user-reviews'] });
      onClose();
    },
    onError: (error: any) => {
      const message = error.response?.data?.error?.message || 'Failed to update review';
      toast.error(message);
    },
  });

  const validate = () => {
    const newErrors: any = {};

    if (title.length > 100) {
      newErrors.title = 'Title must be less than 100 characters';
    }

    if (comment.length > 1000) {
      newErrors.comment = 'Comment must be less than 1000 characters';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!validate()) {
      return;
    }

    const reviewData: any = {
      rating,
    };

    // Only include title and comment if they have content
    if (title.trim()) {
      reviewData.title = title.trim();
    }
    if (comment.trim()) {
      reviewData.comment = comment.trim();
    }

    if (existingReview) {
      updateMutation.mutate(reviewData);
    } else {
      createMutation.mutate(reviewData);
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
          >
            <div className="bg-white rounded-2xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 flex items-center justify-between rounded-t-2xl">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900">
                    {existingReview ? 'Edit Review' : 'Write a Review'}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">{productName}</p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <FiX className="w-6 h-6" />
                </button>
              </div>

              {/* Body */}
              <form onSubmit={handleSubmit} className="p-6 space-y-6">
                {/* Rating */}
                <div>
                  <label className="block text-sm font-semibold text-gray-900 mb-3">
                    Your Rating *
                  </label>
                  <div className="flex items-center gap-4">
                    <StarRating
                      rating={rating}
                      size="lg"
                      interactive
                      onRatingChange={setRating}
                    />
                    <span className="text-lg font-semibold text-gray-700">
                      {rating} {rating === 1 ? 'Star' : 'Stars'}
                    </span>
                  </div>
                </div>

                {/* Comment */}
                <div>
                  <label htmlFor="comment" className="block text-sm font-semibold text-gray-900 mb-2">
                    Your Review <span className="text-gray-400 font-normal">(Optional)</span>
                  </label>
                  <textarea
                    id="comment"
                    value={comment}
                    onChange={(e) => setComment(e.target.value)}
                    placeholder="Share your experience with this product..."
                    rows={6}
                    maxLength={1000}
                    className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none ${
                      errors.comment ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.comment && (
                    <p className="mt-1 text-sm text-red-600">{errors.comment}</p>
                  )}
                  <p className="mt-1 text-xs text-gray-500">{comment.length}/1000 characters</p>
                </div>

                {/* Info */}
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> {comment.trim() || title.trim() 
                      ? 'Written reviews will be submitted for admin approval before appearing on the product page. Your rating will be reflected immediately.' 
                      : 'Your rating will be reflected immediately in the product rating.'}
                  </p>
                </div>

                {/* Actions */}
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                  <button
                    type="button"
                    onClick={onClose}
                    disabled={isLoading}
                    className="px-6 py-3 text-gray-700 hover:bg-gray-100 rounded-lg font-medium transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="px-6 py-3 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700 transition-colors disabled:opacity-50 flex items-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Submitting...
                      </>
                    ) : (
                      existingReview ? 'Update Review' : 'Submit Review'
                    )}
                  </button>
                </div>
              </form>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

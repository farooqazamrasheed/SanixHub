import { useState } from 'react';
import { motion } from 'framer-motion';
import { FiStar } from 'react-icons/fi';

interface RatingDistributionProps {
  stats: {
    rating: number;
    reviewCount: number;
    distribution?: {
      1: number;
      2: number;
      3: number;
      4: number;
      5: number;
    };
  };
  onRatingClick?: (rating: number) => void;
  onFilterByRating?: (rating: number | null) => void;
  selectedRating?: number | null;
}

export default function RatingDistribution({ 
  stats, 
  onRatingClick,
  onFilterByRating,
  selectedRating 
}: RatingDistributionProps) {
  const [hoveredRating, setHoveredRating] = useState<number | null>(null);
  const distribution = stats.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalReviews = stats.reviewCount;

  const getPercentage = (count: number) => {
    if (totalReviews === 0) return 0;
    return (count / totalReviews) * 100;
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 shadow-sm text-center w-full h-full flex flex-col justify-center">
      {/* Rating Number */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ type: 'spring', stiffness: 200, damping: 15 }}
        className="text-3xl font-bold text-gray-900 mb-2"
      >
        {stats.rating.toFixed(1)}
      </motion.div>
      
      {/* Clickable Stars */}
      <div className="flex items-center justify-center gap-1 mb-2">
        {[1, 2, 3, 4, 5].map((star, index) => (
          <motion.button
            key={star}
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ 
              delay: index * 0.05,
              type: 'spring',
              stiffness: 300,
              damping: 20
            }}
            whileHover={{ scale: 1.2 }}
            whileTap={{ scale: 0.9 }}
            onMouseEnter={() => setHoveredRating(star)}
            onMouseLeave={() => setHoveredRating(null)}
            onClick={() => onRatingClick?.(star)}
            className="focus:outline-none transition-all"
          >
            <FiStar
              className={`w-6 h-6 transition-all ${
                hoveredRating
                  ? star <= hoveredRating
                    ? 'fill-yellow-400 text-yellow-400'
                    : 'text-gray-300'
                  : star <= Math.round(stats.rating)
                  ? 'fill-yellow-400 text-yellow-400'
                  : 'text-gray-300'
              }`}
            />
          </motion.button>
        ))}
      </div>

      {/* Review Count */}
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xs text-gray-500"
      >
        {totalReviews.toLocaleString()} review{totalReviews !== 1 ? 's' : ''}
      </motion.p>
    </div>
  );
}

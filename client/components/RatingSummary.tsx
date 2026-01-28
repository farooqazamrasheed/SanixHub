import { motion } from 'framer-motion';
import { FiTrendingUp, FiAward, FiThumbsUp, FiUsers } from 'react-icons/fi';
import StarRating from './StarRating';

interface RatingSummaryProps {
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
  compact?: boolean;
}

export default function RatingSummary({ stats, compact = false }: RatingSummaryProps) {
  const distribution = stats.distribution || { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const totalReviews = stats.reviewCount;

  // Calculate metrics
  const positiveReviews = distribution[5] + distribution[4];
  const positivePercentage = totalReviews > 0 ? (positiveReviews / totalReviews) * 100 : 0;
  const recommendationRate = Math.round(positivePercentage);
  
  const fiveStarPercentage = totalReviews > 0 ? (distribution[5] / totalReviews) * 100 : 0;
  
  // Average rating trend (simplified - you can make this more sophisticated)
  const trend = stats.rating >= 4 ? 'up' : stats.rating >= 3 ? 'stable' : 'down';

  if (compact) {
    return (
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <StarRating rating={stats.rating} size="md" showNumber />
        </div>
        <span className="text-sm text-gray-600">
          {totalReviews.toLocaleString()} reviews
        </span>
        <span className="text-sm text-green-600 font-medium">
          {recommendationRate}% recommended
        </span>
      </div>
    );
  }

  const baseMetrics = [
    {
      icon: FiAward,
      label: 'Average Rating',
      value: stats.rating.toFixed(1),
      suffix: '/ 5.0',
      color: 'text-yellow-600',
      bgColor: 'bg-yellow-100',
    },
    {
      icon: FiUsers,
      label: 'Total Reviews',
      value: totalReviews.toLocaleString(),
      suffix: '',
      color: 'text-blue-600',
      bgColor: 'bg-blue-100',
    },
  ];

  // Only add Recommended card if there are reviews
  const metrics = totalReviews > 0 
    ? [
        ...baseMetrics,
        {
          icon: FiThumbsUp,
          label: 'Recommended',
          value: recommendationRate + '%',
          suffix: '',
          color: 'text-green-600',
          bgColor: 'bg-green-100',
        },
      ]
    : baseMetrics;

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 ${totalReviews > 0 ? 'lg:grid-cols-3' : ''} gap-4`}>
      {metrics.map((metric, index) => (
        <motion.div
          key={metric.label}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: index * 0.1 }}
          className="bg-white rounded-xl border border-gray-200 p-4 hover:shadow-lg transition-shadow"
        >
          <div className="flex items-start justify-between mb-3">
            <div className={`p-2 rounded-lg ${metric.bgColor}`}>
              <metric.icon className={`w-5 h-5 ${metric.color}`} />
            </div>
            {index === 0 && (
              <StarRating rating={stats.rating} size="sm" />
            )}
          </div>
          
          <div className="flex items-baseline gap-1">
            <span className={`text-3xl font-bold ${metric.color}`}>
              {metric.value}
            </span>
            {metric.suffix && (
              <span className="text-sm text-gray-500">{metric.suffix}</span>
            )}
          </div>
          
          <p className="text-sm text-gray-600 mt-2">{metric.label}</p>
        </motion.div>
      ))}
    </div>
  );
}

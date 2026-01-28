import { useState } from 'react';
import { FiStar } from 'react-icons/fi';
import { motion } from 'framer-motion';

interface StarRatingProps {
  rating: number;
  maxRating?: number;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showNumber?: boolean;
  showCount?: boolean;
  count?: number;
  interactive?: boolean;
  allowHalf?: boolean;
  allowClear?: boolean;
  disabled?: boolean;
  onRatingChange?: (rating: number) => void;
  tooltips?: string[];
  color?: 'yellow' | 'orange' | 'red' | 'blue' | 'green';
  className?: string;
}

export default function StarRating({
  rating,
  maxRating = 5,
  size = 'md',
  showNumber = false,
  showCount = false,
  count = 0,
  interactive = false,
  allowHalf = true,
  allowClear = false,
  disabled = false,
  onRatingChange,
  tooltips = [],
  color = 'yellow',
  className = '',
}: StarRatingProps) {
  const [hoverRating, setHoverRating] = useState<number | null>(null);
  const [clickedRating, setClickedRating] = useState(rating);

  const sizeClasses = {
    xs: 'w-2.5 h-2.5',
    sm: 'w-3.5 h-3.5',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const textSizeClasses = {
    xs: 'text-xs',
    sm: 'text-sm',
    md: 'text-base',
    lg: 'text-lg',
    xl: 'text-xl',
  };

  const colorClasses = {
    yellow: {
      filled: 'fill-yellow-400 text-yellow-400',
      empty: 'text-gray-300',
      hover: 'hover:text-yellow-300',
    },
    orange: {
      filled: 'fill-orange-400 text-orange-400',
      empty: 'text-gray-300',
      hover: 'hover:text-orange-300',
    },
    red: {
      filled: 'fill-red-400 text-red-400',
      empty: 'text-gray-300',
      hover: 'hover:text-red-300',
    },
    blue: {
      filled: 'fill-blue-400 text-blue-400',
      empty: 'text-gray-300',
      hover: 'hover:text-blue-300',
    },
    green: {
      filled: 'fill-green-400 text-green-400',
      empty: 'text-gray-300',
      hover: 'hover:text-green-300',
    },
  };

  const colors = colorClasses[color];

  const handleClick = (value: number) => {
    if (!interactive || disabled) return;

    // Allow clearing rating by clicking the same star
    if (allowClear && clickedRating === value) {
      setClickedRating(0);
      onRatingChange?.(0);
      return;
    }

    setClickedRating(value);
    onRatingChange?.(value);
  };

  const handleMouseEnter = (value: number) => {
    if (interactive && !disabled) {
      setHoverRating(value);
    }
  };

  const handleMouseLeave = () => {
    if (interactive && !disabled) {
      setHoverRating(null);
    }
  };

  const getStarValue = (index: number, event?: React.MouseEvent) => {
    const starValue = index + 1;
    
    if (!allowHalf || !event) return starValue;

    // Calculate if click/hover is on left or right half
    const rect = event.currentTarget.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const halfWidth = rect.width / 2;
    
    return x < halfWidth ? starValue - 0.5 : starValue;
  };

  const displayRating = interactive ? (hoverRating ?? clickedRating) : rating;

  const getStarFill = (index: number) => {
    const starValue = index + 1;
    
    if (starValue <= Math.floor(displayRating)) {
      return 'full';
    } else if (starValue === Math.ceil(displayRating) && displayRating % 1 !== 0) {
      return 'partial';
    } else {
      return 'empty';
    }
  };

  const getTooltipText = (index: number) => {
    if (tooltips.length > 0 && tooltips[index]) {
      return tooltips[index];
    }
    return `${index + 1} star${index + 1 > 1 ? 's' : ''}`;
  };

  return (
    <div className={`flex items-center ${className}`}>
      {/* Stars */}
      <div className="flex items-center -space-x-0.5">
        {Array.from({ length: maxRating }, (_, index) => {
          const fillType = getStarFill(index);
          const starValue = index + 1;

          return (
            <motion.button
              key={index}
              type="button"
              disabled={!interactive || disabled}
              onClick={(e) => handleClick(getStarValue(index, e))}
              onMouseMove={(e) => handleMouseEnter(getStarValue(index, e))}
              onMouseLeave={handleMouseLeave}
              whileHover={interactive && !disabled ? { scale: 1.15 } : {}}
              whileTap={interactive && !disabled ? { scale: 0.95 } : {}}
              title={getTooltipText(index)}
              className={`${
                interactive && !disabled
                  ? `cursor-pointer ${colors.hover}`
                  : 'cursor-default'
              } transition-all ${
                interactive && !disabled
                  ? 'focus:outline-none focus:ring-2 focus:ring-offset-1 focus:ring-yellow-400 rounded-sm'
                  : ''
              } ${disabled ? 'opacity-50' : ''}`}
            >
              {fillType === 'full' ? (
                <FiStar className={`${sizeClasses[size]} ${colors.filled}`} />
              ) : fillType === 'partial' ? (
                <div className="relative">
                  <FiStar className={`${sizeClasses[size]} ${colors.empty}`} />
                  <div
                    className="absolute top-0 left-0 overflow-hidden"
                    style={{ width: `${(displayRating % 1) * 100}%` }}
                  >
                    <FiStar className={`${sizeClasses[size]} ${colors.filled}`} />
                  </div>
                </div>
              ) : (
                <FiStar className={`${sizeClasses[size]} ${colors.empty}`} />
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Rating Number */}
      {showNumber && (
        <motion.span
          key={displayRating}
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className={`ml-1 ${textSizeClasses[size]} font-semibold text-gray-700`}
        >
          {displayRating.toFixed(1)}
        </motion.span>
      )}

      {/* Review Count */}
      {showCount && count > 0 && (
        <span className={`ml-1 ${textSizeClasses[size]} text-gray-500`}>
          ({count.toLocaleString()})
        </span>
      )}

      {/* Interactive Label */}
      {interactive && !disabled && hoverRating !== null && tooltips.length === 0 && (
        <motion.span
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          className={`ml-2 ${textSizeClasses[size]} text-gray-600 font-medium`}
        >
          {hoverRating === 1 && 'Poor'}
          {hoverRating === 2 && 'Fair'}
          {hoverRating === 3 && 'Good'}
          {hoverRating === 4 && 'Very Good'}
          {hoverRating === 5 && 'Excellent'}
        </motion.span>
      )}
    </div>
  );
}

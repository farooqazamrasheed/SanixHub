const Review = require('../models/Review');
const Product = require('../models/Product');
const Order = require('../models/Order');

/**
 * @desc    Get product reviews
 * @route   GET /api/products/:productId/reviews
 * @access  Public
 */
exports.getProductReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, sort = '-createdAt' } = req.query;

    const query = {
      product: req.params.productId,
      isApproved: true,
      isRatingOnly: false // Only show written reviews, not rating-only submissions
    };

    const skip = (page - 1) * limit;
    const reviews = await Review.find(query)
      .populate('user', 'profile')
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create product review
 * @route   POST /api/products/:productId/reviews
 * @access  Private
 */
exports.createReview = async (req, res, next) => {
  try {
    const { rating, title, comment, images } = req.body;
    const productId = req.params.productId;

    // Check if product exists
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    // Check if user already reviewed this product
    const existingReview = await Review.findOne({
      product: productId,
      user: req.user._id
    });

    if (existingReview) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_REVIEWED',
          message: 'You have already reviewed this product'
        }
      });
    }

    // Optional: Verify purchase
    const hasPurchased = await Order.findOne({
      customer: req.user._id,
      'items.product': productId,
      status: 'picked_up'
    });

    // Determine if this is rating-only (no written review)
    const isRatingOnly = !title && !comment;

    const review = await Review.create({
      product: productId,
      user: req.user._id,
      rating,
      title,
      comment,
      images: images || [],
      isVerified: !!hasPurchased,
      isRatingOnly,
      isApproved: isRatingOnly // Rating-only reviews auto-approved, written reviews need approval
    });

    // Update product rating immediately if rating-only
    if (isRatingOnly) {
      await updateProductRating(productId);
    }

    res.status(201).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update review
 * @route   PUT /api/reviews/:id
 * @access  Private
 */
exports.updateReview = async (req, res, next) => {
  try {
    let review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    // Check ownership
    if (review.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot edit this review'
        }
      });
    }

    const { rating, title, comment, images } = req.body;
    review.rating = rating || review.rating;
    review.title = title || review.title;
    review.comment = comment || review.comment;
    review.images = images || review.images;
    review.isApproved = false; // Requires re-approval after edit

    await review.save();

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete review
 * @route   DELETE /api/reviews/:id
 * @access  Private
 */
exports.deleteReview = async (req, res, next) => {
  try {
    const review = await Review.findById(req.params.id);

    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    // Check ownership or admin
    if (review.user.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot delete this review'
        }
      });
    }

    await review.deleteOne();

    // Update product stats
    await updateProductRating(review.product);

    res.status(200).json({
      success: true,
      data: {
        message: 'Review deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Helper function to update product rating
 */
async function updateProductRating(productId) {
  // Get all approved reviews (both rating-only and written reviews)
  const reviews = await Review.find({ product: productId, isApproved: true });
  
  const product = await Product.findById(productId);
  if (reviews.length > 0) {
    const avgRating = reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length;
    product.stats.rating = Math.round(avgRating * 10) / 10; // Round to 1 decimal
    
    // Count only written reviews (not rating-only) for review count
    const writtenReviews = reviews.filter(r => !r.isRatingOnly);
    product.stats.reviewCount = writtenReviews.length;
    
    // Calculate distribution for all approved ratings
    const distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    reviews.forEach(review => {
      distribution[review.rating]++;
    });
    product.stats.distribution = distribution;
  } else {
    product.stats.rating = 0;
    product.stats.reviewCount = 0;
    product.stats.distribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  }
  
  await product.save();
}

/**
 * @desc    Get user's reviews
 * @route   GET /api/reviews/my-reviews
 * @access  Private
 */
exports.getUserReviews = async (req, res, next) => {
  try {
    const reviews = await Review.find({ user: req.user._id })
      .populate('product', 'name images slug')
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: { reviews }
    });
  } catch (error) {
    next(error);
  }
};

// Export helper for use in admin controller
exports.updateProductRating = updateProductRating;

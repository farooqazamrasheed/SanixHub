const express = require('express');
const router = express.Router();
const {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  getUserReviews
} = require('../controllers/reviewController');
const { protect } = require('../middleware/auth');
const { reviewValidation, objectIdValidation, validate } = require('../middleware/validators');

// Get product reviews (public)
router.get('/products/:productId', ...objectIdValidation('productId'), validate, getProductReviews);

// Protected routes
router.use(protect);

// Get user's own reviews
router.get('/my-reviews', getUserReviews);

router.post('/products/:productId', ...objectIdValidation('productId'), ...reviewValidation, validate, createReview);
router.put('/:id', ...objectIdValidation('id'), validate, updateReview);
router.delete('/:id', ...objectIdValidation('id'), validate, deleteReview);

module.exports = router;

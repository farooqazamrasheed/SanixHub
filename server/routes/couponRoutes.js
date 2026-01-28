const express = require('express');
const router = express.Router();
const { 
  validateCoupon,
  getAllCoupons,
  getCouponById,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getCouponStats
} = require('../controllers/couponController');
const { protect, authorize } = require('../middleware/auth');
const { couponValidation, objectIdValidation, validate } = require('../middleware/validators');

// Public routes (require authentication)
router.use(protect);
router.post('/validate', validateCoupon);

// Admin routes
router.use(authorize('superadmin'));

// Coupon statistics
router.get('/stats', getCouponStats);

// CRUD routes
router.route('/')
  .get(getAllCoupons)
  .post(...couponValidation, validate, createCoupon);

router.route('/:id')
  .get(...objectIdValidation('id'), validate, getCouponById)
  .put(...objectIdValidation('id'), validate, updateCoupon)
  .delete(...objectIdValidation('id'), validate, deleteCoupon);

module.exports = router;

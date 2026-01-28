const express = require('express');
const router = express.Router();
const {
  getAllBrands,
  getBrandById,
  createBrand,
  updateBrand,
  deleteBrand,
  syncBrandCounts,
  getBrandStats
} = require('../controllers/brandController');
const { protect, authorize } = require('../middleware/auth');
const { brandValidation, validate, objectIdValidation } = require('../middleware/validators');

// All routes require authentication and admin role
router.use(protect);
router.use(authorize('superadmin', 'admin'));

// Brand statistics
router.get('/stats', getBrandStats);

// Sync product counts
router.post('/sync-counts', syncBrandCounts);

// CRUD routes
router.route('/')
  .get(getAllBrands)
  .post(...brandValidation, validate, createBrand);

router.route('/:id')
  .get(...objectIdValidation('id'), validate, getBrandById)
  .put(...objectIdValidation('id'), ...brandValidation, validate, updateBrand)
  .delete(...objectIdValidation('id'), validate, deleteBrand);

module.exports = router;

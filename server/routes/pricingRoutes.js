const express = require('express');
const router = express.Router();
const {
  updateProductPrice,
  previewBrandPriceChange,
  applyBrandPriceChange,
  previewCategoryPriceChange,
  applyCategoryPriceChange,
  getOperationStatus,
  undoPriceChange,
  getPriceChangeHistory,
  getPricingStats
} = require('../controllers/pricingController');
const { protect, adminOnly } = require('../middleware/auth');

// All pricing routes require admin authentication
router.use(protect);
router.use(adminOnly);

// Individual product pricing
router.put('/product/:id', updateProductPrice);

// Brand bulk pricing
router.post('/brand/:id/preview', previewBrandPriceChange);
router.post('/brand/:id/apply', applyBrandPriceChange);

// Category bulk pricing
router.post('/category/:id/preview', previewCategoryPriceChange);
router.post('/category/:id/apply', applyCategoryPriceChange);

// Operation management
router.get('/operation/:id', getOperationStatus);
router.post('/operation/:id/undo', undoPriceChange);

// History and analytics
router.get('/history', getPriceChangeHistory);
router.get('/stats', getPricingStats);

module.exports = router;

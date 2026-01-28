const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  getProductById,
  createProduct,
  updateProduct,
  deleteProduct,
  getRelatedProducts,
  bulkUpdateProducts,
  bulkDeleteProducts,
  getPublicBrands,
  getPublicBrandBySlug,
  checkSku,
  suggestSku,
  bulkUpdateAllProducts
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { productValidation, paginationValidation, objectIdValidation, validate } = require('../middleware/validators');

// Public routes
router.get('/', ...paginationValidation, validate, getProducts);
router.get('/brands', getPublicBrands); // Must be before /:slug
router.get('/brands/:slug', getPublicBrandBySlug);
router.get('/id/:id', ...objectIdValidation('id'), validate, getProductById);
router.get('/:slug', getProduct);
router.get('/:id/related', ...objectIdValidation('id'), validate, getRelatedProducts);

// Admin routes
router.use(protect, authorize('superadmin'));

router.get('/check-sku/:sku', checkSku);
router.post('/suggest-sku', suggestSku);
router.post('/bulk-update-all', bulkUpdateAllProducts);
router.post('/', ...productValidation, validate, createProduct);
router.put('/bulk/update', bulkUpdateProducts);
router.delete('/bulk/delete', bulkDeleteProducts);
router.put('/:id', ...objectIdValidation('id'), validate, updateProduct);
router.delete('/:id', ...objectIdValidation('id'), validate, deleteProduct);

module.exports = router;

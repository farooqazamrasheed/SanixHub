const express = require('express');
const router = express.Router();
const {
  getDashboardStats,
  getAllOrders,
  getOrder,
  updateOrderStatus,
  getAllReviews,
  moderateReview,
  getAllCoupons,
  createCoupon,
  updateCoupon,
  deleteCoupon,
  getLowStockProducts,
  updateInventory,
  getAllUsers,
  getUserDetails,
  toggleUserStatus
} = require('../controllers/adminController');

const { exportOrders } = require('../controllers/orderController');

const {
  bulkUpdateInventory,
  getInventoryHistory,
  generateInventoryReport,
  exportInventory,
  exportInventoryCSV,
  importInventoryCSV,
  getImportTemplate
} = require('../controllers/bulkInventoryController');

const brandController = require('../controllers/brandController');
const { getAllWishlists, getCustomerWishlist } = require('../controllers/wishlistController');
const { triggerLowStockAlert } = require('../utils/inventoryAlerts');
const { protect, authorize } = require('../middleware/auth');
const { couponValidation, objectIdValidation, validate } = require('../middleware/validators');

// All admin routes require superadmin role
router.use(protect, authorize('superadmin'));

// Dashboard
router.get('/dashboard', getDashboardStats);

// Orders management
router.get('/orders/export', exportOrders); // Export orders (must be before /:id route)
router.get('/orders', getAllOrders);
router.get('/orders/:id', ...objectIdValidation('id'), validate, getOrder);
router.put('/orders/:id/status', ...objectIdValidation('id'), validate, updateOrderStatus);

// Reviews moderation
router.get('/reviews', getAllReviews);
router.put('/reviews/:id/approve', ...objectIdValidation('id'), validate, moderateReview);

// Coupons management
router.get('/coupons', getAllCoupons);
router.post('/coupons', ...couponValidation, validate, createCoupon);
router.put('/coupons/:id', ...objectIdValidation('id'), validate, updateCoupon);
router.delete('/coupons/:id', ...objectIdValidation('id'), validate, deleteCoupon);

// Inventory management
router.get('/inventory/low-stock', getLowStockProducts);
router.put('/inventory/:productId', ...objectIdValidation('productId'), validate, updateInventory);
router.post('/inventory/bulk-update', bulkUpdateInventory);
router.get('/inventory/:productId/history', ...objectIdValidation('productId'), validate, getInventoryHistory);
router.get('/inventory/reports', generateInventoryReport);
router.get('/inventory/export', exportInventory); // New unified export endpoint
router.get('/inventory/export/csv', exportInventoryCSV); // Backward compatibility
router.get('/inventory/template', getImportTemplate); // Dynamic template
router.post('/inventory/import/csv', importInventoryCSV);
router.post('/inventory/alerts/trigger', triggerLowStockAlert);

// User management
router.get('/users', getAllUsers);
router.get('/users/:id', ...objectIdValidation('id'), validate, getUserDetails);
router.put('/users/:id/status', ...objectIdValidation('id'), validate, toggleUserStatus);

// Wishlist management
router.get('/wishlists', getAllWishlists);
router.get('/wishlists/:userId', ...objectIdValidation('userId'), validate, getCustomerWishlist);

// Brand management
router.get('/brands/stats', brandController.getBrandStats);
router.post('/brands/sync-counts', brandController.syncBrandCounts);
router.get('/brands/:id/products', ...objectIdValidation('id'), validate, brandController.getBrandProducts);
router.get('/brands/:id/analytics', ...objectIdValidation('id'), validate, brandController.getBrandAnalytics);
router.post('/brands/:id/assign-products', ...objectIdValidation('id'), validate, brandController.assignProductsToBrand);
router.delete('/brands/:id/remove-product/:productId', ...objectIdValidation('id'), ...objectIdValidation('productId'), validate, brandController.removeProductFromBrand);
router.get('/brands/:id', ...objectIdValidation('id'), validate, brandController.getBrandById);
router.get('/brands', brandController.getAllBrands);
router.post('/brands', brandController.createBrand);
router.put('/brands/:id', ...objectIdValidation('id'), validate, brandController.updateBrand);
router.delete('/brands/:id', ...objectIdValidation('id'), validate, brandController.deleteBrand);

module.exports = router;

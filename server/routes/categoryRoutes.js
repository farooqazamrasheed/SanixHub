const express = require('express');
const router = express.Router();
const {
  getCategories,
  getCategoryTree,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
  bulkReorderCategories
} = require('../controllers/categoryController');
const { protect, authorize } = require('../middleware/auth');
const { objectIdValidation, validate } = require('../middleware/validators');

// Public routes
router.get('/', getCategories);
router.get('/tree', getCategoryTree);
router.get('/:slug', getCategory);

// Admin routes
router.use(protect, authorize('superadmin'));

router.post('/', createCategory);
router.put('/bulk/reorder', bulkReorderCategories);
router.put('/:id', ...objectIdValidation('id'), validate, updateCategory);
router.delete('/:id', ...objectIdValidation('id'), validate, deleteCategory);

module.exports = router;

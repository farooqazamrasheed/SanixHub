const express = require('express');
const router = express.Router();
const {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart
} = require('../controllers/cartController');
const { protect } = require('../middleware/auth');
const { objectIdValidation, validate } = require('../middleware/validators');

// All cart routes require authentication
router.use(protect);

router.get('/', getCart);
router.post('/items', addToCart);
router.put('/items/:productId', ...objectIdValidation('productId'), validate, updateCartItem);
router.delete('/items/:productId', ...objectIdValidation('productId'), validate, removeFromCart);
router.delete('/', clearCart);

module.exports = router;

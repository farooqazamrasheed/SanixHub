const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  cancelOrder
} = require('../controllers/orderController');
const { protect } = require('../middleware/auth');
const { orderValidation, objectIdValidation, validate } = require('../middleware/validators');

// All order routes require authentication
router.use(protect);

router.post('/', ...orderValidation, validate, createOrder);
router.get('/', getMyOrders);
router.get('/:id', ...objectIdValidation('id'), validate, getOrder);
router.put('/:id/cancel', ...objectIdValidation('id'), validate, cancelOrder);

module.exports = router;

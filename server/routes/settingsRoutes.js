const express = require('express');
const router = express.Router();
const {
  getSettings,
  getAccountSettings,
  updateAccountSettings,
  getNotificationSettings,
  updateNotificationSettings,
  getStoreSettings,
  updateStoreSettings,
  getPaymentSettings,
  updatePaymentSettings,
  getShippingSettings,
  updateShippingSettings,
  getInvoiceSettings,
  updateInvoiceSettings,
  getEmailSettings,
  updateEmailSettings,
  getNextInvoiceNumber
} = require('../controllers/settingsController');
const { protect, adminOnly } = require('../middleware/auth');

// All settings routes require authentication
router.use(protect);

// General user settings
router.get('/', getSettings);

// Account settings
router.get('/account', getAccountSettings);
router.put('/account', updateAccountSettings);

// Notification settings
router.get('/notifications', getNotificationSettings);
router.put('/notifications', updateNotificationSettings);

// Admin-only routes
// Store settings
router.get('/store', adminOnly, getStoreSettings);
router.put('/store', adminOnly, updateStoreSettings);

// Payment settings
router.get('/payment', adminOnly, getPaymentSettings);
router.put('/payment', adminOnly, updatePaymentSettings);

// Shipping settings
router.get('/shipping', adminOnly, getShippingSettings);
router.put('/shipping', adminOnly, updateShippingSettings);

// Invoice settings
router.get('/invoice', adminOnly, getInvoiceSettings);
router.put('/invoice', adminOnly, updateInvoiceSettings);
router.get('/invoice/next-number', adminOnly, getNextInvoiceNumber);

// Email settings
router.get('/email', adminOnly, getEmailSettings);
router.put('/email', adminOnly, updateEmailSettings);

module.exports = router;

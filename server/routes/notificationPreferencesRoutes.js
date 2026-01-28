const express = require('express');
const router = express.Router();
const {
  getPreferences,
  updatePreferences,
  updatePreferenceCategory,
  testNotification,
  resetPreferences
} = require('../controllers/notificationPreferencesController');
const { protect } = require('../middleware/auth');

// All routes require authentication
router.use(protect);

// User routes
router.get('/preferences', getPreferences);
router.put('/preferences', updatePreferences);
router.patch('/preferences/:category', updatePreferenceCategory);
router.post('/preferences/reset', resetPreferences);
router.post('/test', testNotification);

module.exports = router;

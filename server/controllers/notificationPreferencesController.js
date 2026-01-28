const NotificationPreferences = require('../models/NotificationPreferences');
const { getIO } = require('../socket');

/**
 * @desc    Get user's notification preferences
 * @route   GET /api/notifications/preferences
 * @access  Private
 */
exports.getPreferences = async (req, res, next) => {
  try {
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    res.status(200).json({
      success: true,
      data: { preferences }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update user's notification preferences
 * @route   PUT /api/notifications/preferences
 * @access  Private
 */
exports.updatePreferences = async (req, res, next) => {
  try {
    const preferences = await NotificationPreferences.findOneAndUpdate(
      { user: req.user._id },
      req.body,
      { new: true, upsert: true, runValidators: true }
    );

    // Emit real-time preference update via WebSocket
    try {
      const io = getIO();
      io.to(`user:${req.user._id}`).emit('notifications:preferences-updated', {
        preferences,
        timestamp: new Date()
      });
      console.log(`🔔 Notification preferences updated for user ${req.user._id}`);
    } catch (socketError) {
      console.error('Failed to emit preference update via WebSocket:', socketError);
    }

    res.status(200).json({
      success: true,
      data: { preferences },
      message: 'Notification preferences updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update specific preference category
 * @route   PATCH /api/notifications/preferences/:category
 * @access  Private
 */
exports.updatePreferenceCategory = async (req, res, next) => {
  try {
    const { category } = req.params;
    const validCategories = ['email', 'inApp', 'push', 'sound', 'doNotDisturb', 'admin'];

    if (!validCategories.includes(category)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_CATEGORY',
          message: `Invalid category. Must be one of: ${validCategories.join(', ')}`
        }
      });
    }

    const updateData = { [category]: req.body };
    
    const preferences = await NotificationPreferences.findOneAndUpdate(
      { user: req.user._id },
      updateData,
      { new: true, upsert: true, runValidators: true }
    );

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user:${req.user._id}`).emit('notifications:preferences-updated', {
        preferences,
        category,
        timestamp: new Date()
      });
    } catch (socketError) {
      console.error('Failed to emit preference update via WebSocket:', socketError);
    }

    res.status(200).json({
      success: true,
      data: { preferences },
      message: `${category} preferences updated successfully`
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Test notification with current preferences
 * @route   POST /api/notifications/test
 * @access  Private
 */
exports.testNotification = async (req, res, next) => {
  try {
    const { type = 'orderStatusUpdate', channel = 'inApp' } = req.body;
    
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    // Check if notification is enabled
    const isEnabled = preferences.isEnabled(channel, type);

    if (!isEnabled) {
      return res.status(200).json({
        success: true,
        data: {
          sent: false,
          reason: 'Notification is disabled in preferences or Do Not Disturb is active'
        }
      });
    }

    // Send test notification via WebSocket
    try {
      const io = getIO();
      io.to(`user:${req.user._id}`).emit('notification:test', {
        title: 'Test Notification',
        message: `This is a test ${type} notification via ${channel}`,
        type: 'info',
        channel,
        sound: preferences.sound,
        timestamp: new Date()
      });
    } catch (socketError) {
      console.error('Failed to send test notification:', socketError);
      return res.status(500).json({
        success: false,
        error: {
          code: 'NOTIFICATION_FAILED',
          message: 'Failed to send test notification'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        sent: true,
        message: 'Test notification sent successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Reset preferences to default
 * @route   POST /api/notifications/preferences/reset
 * @access  Private
 */
exports.resetPreferences = async (req, res, next) => {
  try {
    // Delete existing preferences (will be recreated with defaults)
    await NotificationPreferences.findOneAndDelete({ user: req.user._id });
    
    // Create new with defaults
    const preferences = await NotificationPreferences.getOrCreate(req.user._id);

    // Emit real-time update
    try {
      const io = getIO();
      io.to(`user:${req.user._id}`).emit('notifications:preferences-reset', {
        preferences,
        timestamp: new Date()
      });
    } catch (socketError) {
      console.error('Failed to emit preference reset via WebSocket:', socketError);
    }

    res.status(200).json({
      success: true,
      data: { preferences },
      message: 'Notification preferences reset to defaults'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users' preferences (admin only)
 * @route   GET /api/admin/notification-preferences
 * @access  Private (Admin only)
 */
exports.getAllPreferences = async (req, res, next) => {
  try {
    const { page = 1, limit = 20 } = req.query;
    
    const skip = (page - 1) * limit;
    
    const [preferences, total] = await Promise.all([
      NotificationPreferences.find()
        .populate('user', 'email profile')
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      NotificationPreferences.countDocuments()
    ]);

    res.status(200).json({
      success: true,
      data: {
        preferences,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

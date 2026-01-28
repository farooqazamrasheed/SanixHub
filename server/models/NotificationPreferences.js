const mongoose = require('mongoose');

const notificationPreferencesSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  
  // Email Notifications
  email: {
    enabled: { type: Boolean, default: true },
    orderPlaced: { type: Boolean, default: true },
    orderStatusUpdate: { type: Boolean, default: true },
    orderReady: { type: Boolean, default: true },
    orderPickedUp: { type: Boolean, default: true },
    orderCancelled: { type: Boolean, default: true },
    wishlistPriceDrop: { type: Boolean, default: true },
    wishlistBackInStock: { type: Boolean, default: true },
    promotions: { type: Boolean, default: false },
    newsletter: { type: Boolean, default: false }
  },

  // In-App Notifications
  inApp: {
    enabled: { type: Boolean, default: true },
    orderPlaced: { type: Boolean, default: true },
    orderStatusUpdate: { type: Boolean, default: true },
    orderReady: { type: Boolean, default: true },
    orderPickedUp: { type: Boolean, default: true },
    orderCancelled: { type: Boolean, default: true },
    wishlistPriceDrop: { type: Boolean, default: true },
    wishlistBackInStock: { type: Boolean, default: true },
    promotions: { type: Boolean, default: true },
    lowStockAlert: { type: Boolean, default: false }
  },

  // Push Notifications (for future implementation)
  push: {
    enabled: { type: Boolean, default: false },
    orderPlaced: { type: Boolean, default: false },
    orderStatusUpdate: { type: Boolean, default: false },
    orderReady: { type: Boolean, default: false },
    orderPickedUp: { type: Boolean, default: false },
    orderCancelled: { type: Boolean, default: false },
    wishlistPriceDrop: { type: Boolean, default: false },
    wishlistBackInStock: { type: Boolean, default: false },
    promotions: { type: Boolean, default: false }
  },

  // Sound Settings
  sound: {
    enabled: { type: Boolean, default: true },
    volume: { type: Number, default: 0.5, min: 0, max: 1 },
    soundType: { 
      type: String, 
      enum: ['default', 'chime', 'bell', 'ding', 'pop'],
      default: 'default'
    }
  },

  // Do Not Disturb
  doNotDisturb: {
    enabled: { type: Boolean, default: false },
    startTime: { type: String, default: '22:00' }, // HH:mm format
    endTime: { type: String, default: '08:00' },
    timezone: { type: String, default: 'Asia/Karachi' }
  },

  // Admin-specific settings (for admin users)
  admin: {
    newOrderSound: { type: Boolean, default: true },
    lowStockAlert: { type: Boolean, default: true },
    newReviewAlert: { type: Boolean, default: true },
    newUserRegistration: { type: Boolean, default: false }
  }
}, {
  timestamps: true
});

// Note: user field already has unique: true which creates an index

// Method to check if notification type is enabled
notificationPreferencesSchema.methods.isEnabled = function(channel, type) {
  if (!this[channel] || !this[channel].enabled) return false;
  if (type && !this[channel][type]) return false;
  
  // Check Do Not Disturb
  if (this.doNotDisturb.enabled && this.isInDoNotDisturbPeriod()) {
    return false;
  }
  
  return true;
};

// Check if current time is in Do Not Disturb period
notificationPreferencesSchema.methods.isInDoNotDisturbPeriod = function() {
  if (!this.doNotDisturb.enabled) return false;
  
  const now = new Date();
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight
  
  const [startHour, startMin] = this.doNotDisturb.startTime.split(':').map(Number);
  const [endHour, endMin] = this.doNotDisturb.endTime.split(':').map(Number);
  
  const startTime = startHour * 60 + startMin;
  const endTime = endHour * 60 + endMin;
  
  // Handle overnight periods (e.g., 22:00 to 08:00)
  if (startTime > endTime) {
    return currentTime >= startTime || currentTime <= endTime;
  } else {
    return currentTime >= startTime && currentTime <= endTime;
  }
};

// Static method to get or create preferences for a user
notificationPreferencesSchema.statics.getOrCreate = async function(userId) {
  let preferences = await this.findOne({ user: userId });
  
  if (!preferences) {
    preferences = await this.create({ user: userId });
  }
  
  return preferences;
};

module.exports = mongoose.model('NotificationPreferences', notificationPreferencesSchema);

// Notification Preferences Real-Time Handler
const NotificationPreferences = require('../../models/NotificationPreferences');

module.exports = (io, socket) => {
  
  // Subscribe to notification preferences updates
  socket.on('notifications:subscribe', () => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    socket.join(`notifications:user:${socket.userId}`);
    console.log(`🔔 User ${socket.userId} subscribed to notification preferences`);
    socket.emit('notifications:subscribed');
  });

  // Get current notification preferences
  socket.on('notifications:get-preferences', async () => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    try {
      const preferences = await NotificationPreferences.getOrCreate(socket.userId);
      socket.emit('notifications:preferences', {
        preferences,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Error getting notification preferences:', error);
      socket.emit('error', { message: 'Failed to get notification preferences' });
    }
  });

  // Update notification preferences (real-time)
  socket.on('notifications:update-preferences', async (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    try {
      const preferences = await NotificationPreferences.findOneAndUpdate(
        { user: socket.userId },
        data,
        { new: true, upsert: true, runValidators: true }
      );

      // Emit to user's room
      io.to(`user:${socket.userId}`).emit('notifications:preferences-updated', {
        preferences,
        timestamp: new Date()
      });

      socket.emit('notifications:update-success', {
        preferences,
        message: 'Preferences updated successfully'
      });

      console.log(`🔔 Notification preferences updated for user ${socket.userId}`);
    } catch (error) {
      console.error('Error updating notification preferences:', error);
      socket.emit('error', { message: 'Failed to update notification preferences' });
    }
  });

  // Toggle specific notification type
  socket.on('notifications:toggle', async (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    try {
      const { channel, type } = data; // e.g., channel: 'email', type: 'orderPlaced'
      
      const preferences = await NotificationPreferences.getOrCreate(socket.userId);
      
      if (preferences[channel] && preferences[channel][type] !== undefined) {
        preferences[channel][type] = !preferences[channel][type];
        await preferences.save();

        io.to(`user:${socket.userId}`).emit('notifications:preferences-updated', {
          preferences,
          timestamp: new Date()
        });

        socket.emit('notifications:toggle-success', {
          channel,
          type,
          enabled: preferences[channel][type],
          message: `${type} ${preferences[channel][type] ? 'enabled' : 'disabled'}`
        });
      } else {
        socket.emit('error', { message: 'Invalid channel or type' });
      }
    } catch (error) {
      console.error('Error toggling notification:', error);
      socket.emit('error', { message: 'Failed to toggle notification' });
    }
  });

  // Update sound settings (real-time)
  socket.on('notifications:update-sound', async (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    try {
      const { enabled, volume, soundType } = data;
      
      const preferences = await NotificationPreferences.findOneAndUpdate(
        { user: socket.userId },
        { 
          sound: {
            enabled: enabled !== undefined ? enabled : true,
            volume: volume !== undefined ? volume : 0.5,
            soundType: soundType || 'default'
          }
        },
        { new: true, upsert: true }
      );

      io.to(`user:${socket.userId}`).emit('notifications:sound-updated', {
        sound: preferences.sound,
        timestamp: new Date()
      });

      socket.emit('notifications:sound-update-success', {
        sound: preferences.sound,
        message: 'Sound settings updated'
      });

      console.log(`🔊 Sound settings updated for user ${socket.userId}`);
    } catch (error) {
      console.error('Error updating sound settings:', error);
      socket.emit('error', { message: 'Failed to update sound settings' });
    }
  });

  // Test notification sound
  socket.on('notifications:test-sound', async (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    try {
      const preferences = await NotificationPreferences.getOrCreate(socket.userId);
      
      socket.emit('notification:test', {
        title: 'Test Sound',
        message: 'This is a test notification sound',
        type: 'info',
        sound: preferences.sound,
        testSound: true,
        timestamp: new Date()
      });

      console.log(`🔊 Test sound sent to user ${socket.userId}`);
    } catch (error) {
      console.error('Error sending test sound:', error);
      socket.emit('error', { message: 'Failed to send test sound' });
    }
  });
};

// Helper function to emit notifications with preference checking
const emitNotificationWithPreferences = async (io, userId, notification) => {
  try {
    const NotificationPreferences = require('../../models/NotificationPreferences');
    const preferences = await NotificationPreferences.getOrCreate(userId);

    const { channel = 'inApp', type } = notification;

    // Check if notification is enabled
    if (!preferences.isEnabled(channel, type)) {
      console.log(`🔕 Notification blocked by preferences: ${type} for user ${userId}`);
      return false;
    }

    // Add sound settings to notification
    notification.sound = preferences.sound;

    // Emit the notification
    io.to(`user:${userId}`).emit('user:notification', notification);
    
    console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);
    return true;
  } catch (error) {
    console.error('Error emitting notification with preferences:', error);
    return false;
  }
};

module.exports.emitNotificationWithPreferences = emitNotificationWithPreferences;

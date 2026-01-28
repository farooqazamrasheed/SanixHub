// Settings Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to settings updates (admin only)
  socket.on('settings:subscribe', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('settings:updates');
    console.log(`⚙️ Admin ${socket.id} subscribed to settings updates`);
    socket.emit('settings:subscribed');
  });

  // Unsubscribe from settings updates
  socket.on('settings:unsubscribe', () => {
    socket.leave('settings:updates');
    console.log(`⚙️ Admin ${socket.id} unsubscribed from settings updates`);
  });

  // Request current settings
  socket.on('settings:request', async (data) => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    try {
      const Settings = require('../../models/Settings');
      const { category } = data; // store, payment, shipping, invoice, email
      
      const settings = await Settings.getSettings();
      
      let settingsData = {};
      switch (category) {
        case 'store':
          settingsData = { store: settings.store, seo: settings.seo, security: settings.security, notifications: settings.notifications };
          break;
        case 'payment':
          settingsData = settings.payment;
          break;
        case 'shipping':
          settingsData = settings.shipping;
          break;
        case 'invoice':
          settingsData = settings.invoice;
          break;
        case 'email':
          settingsData = settings.email;
          break;
        default:
          settingsData = settings;
      }

      socket.emit('settings:data', {
        category,
        settings: settingsData,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Settings request error:', error);
      socket.emit('error', { message: 'Failed to fetch settings' });
    }
  });
};

// Helper functions to emit settings events (called from controllers)

const emitSettingsUpdate = (io, data) => {
  io.to('settings:updates').emit('settings:updated', {
    ...data,
    timestamp: new Date()
  });
  
  console.log(`⚙️ Settings updated: ${data.category}`);
};

const emitMaintenanceModeChange = (io, enabled) => {
  // Broadcast to all users (not just admins)
  io.emit('settings:maintenance-mode', {
    enabled,
    timestamp: new Date()
  });
  
  console.log(`🔧 Maintenance mode ${enabled ? 'enabled' : 'disabled'}`);
};

const emitPaymentMethodChange = (io, data) => {
  io.to('settings:updates').emit('settings:payment-method-changed', {
    method: data.method,
    enabled: data.enabled,
    timestamp: new Date()
  });
  
  console.log(`💳 Payment method ${data.method} ${data.enabled ? 'enabled' : 'disabled'}`);
};

const emitShippingUpdate = (io, data) => {
  io.to('settings:updates').emit('settings:shipping-updated', {
    ...data,
    timestamp: new Date()
  });
  
  console.log(`🚚 Shipping settings updated`);
};

module.exports.emitSettingsUpdate = emitSettingsUpdate;
module.exports.emitMaintenanceModeChange = emitMaintenanceModeChange;
module.exports.emitPaymentMethodChange = emitPaymentMethodChange;
module.exports.emitShippingUpdate = emitShippingUpdate;

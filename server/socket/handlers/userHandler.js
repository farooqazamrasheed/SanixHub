// User Real-Time Event Handler

module.exports = (io, socket) => {
  
  // User comes online
  socket.on('user:online', () => {
    if (!socket.isAuthenticated) {
      return;
    }

    console.log(`✅ User ${socket.userId} is online`);
    
    // Notify admins about user activity
    const { emitUserActivity } = require('./adminHandler');
    emitUserActivity(io, {
      userId: socket.userId,
      action: 'came_online',
      user: socket.user
    });
  });

  // User typing in search/chat
  socket.on('user:typing', (data) => {
    if (!socket.isAuthenticated) {
      return;
    }

    const { context } = data;
    console.log(`⌨️ User ${socket.userId} is typing in ${context}`);
  });

  // Subscribe to notifications
  socket.on('user:subscribe-notifications', () => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    socket.join(`notifications:${socket.userId}`);
    console.log(`🔔 User ${socket.userId} subscribed to notifications`);
    socket.emit('user:subscribed-notifications');
  });

  // Mark notification as read
  socket.on('user:notification-read', (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    const { notificationId } = data;
    console.log(`✓ User ${socket.userId} marked notification ${notificationId} as read`);
    
    socket.emit('user:notification-updated', {
      notificationId,
      status: 'read'
    });
  });

  // Subscribe to wishlist updates
  socket.on('user:subscribe-wishlist', () => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    socket.join(`wishlist:${socket.userId}`);
    console.log(`❤️ User ${socket.userId} subscribed to wishlist updates`);
    socket.emit('user:subscribed-wishlist');
  });

  // Test notification handler (for testing purposes)
  socket.on('test:notification', (data) => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    console.log(`🧪 Test notification requested by user ${socket.userId}:`, data);

    const { type, title, message } = data;
    
    // Send test notification back to user
    emitUserNotification(io, socket.userId, {
      title: title || 'Test Notification',
      message: message || 'This is a test notification',
      type: type === 'order_cancelled' ? 'warning' : 
            type === 'order_ready' || type === 'price_drop' ? 'success' : 'info'
    });
  });
};

// Helper functions to emit user events (called from controllers)

const emitUserNotification = (io, userId, notification) => {
  io.to(`user:${userId}`).emit('user:notification', {
    ...notification,
    timestamp: new Date()
  });
  
  // Also emit to notifications room
  io.to(`notifications:${userId}`).emit('user:notification', {
    ...notification,
    timestamp: new Date()
  });
  
  console.log(`🔔 Notification sent to user ${userId}: ${notification.title}`);
};

const emitWishlistUpdate = (io, userId, data) => {
  io.to(`wishlist:${userId}`).emit('user:wishlist-updated', {
    ...data,
    timestamp: new Date()
  });
  
  console.log(`❤️ Wishlist update sent to user ${userId}`);
};

const emitPriceDropAlert = (io, userId, productData) => {
  io.to(`user:${userId}`).emit('user:price-drop', {
    productId: productData._id,
    productName: productData.name,
    oldPrice: productData.oldPrice,
    newPrice: productData.pricing.salePrice || productData.pricing.basePrice,
    discount: Math.round(((productData.oldPrice - (productData.pricing.salePrice || productData.pricing.basePrice)) / productData.oldPrice) * 100),
    timestamp: new Date()
  });
  
  console.log(`💰 Price drop alert sent to user ${userId}`);
};

const emitBackInStockAlert = (io, userId, productData) => {
  io.to(`user:${userId}`).emit('user:back-in-stock', {
    productId: productData._id,
    productName: productData.name,
    currentStock: productData.inventory.stockQuantity,
    timestamp: new Date()
  });
  
  console.log(`📦 Back in stock alert sent to user ${userId}`);
};

module.exports.emitUserNotification = emitUserNotification;
module.exports.emitWishlistUpdate = emitWishlistUpdate;
module.exports.emitPriceDropAlert = emitPriceDropAlert;
module.exports.emitBackInStockAlert = emitBackInStockAlert;

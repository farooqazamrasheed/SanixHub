// Wishlist Real-Time Event Handler

module.exports = (io, socket) => {
  // Listen for wishlist actions from client (optional, if you want client-initiated events)
  socket.on('wishlist:subscribe', () => {
    if (socket.isAuthenticated) {
      socket.join(`wishlist:${socket.userId}`);
      console.log(`💖 User ${socket.userId} subscribed to wishlist updates`);
    }
  });

  socket.on('wishlist:unsubscribe', () => {
    if (socket.isAuthenticated) {
      socket.leave(`wishlist:${socket.userId}`);
      console.log(`💔 User ${socket.userId} unsubscribed from wishlist updates`);
    }
  });
};

// Helper functions to emit wishlist events
const { getIO } = require('../index');

/**
 * Emit when a product is added to wishlist
 */
const emitWishlistAdded = (userId, wishlistData) => {
  try {
    const io = getIO();
    
    // Emit to specific user
    io.to(`user:${userId}`).emit('wishlist:itemAdded', {
      userId,
      item: wishlistData.item,
      itemCount: wishlistData.itemCount,
      totalValue: wishlistData.totalValue,
      timestamp: new Date()
    });

    // Emit to all admins
    io.to('admin:all').emit('admin:wishlistUpdated', {
      type: 'added',
      userId,
      userName: wishlistData.userName,
      userEmail: wishlistData.userEmail,
      productName: wishlistData.item?.product?.name?.en,
      productId: wishlistData.item?.product?._id,
      itemCount: wishlistData.itemCount,
      totalValue: wishlistData.totalValue,
      timestamp: new Date()
    });

    console.log(`💖 Wishlist item added event emitted for user ${userId}`);
  } catch (error) {
    console.error('Error emitting wishlist added event:', error);
  }
};

/**
 * Emit when a product is removed from wishlist
 */
const emitWishlistRemoved = (userId, wishlistData) => {
  try {
    const io = getIO();
    
    // Emit to specific user
    io.to(`user:${userId}`).emit('wishlist:itemRemoved', {
      userId,
      productId: wishlistData.productId,
      itemCount: wishlistData.itemCount,
      totalValue: wishlistData.totalValue,
      timestamp: new Date()
    });

    // Emit to all admins
    io.to('admin:all').emit('admin:wishlistUpdated', {
      type: 'removed',
      userId,
      userName: wishlistData.userName,
      userEmail: wishlistData.userEmail,
      productId: wishlistData.productId,
      productName: wishlistData.productName,
      itemCount: wishlistData.itemCount,
      totalValue: wishlistData.totalValue,
      timestamp: new Date()
    });

    console.log(`💔 Wishlist item removed event emitted for user ${userId}`);
  } catch (error) {
    console.error('Error emitting wishlist removed event:', error);
  }
};

/**
 * Emit when entire wishlist is cleared
 */
const emitWishlistCleared = (userId, userData) => {
  try {
    const io = getIO();
    
    // Emit to specific user
    io.to(`user:${userId}`).emit('wishlist:cleared', {
      userId,
      timestamp: new Date()
    });

    // Emit to all admins
    io.to('admin:all').emit('admin:wishlistUpdated', {
      type: 'cleared',
      userId,
      userName: userData.userName,
      userEmail: userData.userEmail,
      itemCount: 0,
      totalValue: 0,
      timestamp: new Date()
    });

    console.log(`🗑️ Wishlist cleared event emitted for user ${userId}`);
  } catch (error) {
    console.error('Error emitting wishlist cleared event:', error);
  }
};

module.exports.emitWishlistAdded = emitWishlistAdded;
module.exports.emitWishlistRemoved = emitWishlistRemoved;
module.exports.emitWishlistCleared = emitWishlistCleared;

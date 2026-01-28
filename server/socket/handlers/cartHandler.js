// Cart Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to cart updates
  socket.on('cart:subscribe', () => {
    if (!socket.isAuthenticated) {
      console.log(`🛒 Anonymous user tried to subscribe to cart updates`);
      return; // Don't emit error, just ignore
    }

    socket.join(`cart:${socket.userId}`);
    console.log(`🛒 User ${socket.userId} subscribed to cart updates`);
    socket.emit('cart:subscribed');
  });

  // Request cart sync
  socket.on('cart:sync', async () => {
    if (!socket.isAuthenticated) {
      console.log(`🛒 Anonymous user tried to sync cart`);
      return; // Don't emit error, just ignore
    }

    try {
      const Cart = require('../../models/Cart');
      const cart = await Cart.findOne({ user: socket.userId })
        .populate('items.product', 'name images pricing inventory');

      if (cart) {
        socket.emit('cart:synced', {
          cart,
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to sync cart' });
    }
  });

  // Real-time stock validation
  socket.on('cart:validate-stock', async (data) => {
    if (!socket.isAuthenticated) {
      console.log(`🛒 Anonymous user tried to validate stock`);
      return; // Don't emit error, just ignore
    }

    try {
      const { productId, quantity } = data;
      const Product = require('../../models/Product');
      
      const product = await Product.findById(productId).select('inventory');
      
      if (product) {
        const available = product.inventory.stockQuantity >= quantity;
        socket.emit('cart:stock-validated', {
          productId,
          quantity,
          available,
          currentStock: product.inventory.stockQuantity,
          timestamp: new Date()
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to validate stock' });
    }
  });
};

// Helper functions to emit cart events (called from controllers)

const emitCartUpdated = (io, userId, cartData) => {
  io.to(`cart:${userId}`).emit('cart:updated', {
    cart: cartData,
    timestamp: new Date()
  });
  
  // Also emit to user's personal room
  io.to(`user:${userId}`).emit('cart:updated', {
    itemCount: cartData.items.length,
    timestamp: new Date()
  });
  
  console.log(`🛒 Cart updated for user ${userId}`);
};

const emitCartItemUnavailable = (io, userId, productData) => {
  io.to(`cart:${userId}`).emit('cart:item-unavailable', {
    productId: productData._id,
    productName: productData.name,
    reason: 'out_of_stock',
    timestamp: new Date()
  });
  
  console.log(`⚠️ Cart item unavailable notification sent to user ${userId}`);
};

const emitCartPriceChanged = (io, userId, productData, oldPrice, newPrice) => {
  io.to(`cart:${userId}`).emit('cart:price-changed', {
    productId: productData._id,
    productName: productData.name,
    oldPrice,
    newPrice,
    timestamp: new Date()
  });
  
  console.log(`💰 Price change notification sent to user ${userId}`);
};

const emitCartCleared = (io, userId) => {
  io.to(`cart:${userId}`).emit('cart:cleared', {
    timestamp: new Date()
  });
};

module.exports.emitCartUpdated = emitCartUpdated;
module.exports.emitCartItemUnavailable = emitCartItemUnavailable;
module.exports.emitCartPriceChanged = emitCartPriceChanged;
module.exports.emitCartCleared = emitCartCleared;

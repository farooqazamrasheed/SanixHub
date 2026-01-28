// Inventory Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to product inventory updates
  socket.on('inventory:subscribe', (data) => {
    const { productId } = data;
    
    if (productId) {
      socket.join(`product:${productId}`);
      console.log(`📦 Socket ${socket.id} subscribed to product ${productId}`);
      socket.emit('inventory:subscribed', { productId });
    }
  });

  // Unsubscribe from product inventory updates
  socket.on('inventory:unsubscribe', (data) => {
    const { productId } = data;
    
    if (productId) {
      socket.leave(`product:${productId}`);
      console.log(`📦 Socket ${socket.id} unsubscribed from product ${productId}`);
      socket.emit('inventory:unsubscribed', { productId });
    }
  });

  // Subscribe to all inventory updates (admin only)
  socket.on('inventory:subscribe-all', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('inventory:all');
    console.log(`📦 Admin ${socket.id} subscribed to all inventory`);
    socket.emit('inventory:subscribed-all');
  });

  // Subscribe to low stock alerts (admin only)
  socket.on('inventory:subscribe-low-stock', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('inventory:low-stock');
    console.log(`⚠️ Admin ${socket.id} subscribed to low stock alerts`);
    socket.emit('inventory:subscribed-low-stock');
  });

  // Get current stock (real-time query)
  socket.on('inventory:get-stock', async (data) => {
    try {
      const { productId } = data;
      const Product = require('../../models/Product');
      
      const product = await Product.findById(productId).select('inventory');
      
      if (product) {
        socket.emit('inventory:stock-data', {
          productId,
          stock: product.inventory.stockQuantity,
          lowStockThreshold: product.inventory.lowStockThreshold,
          isLowStock: product.inventory.stockQuantity <= product.inventory.lowStockThreshold
        });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to fetch stock data' });
    }
  });
};

// Helper functions to emit inventory events (called from controllers)

const emitInventoryUpdate = (io, productId, inventoryData) => {
  io.to(`product:${productId}`).emit('inventory:updated', {
    productId,
    ...inventoryData,
    timestamp: new Date()
  });
  
  // Also emit to all inventory subscribers
  io.to('inventory:all').emit('inventory:product-updated', {
    productId,
    ...inventoryData,
    timestamp: new Date()
  });
  
  console.log(`📦 Inventory updated for product ${productId}`);
};

const emitLowStockAlert = (io, productData) => {
  io.to('inventory:low-stock').emit('inventory:low-stock', {
    productId: productData._id,
    productName: productData.name,
    currentStock: productData.inventory.stockQuantity,
    threshold: productData.inventory.lowStockThreshold,
    timestamp: new Date()
  });
  
  console.log(`⚠️ Low stock alert for product ${productData._id}`);
};

const emitOutOfStockAlert = (io, productData) => {
  // Notify all subscribers
  io.to(`product:${productData._id}`).emit('inventory:out-of-stock', {
    productId: productData._id,
    productName: productData.name,
    timestamp: new Date()
  });
  
  // Notify admins
  io.to('inventory:low-stock').emit('inventory:out-of-stock', {
    productId: productData._id,
    productName: productData.name,
    timestamp: new Date()
  });
  
  console.log(`❌ Out of stock alert for product ${productData._id}`);
};

const emitBulkUpdateProgress = (io, data) => {
  io.to('inventory:all').emit('inventory:bulk-progress', {
    ...data,
    timestamp: new Date()
  });
};

module.exports.emitInventoryUpdate = emitInventoryUpdate;
module.exports.emitLowStockAlert = emitLowStockAlert;
module.exports.emitOutOfStockAlert = emitOutOfStockAlert;
module.exports.emitBulkUpdateProgress = emitBulkUpdateProgress;

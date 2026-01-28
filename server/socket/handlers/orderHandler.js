// Order Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to user's own orders
  socket.on('order:subscribe', () => {
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    socket.join(`orders:user:${socket.userId}`);
    console.log(`📋 User ${socket.userId} subscribed to their orders`);
    socket.emit('order:subscribed');
  });

  // Subscribe to specific order
  socket.on('order:subscribe-single', (data) => {
    const { orderId } = data;
    
    if (!socket.isAuthenticated) {
      return socket.emit('error', { message: 'Authentication required' });
    }

    socket.join(`order:${orderId}`);
    console.log(`📋 User ${socket.userId} subscribed to order ${orderId}`);
    socket.emit('order:subscribed-single', { orderId });
  });

  // Subscribe to all orders (admin only)
  socket.on('order:subscribe-all', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('orders:all');
    console.log(`📋 Admin ${socket.id} subscribed to all orders`);
    socket.emit('order:subscribed-all');
  });

  // Update order status (admin only)
  socket.on('order:update-status', async (data) => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    try {
      const { orderId, status, notes } = data;
      const Order = require('../../models/Order');
      
      const order = await Order.findByIdAndUpdate(
        orderId,
        { 
          status,
          $push: {
            statusHistory: {
              status,
              notes,
              changedBy: socket.userId,
              timestamp: new Date()
            }
          }
        },
        { new: true }
      );

      if (order) {
        // Emit to order subscribers and customer
        emitOrderStatusChange(io, order);
        socket.emit('order:status-updated', { orderId, status });
      }
    } catch (error) {
      socket.emit('error', { message: 'Failed to update order status' });
    }
  });
};

// Helper functions to emit order events (called from controllers)

const emitNewOrder = (io, orderData) => {
  // Notify all admins
  io.to('orders:all').emit('order:new', {
    orderId: orderData._id,
    orderNumber: orderData.orderNumber,
    customer: orderData.customer,
    totalAmount: orderData.pricing.total,
    itemCount: orderData.items.length,
    timestamp: new Date()
  });
  
  // Notify specific customer
  if (orderData.customer._id) {
    io.to(`user:${orderData.customer._id}`).emit('order:created', {
      orderId: orderData._id,
      orderNumber: orderData.orderNumber,
      timestamp: new Date()
    });
  }
  
  console.log(`📋 New order notification sent: ${orderData.orderNumber}`);
};

const emitOrderStatusChange = (io, orderData) => {
  const notification = {
    orderId: orderData._id,
    orderNumber: orderData.orderNumber,
    status: orderData.status,
    timestamp: new Date()
  };

  // Notify specific order room
  io.to(`order:${orderData._id}`).emit('order:status-changed', notification);
  
  // Notify customer
  if (orderData.customer._id) {
    io.to(`orders:user:${orderData.customer._id}`).emit('order:status-changed', notification);
  }
  
  // Notify all admins
  io.to('orders:all').emit('order:status-changed', notification);
  
  console.log(`📋 Order status changed: ${orderData.orderNumber} → ${orderData.status}`);
};

const emitOrderAssigned = (io, orderId, adminId) => {
  io.to(`order:${orderId}`).emit('order:assigned', {
    orderId,
    adminId,
    timestamp: new Date()
  });
};

const emitOrderDeleted = (io, orderId, userId) => {
  // Notify customer
  io.to(`user:${userId}`).emit('order:deleted', {
    orderId,
    timestamp: new Date()
  });
  
  // Notify admins
  io.to('orders:all').emit('order:deleted', {
    orderId,
    timestamp: new Date()
  });
};

module.exports.emitNewOrder = emitNewOrder;
module.exports.emitOrderStatusChange = emitOrderStatusChange;
module.exports.emitOrderAssigned = emitOrderAssigned;
module.exports.emitOrderDeleted = emitOrderDeleted;

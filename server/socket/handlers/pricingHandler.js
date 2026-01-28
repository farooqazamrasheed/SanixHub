/**
 * Pricing WebSocket Handler
 * Handles real-time price change updates
 */

const PriceChangeHistory = require('../../models/PriceChangeHistory');

module.exports = (io, socket) => {
  console.log(`📊 Pricing handler initialized for socket: ${socket.id}`);

  // Subscribe to pricing updates (admin only)
  socket.on('pricing:subscribe', async () => {
    if (!socket.isAdmin) {
      console.log(`⚠️ Non-admin attempted pricing subscription: ${socket.id}`);
      socket.emit('error', { 
        message: 'Unauthorized: Admin access required' 
      });
      return;
    }

    try {
      // Admin already joined 'admin:all' room on connection
      // This subscription is just for confirmation
      console.log(`📊 Admin ${socket.userId} confirmed pricing subscription`);
      
      socket.emit('pricing:subscribed', {
        message: 'Successfully subscribed to pricing updates'
      });

    } catch (error) {
      console.error('Error subscribing to pricing updates:', error);
      socket.emit('error', { 
        message: 'Failed to subscribe to pricing updates',
        error: error.message 
      });
    }
  });

  // Unsubscribe from pricing updates
  socket.on('pricing:unsubscribe', () => {
    socket.leave('pricing:all');
    console.log(`📊 Admin ${socket.userId} unsubscribed from pricing updates`);
    
    socket.emit('pricing:unsubscribed', {
      message: 'Successfully unsubscribed from pricing updates'
    });
  });

  // Get active operations
  socket.on('pricing:get-active-operations', async () => {
    if (!socket.isAdmin) {
      socket.emit('error', { 
        message: 'Unauthorized: Admin access required' 
      });
      return;
    }

    try {
      const activeOperations = await PriceChangeHistory.find({
        status: { $in: ['pending', 'in_progress'] }
      })
      .populate('changedBy', 'name email')
      .sort({ createdAt: -1 });

      socket.emit('pricing:active-operations', {
        operations: activeOperations
      });

    } catch (error) {
      console.error('Error getting active operations:', error);
      socket.emit('error', { 
        message: 'Failed to get active operations',
        error: error.message 
      });
    }
  });

  // Check if operation can be undone
  socket.on('pricing:check-undo', async (data) => {
    if (!socket.isAdmin) {
      socket.emit('error', { 
        message: 'Unauthorized: Admin access required' 
      });
      return;
    }

    try {
      const { operationId } = data;
      const operation = await PriceChangeHistory.findById(operationId);

      if (!operation) {
        socket.emit('pricing:undo-status', {
          operationId,
          canUndo: false,
          reason: 'Operation not found'
        });
        return;
      }

      socket.emit('pricing:undo-status', {
        operationId,
        canUndo: operation.isUndoable(),
        timeRemaining: operation.undoTimeRemaining(),
        status: operation.status
      });

    } catch (error) {
      console.error('Error checking undo status:', error);
      socket.emit('error', { 
        message: 'Failed to check undo status',
        error: error.message 
      });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`📊 Pricing handler disconnected for socket: ${socket.id}`);
  });
};

/**
 * Helper function to emit pricing events to all admins
 */
const emitToAdmins = (io, event, data) => {
  io.to('pricing:all').emit(event, {
    ...data,
    timestamp: Date.now()
  });
};

module.exports.emitToAdmins = emitToAdmins;

// Admin Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to dashboard updates (admin only)
  socket.on('admin:subscribe-dashboard', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('admin:dashboard');
    console.log(`📊 Admin ${socket.id} subscribed to dashboard updates`);
    socket.emit('admin:subscribed-dashboard');
  });

  // Subscribe to user activity (admin only)
  socket.on('admin:subscribe-activity', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('admin:activity');
    console.log(`👥 Admin ${socket.id} subscribed to user activity`);
    socket.emit('admin:subscribed-activity');
  });

  // Broadcast message to all users (admin only)
  socket.on('admin:broadcast', (data) => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    const { message, type = 'info' } = data;
    
    io.emit('admin:announcement', {
      message,
      type,
      from: socket.userId,
      timestamp: new Date()
    });
    
    console.log(`📢 Admin broadcast: ${message}`);
    socket.emit('admin:broadcast-sent');
  });

  // Get real-time statistics (admin only)
  socket.on('admin:get-stats', async () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    try {
      const Order = require('../../models/Order');
      const User = require('../../models/User');
      const Product = require('../../models/Product');
      const Review = require('../../models/Review');
      const Inventory = require('../../models/Inventory');

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const thirtyDaysAgo = new Date(today);
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

      const [
        totalProducts,
        activeProducts,
        totalOrders,
        todayOrders,
        placedOrders,
        readyOrders,
        totalCustomers,
        lowStockProducts,
        pendingReviews,
        revenueData
      ] = await Promise.all([
        Product.countDocuments(),
        Product.countDocuments({ isActive: true }),
        Order.countDocuments(),
        Order.countDocuments({ createdAt: { $gte: today } }),
        Order.countDocuments({ status: 'placed' }),
        Order.countDocuments({ status: 'ready' }),
        User.countDocuments({ role: 'customer' }),
        Inventory.countDocuments({
          $expr: {
            $lte: ['$stock.available', '$alerts.lowStockThreshold']
          }
        }),
        Review.countDocuments({ isApproved: false }),
        Order.aggregate([
          {
            $match: {
              status: 'picked_up',
              createdAt: { $gte: thirtyDaysAgo }
            }
          },
          {
            $group: {
              _id: null,
              totalRevenue: { $sum: '$pricing.total' },
              totalOrders: { $sum: 1 }
            }
          }
        ])
      ]);

      const revenue = revenueData[0] || { totalRevenue: 0, totalOrders: 0 };

      // Match the same structure as the API endpoint
      socket.emit('admin:stats', {
        products: {
          total: totalProducts,
          active: activeProducts,
          lowStock: lowStockProducts
        },
        orders: {
          total: totalOrders,
          today: todayOrders,
          placed: placedOrders,
          ready: readyOrders
        },
        customers: totalCustomers,
        reviews: {
          pending: pendingReviews
        },
        revenue: {
          last30Days: revenue.totalRevenue,
          ordersCount: revenue.totalOrders,
          averageOrderValue: revenue.totalOrders > 0 
            ? Math.round(revenue.totalRevenue / revenue.totalOrders) 
            : 0
        },
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Failed to fetch dashboard statistics:', error);
      socket.emit('error', { message: 'Failed to fetch statistics' });
    }
  });
};

// Helper functions to emit admin events (called from controllers)

const emitDashboardUpdate = (io, data) => {
  io.to('admin:dashboard').emit('admin:dashboard-update', {
    ...data,
    timestamp: new Date()
  });
  
  console.log('📊 Dashboard update emitted');
};

const emitUserActivity = (io, activityData) => {
  io.to('admin:activity').emit('admin:user-activity', {
    ...activityData,
    timestamp: new Date()
  });
  
  console.log(`👥 User activity: ${activityData.action}`);
};

const emitNotificationToAdmin = (io, notification) => {
  io.to('admin:all').emit('admin:notification', {
    ...notification,
    timestamp: new Date()
  });
  
  console.log(`🔔 Admin notification: ${notification.title}`);
};

const emitSystemAlert = (io, alert) => {
  io.to('admin:all').emit('admin:system-alert', {
    ...alert,
    timestamp: new Date()
  });
  
  console.log(`⚠️ System alert: ${alert.message}`);
};

module.exports.emitDashboardUpdate = emitDashboardUpdate;
module.exports.emitUserActivity = emitUserActivity;
module.exports.emitNotificationToAdmin = emitNotificationToAdmin;
module.exports.emitSystemAlert = emitSystemAlert;

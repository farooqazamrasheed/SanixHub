const User = require('../models/User');
const Product = require('../models/Product');
const Order = require('../models/Order');
const Review = require('../models/Review');
const Coupon = require('../models/Coupon');
const Inventory = require('../models/Inventory');
const { updateProductRating } = require('./reviewController');
const { sendOrderStatusUpdate, sendAccountDeactivationEmail, sendAccountActivationEmail } = require('./emailController');

/**
 * @desc    Get dashboard stats
 * @route   GET /api/admin/dashboard
 * @access  Private (Admin only)
 */
exports.getDashboardStats = async (req, res, next) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Get stats
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

    res.status(200).json({
      success: true,
      data: {
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
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all orders (admin)
 * @route   GET /api/admin/orders
 * @access  Private (Admin only)
 */
exports.getAllOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;

    const query = {};
    if (status) query.status = status;
    if (search) {
      query.$or = [
        { orderNumber: new RegExp(search, 'i') },
        { 'pickupDetails.customerName': new RegExp(search, 'i') },
        { 'pickupDetails.phone': new RegExp(search, 'i') }
      ];
    }

    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
      .populate('customer', 'profile email')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Order.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        orders,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single order (admin)
 * @route   GET /api/admin/orders/:id
 * @access  Private (Admin only)
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'profile email')
      .populate('items.product', 'name slug images')
      .lean();

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update order status
 * @route   PUT /api/admin/orders/:id/status
 * @access  Private (Admin only)
 */
exports.updateOrderStatus = async (req, res, next) => {
  const session = await require('mongoose').startSession();
  session.startTransaction();

  try {
    const { status, note } = req.body;

    const order = await Order.findById(req.params.id).session(session);
    if (!order) {
      await session.abortTransaction();
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Validate status transition
    const validTransitions = {
      placed: ['ready', 'cancelled'],
      ready: ['picked_up', 'cancelled'],
      picked_up: [],
      cancelled: []
    };

    if (!validTransitions[order.status].includes(status)) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_STATUS_TRANSITION',
          message: `Cannot change status from ${order.status} to ${status}`
        }
      });
    }

    // Store old status for email
    const oldStatus = order.status;

    // RESTORE INVENTORY IF CANCELLING
    if (status === 'cancelled' && oldStatus !== 'cancelled') {
      console.log('🔄 Restoring inventory for cancelled order:', order._id);
      
      for (const item of order.items) {
        const inventory = await Inventory.findOne({ product: item.product }).session(session);
        const product = await Product.findById(item.product).session(session);

        if (inventory && product) {
          // Restore stock
          inventory.stock.available += item.quantity;
          inventory.stock.sold -= item.quantity;
          inventory.transactions.push({
            type: 'return',
            quantity: item.quantity,
            order: order._id,
            reason: note || 'Order cancelled by admin',
            performedBy: req.user._id,
            timestamp: new Date()
          });
          await inventory.save({ session });

          // Update product stock
          product.inventory.stockQuantity += item.quantity;
          product.stats.orderCount = Math.max(0, product.stats.orderCount - 1);
          await product.save({ session });

          console.log(`✅ Restored ${item.quantity} units of ${product.name.en}`);
        }
      }
    }

    // Update status
    order.status = status;
    order.statusHistory.push({
      status,
      timestamp: new Date(),
      note: note || `Status changed to ${status}`,
      updatedBy: req.user._id
    });

    // Mark as paid if picked up
    if (status === 'picked_up' && order.payment.status === 'pending') {
      order.payment.status = 'completed';
      order.payment.paidAt = new Date();
    }

    await order.save({ session });
    await session.commitTransaction();

    // Emit real-time order status update via WebSocket
    try {
      const { getIO } = require('../socket');
      const { emitOrderStatusChange } = require('../socket/handlers/orderHandler');
      const { emitUserNotification } = require('../socket/handlers/userHandler');
      const io = getIO();
      
      emitOrderStatusChange(io, order);

      // Send notification to customer about status change
      if (order.customer) {
        const statusMessages = {
          ready: 'Your order is ready for pickup!',
          picked_up: 'Your order has been picked up. Thank you!',
          cancelled: 'Your order has been cancelled'
        };

        if (statusMessages[status]) {
          emitUserNotification(io, order.customer.toString(), {
            title: 'Order Status Updated',
            message: `Order #${order.orderNumber}: ${statusMessages[status]}`,
            type: status === 'cancelled' ? 'warning' : 'success'
          });
        }
      }
    } catch (socketError) {
      console.error('Failed to emit order status update via WebSocket:', socketError);
    }

    // Send status update email (async, don't wait for it)
    const populatedOrder = await Order.findById(order._id)
      .populate('customer', 'name email')
      .populate('items.product', 'name');
    
    if (populatedOrder && populatedOrder.customer) {
      sendOrderStatusUpdate(populatedOrder, populatedOrder.customer, oldStatus, status).catch(err => {
        console.error('Failed to send order status email:', err);
      });
    }

    res.status(200).json({
      success: true,
      data: { order }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get all reviews (for moderation)
 * @route   GET /api/admin/reviews
 * @access  Private (Admin only)
 */
exports.getAllReviews = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, approved } = req.query;

    const query = {};
    if (approved !== undefined) {
      query.isApproved = approved === 'true';
    }

    const skip = (page - 1) * limit;
    const reviews = await Review.find(query)
      .populate('user', 'profile')
      .populate('product', 'name slug images')
      .sort('-createdAt')
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    const total = await Review.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        reviews,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Approve/Reject review
 * @route   PUT /api/admin/reviews/:id/approve
 * @access  Private (Admin only)
 */
exports.moderateReview = async (req, res, next) => {
  try {
    const { approved } = req.body;

    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'REVIEW_NOT_FOUND',
          message: 'Review not found'
        }
      });
    }

    review.isApproved = approved;
    await review.save();

    // Update product rating
    await updateProductRating(review.product);

    res.status(200).json({
      success: true,
      data: { review }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all coupons
 * @route   GET /api/admin/coupons
 * @access  Private (Admin only)
 */
exports.getAllCoupons = async (req, res, next) => {
  try {
    const coupons = await Coupon.find()
      .sort('-createdAt')
      .lean();

    res.status(200).json({
      success: true,
      data: { coupons }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create coupon
 * @route   POST /api/admin/coupons
 * @access  Private (Admin only)
 */
exports.createCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.create(req.body);

    res.status(201).json({
      success: true,
      data: { coupon }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coupon
 * @route   PUT /api/admin/coupons/:id
 * @access  Private (Admin only)
 */
exports.updateCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndUpdate(
      req.params.id,
      req.body,
      { new: true, runValidators: true }
    );

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Coupon not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: { coupon }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete coupon
 * @route   DELETE /api/admin/coupons/:id
 * @access  Private (Admin only)
 */
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findByIdAndDelete(req.params.id);

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Coupon not found'
        }
      });
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Coupon deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get low stock products
 * @route   GET /api/admin/inventory/low-stock
 * @access  Private (Admin only)
 */
exports.getLowStockProducts = async (req, res, next) => {
  try {
    const lowStockInventory = await Inventory.find({
      $expr: {
        $lte: ['$stock.available', '$alerts.lowStockThreshold']
      }
    })
      .populate('product', 'name sku images pricing inventory lowStockThreshold')
      .lean();

    // Transform inventory data to product format for frontend
    const products = lowStockInventory.map(inv => {
      if (!inv.product) return null;
      
      return {
        _id: inv.product._id,
        name: inv.product.name,
        sku: inv.product.sku,
        images: inv.product.images,
        pricing: inv.product.pricing,
        price: inv.product.pricing?.salePrice || inv.product.pricing?.basePrice,
        stock: inv.stock.available, // Map inventory stock to product.stock
        lowStockThreshold: inv.alerts.lowStockThreshold,
        inventory: inv.product.inventory
      };
    }).filter(Boolean);

    res.status(200).json({
      success: true,
      data: { products }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update inventory stock
 * @route   PUT /api/admin/inventory/:productId
 * @access  Private (Admin only)
 */
exports.updateInventory = async (req, res, next) => {
  try {
    const { stock, lowStockThreshold, quantity, reason } = req.body;
    const { productId } = req.params;

    // Find or create inventory record
    let inventory = await Inventory.findOne({ product: productId });
    
    // Get product for validation and updates
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found'
        }
      });
    }

    // If inventory doesn't exist, create it
    if (!inventory) {
      inventory = new Inventory({
        product: productId,
        stock: {
          available: product.inventory?.stockQuantity || 0,
          reserved: 0,
          sold: 0
        },
        alerts: {
          lowStockEnabled: true,
          lowStockThreshold: product.lowStockThreshold || 10
        }
      });
    }

    // Handle absolute stock update (from inventory management UI)
    if (stock !== undefined) {
      const oldStock = inventory.stock.available;
      const difference = stock - oldStock;
      
      inventory.stock.available = stock;
      
      // Record transaction
      inventory.transactions.push({
        type: difference > 0 ? 'restock' : 'adjustment',
        quantity: difference,
        reason: reason || `Manual stock update from ${oldStock} to ${stock}`,
        performedBy: req.user._id,
        timestamp: new Date()
      });

      // Update product stock quantity
      product.inventory.stockQuantity = stock;
    }
    
    // Handle quantity adjustment (add/subtract)
    else if (quantity !== undefined) {
      inventory.stock.available += quantity;
      
      inventory.transactions.push({
        type: quantity > 0 ? 'restock' : 'adjustment',
        quantity,
        reason: reason || 'Manual adjustment',
        performedBy: req.user._id,
        timestamp: new Date()
      });

      // Update product stock quantity
      product.inventory.stockQuantity = inventory.stock.available;
    }

    // Update low stock threshold if provided
    if (lowStockThreshold !== undefined) {
      inventory.alerts.lowStockThreshold = lowStockThreshold;
      product.lowStockThreshold = lowStockThreshold;
    }

    // Save both inventory and product
    await inventory.save();
    await product.save();

    // Emit real-time inventory update via WebSocket
    try {
      const { getIO } = require('../socket');
      const { emitInventoryUpdate, emitLowStockAlert, emitOutOfStockAlert } = require('../socket/handlers/inventoryHandler');
      const io = getIO();
      
      emitInventoryUpdate(io, product._id, {
        stock: product.inventory.stockQuantity,
        lowStockThreshold: inventory.alerts.lowStockThreshold,
        isLowStock: product.inventory.stockQuantity <= inventory.alerts.lowStockThreshold
      });

      // Check for low stock alert
      if (product.inventory.stockQuantity <= inventory.alerts.lowStockThreshold && product.inventory.stockQuantity > 0) {
        emitLowStockAlert(io, product);
      }

      // Check for out of stock
      if (product.inventory.stockQuantity === 0) {
        emitOutOfStockAlert(io, product);
      }
    } catch (socketError) {
      console.error('Failed to emit inventory update via WebSocket:', socketError);
      // Don't fail the request if socket emission fails
    }

    // Populate product details for response
    await inventory.populate('product', 'name sku images pricing inventory');

    res.status(200).json({
      success: true,
      data: { inventory }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all users with search and filters
 * @route   GET /api/admin/users
 * @access  Private (Admin only)
 */
exports.getAllUsers = async (req, res, next) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      search = '', 
      status = '',
      sortBy = '-createdAt'
    } = req.query;

    const query = { role: 'customer' }; // Only show customers, not admins

    // Status filter
    if (status === 'active') query.isActive = true;
    if (status === 'inactive') query.isActive = false;

    // Search by name, email, or phone
    if (search) {
      query.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { 'profile.phone': { $regex: search, $options: 'i' } }
      ];
    }

    const skip = (page - 1) * limit;

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password -refreshToken')
        .sort(sortBy)
        .limit(parseInt(limit))
        .skip(skip)
        .lean(),
      User.countDocuments(query)
    ]);

    // Get order count and total spent for each user
    const usersWithStats = await Promise.all(
      users.map(async (user) => {
        const orderStats = await Order.aggregate([
          { $match: { customer: user._id } },
          {
            $group: {
              _id: null,
              totalOrders: { $sum: 1 },
              totalSpent: { $sum: '$pricing.total' }
            }
          }
        ]);

        return {
          ...user,
          stats: {
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalSpent: orderStats[0]?.totalSpent || 0
          }
        };
      })
    );

    res.status(200).json({
      success: true,
      data: {
        users: usersWithStats,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single user details
 * @route   GET /api/admin/users/:id
 * @access  Private (Admin only)
 */
exports.getUserDetails = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id)
      .select('-password -refreshToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Get user's orders
    const orders = await Order.find({ customer: user._id })
      .select('orderNumber pricing.total status createdAt statusHistory')
      .sort('-createdAt')
      .limit(10)
      .lean();

    // Get order statistics
    const orderStats = await Order.aggregate([
      { $match: { customer: user._id } },
      {
        $group: {
          _id: null,
          totalOrders: { $sum: 1 },
          totalSpent: { $sum: '$pricing.total' },
          completedOrders: {
            $sum: { $cond: [{ $eq: ['$status', 'picked_up'] }, 1, 0] }
          }
        }
      }
    ]);

    // Get user's reviews
    const reviewCount = await Review.countDocuments({ user: user._id });

    res.status(200).json({
      success: true,
      data: {
        user: {
          ...user,
          stats: {
            totalOrders: orderStats[0]?.totalOrders || 0,
            totalSpent: orderStats[0]?.totalSpent || 0,
            completedOrders: orderStats[0]?.completedOrders || 0,
            totalReviews: reviewCount
          }
        },
        recentOrders: orders
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Toggle user active status
 * @route   PUT /api/admin/users/:id/status
 * @access  Private (Admin only)
 */
exports.toggleUserStatus = async (req, res, next) => {
  try {
    const { isActive } = req.body;

    if (typeof isActive !== 'boolean') {
      return res.status(400).json({
        success: false,
        message: 'isActive must be a boolean value'
      });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    // Prevent deactivating admin accounts
    if (user.role === 'superadmin') {
      return res.status(403).json({
        success: false,
        message: 'Cannot deactivate admin accounts'
      });
    }

    user.isActive = isActive;
    await user.save();

    // Send email notification (async, don't wait for it)
    if (isActive) {
      sendAccountActivationEmail(user).catch(err => {
        console.error('Failed to send activation email:', err);
      });
    } else {
      sendAccountDeactivationEmail(user).catch(err => {
        console.error('Failed to send deactivation email:', err);
      });
    }

    res.status(200).json({
      success: true,
      message: `User account ${isActive ? 'activated' : 'deactivated'} successfully`,
      data: {
        user: {
          _id: user._id,
          email: user.email,
          isActive: user.isActive,
          profile: user.profile
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

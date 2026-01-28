const Order = require('../models/Order');
const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const Coupon = require('../models/Coupon');
const mongoose = require('mongoose');
const { sendOrderConfirmation, sendOrderStatusUpdate } = require('./emailController');

/**
 * @desc    Create new order
 * @route   POST /api/orders
 * @access  Private
 */
exports.createOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    // Check if user account is active
    if (!req.user.isActive) {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: {
          code: 'ACCOUNT_DEACTIVATED',
          message: 'Your account has been deactivated by admin. Please contact admin to reactivate your account.'
        }
      });
    }

    const { items, couponCode, pickupDetails } = req.body;

    // Validate products and check availability
    const productIds = items.map(item => item.product);
    const products = await Product.find({ 
      _id: { $in: productIds },
      isActive: true 
    }).session(session);

    if (products.length !== items.length) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PRODUCTS',
          message: 'Some products are not available'
        }
      });
    }

    // Build order items with product snapshots
    const orderItems = [];
    let subtotal = 0;

    for (const item of items) {
      const product = products.find(p => p._id.toString() === item.product);
      
      // Check inventory
      const inventory = await Inventory.findOne({ product: product._id }).session(session);
      if (inventory.stock.available < item.quantity) {
        await session.abortTransaction();
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Insufficient stock for ${product.name.en}`
          }
        });
      }

      const price = product.pricing.salePrice || product.pricing.basePrice;
      const itemSubtotal = price * item.quantity;
      subtotal += itemSubtotal;

      // Populate category and brand if needed
      await product.populate('category');
      
      orderItems.push({
        product: product._id,
        productSnapshot: {
          name: product.name,
          sku: product.sku,
          image: product.images.find(img => img.isPrimary)?.url || product.images[0]?.url,
          price,
          size: product.size,
          productId: product.productId,
          brand: typeof product.brand === 'string' ? product.brand : (product.brand?.name?.en || ''),
          category: product.category?.name?.en || ''
        },
        quantity: item.quantity,
        price,
        subtotal: itemSubtotal
      });

      // Update inventory
      inventory.stock.available -= item.quantity;
      inventory.stock.sold += item.quantity;
      inventory.transactions.push({
        type: 'sale',
        quantity: -item.quantity,
        reason: 'Order placement',
        performedBy: req.user._id,
        timestamp: new Date()
      });
      await inventory.save({ session });

      // Update product stats
      product.inventory.stockQuantity -= item.quantity;
      product.stats.orderCount += 1;
      await product.save({ session });
    }

    // Apply coupon if provided
    let discount = 0;
    let couponData = null;

    if (couponCode) {
      const coupon = await Coupon.findOne({ 
        code: couponCode.toUpperCase(),
        isActive: true
      }).session(session);

      if (coupon) {
        const now = new Date();
        if (now >= coupon.validity.startDate && now <= coupon.validity.endDate) {
          // Check usage limits
          const userUsage = coupon.usage.usedBy.find(u => u.user.toString() === req.user._id.toString());
          const userUsedCount = userUsage?.usedCount || 0;

          if (
            (!coupon.conditions.usageLimit || coupon.usage.totalUsed < coupon.conditions.usageLimit) &&
            (!coupon.conditions.usagePerUser || userUsedCount < coupon.conditions.usagePerUser) &&
            (subtotal >= coupon.conditions.minOrderValue)
          ) {
            // Calculate discount
            if (coupon.type === 'percentage') {
              discount = subtotal * (coupon.value / 100);
              if (coupon.conditions.maxDiscount) {
                discount = Math.min(discount, coupon.conditions.maxDiscount);
              }
            } else {
              discount = coupon.value;
            }

            // Round down to whole number
            discount = Math.floor(discount);

            couponData = {
              code: coupon.code,
              discountAmount: discount
            };

            // Update coupon usage
            coupon.usage.totalUsed += 1;
            if (userUsage) {
              userUsage.usedCount += 1;
              userUsage.lastUsed = new Date();
            } else {
              coupon.usage.usedBy.push({
                user: req.user._id,
                usedCount: 1,
                lastUsed: new Date()
              });
            }
            await coupon.save({ session });
          }
        }
      }
    }

    // Calculate total
    const tax = 0; // No tax for now
    const total = subtotal - discount + tax;

    // Create order
    const order = await Order.create([{
      customer: req.user._id,
      items: orderItems,
      pricing: {
        subtotal,
        discount,
        tax,
        total
      },
      coupon: couponData,
      pickupDetails: {
        customerName: pickupDetails.customerName || req.user.fullName,
        phone: pickupDetails.phone || req.user.profile.phone,
        whatsapp: pickupDetails.whatsapp || req.user.profile.whatsapp,
        notes: pickupDetails.notes
      },
      status: 'placed'
    }], { session });

    await session.commitTransaction();

    // Emit real-time new order notification via WebSocket
    try {
      const { getIO } = require('../socket');
      const { emitNewOrder } = require('../socket/handlers/orderHandler');
      const io = getIO();
      
      emitNewOrder(io, {
        ...order[0].toObject(),
        customer: {
          _id: req.user._id,
          name: `${req.user.profile.firstName} ${req.user.profile.lastName}`,
          phone: pickupDetails.phone || req.user.profile.phone
        }
      });
    } catch (socketError) {
      console.error('Failed to emit new order via WebSocket:', socketError);
    }

    // Send order confirmation email (async, don't wait for it)
    sendOrderConfirmation(order[0], req.user).catch(err => {
      console.error('Failed to send order confirmation email:', err);
    });

    res.status(201).json({
      success: true,
      data: { order: order[0] }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get user's orders
 * @route   GET /api/orders
 * @access  Private
 */
exports.getMyOrders = async (req, res, next) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = { customer: req.user._id };
    if (status) query.status = status;

    const skip = (page - 1) * limit;
    const orders = await Order.find(query)
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
 * @desc    Get single order
 * @route   GET /api/orders/:id
 * @access  Private
 */
exports.getOrder = async (req, res, next) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('customer', 'profile email')
      .populate('items.product', 'name slug images');

    if (!order) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ORDER_NOT_FOUND',
          message: 'Order not found'
        }
      });
    }

    // Check authorization (user can only view their own orders unless admin)
    if (order.customer._id.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You do not have access to this order'
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
 * @desc    Cancel order
 * @route   PUT /api/orders/:id/cancel
 * @access  Private
 */
exports.cancelOrder = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
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

    // Check authorization
    if (order.customer.toString() !== req.user._id.toString() && req.user.role !== 'superadmin') {
      await session.abortTransaction();
      return res.status(403).json({
        success: false,
        error: {
          code: 'FORBIDDEN',
          message: 'You cannot cancel this order'
        }
      });
    }

    // Check if order can be cancelled
    if (order.status === 'picked_up') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'CANNOT_CANCEL',
          message: 'Cannot cancel order that has been picked up'
        }
      });
    }

    if (order.status === 'cancelled') {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_CANCELLED',
          message: 'Order is already cancelled'
        }
      });
    }

    // Restore inventory
    for (const item of order.items) {
      const inventory = await Inventory.findOne({ product: item.product }).session(session);
      const product = await Product.findById(item.product).session(session);

      inventory.stock.available += item.quantity;
      inventory.stock.sold -= item.quantity;
      inventory.transactions.push({
        type: 'return',
        quantity: item.quantity,
        order: order._id,
        reason: 'Order cancelled',
        performedBy: req.user._id,
        timestamp: new Date()
      });
      await inventory.save({ session });

      product.inventory.stockQuantity += item.quantity;
      product.stats.orderCount -= 1;
      await product.save({ session });
    }

    // Update order status
    order.status = 'cancelled';
    order.statusHistory.push({
      status: 'cancelled',
      timestamp: new Date(),
      note: req.body.reason || 'Cancelled by customer',
      updatedBy: req.user._id
    });
    await order.save({ session });

    await session.commitTransaction();

    // Emit real-time order cancellation notification via WebSocket
    try {
      const { getIO } = require('../socket');
      const { emitOrderStatusChange } = require('../socket/handlers/orderHandler');
      const { emitUserNotification } = require('../socket/handlers/userHandler');
      const io = getIO();
      
      // Emit order status change
      emitOrderStatusChange(io, order);

      // Send notification to user
      emitUserNotification(io, req.user._id.toString(), {
        title: 'Order Cancelled',
        message: `Your order #${order.orderNumber} has been cancelled`,
        type: 'info'
      });
    } catch (socketError) {
      console.error('Failed to emit order cancellation via WebSocket:', socketError);
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
 * @desc    Export orders in various formats
 * @route   GET /api/admin/orders/export
 * @access  Private (Admin only)
 */
exports.exportOrders = async (req, res, next) => {
  try {
    const { format = 'csv-summary', status, dateFrom, dateTo, search } = req.query;
    const {
      generateDetailedCSV,
      generateSummaryCSV,
      generateExcelExport,
      generateCombinedPDF,
      generateSummaryReportPDF
    } = require('../utils/orderExportUtils');

    // Build filter
    let filter = {};
    
    if (status) {
      filter.status = status;
    }
    
    if (dateFrom || dateTo) {
      filter.createdAt = {};
      if (dateFrom) filter.createdAt.$gte = new Date(dateFrom);
      if (dateTo) filter.createdAt.$lte = new Date(dateTo);
    }
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { 'pickupDetails.customerName': { $regex: search, $options: 'i' } },
        { 'pickupDetails.phone': { $regex: search, $options: 'i' } }
      ];
    }

    // Fetch orders with full details
    const orders = await Order.find(filter)
      .populate('user', 'name email')
      .populate('items.product', 'name sku brand category')
      .sort({ createdAt: -1 })
      .lean();

    if (!orders || orders.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No orders found matching the filters'
        }
      });
    }

    // Generate export based on format
    const timestamp = Date.now();
    const dateStr = new Date().toISOString().split('T')[0];
    let filename, contentType, content;

    switch (format) {
      case 'csv-detailed':
        content = generateDetailedCSV(orders);
        filename = `orders-detailed-${dateStr}.csv`;
        contentType = 'text/csv';
        break;

      case 'csv-summary':
        content = generateSummaryCSV(orders);
        filename = `orders-summary-${dateStr}.csv`;
        contentType = 'text/csv';
        break;

      case 'excel':
        content = await generateExcelExport(orders);
        filename = `orders-report-${dateStr}.xlsx`;
        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
        break;

      case 'pdf-combined':
        content = await generateCombinedPDF(orders);
        filename = `orders-combined-${dateStr}.pdf`;
        contentType = 'application/pdf';
        break;

      case 'pdf-summary':
        content = await generateSummaryReportPDF(orders);
        filename = `orders-summary-report-${dateStr}.pdf`;
        contentType = 'application/pdf';
        break;

      default:
        return res.status(400).json({
          success: false,
          error: {
            code: 'INVALID_FORMAT',
            message: 'Invalid export format. Valid formats: csv-detailed, csv-summary, excel, pdf-combined, pdf-summary'
          }
        });
    }

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Disposition', `attachment; filename=${filename}`);
    res.send(content);
  } catch (error) {
    console.error('Export orders error:', error);
    next(error);
  }
};

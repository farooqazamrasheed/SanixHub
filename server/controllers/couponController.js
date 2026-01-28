const Coupon = require('../models/Coupon');
const { getIO } = require('../socket');
const { emitCouponCreated, emitCouponUpdated, emitCouponDeleted } = require('../socket/handlers/couponHandler');
const { ApiError } = require('../middleware/errorHandler');

/**
 * @desc    Get all coupons (Admin)
 * @route   GET /api/admin/coupons
 * @access  Private (Admin)
 */
exports.getAllCoupons = async (req, res, next) => {
  try {
    const { search, isActive, type, page = 1, limit = 50 } = req.query;

    const query = {};
    
    if (search) {
      query.code = { $regex: new RegExp(search, 'i') };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    if (type) {
      query.type = type;
    }

    const skip = (page - 1) * limit;

    const [coupons, total] = await Promise.all([
      Coupon.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Coupon.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        coupons,
        pagination: {
          total,
          page: parseInt(page),
          pages: Math.ceil(total / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single coupon by ID (Admin)
 * @route   GET /api/admin/coupons/:id
 * @access  Private (Admin)
 */
exports.getCouponById = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      throw new ApiError('Coupon not found', 404);
    }

    res.json({
      success: true,
      data: { coupon }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new coupon (Admin)
 * @route   POST /api/admin/coupons
 * @access  Private (Admin)
 */
exports.createCoupon = async (req, res, next) => {
  try {
    const { code, type, value, description, validity, conditions, isActive } = req.body;

    // Check if coupon code already exists
    const existingCoupon = await Coupon.findOne({ 
      code: code.toUpperCase()
    });

    if (existingCoupon) {
      throw new ApiError('Coupon code already exists', 400);
    }

    const coupon = await Coupon.create({
      code: code.toUpperCase(),
      type,
      value,
      description,
      validity,
      conditions,
      isActive
    });

    // Emit real-time update
    const io = getIO();
    if (io) {
      emitCouponCreated(io, coupon);
    }

    res.status(201).json({
      success: true,
      data: { coupon },
      message: 'Coupon created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update coupon (Admin)
 * @route   PUT /api/admin/coupons/:id
 * @access  Private (Admin)
 */
exports.updateCoupon = async (req, res, next) => {
  try {
    const { code, type, value, description, validity, conditions, isActive } = req.body;

    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      throw new ApiError('Coupon not found', 404);
    }

    // Check if code is being changed and if it conflicts with another coupon
    if (code && code.toUpperCase() !== coupon.code) {
      const existingCoupon = await Coupon.findOne({
        code: code.toUpperCase(),
        _id: { $ne: req.params.id }
      });

      if (existingCoupon) {
        throw new ApiError('Coupon code already exists', 400);
      }
      coupon.code = code.toUpperCase();
    }

    // Update fields
    if (type !== undefined) coupon.type = type;
    if (value !== undefined) coupon.value = value;
    if (description !== undefined) coupon.description = description;
    if (validity !== undefined) coupon.validity = validity;
    if (conditions !== undefined) coupon.conditions = conditions;
    if (isActive !== undefined) coupon.isActive = isActive;

    await coupon.save();

    // Emit real-time update
    const io = getIO();
    if (io) {
      emitCouponUpdated(io, coupon);
    }

    res.json({
      success: true,
      data: { coupon },
      message: 'Coupon updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete coupon (Admin)
 * @route   DELETE /api/admin/coupons/:id
 * @access  Private (Admin)
 */
exports.deleteCoupon = async (req, res, next) => {
  try {
    const coupon = await Coupon.findById(req.params.id);
    
    if (!coupon) {
      throw new ApiError('Coupon not found', 404);
    }

    const couponCode = coupon.code; // Store before deletion

    await Coupon.findByIdAndDelete(req.params.id);

    // Emit real-time update
    const io = getIO();
    if (io) {
      emitCouponDeleted(io, req.params.id, couponCode);
    }

    res.json({
      success: true,
      message: 'Coupon deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get coupon statistics (Admin)
 * @route   GET /api/admin/coupons/stats
 * @access  Private (Admin)
 */
exports.getCouponStats = async (req, res, next) => {
  try {
    const [totalCoupons, activeCoupons, expiredCoupons] = await Promise.all([
      Coupon.countDocuments(),
      Coupon.countDocuments({ isActive: true }),
      Coupon.countDocuments({ 
        'validity.endDate': { $lt: new Date() }
      })
    ]);

    // Get most used coupons
    const mostUsedCoupons = await Coupon.find()
      .sort({ 'usage.totalUsed': -1 })
      .limit(10)
      .select('code usage.totalUsed type value');

    res.json({
      success: true,
      data: {
        totalCoupons,
        activeCoupons,
        expiredCoupons,
        mostUsedCoupons
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Validate and get coupon details
 * @route   POST /api/coupons/validate
 * @access  Private
 */
exports.validateCoupon = async (req, res, next) => {
  try {
    const { code, orderTotal } = req.body;

    const coupon = await Coupon.findOne({ 
      code: code.toUpperCase(),
      isActive: true
    });

    if (!coupon) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'COUPON_NOT_FOUND',
          message: 'Invalid coupon code'
        }
      });
    }

    // Check validity dates
    const now = new Date();
    if (now < coupon.validity.startDate || now > coupon.validity.endDate) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'COUPON_EXPIRED',
          message: 'Coupon has expired or not yet valid'
        }
      });
    }

    // Check minimum order value
    if (orderTotal < coupon.conditions.minOrderValue) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MIN_ORDER_NOT_MET',
          message: `Minimum order value of PKR ${coupon.conditions.minOrderValue} required`
        }
      });
    }

    // Check usage limit
    if (coupon.conditions.usageLimit && coupon.usage.totalUsed >= coupon.conditions.usageLimit) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USAGE_LIMIT_REACHED',
          message: 'Coupon usage limit reached'
        }
      });
    }

    // Check user-specific usage
    const userUsage = coupon.usage.usedBy.find(
      u => u.user.toString() === req.user._id.toString()
    );
    const userUsedCount = userUsage?.usedCount || 0;

    if (coupon.conditions.usagePerUser && userUsedCount >= coupon.conditions.usagePerUser) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'USER_LIMIT_REACHED',
          message: 'You have already used this coupon maximum times'
        }
      });
    }

    // Calculate discount
    let discount = 0;
    if (coupon.type === 'percentage') {
      discount = orderTotal * (coupon.value / 100);
      if (coupon.conditions.maxDiscount) {
        discount = Math.min(discount, coupon.conditions.maxDiscount);
      }
    } else {
      discount = Math.min(coupon.value, orderTotal);
    }

    // Round down to whole number (e.g., 8.9 becomes 8)
    discount = Math.floor(discount);

    res.status(200).json({
      success: true,
      data: {
        coupon: {
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          discount: discount
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

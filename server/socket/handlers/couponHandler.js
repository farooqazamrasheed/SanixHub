// Coupon Real-Time Event Handler

module.exports = (io, socket) => {
  
  // Subscribe to coupon updates (admin only)
  socket.on('coupon:subscribe', () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    socket.join('coupon:updates');
    console.log(`🎟️ Admin ${socket.id} subscribed to coupon updates`);
    socket.emit('coupon:subscribed');
  });

  // Unsubscribe from coupon updates
  socket.on('coupon:unsubscribe', () => {
    socket.leave('coupon:updates');
    console.log(`🎟️ Admin ${socket.id} unsubscribed from coupon updates`);
  });

  // Request current coupons
  socket.on('coupon:request-all', async () => {
    if (!socket.isAdmin) {
      return socket.emit('error', { message: 'Admin access required' });
    }

    try {
      const Coupon = require('../../models/Coupon');
      const coupons = await Coupon.find().sort({ createdAt: -1 });
      
      socket.emit('coupon:list', {
        coupons,
        timestamp: new Date()
      });
    } catch (error) {
      console.error('Coupon request error:', error);
      socket.emit('error', { message: 'Failed to fetch coupons' });
    }
  });

  // Validate coupon in real-time (for checkout)
  socket.on('coupon:validate', async (data) => {
    try {
      const Coupon = require('../../models/Coupon');
      const { code, orderTotal, userId } = data;

      const coupon = await Coupon.findOne({
        code: code.toUpperCase(),
        isActive: true
      });

      if (!coupon) {
        return socket.emit('coupon:invalid', {
          message: 'Invalid coupon code'
        });
      }

      // Validate coupon
      const now = new Date();
      if (coupon.validity.startDate > now || coupon.validity.endDate < now) {
        return socket.emit('coupon:invalid', {
          message: 'This coupon has expired or is not yet valid'
        });
      }

      if (orderTotal < coupon.conditions.minOrderValue) {
        return socket.emit('coupon:invalid', {
          message: `Minimum order value is ${coupon.conditions.minOrderValue}`
        });
      }

      if (coupon.usage.totalUsed >= coupon.conditions.usageLimit) {
        return socket.emit('coupon:invalid', {
          message: 'This coupon has reached its usage limit'
        });
      }

      if (userId) {
        const userUsage = coupon.usage.usedBy.find(u => u.user.toString() === userId);
        if (userUsage && userUsage.usedCount >= coupon.conditions.usagePerUser) {
          return socket.emit('coupon:invalid', {
            message: 'You have already used this coupon the maximum number of times'
          });
        }
      }

      // Calculate discount
      let discount = 0;
      if (coupon.type === 'percentage') {
        discount = (orderTotal * coupon.value) / 100;
        if (coupon.conditions.maxDiscount) {
          discount = Math.min(discount, coupon.conditions.maxDiscount);
        }
      } else {
        discount = Math.min(coupon.value, orderTotal);
      }

      // Round down discount to whole number
      discount = Math.floor(discount);

      socket.emit('coupon:valid', {
        coupon: {
          _id: coupon._id,
          code: coupon.code,
          type: coupon.type,
          value: coupon.value,
          description: coupon.description
        },
        discount: discount,
        message: `Coupon applied! You saved ${discount} PKR`
      });

    } catch (error) {
      console.error('Coupon validation error:', error);
      socket.emit('coupon:invalid', {
        message: 'Error validating coupon'
      });
    }
  });
};

// Helper functions to emit coupon events (called from controllers)

const emitCouponCreated = (io, coupon) => {
  io.to('coupon:updates').emit('coupon:created', {
    coupon,
    timestamp: new Date()
  });
  
  console.log(`🎟️ Coupon created: ${coupon.code}`);
};

const emitCouponUpdated = (io, coupon) => {
  io.to('coupon:updates').emit('coupon:updated', {
    coupon,
    timestamp: new Date()
  });
  
  console.log(`🎟️ Coupon updated: ${coupon.code}`);
};

const emitCouponDeleted = (io, couponId, code) => {
  io.to('coupon:updates').emit('coupon:deleted', {
    couponId,
    code,
    timestamp: new Date()
  });
  
  console.log(`🎟️ Coupon deleted: ${code}`);
};

const emitCouponUsed = (io, data) => {
  io.to('coupon:updates').emit('coupon:used', {
    ...data,
    timestamp: new Date()
  });
  
  console.log(`🎟️ Coupon used: ${data.code} by ${data.userId}`);
};

module.exports.emitCouponCreated = emitCouponCreated;
module.exports.emitCouponUpdated = emitCouponUpdated;
module.exports.emitCouponDeleted = emitCouponDeleted;
module.exports.emitCouponUsed = emitCouponUsed;

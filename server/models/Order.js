const mongoose = require('mongoose');

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    required: false,
    uppercase: true,
    unique: true
  },
  customer: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  items: [{
    product: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    productSnapshot: {
      name: {
        en: { type: String, required: true },
        ur: { type: String, required: true }
      },
      sku: { type: String, required: true },
      image: String,
      price: { type: Number, required: true },
      size: String,
      productId: String,
      brand: String,
      category: String
    },
    quantity: {
      type: Number,
      required: true,
      min: 1
    },
    price: {
      type: Number,
      required: true
    },
    subtotal: {
      type: Number,
      required: true
    }
  }],
  pricing: {
    subtotal: {
      type: Number,
      required: true
    },
    discount: {
      type: Number,
      default: 0
    },
    tax: {
      type: Number,
      default: 0
    },
    total: {
      type: Number,
      required: true
    }
  },
  coupon: {
    code: String,
    discountAmount: Number
  },
  pickupDetails: {
    customerName: {
      type: String,
      required: true
    },
    phone: {
      type: String,
      required: true
    },
    whatsapp: String,
    notes: String
  },
  status: {
    type: String,
    enum: ['placed', 'ready', 'picked_up', 'cancelled'],
    default: 'placed'
  },
  statusHistory: [{
    status: {
      type: String,
      enum: ['placed', 'ready', 'picked_up', 'cancelled'],
      required: true
    },
    timestamp: {
      type: Date,
      default: Date.now
    },
    note: String,
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  payment: {
    method: {
      type: String,
      default: 'cash_on_pickup'
    },
    status: {
      type: String,
      enum: ['pending', 'completed'],
      default: 'pending'
    },
    paidAt: Date
  },
  notes: String
}, {
  timestamps: true
});

// Indexes
// Note: orderNumber already has unique: true in schema definition
orderSchema.index({ customer: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ 'items.product': 1 });

// Generate order number before saving
orderSchema.pre('save', async function(next) {
  try {
    if (this.isNew) {
      const year = new Date().getFullYear();
      const count = await this.constructor.countDocuments({
        createdAt: { $gte: new Date(year, 0, 1) }
      });
      this.orderNumber = `SH-${year}-${String(count + 1).padStart(5, '0')}`;
      
      // Add initial status to history
      this.statusHistory.push({
        status: this.status,
        timestamp: new Date()
      });
    }
    next();
  } catch (error) {
    next(error);
  }
});

// Calculate totals before saving
orderSchema.pre('save', function() {
  // Calculate item subtotals
  this.items.forEach(item => {
    item.subtotal = item.price * item.quantity;
  });
  
  // Calculate order subtotal
  this.pricing.subtotal = this.items.reduce((sum, item) => sum + item.subtotal, 0);
  
  // Calculate total
  this.pricing.total = this.pricing.subtotal - this.pricing.discount + this.pricing.tax;
});

module.exports = mongoose.model('Order', orderSchema);

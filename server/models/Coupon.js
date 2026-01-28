const mongoose = require('mongoose');

const couponSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Coupon code is required'],
    uppercase: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['percentage', 'fixed'],
    required: true
  },
  value: {
    type: Number,
    required: [true, 'Discount value is required'],
    min: 0
  },
  conditions: {
    minOrderValue: {
      type: Number,
      default: 0
    },
    maxDiscount: {
      type: Number,
      default: null
    },
    applicableCategories: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category'
    }],
    applicableProducts: [{
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    }],
    firstOrderOnly: {
      type: Boolean,
      default: false
    },
    usageLimit: {
      type: Number,
      default: null
    },
    usagePerUser: {
      type: Number,
      default: 1
    }
  },
  validity: {
    startDate: {
      type: Date,
      required: true
    },
    endDate: {
      type: Date,
      required: true
    }
  },
  usage: {
    totalUsed: {
      type: Number,
      default: 0
    },
    usedBy: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      },
      usedCount: {
        type: Number,
        default: 0
      },
      lastUsed: Date
    }]
  },
  isActive: {
    type: Boolean,
    default: true
  }
}, {
  timestamps: true
});

// Indexes
couponSchema.index({ code: 1 }, { unique: true });
couponSchema.index({ isActive: 1, 'validity.startDate': 1, 'validity.endDate': 1 });

// Validate dates
couponSchema.pre('save', function() {
  if (this.validity.endDate <= this.validity.startDate) {
    throw new Error('End date must be after start date');
  }
});

module.exports = mongoose.model('Coupon', couponSchema);

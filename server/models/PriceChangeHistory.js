const mongoose = require('mongoose');

const priceChangeHistorySchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual', 'brand', 'category', 'scheduled'],
    required: true
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetModel'
  },
  targetModel: {
    type: String,
    enum: ['Product', 'Brand', 'Category'],
    required: true
  },
  targetName: {
    type: String,
    required: true
  },
  changeType: {
    type: String,
    enum: ['fixed', 'percentage', 'override'],
    required: true
  },
  changeValue: {
    type: Number,
    required: true
  },
  direction: {
    type: String,
    enum: ['increase', 'decrease', 'set'],
    required: true
  },
  affectedProducts: [{
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    productName: String,
    oldPrice: Number,
    newPrice: Number,
    changeAmount: Number,
    changePercentage: Number
  }],
  totalProductsAffected: {
    type: Number,
    default: 0
  },
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'failed', 'cancelled', 'undone', 'scheduled'],
    default: 'pending'
  },
  scheduledFor: {
    type: Date,
    default: null
  },
  executedAt: {
    type: Date,
    default: null
  },
  undoneAt: {
    type: Date,
    default: null
  },
  undoneBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null
  },
  canUndo: {
    type: Boolean,
    default: true
  },
  undoExpiresAt: {
    type: Date,
    default: function() {
      return new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now
    }
  },
  errorMessage: {
    type: String,
    default: null
  },
  analytics: {
    totalRevenueImpact: Number,
    averagePriceChange: Number,
    maxPriceChange: Number,
    minPriceChange: Number
  }
}, {
  timestamps: true
});

// Index for faster queries
priceChangeHistorySchema.index({ type: 1, status: 1, createdAt: -1 });
priceChangeHistorySchema.index({ changedBy: 1, createdAt: -1 });
priceChangeHistorySchema.index({ targetId: 1, targetModel: 1 });
priceChangeHistorySchema.index({ scheduledFor: 1, status: 1 });
priceChangeHistorySchema.index({ undoExpiresAt: 1, canUndo: 1 });

// Check if undo is still possible
priceChangeHistorySchema.methods.isUndoable = function() {
  return this.canUndo && 
         this.status === 'completed' && 
         this.undoExpiresAt > new Date();
};

// Calculate time remaining for undo
priceChangeHistorySchema.methods.undoTimeRemaining = function() {
  if (!this.isUndoable()) return 0;
  const remaining = this.undoExpiresAt - new Date();
  return Math.max(0, Math.floor(remaining / 1000)); // seconds
};

module.exports = mongoose.model('PriceChangeHistory', priceChangeHistorySchema);

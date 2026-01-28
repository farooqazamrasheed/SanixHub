const mongoose = require('mongoose');

const inventorySchema = new mongoose.Schema({
  product: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  stock: {
    available: {
      type: Number,
      required: true,
      min: 0,
      default: 0
    },
    reserved: {
      type: Number,
      default: 0,
      min: 0
    },
    sold: {
      type: Number,
      default: 0,
      min: 0
    }
  },
  transactions: [{
    type: {
      type: String,
      enum: ['restock', 'sale', 'adjustment', 'return'],
      required: true
    },
    quantity: {
      type: Number,
      required: true
    },
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    reason: String,
    performedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  alerts: {
    lowStockEnabled: {
      type: Boolean,
      default: true
    },
    lowStockThreshold: {
      type: Number,
      default: 10
    },
    lastAlertSent: Date
  }
}, {
  timestamps: true
});

// Indexes
inventorySchema.index({ product: 1 }, { unique: true });
inventorySchema.index({ 'stock.available': 1 });
inventorySchema.index({ 'transactions.timestamp': -1 });

module.exports = mongoose.model('Inventory', inventorySchema);

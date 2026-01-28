const mongoose = require('mongoose');

const brandSchema = new mongoose.Schema({
  brandId: {
    type: String,
    required: true,
    trim: true
  },
  name: {
    type: String,
    required: [true, 'Brand name is required'],
    trim: true
  },
  slug: {
    type: String,
    lowercase: true,
    trim: true
  },
  description: {
    type: String,
    trim: true
  },
  image: {
    type: String,
    trim: true
  },
  website: {
    type: String,
    trim: true
  },
  isActive: {
    type: Boolean,
    default: true
  },
  productCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Index for better query performance
brandSchema.index({ brandId: 1 }, { unique: true });
brandSchema.index({ name: 1 }, { unique: true });
brandSchema.index({ slug: 1 }, { unique: true });
brandSchema.index({ isActive: 1 });

// Auto-generate slug from name if not provided
brandSchema.pre('validate', function() {
  if (!this.slug && this.name) {
    this.slug = this.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }
});

module.exports = mongoose.model('Brand', brandSchema);

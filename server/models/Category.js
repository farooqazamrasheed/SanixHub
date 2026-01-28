const mongoose = require('mongoose');

const categorySchema = new mongoose.Schema({
  categoryId: {
    type: String,
    uppercase: true,
  },
  name: {
    en: {
      type: String,
      required: [true, 'English name is required'],
      trim: true
    },
    ur: {
      type: String,
      required: [true, 'Urdu name is required'],
      trim: true
    }
  },
  slug: {
    type: String,
    required: true,
    lowercase: true,
    trim: true
  },
  description: {
    en: { type: String, trim: true },
    ur: { type: String, trim: true }
  },
  parentCategory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Category',
    default: null
  },
  image: {
    url: {
      type: String,
      default: null
    },
    thumbnail: {
      type: String,
      default: null
    }
  },
  icon: {
    type: String,
    default: null
  },
  displayOrder: {
    type: Number,
    default: 0
  },
  isActive: {
    type: Boolean,
    default: true
  },
  seoMeta: {
    title: {
      en: String,
      ur: String
    },
    description: {
      en: String,
      ur: String
    },
    keywords: [String]
  }
}, {
  timestamps: true
});

// Auto-generate categoryId before saving
categorySchema.pre('save', async function(next) {
  try {
    // Generate categoryId only for new documents
    if (!this.categoryId && this.isNew) {
      const date = new Date();
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      // Find the last category created today
      const lastCategory = await this.constructor.findOne({
        categoryId: new RegExp(`^CAT-${dateStr}-`)
      }).sort({ categoryId: -1 });
      
      let sequence = 1;
      if (lastCategory && lastCategory.categoryId) {
        const lastSequence = parseInt(lastCategory.categoryId.split('-')[2]);
        sequence = lastSequence + 1;
      }
      
      // Format: CAT-20241230-0001
      this.categoryId = `CAT-${dateStr}-${sequence.toString().padStart(4, '0')}`;
    }
    
    // Check circular reference
    if (this.parentCategory) {
      if (this.parentCategory.toString() === this._id.toString()) {
        return next(new Error('A category cannot be its own parent'));
      }
      
      const parent = await this.constructor.findById(this.parentCategory);
      if (parent && parent.parentCategory && parent.parentCategory.toString() === this._id.toString()) {
        return next(new Error('Circular category reference detected'));
      }
    }
    
    next();
  } catch (error) {
    next(error);
  }
});

// Indexes
categorySchema.index({ categoryId: 1 }, { unique: true });
categorySchema.index({ slug: 1 }, { unique: true });
categorySchema.index({ parentCategory: 1 });
categorySchema.index({ isActive: 1, displayOrder: 1 });
categorySchema.index({ 'name.en': 'text', 'name.ur': 'text' });

// Virtual for subcategories
categorySchema.virtual('subcategories', {
  ref: 'Category',
  localField: '_id',
  foreignField: 'parentCategory'
});


module.exports = mongoose.model('Category', categorySchema);

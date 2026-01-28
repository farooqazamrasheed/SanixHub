const mongoose = require("mongoose");

const productSchema = new mongoose.Schema(
  {
    productId: {
      type: String,
      uppercase: true,
    },
    name: {
      en: {
        type: String,
        required: [true, "English product name is required"],
        trim: true,
      },
      ur: {
        type: String,
        required: [true, "Urdu product name is required"],
        trim: true,
      },
    },
    slug: {
      type: String,
      required: true,
      lowercase: true,
      trim: true,
    },
    sku: {
      type: String,
      required: [true, "SKU is required"],
      uppercase: true,
      trim: true,
    },
    description: {
      en: {
        type: String,
        required: [true, "English description is required"],
      },
      ur: {
        type: String,
        required: [true, "Urdu description is required"],
      },
    },
    shortDescription: {
      en: { type: String, maxlength: 200 },
      ur: { type: String, maxlength: 200 },
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
      required: [true, "Category is required"],
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Category",
    },
    pricing: {
      basePrice: {
        type: Number,
        required: [true, "Base price is required"],
        min: 0,
      },
      salePrice: {
        type: Number,
        min: 0,
      },
      discount: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
      taxRate: {
        type: Number,
        min: 0,
        max: 100,
        default: 0,
      },
    },
    specifications: [
      {
        key: {
          en: { type: String, required: true },
          ur: { type: String, required: true },
        },
        value: {
          en: { type: String, required: true },
          ur: { type: String, required: true },
        },
      },
    ],
    images: [
      {
        url: {
          type: String,
          required: true,
        },
        alt: {
          en: String,
          ur: String,
        },
        isPrimary: {
          type: Boolean,
          default: false,
        },
      },
    ],
    dimensions: {
      length: Number,
      width: Number,
      height: Number,
      weight: Number,
      unit: {
        type: String,
        enum: ["cm", "inch", "kg", "g"],
        default: "cm",
      },
    },
    tags: {
      type: [String],
      default: [],
    },
    brand: {
      type: String,
      trim: true,
    },
    manufacturer: {
      type: String,
      trim: true,
    },
    origin: {
      type: String,
      trim: true,
    },
    size: {
      type: String,
      trim: true,
    },
    inventory: {
      stockQuantity: {
        type: Number,
        required: true,
        min: 0,
        default: 0,
      },
      lowStockThreshold: {
        type: Number,
        default: 10,
      },
      allowBackorder: {
        type: Boolean,
        default: false,
      },
      trackInventory: {
        type: Boolean,
        default: true,
      },
    },
    seo: {
      metaTitle: {
        en: String,
        ur: String,
      },
      metaDescription: {
        en: String,
        ur: String,
      },
      keywords: [String],
    },
    stats: {
      viewCount: {
        type: Number,
        default: 0,
      },
      orderCount: {
        type: Number,
        default: 0,
      },
      rating: {
        type: Number,
        default: 0,
        min: 0,
        max: 5,
      },
      reviewCount: {
        type: Number,
        default: 0,
      },
      distribution: {
        type: Map,
        of: Number,
        default: () =>
          new Map([
            ["1", 0],
            ["2", 0],
            ["3", 0],
            ["4", 0],
            ["5", 0],
          ]),
      },
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    isFeatured: {
      type: Boolean,
      default: false,
    },
    isNewProduct: {
      type: Boolean,
      default: false,
    },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// Auto-generate productId before saving
productSchema.pre("save", async function () {
  if (!this.productId && this.isNew) {
    // Generate unique productId: PRD-YYYYMMDD-XXXX
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, "");

    // Find the last product created today to get the next sequence number
    const lastProduct = await this.constructor
      .findOne({
        productId: new RegExp(`^PRD-${dateStr}-`),
      })
      .sort({ productId: -1 });

    let sequence = 1;
    if (lastProduct && lastProduct.productId) {
      const lastSequence = parseInt(lastProduct.productId.split("-")[2]);
      sequence = lastSequence + 1;
    }

    // Format: PRD-20241230-0001
    this.productId = `PRD-${dateStr}-${sequence.toString().padStart(4, "0")}`;
  }
});

// Indexes
productSchema.index({ productId: 1 }, { unique: true });
productSchema.index({ slug: 1 }, { unique: true });
productSchema.index({ sku: 1 }, { unique: true });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ isActive: 1, isFeatured: 1 });
productSchema.index({ "pricing.salePrice": 1 });
productSchema.index({ "stats.rating": -1 });
productSchema.index({ tags: 1 });
productSchema.index(
  {
    "name.en": "text",
    "name.ur": "text",
    "description.en": "text",
    "description.ur": "text",
    "shortDescription.en": "text",
    "shortDescription.ur": "text",
    tags: "text",
    sku: "text",
    productId: "text",
    brand: "text",
    manufacturer: "text",
    "seo.keywords": "text",
  },
  {
    weights: {
      "name.en": 10,
      "name.ur": 10,
      sku: 8,
      productId: 8,
      brand: 7,
      tags: 5,
      manufacturer: 4,
      "shortDescription.en": 3,
      "shortDescription.ur": 3,
      "description.en": 2,
      "description.ur": 2,
      "seo.keywords": 2,
    },
  }
);

// Validate sale price is less than base price before saving
productSchema.pre("save", async function () {
  if (this.pricing.salePrice && this.pricing.basePrice) {
    if (this.pricing.salePrice >= this.pricing.basePrice) {
      throw new Error("Sale price must be less than base price");
    }
  }
});

// Calculate discount percentage if sale price exists
productSchema.pre("save", async function () {
  if (this.pricing.salePrice && this.pricing.basePrice) {
    this.pricing.discount = Math.round(
      ((this.pricing.basePrice - this.pricing.salePrice) /
        this.pricing.basePrice) *
        100
    );
  } else {
    this.pricing.discount = 0;
  }
});

// Ensure only one primary image
productSchema.pre("save", async function () {
  if (this.images && this.images.length > 0) {
    let primaryCount = 0;
    this.images.forEach((img) => {
      if (img.isPrimary) primaryCount++;
    });

    if (primaryCount === 0) {
      this.images[0].isPrimary = true;
    } else if (primaryCount > 1) {
      let foundPrimary = false;
      this.images.forEach((img) => {
        if (!foundPrimary && img.isPrimary) {
          foundPrimary = true;
        } else {
          img.isPrimary = false;
        }
      });
    }
  }
});

// Virtual for final price (use sale price if available, otherwise base price)
productSchema.virtual("finalPrice").get(function () {
  return this.pricing.salePrice || this.pricing.basePrice;
});

// Virtual for checking if in stock
productSchema.virtual("inStock").get(function () {
  return this.inventory.stockQuantity > 0 || this.inventory.allowBackorder;
});

module.exports = mongoose.model("Product", productSchema);

const Product = require("../models/Product");
const Inventory = require("../models/Inventory");
const Brand = require("../models/Brand");

/**
 * @desc    Get all products with filtering, sorting, and pagination
 * @route   GET /api/products
 * @access  Public
 */
exports.getProducts = async (req, res, next) => {
  try {
    const {
      page = 1,
      limit = 20,
      category,
      subCategory,
      minPrice,
      maxPrice,
      search,
      sort = "-createdAt",
      featured,
      isNew,
      inStock,
      brand,
      tags,
    } = req.query;

    // Build query
    const query = { isActive: true };

    if (category) query.category = category;
    if (subCategory) query.subCategory = subCategory;
    if (featured) query.isFeatured = featured === "true";
    if (isNew) query.isNewProduct = isNew === "true";
    if (brand) query.brand = { $regex: new RegExp(brand, "i") };
    if (tags) {
      const tagArray = tags.split(",").map((tag) => tag.trim());
      query.tags = { $in: tagArray };
    }

    if (minPrice || maxPrice) {
      query["pricing.salePrice"] = {};
      if (minPrice) query["pricing.salePrice"].$gte = parseFloat(minPrice);
      if (maxPrice) query["pricing.salePrice"].$lte = parseFloat(maxPrice);
    }

    // Build $and array to combine stock filter and search filter
    const andConditions = [];

    // Stock filter
    if (inStock === "true") {
      andConditions.push({
        $or: [
          { "inventory.stockQuantity": { $gt: 0 } },
          { "inventory.allowBackorder": true },
        ],
      });
    }

    // Enhanced search - search through multiple fields with substring matching
    if (search) {
      const searchRegex = new RegExp(search, "i"); // Case-insensitive regex for substring matching
      andConditions.push({
        $or: [
          // Direct field matches - finds any substring
          { "name.en": searchRegex },
          { "name.ur": searchRegex },
          { sku: searchRegex },
          { productId: searchRegex },
          { brand: searchRegex },
          { manufacturer: searchRegex },
          { tags: searchRegex },
          { "description.en": searchRegex },
          { "description.ur": searchRegex },
          { "shortDescription.en": searchRegex },
          { "shortDescription.ur": searchRegex },
          { "seo.keywords": searchRegex },
          { slug: searchRegex },
        ],
      });
    }

    // Add $and conditions to query if any exist
    if (andConditions.length > 0) {
      query.$and = andConditions;
    }

    // Execute query with pagination
    const skip = (page - 1) * limit;
    const products = await Product.find(query)
      .populate("category", "name slug")
      .sort(sort)
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Transform products to include stock field for frontend compatibility
    const transformedProducts = products.map((product) => ({
      ...product,
      stock: product.inventory?.stockQuantity || 0, // Add stock field
      price: product.pricing?.salePrice || product.pricing?.basePrice,
    }));

    // Get total count
    const total = await Product.countDocuments(query);

    res.status(200).json({
      success: true,
      data: {
        products: transformedProducts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit),
        },
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by slug
 * @route   GET /api/products/:slug
 * @access  Public
 */
exports.getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({
      slug: req.params.slug,
      isActive: true,
    })
      .populate("category", "name slug")
      .populate("subCategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    // Increment view count
    product.stats.viewCount += 1;
    await product.save();

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single product by ID (for admin editing)
 * @route   GET /api/products/id/:id
 * @access  Public
 */
exports.getProductById = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate("category", "name slug")
      .populate("subCategory", "name slug");

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create new product
 * @route   POST /api/products
 * @access  Private (Admin only)
 */
exports.createProduct = async (req, res, next) => {
  try {
    const product = await Product.create(req.body);

    // Create inventory record
    await Inventory.create({
      product: product._id,
      stock: {
        available: product.inventory.stockQuantity,
        reserved: 0,
        sold: 0,
      },
      alerts: {
        lowStockEnabled: true,
        lowStockThreshold: product.inventory.lowStockThreshold,
      },
      transactions: [
        {
          type: "restock",
          quantity: product.inventory.stockQuantity,
          reason: "Initial stock",
          performedBy: req.user._id,
          timestamp: new Date(),
        },
      ],
    });

    // Populate category and subcategory for WebSocket
    await product.populate([
      { path: "category", select: "name slug" },
      { path: "subCategory", select: "name slug" },
    ]);

    // Emit WebSocket event for real-time updates
    try {
      const { getIO } = require("../socket");
      const io = getIO();

      if (io) {
        // Notify all admin users about new product
        io.to("admin:all").emit("product:created", {
          type: "PRODUCT_CREATED",
          product: {
            _id: product._id,
            productId: product.productId,
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            category: product.category,
            subCategory: product.subCategory,
            pricing: product.pricing,
            inventory: product.inventory,
            images: product.images,
            brand: product.brand,
            size: product.size,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
          },
          timestamp: new Date(),
        });

        console.log(`✅ Product created and broadcasted: ${product.sku}`);
      }
    } catch (socketError) {
      console.error("Failed to emit WebSocket event:", socketError);
      // Don't fail the request if socket fails
    }

    res.status(201).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    // Handle duplicate errors
    if (error.code === 11000) {
      if (error.keyPattern && error.keyPattern.sku) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DUPLICATE_SKU",
            message: "A product with this SKU already exists",
          },
        });
      }
      if (error.keyPattern && error.keyPattern.slug) {
        return res.status(400).json({
          success: false,
          error: {
            code: "DUPLICATE_SLUG",
            message: "A product with this slug already exists",
          },
        });
      }
    }

    next(error);
  }
};

/**
 * @desc    Update product
 * @route   PUT /api/products/:id
 * @access  Private (Admin only)
 */
exports.updateProduct = async (req, res, next) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    // Check if stock quantity changed
    const oldStock = product.inventory.stockQuantity;
    const oldPrice = product.pricing.salePrice || product.pricing.basePrice;

    // Handle images field - convert string URLs to proper image objects
    const updateData = { ...req.body };
    if (updateData.images) {
      if (typeof updateData.images === "string") {
        // Single image URL - convert to array of objects
        updateData.images = [
          {
            url: updateData.images,
            alt: { en: "", ur: "" },
            isPrimary: true,
          },
        ];
      } else if (Array.isArray(updateData.images)) {
        // Array of images - ensure each is an object
        updateData.images = updateData.images.map((img) => {
          if (typeof img === "string") {
            return {
              url: img,
              alt: { en: "", ur: "" },
              isPrimary: false,
            };
          }
          return img;
        });
        // Ensure at least one primary image
        if (
          updateData.images.length > 0 &&
          !updateData.images.some((img) => img.isPrimary)
        ) {
          updateData.images[0].isPrimary = true;
        }
      }
    }

    product = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    // Update inventory if stock changed
    if (
      req.body.inventory?.stockQuantity &&
      req.body.inventory.stockQuantity !== oldStock
    ) {
      const inventory = await Inventory.findOne({ product: product._id });
      const difference = req.body.inventory.stockQuantity - oldStock;

      inventory.stock.available += difference;
      inventory.transactions.push({
        type: "adjustment",
        quantity: difference,
        reason: "Manual adjustment",
        performedBy: req.user._id,
        timestamp: new Date(),
      });

      await inventory.save();

      // Emit real-time inventory update
      const { getIO } = require("../socket");
      const {
        emitInventoryUpdate,
        emitLowStockAlert,
        emitOutOfStockAlert,
      } = require("../socket/handlers/inventoryHandler");
      const io = getIO();

      emitInventoryUpdate(io, product._id, {
        stock: product.inventory.stockQuantity,
        lowStockThreshold: product.inventory.lowStockThreshold,
        isLowStock:
          product.inventory.stockQuantity <=
          product.inventory.lowStockThreshold,
      });

      // Check for low stock alert
      if (
        product.inventory.stockQuantity <=
          product.inventory.lowStockThreshold &&
        product.inventory.stockQuantity > 0
      ) {
        emitLowStockAlert(io, product);
      }

      // Check for out of stock
      if (product.inventory.stockQuantity === 0) {
        emitOutOfStockAlert(io, product);
      }
    }

    // Check if price changed - notify users with item in wishlist
    const newPrice = product.pricing.salePrice || product.pricing.basePrice;
    if (newPrice !== oldPrice && newPrice < oldPrice) {
      // Price dropped - notify wishlist users
      console.log(
        `💰 Price dropped for product ${product._id}: ${oldPrice} → ${newPrice}`
      );

      try {
        const Wishlist = require("../models/Wishlist");
        const NotificationPreferences = require("../models/NotificationPreferences");
        const { getIO } = require("../socket");
        const {
          emitPriceDropAlert,
        } = require("../socket/handlers/userHandler");

        // Find all users who have this product in their wishlist
        const wishlists = await Wishlist.find({
          "items.product": product._id,
        }).populate("user", "_id");

        if (wishlists.length > 0) {
          const io = getIO();
          const discount = Math.round(((oldPrice - newPrice) / oldPrice) * 100);

          // Send price drop alert to each user (with preference check)
          let sentCount = 0;
          for (const wishlist of wishlists) {
            if (wishlist.user) {
              try {
                // Get user's notification preferences
                const prefs = await NotificationPreferences.getOrCreate(
                  wishlist.user._id
                );

                // Check if price drop notifications are enabled
                if (prefs.isNotificationAllowed("wishlist", "priceDrops")) {
                  // Check if meets minimum discount threshold
                  if (prefs.meetsDiscountThreshold(discount)) {
                    // Check if not in quiet hours
                    if (!prefs.isInQuietHours()) {
                      emitPriceDropAlert(io, wishlist.user._id.toString(), {
                        _id: product._id,
                        name: product.name,
                        oldPrice,
                        pricing: {
                          salePrice: newPrice,
                          basePrice: product.pricing.basePrice,
                        },
                        slug: product.slug,
                        images: product.images,
                      });
                      sentCount++;
                    }
                  }
                }
              } catch (error) {
                console.error(
                  `Failed to check preferences for user ${wishlist.user._id}:`,
                  error
                );
                // Send anyway on error (fail-open)
                emitPriceDropAlert(io, wishlist.user._id.toString(), {
                  _id: product._id,
                  name: product.name,
                  oldPrice,
                  pricing: {
                    salePrice: newPrice,
                    basePrice: product.pricing.basePrice,
                  },
                  slug: product.slug,
                  images: product.images,
                });
                sentCount++;
              }
            }
          }

          console.log(
            `💰 Price drop alerts sent to ${sentCount}/${wishlists.length} users (after preference filtering)`
          );
        }
      } catch (error) {
        console.error("Failed to send price drop alerts:", error);
      }
    }

    // Check if product came back in stock - notify wishlist users
    if (oldStock === 0 && req.body.inventory?.stockQuantity > 0) {
      try {
        const Wishlist = require("../models/Wishlist");
        const NotificationPreferences = require("../models/NotificationPreferences");
        const { getIO } = require("../socket");
        const {
          emitBackInStockAlert,
        } = require("../socket/handlers/userHandler");

        // Find all users who have this product in their wishlist
        const wishlists = await Wishlist.find({
          "items.product": product._id,
        }).populate("user", "_id");

        if (wishlists.length > 0) {
          const io = getIO();

          // Send back-in-stock alert to each user (with preference check)
          let sentCount = 0;
          for (const wishlist of wishlists) {
            if (wishlist.user) {
              try {
                // Get user's notification preferences
                const prefs = await NotificationPreferences.getOrCreate(
                  wishlist.user._id
                );

                // Check if back-in-stock notifications are enabled
                if (prefs.isNotificationAllowed("wishlist", "backInStock")) {
                  // Check if not in quiet hours
                  if (!prefs.isInQuietHours()) {
                    emitBackInStockAlert(io, wishlist.user._id.toString(), {
                      _id: product._id,
                      name: product.name,
                      inventory: {
                        stockQuantity: product.inventory.stockQuantity,
                      },
                      slug: product.slug,
                      images: product.images,
                    });
                    sentCount++;
                  }
                }
              } catch (error) {
                console.error(
                  `Failed to check preferences for user ${wishlist.user._id}:`,
                  error
                );
                // Send anyway on error (fail-open)
                emitBackInStockAlert(io, wishlist.user._id.toString(), {
                  _id: product._id,
                  name: product.name,
                  inventory: {
                    stockQuantity: product.inventory.stockQuantity,
                  },
                  slug: product.slug,
                  images: product.images,
                });
                sentCount++;
              }
            }
          }

          console.log(
            `📦 Back-in-stock alerts sent to ${sentCount}/${wishlists.length} users (after preference filtering)`
          );
        }
      } catch (error) {
        console.error("Failed to send back-in-stock alerts:", error);
      }
    }

    // Emit WebSocket event for product update
    try {
      const { getIO } = require("../socket");
      const io = getIO();

      if (io) {
        // Populate category for response
        await product.populate("category", "name slug");
        
        // Notify all admin users about product update
        io.to("admin:all").emit("product:updated", {
          type: "PRODUCT_UPDATED",
          product: {
            _id: product._id,
            productId: product.productId,
            name: product.name,
            sku: product.sku,
            slug: product.slug,
            category: product.category,
            pricing: product.pricing,
            inventory: product.inventory,
            images: product.images,
            brand: product.brand,
            size: product.size,
            isActive: product.isActive,
            isFeatured: product.isFeatured,
          },
          changes: {
            priceChanged: newPrice !== oldPrice,
            stockChanged: req.body.inventory?.stockQuantity !== oldStock,
          },
          timestamp: new Date(),
        });

        console.log(`✅ Product updated and broadcasted: ${product.sku}`);
      }
    } catch (socketError) {
      console.error("Failed to emit WebSocket event:", socketError);
    }

    res.status(200).json({
      success: true,
      data: { product },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete product (soft delete)
 * @route   DELETE /api/products/:id
 * @access  Private (Admin only)
 */
exports.deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    // Soft delete
    product.isActive = false;
    await product.save();

    // Emit WebSocket event for product deletion
    try {
      const { getIO } = require("../socket");
      const io = getIO();

      if (io) {
        // Notify all admin users about product deletion
        io.to("admin:all").emit("product:deleted", {
          type: "PRODUCT_DELETED",
          productId: product._id,
          productName: product.name,
          sku: product.sku,
          timestamp: new Date(),
        });

        console.log(`✅ Product deleted and broadcasted: ${product.sku}`);
      }
    } catch (socketError) {
      console.error("Failed to emit WebSocket event:", socketError);
    }

    res.status(200).json({
      success: true,
      data: {
        message: "Product deleted successfully",
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get related products
 * @route   GET /api/products/:id/related
 * @access  Public
 */
exports.getRelatedProducts = async (req, res, next) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: "PRODUCT_NOT_FOUND",
          message: "Product not found",
        },
      });
    }

    // Find products in same category, excluding current product
    const relatedProducts = await Product.find({
      category: product.category,
      _id: { $ne: product._id },
      isActive: true,
    })
      .limit(8)
      .select("name slug images pricing stats")
      .lean();

    res.status(200).json({
      success: true,
      data: { products: relatedProducts },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update products
 * @route   PUT /api/products/bulk/update
 * @access  Private (Admin only)
 */
exports.bulkUpdateProducts = async (req, res, next) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_IDS",
          message: "Product IDs array is required",
        },
      });
    }

    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: updates }
    );

    res.status(200).json({
      success: true,
      data: {
        message: `${result.modifiedCount} product(s) updated successfully`,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk delete products
 * @route   DELETE /api/products/bulk/delete
 * @access  Private (Admin only)
 */
exports.bulkDeleteProducts = async (req, res, next) => {
  try {
    const { ids } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: "INVALID_IDS",
          message: "Product IDs array is required",
        },
      });
    }

    // Soft delete
    const result = await Product.updateMany(
      { _id: { $in: ids } },
      { $set: { isActive: false } }
    );

    res.status(200).json({
      success: true,
      data: {
        message: `${result.modifiedCount} product(s) deleted successfully`,
        modifiedCount: result.modifiedCount,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all brands with product counts (public)
 * @route   GET /api/products/brands
 * @access  Public
 */
exports.getPublicBrands = async (req, res, next) => {
  try {
    const { search } = req.query;

    const query = { isActive: true };

    if (search) {
      query.name = { $regex: new RegExp(search, "i") };
    }

    const brands = await Brand.find(query)
      .sort({ name: 1 })
      .select("name slug description image website productCount");

    res.json({
      success: true,
      data: {
        brands,
        count: brands.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single brand by slug (public)
 * @route   GET /api/products/brands/:slug
 * @access  Public
 */
exports.getPublicBrandBySlug = async (req, res, next) => {
  try {
    const brand = await Brand.findOne({
      slug: req.params.slug,
      isActive: true,
    });

    if (!brand) {
      return res.status(404).json({
        success: false,
        error: {
          code: "BRAND_NOT_FOUND",
          message: "Brand not found",
        },
      });
    }

    res.json({
      success: true,
      data: { brand },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if SKU is available
 * @route   GET /api/products/check-sku/:sku
 * @access  Private (Admin only)
 */
exports.checkSku = async (req, res, next) => {
  try {
    const { sku } = req.params;
    const { excludeId } = req.query; // For edit mode, exclude current product

    const query = { sku: sku.toUpperCase() };
    if (excludeId) {
      query._id = { $ne: excludeId };
    }

    const existingProduct = await Product.findOne(query).select(
      "_id name sku productId"
    );

    res.json({
      success: true,
      data: {
        available: !existingProduct,
        existingProduct: existingProduct
          ? {
              id: existingProduct._id,
              name: existingProduct.name,
              sku: existingProduct.sku,
              productId: existingProduct.productId,
            }
          : null,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get SKU suggestions based on product name and category
 * @route   POST /api/products/suggest-sku
 * @access  Private (Admin only)
 */
exports.suggestSku = async (req, res, next) => {
  try {
    const { name, category, brand } = req.body;

    const suggestions = [];

    // Strategy 1: Brand-based SKU
    if (brand) {
      const brandPrefix = brand
        .substring(0, 3)
        .toUpperCase()
        .replace(/[^A-Z]/g, "");
      const namePrefix =
        name
          ?.substring(0, 3)
          .toUpperCase()
          .replace(/[^A-Z]/g, "") || "PRD";

      // Find last SKU with this pattern
      const lastProduct = await Product.findOne({
        sku: new RegExp(`^${brandPrefix}-${namePrefix}-`),
      })
        .sort({ sku: -1 })
        .select("sku");

      let sequence = 1;
      if (lastProduct?.sku) {
        const match = lastProduct.sku.match(/-(\d+)$/);
        if (match) sequence = parseInt(match[1]) + 1;
      }

      suggestions.push(
        `${brandPrefix}-${namePrefix}-${sequence.toString().padStart(3, "0")}`
      );
    }

    // Strategy 2: Category-based SKU
    if (category) {
      try {
        const Category = require("../models/Category");
        const cat = await Category.findById(category).select("name");
        if (cat) {
          const catPrefix =
            cat.name.en
              .substring(0, 3)
              .toUpperCase()
              .replace(/[^A-Z]/g, "") || "CAT";

          const lastProduct = await Product.findOne({
            sku: new RegExp(`^${catPrefix}-`),
          })
            .sort({ sku: -1 })
            .select("sku");

          let sequence = 1;
          if (lastProduct?.sku) {
            const match = lastProduct.sku.match(/-(\d+)$/);
            if (match) sequence = parseInt(match[1]) + 1;
          }

          suggestions.push(
            `${catPrefix}-${sequence.toString().padStart(4, "0")}`
          );
        }
      } catch (error) {
        console.error("Error generating category-based SKU:", error);
      }
    }

    // Strategy 3: Name-based SKU
    if (name) {
      const words = name
        .toUpperCase()
        .split(/\s+/)
        .filter((w) => w.length > 0);
      if (words.length >= 2) {
        const initials = words
          .slice(0, 3)
          .map((w) => w[0])
          .join("");

        const lastProduct = await Product.findOne({
          sku: new RegExp(`^${initials}-`),
        })
          .sort({ sku: -1 })
          .select("sku");

        let sequence = 1;
        if (lastProduct?.sku) {
          const match = lastProduct.sku.match(/-(\d+)$/);
          if (match) sequence = parseInt(match[1]) + 1;
        }

        suggestions.push(`${initials}-${sequence.toString().padStart(3, "0")}`);
      }
    }

    // Strategy 4: Sequential SKU
    const lastProduct = await Product.findOne()
      .sort({ createdAt: -1 })
      .select("sku");
    let nextSequence = 1;
    if (lastProduct?.sku) {
      const match = lastProduct.sku.match(/(\d+)$/);
      if (match) nextSequence = parseInt(match[1]) + 1;
    }
    suggestions.push(`SKU-${nextSequence.toString().padStart(5, "0")}`);

    // Strategy 5: Date-based SKU
    const date = new Date();
    const dateStr = `${date.getFullYear()}${(date.getMonth() + 1)
      .toString()
      .padStart(2, "0")}${date.getDate().toString().padStart(2, "0")}`;

    const todayProducts = await Product.countDocuments({
      sku: new RegExp(`^SKU-${dateStr}-`),
    });

    suggestions.push(
      `SKU-${dateStr}-${(todayProducts + 1).toString().padStart(3, "0")}`
    );

    res.json({
      success: true,
      data: {
        suggestions: [...new Set(suggestions)], // Remove duplicates
        count: suggestions.length,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update all products (fix data, add missing fields)
 * @route   POST /api/products/bulk-update-all
 * @access  Private (Admin only)
 */
exports.bulkUpdateAllProducts = async (req, res, next) => {
  try {
    const { dryRun = true, createBackup = false } = req.body;

    console.log(
      `\n🔍 Bulk Update Request: dryRun=${dryRun}, backup=${createBackup}`
    );

    const stats = {
      total: 0,
      updated: 0,
      skipped: 0,
      errors: 0,
      changes: {
        skuFixed: 0,
        priceRounded: 0,
        stockFixed: 0,
        missingFieldsAdded: 0,
        subcategoryAdded: 0,
        seoAdded: 0,
        dimensionsAdded: 0,
        slugFixed: 0,
        imagesFixed: 0,
      },
    };

    // Create backup if requested (only if not dry run)
    if (createBackup && !dryRun) {
      try {
        const fs = require("fs");
        console.log("📦 Creating backup...");
        const productsBackup = await Product.find({}).lean();
        const backupPath = `./backups/products_backup_${Date.now()}.json`;

        if (!fs.existsSync("./backups")) {
          fs.mkdirSync("./backups", { recursive: true });
        }

        fs.writeFileSync(backupPath, JSON.stringify(productsBackup, null, 2));
        console.log(`✅ Backup created: ${backupPath}`);
      } catch (backupError) {
        console.error("⚠️ Backup failed:", backupError.message);
        // Continue even if backup fails
      }
    }

    // Fetch all products
    console.log("📦 Fetching products...");
    const products = await Product.find({}).populate("category").lean();
    stats.total = products.length;
    console.log(`✅ Found ${products.length} products`);

    if (products.length === 0) {
      return res.json({
        success: true,
        stats,
        message: "No products found to update.",
      });
    }

    // Update each product
    console.log("🚀 Starting updates...");
    for (let i = 0; i < products.length; i++) {
      try {
        // Get the product as a Mongoose document (not lean)
        const product = await Product.findById(products[i]._id).populate(
          "category"
        );

        if (!product) {
          console.log(`⚠️ Product ${products[i]._id} not found, skipping`);
          stats.skipped++;
          continue;
        }

        // Inline update logic to avoid module issues
        const changes = [];
        let needsUpdate = false;

        // Fix SKU
        if (product.sku) {
          const oldSku = product.sku;
          const newSku = oldSku.toUpperCase().replace(/[^A-Z0-9\-\/]/g, "");
          if (newSku !== oldSku) {
            product.sku = newSku;
            changes.push("SKU fixed");
            needsUpdate = true;
          }
        }

        // Round prices
        if (product.pricing) {
          const oldBase = product.pricing.basePrice;
          const newBase = Math.round(oldBase * 100) / 100;
          if (oldBase !== newBase) {
            product.pricing.basePrice = newBase;
            changes.push("Prices rounded");
            needsUpdate = true;
          }
          if (product.pricing.salePrice) {
            const oldSale = product.pricing.salePrice;
            const newSale = Math.round(oldSale * 100) / 100;
            if (oldSale !== newSale) {
              product.pricing.salePrice = newSale;
              needsUpdate = true;
            }
          }
        }

        // Fix stock
        if (product.inventory && product.inventory.stockQuantity < 0) {
          product.inventory.stockQuantity = 0;
          changes.push("Stock fixed");
          needsUpdate = true;
        }

        // Add SEO if missing
        if (
          !product.seo ||
          !product.seo.metaTitle ||
          !product.seo.metaTitle.en
        ) {
          if (!product.seo) product.seo = {};
          if (!product.seo.metaTitle) {
            product.seo.metaTitle = {
              en: `${product.name.en} - SanixHub`,
              ur: `${product.name.ur} - سینکس ہب`,
            };
            changes.push("SEO added");
            needsUpdate = true;
          }
        }

        // Save if needed
        if (needsUpdate && !dryRun) {
          await product.save();
        }

        if (changes.length > 0) {
          stats.updated++;
          changes.forEach((change) => {
            if (change.includes("SKU")) stats.changes.skuFixed++;
            if (change.includes("Price")) stats.changes.priceRounded++;
            if (change.includes("Stock")) stats.changes.stockFixed++;
            if (change.includes("SEO")) stats.changes.seoAdded++;
          });
        } else {
          stats.skipped++;
        }

        // Log progress every 10 products
        if ((i + 1) % 10 === 0 || i === products.length - 1) {
          const percent = Math.round(((i + 1) / products.length) * 100);
          console.log(`📊 Progress: ${i + 1}/${products.length} (${percent}%)`);
        }
      } catch (prodError) {
        console.error(
          `❌ Error with product ${products[i]._id}:`,
          prodError.message
        );
        stats.errors++;
      }
    }

    console.log("✅ Update complete");
    console.log(
      `📊 Stats: ${stats.updated} updated, ${stats.skipped} skipped, ${stats.errors} errors`
    );

    res.json({
      success: true,
      stats,
      message: dryRun
        ? `Dry run completed. ${stats.updated} products would be updated. No changes were saved.`
        : `Successfully updated ${stats.updated} products.`,
    });
  } catch (error) {
    console.error("❌ Bulk update error:", error);
    console.error("Stack:", error.stack);
    res.status(500).json({
      success: false,
      error: {
        message: error.message,
        code: "BULK_UPDATE_FAILED",
      },
    });
  }
};

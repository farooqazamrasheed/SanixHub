const Brand = require('../models/Brand');
const Product = require('../models/Product');
const { ApiError } = require('../middleware/errorHandler');

/**
 * Generate unique brand ID in format: BRD-YYYYMMDD-XXXX
 */
async function generateBrandId() {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `BRD-${dateStr}`;

  // Find the latest brand created today
  const latestBrand = await Brand.findOne({
    brandId: { $regex: `^${prefix}` }
  }).sort({ brandId: -1 });

  let sequence = 1;
  if (latestBrand) {
    // Extract the sequence number from the last brand ID
    const lastSequence = parseInt(latestBrand.brandId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  // Format sequence as 4 digits (0001-9999)
  const sequenceStr = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceStr}`;
}

/**
 * Get all brands
 * @route GET /api/admin/brands
 */
exports.getAllBrands = async (req, res, next) => {
  try {
    const { search, isActive, page = 1, limit = 50 } = req.query;

    const query = {};
    
    if (search) {
      query.name = { $regex: new RegExp(search, 'i') };
    }
    
    if (isActive !== undefined) {
      query.isActive = isActive === 'true';
    }

    const skip = (page - 1) * limit;

    const [brands, total] = await Promise.all([
      Brand.find(query)
        .sort({ name: 1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Brand.countDocuments(query)
    ]);

    res.json({
      success: true,
      data: {
        brands,
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
 * Get single brand by ID
 * @route GET /api/admin/brands/:id
 */
exports.getBrandById = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    res.json({
      success: true,
      data: { brand }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new brand
 * @route POST /api/admin/brands
 */
exports.createBrand = async (req, res, next) => {
  try {
    const { name, description, image, website, isActive } = req.body;

    // Check if brand already exists
    const existingBrand = await Brand.findOne({ 
      name: { $regex: new RegExp(`^${name}$`, 'i') }
    });

    if (existingBrand) {
      throw new ApiError('Brand with this name already exists', 400);
    }

    // Generate unique brand ID
    const brandId = await generateBrandId();

    const brand = await Brand.create({
      brandId,
      name,
      description,
      image,
      website,
      isActive
    });

    res.status(201).json({
      success: true,
      data: { brand },
      message: 'Brand created successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update brand
 * @route PUT /api/admin/brands/:id
 */
exports.updateBrand = async (req, res, next) => {
  try {
    const { name, description, image, website, isActive } = req.body;

    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Check if name is being changed and if it conflicts with another brand
    if (name && name !== brand.name) {
      const existingBrand = await Brand.findOne({
        name: { $regex: new RegExp(`^${name}$`, 'i') },
        _id: { $ne: req.params.id }
      });

      if (existingBrand) {
        throw new ApiError('Brand with this name already exists', 400);
      }
    }

    // Update fields
    if (name !== undefined) brand.name = name;
    if (description !== undefined) brand.description = description;
    if (image !== undefined) brand.image = image;
    if (website !== undefined) brand.website = website;
    if (isActive !== undefined) brand.isActive = isActive;

    await brand.save();

    res.json({
      success: true,
      data: { brand },
      message: 'Brand updated successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Delete brand
 * @route DELETE /api/admin/brands/:id
 */
exports.deleteBrand = async (req, res, next) => {
  try {
    const brand = await Brand.findById(req.params.id);
    
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Check if brand is used by any products
    const productsUsingBrand = await Product.countDocuments({ brand: brand.name });

    if (productsUsingBrand > 0) {
      throw new ApiError(
        `Cannot delete brand. ${productsUsingBrand} product(s) are using this brand. Please reassign or remove the brand from products first.`,
        400
      );
    }

    await Brand.findByIdAndDelete(req.params.id);

    res.json({
      success: true,
      message: 'Brand deleted successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update product counts for all brands
 * @route POST /api/admin/brands/sync-counts
 */
exports.syncBrandCounts = async (req, res, next) => {
  try {
    const brands = await Brand.find({});
    
    for (const brand of brands) {
      const count = await Product.countDocuments({ 
        brand: brand.name,
        isActive: true 
      });
      brand.productCount = count;
      await brand.save();
    }

    res.json({
      success: true,
      message: 'Brand product counts synchronized successfully'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand statistics
 * @route GET /api/admin/brands/stats
 */
exports.getBrandStats = async (req, res, next) => {
  try {
    const [totalBrands, activeBrands, brandsWithProducts] = await Promise.all([
      Brand.countDocuments(),
      Brand.countDocuments({ isActive: true }),
      Brand.countDocuments({ productCount: { $gt: 0 } })
    ]);

    // Get top 10 brands by product count
    const topBrands = await Brand.find({ productCount: { $gt: 0 } })
      .sort({ productCount: -1 })
      .limit(10)
      .select('name productCount');

    res.json({
      success: true,
      data: {
        totalBrands,
        activeBrands,
        brandsWithProducts,
        topBrands
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand products
 * @route GET /api/admin/brands/:id/products
 */
exports.getBrandProducts = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Verify brand exists
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Get all products for this brand
    const products = await Product.find({ brand: brand.name })
      .populate('category', 'name')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      data: {
        products,
        count: products.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get brand analytics
 * @route GET /api/admin/brands/:id/analytics
 */
exports.getBrandAnalytics = async (req, res, next) => {
  try {
    const Order = require('../models/Order');
    const { id } = req.params;

    // Verify brand exists
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Get all products for this brand
    const products = await Product.find({ brand: brand.name });
    const productIds = products.map(p => p._id);

    // Calculate analytics
    const totalProducts = products.length;
    
    // Get orders containing brand products
    const orders = await Order.find({
      'items.product': { $in: productIds },
      status: { $ne: 'cancelled' }
    });

    // Calculate total revenue and orders
    let totalRevenue = 0;
    let totalOrders = 0;
    const orderSet = new Set();

    orders.forEach(order => {
      if (!orderSet.has(order._id.toString())) {
        orderSet.add(order._id.toString());
        totalOrders++;
      }
      
      order.items.forEach(item => {
        if (productIds.some(pid => pid.toString() === item.product.toString())) {
          totalRevenue += item.price * item.quantity;
        }
      });
    });

    // Calculate average price
    const avgPrice = products.length > 0
      ? products.reduce((sum, p) => sum + p.price, 0) / products.length
      : 0;

    // Get top selling products
    const topProducts = await Product.find({ brand: brand.name })
      .sort({ 'stats.orderCount': -1 })
      .limit(5)
      .select('name price stats.orderCount image');

    res.json({
      success: true,
      data: {
        totalProducts,
        totalRevenue: Math.round(totalRevenue),
        totalOrders,
        avgPrice: Math.round(avgPrice),
        topProducts
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Assign products to brand
 * @route POST /api/admin/brands/:id/assign-products
 */
exports.assignProductsToBrand = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { productIds } = req.body;

    if (!productIds || !Array.isArray(productIds) || productIds.length === 0) {
      throw new ApiError('Please provide an array of product IDs', 400);
    }

    // Verify brand exists
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Update products with brand name
    const result = await Product.updateMany(
      { _id: { $in: productIds } },
      { $set: { brand: brand.name } }
    );

    // Update brand product count
    const count = await Product.countDocuments({ brand: brand.name });
    brand.productCount = count;
    await brand.save();

    res.json({
      success: true,
      message: `${result.modifiedCount} product(s) assigned to ${brand.name}`,
      data: {
        assignedCount: result.modifiedCount
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Remove product from brand
 * @route DELETE /api/admin/brands/:id/remove-product/:productId
 */
exports.removeProductFromBrand = async (req, res, next) => {
  try {
    const { id, productId } = req.params;

    // Verify brand exists
    const brand = await Brand.findById(id);
    if (!brand) {
      throw new ApiError('Brand not found', 404);
    }

    // Remove brand from product
    const product = await Product.findById(productId);
    if (!product) {
      throw new ApiError('Product not found', 404);
    }

    product.brand = null;
    await product.save();

    // Update brand product count
    const count = await Product.countDocuments({ brand: brand.name });
    brand.productCount = count;
    await brand.save();

    res.json({
      success: true,
      message: 'Product removed from brand'
    });
  } catch (error) {
    next(error);
  }
};

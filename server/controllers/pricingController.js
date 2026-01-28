const Product = require('../models/Product');
const Brand = require('../models/Brand');
const Category = require('../models/Category');
const PriceChangeHistory = require('../models/PriceChangeHistory');
const {
  calculateNewPrice,
  validatePriceChange,
  previewBulkPriceChange,
  calculateAnalytics,
  checkConflict,
  roundPrice
} = require('../utils/priceCalculator');
const { getIO } = require('../socket');

/**
 * Update single product price
 * PUT /api/admin/pricing/product/:id
 */
exports.updateProductPrice = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, value, direction, reason } = req.body;

    // Get product
    const product = await Product.findById(id);
    if (!product) {
      return res.status(404).json({
        success: false,
        error: { message: 'Product not found' }
      });
    }

    const oldPrice = product.pricing?.salePrice || product.pricing?.basePrice || 0;

    // Validate price change
    const validation = validatePriceChange(oldPrice, changeType, value, direction);
    if (!validation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          message: 'Invalid price change',
          details: validation.errors
        }
      });
    }

    // Calculate new price and round to whole number
    const newPrice = roundPrice(calculateNewPrice(oldPrice, changeType, value, direction));

    // Update product pricing
    if (!product.pricing) {
      product.pricing = {};
    }
    
    // Update sale price and adjust base price to be higher
    // Sale price must be less than base price, so we set base price slightly higher
    product.pricing.salePrice = newPrice;
    // Add a small margin (2-10% random) to basePrice to maintain validation
    const margin = 1 + (Math.random() * 0.08 + 0.02); // Random between 2-10%
    product.pricing.basePrice = roundPrice(Math.max(newPrice * margin, newPrice + 1));
    
    // Add to price history in product
    if (!product.priceHistory) {
      product.priceHistory = [];
    }
    product.priceHistory.push({
      price: newPrice,
      changedAt: new Date(),
      changedBy: req.user._id,
      changeReason: reason || `${direction} by ${changeType === 'percentage' ? value + '%' : '$' + value}`
    });

    await product.save();

    // Create history record
    const historyRecord = await PriceChangeHistory.create({
      type: 'individual',
      targetId: product._id,
      targetModel: 'Product',
      targetName: product.name,
      changeType,
      changeValue: value,
      direction,
      affectedProducts: [{
        productId: product._id,
        productName: typeof product.name === 'string' ? product.name : (product.name?.en || product.name?.ur || 'Product'),
        oldPrice,
        newPrice,
        changeAmount: newPrice - oldPrice,
        changePercentage: ((newPrice - oldPrice) / oldPrice) * 100
      }],
      totalProductsAffected: 1,
      changedBy: req.user._id,
      status: 'completed',
      executedAt: new Date()
    });

    // Emit WebSocket event to admins
    const io = getIO();
    io.to('admin:all').emit('product:price-updated', {
      productId: product._id,
      productName: typeof product.name === 'string' ? product.name : (product.name?.en || product.name?.ur || 'Product'),
      oldPrice,
      newPrice,
      changeAmount: newPrice - oldPrice,
      changePercentage: ((newPrice - oldPrice) / oldPrice) * 100,
      updatedBy: {
        userId: req.user._id,
        userName: req.user.name
      }
    });
    
    // Emit to all connected users for real-time customer updates
    io.emit('product:price-changed', {
      productId: product._id,
      salePrice: newPrice,
      basePrice: product.pricing.basePrice
    });

    res.json({
      success: true,
      message: 'Product price updated successfully',
      data: {
        product: {
          _id: product._id,
          name: product.name,
          sku: product.sku,
          oldPrice,
          newPrice,
          changeAmount: newPrice - oldPrice,
          changePercentage: ((newPrice - oldPrice) / oldPrice) * 100
        },
        historyId: historyRecord._id,
        canUndo: historyRecord.isUndoable(),
        undoExpiresAt: historyRecord.undoExpiresAt
      }
    });

  } catch (error) {
    console.error('Error updating product price:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Preview brand price changes
 * POST /api/admin/pricing/brand/:id/preview
 */
exports.previewBrandPriceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, value, direction } = req.body;

    // Get brand
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        error: { message: 'Brand not found' }
      });
    }

    // Get all products in this brand (brand field in Product is the brand name, not ID)
    const products = await Product.find({ brand: brand.name, isActive: true });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active products found for this brand' }
      });
    }

    // Generate preview
    const { preview, summary } = previewBulkPriceChange(
      products,
      changeType,
      value,
      direction
    );

    res.json({
      success: true,
      data: {
        brand: {
          _id: brand._id,
          name: brand.name
        },
        preview,
        summary
      }
    });

  } catch (error) {
    console.error('Error previewing brand price change:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Apply brand price changes
 * POST /api/admin/pricing/brand/:id/apply
 */
exports.applyBrandPriceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, value, direction, reason } = req.body;

    // Get brand
    const brand = await Brand.findById(id);
    if (!brand) {
      return res.status(404).json({
        success: false,
        error: { message: 'Brand not found' }
      });
    }

    // Check for conflicts
    const conflict = await checkConflict(PriceChangeHistory, id, 'Brand');
    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Another price update is in progress for this brand',
          conflictOperation: conflict.conflictOperation
        }
      });
    }

    // Get all products (brand field in Product is the brand name, not ID)
    const products = await Product.find({ brand: brand.name, isActive: true });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active products found for this brand' }
      });
    }

    // Create history record (pending)
    const historyRecord = await PriceChangeHistory.create({
      type: 'brand',
      targetId: brand._id,
      targetModel: 'Brand',
      targetName: brand.name,
      changeType,
      changeValue: value,
      direction,
      totalProductsAffected: products.length,
      changedBy: req.user._id,
      status: 'pending'
    });

    // Return immediately with operation ID
    res.json({
      success: true,
      message: `Starting price update for ${products.length} products...`,
      data: {
        operationId: historyRecord._id,
        brand: {
          _id: brand._id,
          name: brand.name
        },
        totalProducts: products.length
      }
    });

    // Process in background
    processBulkPriceChange(historyRecord._id, products, changeType, value, direction, req.user);

  } catch (error) {
    console.error('Error applying brand price change:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Preview category price changes
 * POST /api/admin/pricing/category/:id/preview
 */
exports.previewCategoryPriceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, value, direction } = req.body;

    // Get category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' }
      });
    }

    // Get all products in this category
    const products = await Product.find({ category: id, isActive: true });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active products found for this category' }
      });
    }

    // Generate preview
    const { preview, summary } = previewBulkPriceChange(
      products,
      changeType,
      value,
      direction
    );

    res.json({
      success: true,
      data: {
        category: {
          _id: category._id,
          name: category.name
        },
        preview,
        summary
      }
    });

  } catch (error) {
    console.error('Error previewing category price change:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Apply category price changes
 * POST /api/admin/pricing/category/:id/apply
 */
exports.applyCategoryPriceChange = async (req, res) => {
  try {
    const { id } = req.params;
    const { changeType, value, direction, reason } = req.body;

    // Get category
    const category = await Category.findById(id);
    if (!category) {
      return res.status(404).json({
        success: false,
        error: { message: 'Category not found' }
      });
    }

    // Check for conflicts
    const conflict = await checkConflict(PriceChangeHistory, id, 'Category');
    if (conflict.hasConflict) {
      return res.status(409).json({
        success: false,
        error: {
          message: 'Another price update is in progress for this category',
          conflictOperation: conflict.conflictOperation
        }
      });
    }

    // Get all products
    const products = await Product.find({ category: id, isActive: true });

    if (products.length === 0) {
      return res.status(400).json({
        success: false,
        error: { message: 'No active products found for this category' }
      });
    }

    // Create history record (pending)
    const historyRecord = await PriceChangeHistory.create({
      type: 'category',
      targetId: category._id,
      targetModel: 'Category',
      targetName: category.name,
      changeType,
      changeValue: value,
      direction,
      totalProductsAffected: products.length,
      changedBy: req.user._id,
      status: 'pending'
    });

    // Return immediately with operation ID
    res.json({
      success: true,
      message: `Starting price update for ${products.length} products...`,
      data: {
        operationId: historyRecord._id,
        category: {
          _id: category._id,
          name: category.name
        },
        totalProducts: products.length
      }
    });

    // Process in background
    processBulkPriceChange(historyRecord._id, products, changeType, value, direction, req.user);

  } catch (error) {
    console.error('Error applying category price change:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Background processor for bulk price changes
 */
async function processBulkPriceChange(operationId, products, changeType, value, direction, user) {
  const io = getIO();
  let processedCount = 0;
  let failedCount = 0;
  const affectedProducts = [];

  try {
    // Update status to in_progress
    await PriceChangeHistory.findByIdAndUpdate(operationId, {
      status: 'in_progress'
    });

    // Emit start event
    io.to('admin:all').emit('pricing:bulk-start', {
      operationId,
      totalProducts: products.length,
      startedBy: {
        userId: user._id,
        userName: user.name
      }
    });

    // Process each product
    for (const product of products) {
      try {
        const oldPrice = product.pricing?.salePrice || product.pricing?.basePrice || 0;
        const newPrice = roundPrice(calculateNewPrice(oldPrice, changeType, value, direction));

        // Update product pricing
        if (!product.pricing) {
          product.pricing = {};
        }
        
        // Update sale price and adjust base price to be higher
        product.pricing.salePrice = newPrice;
        // Add a small margin (2-10% random) to basePrice to maintain validation
        const margin = 1 + (Math.random() * 0.08 + 0.02); // Random between 2-10%
        product.pricing.basePrice = roundPrice(Math.max(newPrice * margin, newPrice + 1));
        
        if (!product.priceHistory) {
          product.priceHistory = [];
        }
        product.priceHistory.push({
          price: newPrice,
          changedAt: new Date(),
          changedBy: user._id,
          changeReason: `Bulk ${direction} by ${changeType === 'percentage' ? value + '%' : '$' + value}`
        });

        await product.save();

        affectedProducts.push({
          productId: product._id,
          productName: typeof product.name === 'string' ? product.name : (product.name?.en || product.name?.ur || 'Product'),
          oldPrice,
          newPrice,
          changeAmount: newPrice - oldPrice,
          changePercentage: ((newPrice - oldPrice) / oldPrice) * 100
        });

        processedCount++;

        // Emit progress update for each product (or every 5 for large batches)
        const shouldEmit = products.length <= 10 || processedCount % 5 === 0 || processedCount === products.length;
        if (shouldEmit) {
          io.to('admin:all').emit('pricing:bulk-progress', {
            operationId,
            processed: processedCount,
            total: products.length,
            percentage: Math.round((processedCount / products.length) * 100),
            currentProduct: typeof product.name === 'string' ? product.name : (product.name?.en || product.name?.ur || 'Product')
          });
        }

      } catch (error) {
        console.error(`Error updating product ${product._id}:`, error);
        failedCount++;
      }
    }

    // Calculate analytics
    const analytics = calculateAnalytics(affectedProducts);

    // Update history record
    await PriceChangeHistory.findByIdAndUpdate(operationId, {
      status: 'completed',
      affectedProducts,
      executedAt: new Date(),
      analytics
    });

    // Emit product updates to all users
    affectedProducts.forEach(item => {
      io.emit('product:price-changed', {
        productId: item.productId,
        salePrice: roundPrice(item.newPrice),
        basePrice: roundPrice(item.newPrice * (1 + (Math.random() * 0.08 + 0.02))) // Estimated base price
      });
    });
    
    // Emit completion event
    io.to('admin:all').emit('pricing:bulk-complete', {
      operationId,
      totalUpdated: processedCount,
      totalFailed: failedCount,
      analytics,
      summary: {
        message: `Successfully updated ${processedCount} of ${products.length} products`,
        canUndo: true,
        undoExpiresIn: 15 * 60 // 15 minutes in seconds
      }
    });

    // Send notification to all admins
    io.to('admin:all').emit('notification:price-change', {
      type: 'bulk_price_change',
      message: `${user.name} updated ${processedCount} products`,
      timestamp: Date.now(),
      operationId
    });

  } catch (error) {
    console.error('Error in bulk price change processor:', error);
    
    await PriceChangeHistory.findByIdAndUpdate(operationId, {
      status: 'failed',
      errorMessage: error.message
    });

    io.to('admin:all').emit('pricing:bulk-failed', {
      operationId,
      error: error.message
    });
  }
}

/**
 * Get operation status
 * GET /api/admin/pricing/operation/:id
 */
exports.getOperationStatus = async (req, res) => {
  try {
    const { id } = req.params;

    const operation = await PriceChangeHistory.findById(id)
      .populate('changedBy', 'name email')
      .populate('undoneBy', 'name email');

    if (!operation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Operation not found' }
      });
    }

    res.json({
      success: true,
      data: {
        operation,
        canUndo: operation.isUndoable(),
        undoTimeRemaining: operation.undoTimeRemaining()
      }
    });

  } catch (error) {
    console.error('Error getting operation status:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Undo price change
 * POST /api/admin/pricing/operation/:id/undo
 */
exports.undoPriceChange = async (req, res) => {
  try {
    const { id } = req.params;

    const operation = await PriceChangeHistory.findById(id);

    if (!operation) {
      return res.status(404).json({
        success: false,
        error: { message: 'Operation not found' }
      });
    }

    if (!operation.isUndoable()) {
      return res.status(400).json({
        success: false,
        error: { message: 'Operation cannot be undone (expired or already undone)' }
      });
    }

    // Revert all product prices
    for (const productData of operation.affectedProducts) {
      const product = await Product.findById(productData.productId);
      if (product) {
        if (!product.pricing) {
          product.pricing = {};
        }
        // Restore sale price and adjust base price
        product.pricing.salePrice = roundPrice(productData.oldPrice);
        // Add a small margin (2-10% random) to basePrice to maintain validation
        const margin = 1 + (Math.random() * 0.08 + 0.02); // Random between 2-10%
        product.pricing.basePrice = roundPrice(Math.max(productData.oldPrice * margin, productData.oldPrice + 1));
        
        if (!product.priceHistory) {
          product.priceHistory = [];
        }
        product.priceHistory.push({
          price: productData.oldPrice,
          changedAt: new Date(),
          changedBy: req.user._id,
          changeReason: 'Undo bulk price change'
        });

        await product.save();
      }
    }

    // Update operation record
    operation.status = 'undone';
    operation.undoneAt = new Date();
    operation.undoneBy = req.user._id;
    operation.canUndo = false;
    await operation.save();

    // Emit WebSocket event
    const io = getIO();
    io.to('admin:all').emit('pricing:undone', {
      operationId: id,
      undoneBy: {
        userId: req.user._id,
        userName: req.user.name
      },
      productsReverted: operation.affectedProducts.length
    });

    res.json({
      success: true,
      message: `Successfully reverted ${operation.affectedProducts.length} products to original prices`,
      data: {
        operation
      }
    });

  } catch (error) {
    console.error('Error undoing price change:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Get price change history
 * GET /api/admin/pricing/history
 */
exports.getPriceChangeHistory = async (req, res) => {
  try {
    const { 
      type, 
      startDate, 
      endDate, 
      status,
      page = 1, 
      limit = 20 
    } = req.query;

    const query = {};

    if (type && type !== 'all') {
      query.type = type;
    }

    if (status) {
      query.status = status;
    }

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [history, total] = await Promise.all([
      PriceChangeHistory.find(query)
        .populate('changedBy', 'name email')
        .populate('undoneBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      PriceChangeHistory.countDocuments(query)
    ]);

    // Add computed fields to each history item
    const historyWithUndoInfo = history.map(item => ({
      ...item.toObject(),
      canUndo: item.isUndoable(),
      undoTimeRemaining: item.undoTimeRemaining()
    }));

    res.json({
      success: true,
      data: {
        history: historyWithUndoInfo,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });

  } catch (error) {
    console.error('Error getting price change history:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

/**
 * Get pricing statistics
 * GET /api/admin/pricing/stats
 */
exports.getPricingStats = async (req, res) => {
  try {
    const now = new Date();
    const last24Hours = new Date(now - 24 * 60 * 60 * 1000);
    const last7Days = new Date(now - 7 * 24 * 60 * 60 * 1000);

    const [
      stats24h,
      stats7d,
      totalOperations,
      recentOperations
    ] = await Promise.all([
      PriceChangeHistory.aggregate([
        { $match: { createdAt: { $gte: last24Hours }, status: 'completed' } },
        {
          $group: {
            _id: null,
            changes: { $sum: 1 },
            productsAffected: { $sum: '$totalProductsAffected' },
            totalImpact: { $sum: '$analytics.totalRevenueImpact' }
          }
        }
      ]),
      PriceChangeHistory.aggregate([
        { $match: { createdAt: { $gte: last7Days }, status: 'completed' } },
        {
          $group: {
            _id: null,
            changes: { $sum: 1 },
            productsAffected: { $sum: '$totalProductsAffected' },
            totalImpact: { $sum: '$analytics.totalRevenueImpact' }
          }
        }
      ]),
      PriceChangeHistory.countDocuments({ status: 'completed' }),
      PriceChangeHistory.find({ status: 'completed' })
        .populate('changedBy', 'name')
        .sort({ createdAt: -1 })
        .limit(5)
        .select('type targetName totalProductsAffected createdAt changedBy')
    ]);

    res.json({
      success: true,
      data: {
        last24Hours: stats24h[0] || { changes: 0, productsAffected: 0, totalImpact: 0 },
        last7Days: stats7d[0] || { changes: 0, productsAffected: 0, totalImpact: 0 },
        totalOperations,
        recentOperations
      }
    });

  } catch (error) {
    console.error('Error getting pricing stats:', error);
    res.status(500).json({
      success: false,
      error: { message: error.message }
    });
  }
};

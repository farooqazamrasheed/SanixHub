const Product = require('../models/Product');
const Inventory = require('../models/Inventory');
const mongoose = require('mongoose');
const { sendLowStockAlert } = require('./emailController');

/**
 * @desc    Bulk update inventory for multiple products
 * @route   POST /api/admin/inventory/bulk-update
 * @access  Private (Admin only)
 */
exports.bulkUpdateInventory = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { updates, reason } = req.body;
    // updates: [{ productId, stock, lowStockThreshold }]

    if (!Array.isArray(updates) || updates.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_INPUT',
          message: 'Updates array is required'
        }
      });
    }

    const results = [];
    const errors = [];
    const io = req.app.get('io'); // Get Socket.IO instance
    let completedCount = 0;

    for (const update of updates) {
      try {
        const { productId, stock, lowStockThreshold } = update;

        // Find or create inventory
        let inventory = await Inventory.findOne({ product: productId }).session(session);
        const product = await Product.findById(productId).session(session);

        if (!product) {
          errors.push({ productId, error: 'Product not found' });
          continue;
        }

        if (!inventory) {
          inventory = new Inventory({
            product: productId,
            stock: {
              available: product.inventory?.stockQuantity || 0,
              reserved: 0,
              sold: 0
            },
            alerts: {
              lowStockEnabled: true,
              lowStockThreshold: product.lowStockThreshold || 10
            }
          });
        }

        // Update stock if provided
        if (stock !== undefined) {
          const oldStock = inventory.stock.available;
          const difference = stock - oldStock;

          inventory.stock.available = stock;
          inventory.transactions.push({
            type: difference > 0 ? 'restock' : 'adjustment',
            quantity: difference,
            reason: reason || `Bulk update from ${oldStock} to ${stock}`,
            performedBy: req.user._id,
            timestamp: new Date()
          });

          product.inventory.stockQuantity = stock;
        }

        // Update threshold if provided
        if (lowStockThreshold !== undefined) {
          inventory.alerts.lowStockThreshold = lowStockThreshold;
          // Update both root level and nested inventory object
          product.lowStockThreshold = lowStockThreshold;
          if (!product.inventory) {
            product.inventory = {};
          }
          product.inventory.lowStockThreshold = lowStockThreshold;
        }

        await inventory.save({ session });
        await product.save({ session });

        results.push({
          productId,
          productName: product.name.en,
          success: true,
          newStock: inventory.stock.available,
          newThreshold: inventory.alerts.lowStockThreshold
        });

        // Emit progress update
        completedCount++;
        if (io) {
          io.emit('inventory:bulk-progress', {
            total: updates.length,
            completed: completedCount,
            updated: results.length,
            failed: errors.length,
            currentProduct: product.name.en
          });
        }
      } catch (error) {
        errors.push({
          productId: update.productId,
          error: error.message
        });
      }
    }

    await session.commitTransaction();

    // Emit completion event with all updated products
    if (io && results.length > 0) {
      io.emit('inventory:bulk-complete', {
        total: updates.length,
        updated: results.length,
        failed: errors.length,
        results,
        timestamp: new Date()
      });

      // Emit individual product updates
      results.forEach(result => {
        io.emit('inventory:product-updated', {
          productId: result.productId,
          productName: result.productName,
          stock: result.newStock,
          lowStockThreshold: result.newThreshold,
          timestamp: new Date()
        });
      });
    }

    res.status(200).json({
      success: true,
      data: {
        updated: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get inventory history/transactions
 * @route   GET /api/admin/inventory/:productId/history
 * @access  Private (Admin only)
 */
exports.getInventoryHistory = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { page = 1, limit = 50 } = req.query;

    const inventory = await Inventory.findOne({ product: productId })
      .populate('product', 'name sku images')
      .populate('transactions.performedBy', 'profile.name email');

    if (!inventory) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVENTORY_NOT_FOUND',
          message: 'Inventory not found for this product'
        }
      });
    }

    // Sort transactions by timestamp (newest first)
    const transactions = inventory.transactions
      .sort((a, b) => b.timestamp - a.timestamp)
      .slice((page - 1) * limit, page * limit);

    res.status(200).json({
      success: true,
      data: {
        product: inventory.product,
        currentStock: inventory.stock,
        alerts: inventory.alerts,
        transactions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total: inventory.transactions.length,
          pages: Math.ceil(inventory.transactions.length / limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Generate inventory report
 * @route   GET /api/admin/inventory/reports
 * @access  Private (Admin only)
 */
exports.generateInventoryReport = async (req, res, next) => {
  try {
    const { startDate, endDate } = req.query;

    // Get all inventory data with complete product information
    const inventories = await Inventory.find()
      .populate({
        path: 'product',
        select: 'name sku category brand pricing size productId _id',
        populate: [
          { path: 'category', select: 'name' }
        ]
      })
      .lean();

    // Calculate statistics
    const totalProducts = inventories.length;
    const outOfStock = inventories.filter(inv => inv.stock.available === 0).length;
    const lowStock = inventories.filter(inv => 
      inv.stock.available > 0 && 
      inv.stock.available <= inv.alerts.lowStockThreshold
    ).length;
    const inStock = totalProducts - outOfStock - lowStock;

    // Calculate total value
    let totalValue = 0;
    inventories.forEach(inv => {
      if (inv.product && inv.product.pricing) {
        const price = inv.product.pricing.salePrice || inv.product.pricing.basePrice;
        totalValue += price * inv.stock.available;
      }
    });

    // Get transactions in date range if provided
    let recentTransactions = [];
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      inventories.forEach(inv => {
        const filtered = inv.transactions.filter(t => 
          t.timestamp >= start && t.timestamp <= end
        );
        recentTransactions.push(...filtered);
      });
    } else {
      // If no date range, include ALL transactions
      inventories.forEach(inv => {
        if (inv.transactions && inv.transactions.length > 0) {
          recentTransactions.push(...inv.transactions);
        }
      });
    }

    // Group transactions by type
    const transactionsByType = {
      restock: 0,
      sale: 0,
      adjustment: 0,
      return: 0
    };

    recentTransactions.forEach(t => {
      if (transactionsByType[t.type] !== undefined) {
        transactionsByType[t.type]++;
      }
    });

    res.status(200).json({
      success: true,
      data: {
        summary: {
          totalProducts,
          inStock,
          lowStock,
          outOfStock,
          totalValue: Math.round(totalValue),
          stockPercentage: {
            inStock: Math.round((inStock / totalProducts) * 100),
            lowStock: Math.round((lowStock / totalProducts) * 100),
            outOfStock: Math.round((outOfStock / totalProducts) * 100)
          }
        },
        transactions: {
          period: startDate && endDate ? { startDate, endDate } : 'all-time',
          total: recentTransactions.length,
          byType: transactionsByType
        },
        topProducts: inventories
          .sort((a, b) => b.stock.sold - a.stock.sold)
          .slice(0, 10)
          .map(inv => ({
            productId: inv.product?.productId || 'N/A', // Auto-generated product ID (PRD-YYYYMMDD-XXXX)
            name: inv.product?.name?.en,
            sku: inv.product?.sku,
            brand: inv.product?.brand || 'N/A',
            category: inv.product?.category?.name?.en || 'Uncategorized',
            size: inv.product?.size || 'N/A',
            sold: inv.stock.sold,
            available: inv.stock.available,
            price: inv.product?.pricing?.salePrice || inv.product?.pricing?.basePrice || 0
          }))
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Export inventory to CSV/Excel/PDF
 * @route   GET /api/admin/inventory/export
 * @access  Private (Admin only)
 */
exports.exportInventory = async (req, res, next) => {
  try {
    const { format = 'csv', category, brand, status, lowStock } = req.query;
    const { generateCSVExport, generateExcelExport, generatePDFExport } = require('../utils/exportUtils');

    // Build filter query
    let productFilter = {};
    if (category) productFilter.category = category;
    
    // Handle brand filter - brand is stored as string (name) in Product model
    if (brand) {
      const Brand = require('../models/Brand');
      const brandDoc = await Brand.findById(brand).lean();
      if (brandDoc) {
        productFilter.brand = brandDoc.name; // Match by brand name, not ObjectId
      }
    }

    // Get products matching filter
    let productIds = null;
    if (Object.keys(productFilter).length > 0) {
      const Product = require('../models/Product');
      const products = await Product.find(productFilter).select('_id').lean();
      productIds = products.map(p => p._id);
    }

    // Build inventory filter
    let inventoryFilter = {};
    if (productIds) {
      inventoryFilter.product = { $in: productIds };
    }

    // Filter by stock status
    if (status === 'out-of-stock') {
      inventoryFilter['stock.available'] = 0;
    } else if (status === 'low-stock' || lowStock === 'true') {
      // Low stock items (available > 0 and available <= threshold)
      inventoryFilter.$expr = {
        $and: [
          { $gt: ['$stock.available', 0] },
          { $lte: ['$stock.available', '$alerts.lowStockThreshold'] }
        ]
      };
    } else if (status === 'in-stock') {
      inventoryFilter.$expr = {
        $gt: ['$stock.available', '$alerts.lowStockThreshold']
      };
    }

    // Fetch inventory data
    const inventories = await Inventory.find(inventoryFilter)
      .populate({
        path: 'product',
        select: 'name sku pricing category brand',
        populate: [
          { path: 'category', select: 'name' }
          // Note: brand is stored as string in Product model, not a reference
        ]
      })
      .lean();

    if (!inventories || inventories.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NO_DATA',
          message: 'No inventory data found matching the filters'
        }
      });
    }

    // Generate export based on format
    const timestamp = Date.now();
    const filename = `inventory-export-${timestamp}`;

    switch (format.toLowerCase()) {
      case 'excel':
      case 'xlsx':
        const excelBuffer = await generateExcelExport(inventories);
        res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.xlsx`);
        res.send(excelBuffer);
        break;

      case 'pdf':
        const pdfBuffer = await generatePDFExport(inventories);
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.pdf`);
        res.send(pdfBuffer);
        break;

      case 'csv':
      default:
        const csvContent = generateCSVExport(inventories);
        res.setHeader('Content-Type', 'text/csv');
        res.setHeader('Content-Disposition', `attachment; filename=${filename}.csv`);
        res.send(csvContent);
        break;
    }
  } catch (error) {
    next(error);
  }
};

// Keep old endpoint for backwards compatibility
exports.exportInventoryCSV = async (req, res, next) => {
  req.query.format = 'csv';
  return exports.exportInventory(req, res, next);
};

/**
 * @desc    Import inventory from CSV
 * @route   POST /api/admin/inventory/import/csv
 * @access  Private (Admin only)
 */
exports.importInventoryCSV = async (req, res, next) => {
  const session = await mongoose.startSession();
  session.startTransaction();

  try {
    const { csvData } = req.body;
    // csvData should be array of objects: [{ sku, stock, lowStockThreshold }]

    if (!Array.isArray(csvData) || csvData.length === 0) {
      await session.abortTransaction();
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'CSV data is required'
        }
      });
    }

    const results = [];
    const errors = [];
    const io = req.app.get('io'); // Get Socket.IO instance
    let processedCount = 0;

    for (const row of csvData) {
      try {
        const { sku, stock, lowStockThreshold } = row;

        if (!sku) {
          errors.push({ row, error: 'SKU is required' });
          processedCount++;
          continue;
        }

        // Find product by SKU
        const product = await Product.findOne({ sku }).session(session);
        if (!product) {
          errors.push({ sku, error: 'Product not found' });
          processedCount++;
          
          // Emit progress update
          if (io) {
            io.to('inventory:all').emit('inventory:import-progress', {
              total: csvData.length,
              processed: processedCount,
              imported: results.length,
              failed: errors.length,
              currentSku: sku,
              status: 'error'
            });
          }
          continue;
        }

        // Find or create inventory
        let inventory = await Inventory.findOne({ product: product._id }).session(session);
        if (!inventory) {
          inventory = new Inventory({
            product: product._id,
            stock: { available: 0, reserved: 0, sold: 0 },
            alerts: { lowStockEnabled: true, lowStockThreshold: 10 }
          });
        }

        // Update stock
        if (stock !== undefined && stock !== '') {
          const newStock = parseInt(stock);
          const oldStock = inventory.stock.available;
          const difference = newStock - oldStock;

          inventory.stock.available = newStock;
          inventory.transactions.push({
            type: difference > 0 ? 'restock' : 'adjustment',
            quantity: difference,
            reason: `CSV import: ${oldStock} → ${newStock}`,
            performedBy: req.user._id,
            timestamp: new Date()
          });

          product.inventory.stockQuantity = newStock;
        }

        // Update threshold
        if (lowStockThreshold !== undefined && lowStockThreshold !== '') {
          inventory.alerts.lowStockThreshold = parseInt(lowStockThreshold);
          product.lowStockThreshold = parseInt(lowStockThreshold);
        }

        await inventory.save({ session });
        await product.save({ session });

        results.push({
          sku,
          productName: product.name.en,
          success: true
        });

        processedCount++;

        // Emit progress update
        if (io) {
          io.to('inventory:all').emit('inventory:import-progress', {
            total: csvData.length,
            processed: processedCount,
            imported: results.length,
            failed: errors.length,
            currentSku: sku,
            currentProduct: product.name.en,
            status: 'success'
          });
        }
      } catch (error) {
        errors.push({
          row,
          error: error.message
        });
        processedCount++;

        // Emit progress update for error
        if (io) {
          io.to('inventory:all').emit('inventory:import-progress', {
            total: csvData.length,
            processed: processedCount,
            imported: results.length,
            failed: errors.length,
            currentSku: row.sku || 'Unknown',
            status: 'error'
          });
        }
      }
    }

    await session.commitTransaction();

    // Emit completion event
    if (io) {
      io.to('inventory:all').emit('inventory:import-complete', {
        total: csvData.length,
        imported: results.length,
        failed: errors.length,
        results,
        errors,
        timestamp: new Date()
      });

      // Invalidate inventory queries
      io.to('inventory:all').emit('inventory:refresh-required');
    }

    res.status(200).json({
      success: true,
      data: {
        imported: results.length,
        failed: errors.length,
        results,
        errors
      }
    });
  } catch (error) {
    await session.abortTransaction();
    next(error);
  } finally {
    session.endSession();
  }
};

/**
 * @desc    Get dynamic CSV template with actual categories
 * @route   GET /api/admin/inventory/template
 * @access  Private (Admin only)
 */
exports.getImportTemplate = async (req, res, next) => {
  try {
    const Category = require('../models/Category');
    const Brand = require('../models/Brand');
    
    // Get sample categories and brands
    const categories = await Category.find().limit(3).select('name').lean();
    const brands = await Brand.find().limit(3).select('name').lean();

    const headers = [
      'SKU',
      'Product Name (EN)',
      'Product Name (UR)',
      'Category',
      'Brand',
      'Available Stock',
      'Reserved Stock',
      'Sold',
      'Low Stock Threshold',
      'Price',
      'Total Value',
      'Status'
    ];

    // Create sample rows with actual data
    const sampleRows = [
      [
        'MS-001',
        'Example Product',
        'مثال کی پروڈکٹ',
        categories[0]?.name?.en || 'Category',
        brands[0]?.name || 'Brand',
        '100',
        '0',
        '50',
        '10',
        '2500',
        '250000',
        'In Stock'
      ],
      [
        'MS-002',
        'Another Product',
        'ایک اور پروڈکٹ',
        categories[1]?.name?.en || 'Category',
        brands[1]?.name || 'Brand',
        '50',
        '0',
        '25',
        '10',
        '1500',
        '75000',
        'In Stock'
      ]
    ];

    const csvContent = [
      headers.join(','),
      ...sampleRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename=inventory-template.csv');
    res.send(csvContent);
  } catch (error) {
    next(error);
  }
};

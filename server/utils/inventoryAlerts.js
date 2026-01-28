const Inventory = require('../models/Inventory');
const Product = require('../models/Product');
const User = require('../models/User');
const { sendLowStockAlert } = require('../controllers/emailController');

/**
 * Check low stock and send alerts
 * This should be run as a scheduled job (cron)
 */
exports.checkLowStockAlerts = async () => {
  try {
    console.log('🔍 Checking for low stock products...');

    // Find low stock products
    const lowStockInventory = await Inventory.find({
      'alerts.lowStockEnabled': true,
      $expr: {
        $lte: ['$stock.available', '$alerts.lowStockThreshold']
      }
    }).populate('product', 'name sku images pricing');

    if (lowStockInventory.length === 0) {
      console.log('✅ No low stock products found');
      return { success: true, count: 0 };
    }

    console.log(`⚠️  Found ${lowStockInventory.length} low stock products`);

    // Transform to product format
    const lowStockProducts = lowStockInventory
      .map(inv => {
        if (!inv.product) return null;
        return {
          _id: inv.product._id,
          name: inv.product.name,
          sku: inv.product.sku,
          stock: inv.stock.available,
          lowStockThreshold: inv.alerts.lowStockThreshold,
          pricing: inv.product.pricing
        };
      })
      .filter(Boolean);

    // Check if we already sent an alert recently (within 24 hours)
    const needsAlert = [];
    const now = new Date();
    const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    for (const inv of lowStockInventory) {
      if (!inv.alerts.lastAlertSent || inv.alerts.lastAlertSent < oneDayAgo) {
        needsAlert.push(inv);
      }
    }

    if (needsAlert.length === 0) {
      console.log('ℹ️  All alerts were sent recently, skipping');
      return { success: true, count: 0, alreadySent: true };
    }

    // Get admin email
    const adminUser = await User.findOne({ role: 'superadmin' });
    const adminEmail = process.env.ADMIN_EMAIL || adminUser?.email;

    if (!adminEmail) {
      console.warn('⚠️  No admin email configured');
      return { success: false, error: 'No admin email' };
    }

    // Send email
    const emailSent = await sendLowStockAlert(lowStockProducts, adminEmail);

    if (emailSent) {
      // Update last alert sent timestamp
      for (const inv of needsAlert) {
        inv.alerts.lastAlertSent = new Date();
        await inv.save();
      }
      console.log(`✅ Low stock alert sent to ${adminEmail}`);
      return { success: true, count: needsAlert.length, emailSent: true };
    } else {
      console.warn('⚠️  Failed to send low stock alert email');
      return { success: false, error: 'Email failed' };
    }
  } catch (error) {
    console.error('❌ Error checking low stock alerts:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Manually trigger low stock alert
 */
exports.triggerLowStockAlert = async (req, res, next) => {
  try {
    const result = await exports.checkLowStockAlerts();
    
    res.status(200).json({
      success: true,
      data: result
    });
  } catch (error) {
    next(error);
  }
};

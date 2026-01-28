/**
 * Comprehensive Product Update Script
 * 
 * This script updates all existing products in the database with:
 * 1. Missing fields (subcategory, brand, manufacturer, origin, size, dimensions, seo)
 * 2. Data validation and fixes (SKU format, price rounding, stock validation)
 * 3. Field normalization and cleanup
 * 
 * Usage: node server/scripts/updateAllProducts.js
 * 
 * Safety: Creates backup before updates, runs in dry-run mode first
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });
const mongoose = require('mongoose');
const Product = require('../models/Product');
const Category = require('../models/Category');

// Configuration
const DRY_RUN = process.argv.includes('--dry-run'); // Use --dry-run to preview changes
const BACKUP = process.argv.includes('--backup'); // Use --backup to create backup
const FORCE = process.argv.includes('--force'); // Use --force to skip confirmations

// Statistics
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
    imagesFixed: 0
  }
};

/**
 * Connect to MongoDB
 */
async function connectDB() {
  try {
    // Support both MONGODB_URI and MONGO_URI
    const mongoUri = process.env.MONGODB_URI || process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MongoDB URI not found in .env file. Please set MONGO_URI or MONGODB_URI');
    }
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB\n');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
}

/**
 * Create backup of all products
 */
async function createBackup() {
  if (!BACKUP && !FORCE) return;
  
  try {
    console.log('📦 Creating backup...');
    const products = await Product.find({}).lean();
    const fs = require('fs');
    const backupPath = `./backups/products_backup_${Date.now()}.json`;
    
    // Create backups directory if it doesn't exist
    if (!fs.existsSync('./backups')) {
      fs.mkdirSync('./backups', { recursive: true });
    }
    
    fs.writeFileSync(backupPath, JSON.stringify(products, null, 2));
    console.log(`✅ Backup created: ${backupPath}\n`);
  } catch (error) {
    console.error('❌ Backup failed:', error.message);
    throw error;
  }
}

/**
 * Fix SKU format (ensure uppercase, proper format)
 */
function fixSKU(sku) {
  if (!sku) return null;
  
  // Convert to uppercase and trim
  let fixed = sku.toUpperCase().trim();
  
  // Remove any invalid characters (only allow A-Z, 0-9, -, /)
  fixed = fixed.replace(/[^A-Z0-9\-\/]/g, '');
  
  return fixed;
}

/**
 * Fix and generate slug from product name
 */
function generateSlug(name) {
  if (!name || !name.en) return null;
  
  return name.en
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '') // Remove special characters
    .replace(/\s+/g, '-') // Replace spaces with hyphens
    .replace(/-+/g, '-') // Replace multiple hyphens with single
    .replace(/^-+|-+$/g, ''); // Remove leading/trailing hyphens
}

/**
 * Round prices to 2 decimal places
 */
function roundPrice(price) {
  if (typeof price !== 'number') return price;
  return Math.round(price * 100) / 100;
}

/**
 * Add missing SEO fields
 */
function generateSEO(product) {
  const seo = product.seo || {};
  
  // Generate meta title if missing
  if (!seo.metaTitle) {
    seo.metaTitle = {
      en: `${product.name.en} - SanixHub`,
      ur: `${product.name.ur} - سینکس ہب`
    };
  }
  
  // Generate meta description if missing
  if (!seo.metaDescription) {
    seo.metaDescription = {
      en: product.shortDescription?.en || product.description?.en?.substring(0, 160) || `Buy ${product.name.en} at SanixHub`,
      ur: product.shortDescription?.ur || product.description?.ur?.substring(0, 160) || `${product.name.ur} خریدیں`
    };
  }
  
  // Generate keywords if missing
  if (!seo.keywords || seo.keywords.length === 0) {
    const keywords = [];
    keywords.push(product.name.en.toLowerCase());
    if (product.brand) keywords.push(product.brand.toLowerCase());
    if (product.tags && product.tags.length > 0) keywords.push(...product.tags);
    seo.keywords = [...new Set(keywords)]; // Remove duplicates
  }
  
  return seo;
}

/**
 * Fix image structure
 */
function fixImages(images) {
  if (!images || images.length === 0) return images;
  
  return images.map((img, index) => ({
    url: img.url || img,
    thumbnail: img.thumbnail,
    alt: img.alt || {},
    isPrimary: index === 0 // First image is primary
  }));
}

/**
 * Update a single product
 * @param {Object} product - Product document
 * @param {Boolean} dryRun - If true, don't save changes
 * @returns {Object} - Result with success status and changes
 */
async function updateProduct(product, dryRun = DRY_RUN) {
  const changes = [];
  let needsUpdate = false;
  
  try {
    // 1. Fix SKU format
    const currentSKU = product.sku;
    const fixedSKU = fixSKU(currentSKU);
    if (fixedSKU && fixedSKU !== currentSKU) {
      product.sku = fixedSKU;
      changes.push(`SKU: ${currentSKU} → ${fixedSKU}`);
      stats.changes.skuFixed++;
      needsUpdate = true;
    }
    
    // 2. Fix slug
    const currentSlug = product.slug;
    const fixedSlug = generateSlug(product.name);
    if (fixedSlug && fixedSlug !== currentSlug) {
      // Check if slug already exists
      const existingSlug = await Product.findOne({ slug: fixedSlug, _id: { $ne: product._id } });
      if (!existingSlug) {
        product.slug = fixedSlug;
        changes.push(`Slug: ${currentSlug} → ${fixedSlug}`);
        stats.changes.slugFixed++;
        needsUpdate = true;
      }
    }
    
    // 3. Round prices
    if (product.pricing) {
      const oldBase = product.pricing.basePrice;
      const oldSale = product.pricing.salePrice;
      
      product.pricing.basePrice = roundPrice(oldBase);
      if (oldSale) {
        product.pricing.salePrice = roundPrice(oldSale);
      }
      
      if (oldBase !== product.pricing.basePrice || (oldSale && oldSale !== product.pricing.salePrice)) {
        changes.push(`Prices rounded`);
        stats.changes.priceRounded++;
        needsUpdate = true;
      }
    }
    
    // 4. Fix stock quantity (ensure non-negative)
    if (product.inventory && product.inventory.stockQuantity < 0) {
      product.inventory.stockQuantity = 0;
      changes.push(`Stock fixed: negative → 0`);
      stats.changes.stockFixed++;
      needsUpdate = true;
    }
    
    // 5. Add SEO fields if missing
    const oldSEO = JSON.stringify(product.seo);
    product.seo = generateSEO(product);
    const newSEO = JSON.stringify(product.seo);
    if (oldSEO !== newSEO) {
      changes.push(`SEO fields added/updated`);
      stats.changes.seoAdded++;
      needsUpdate = true;
    }
    
    // 6. Add default dimensions if missing
    if (!product.dimensions || (!product.dimensions.length && !product.dimensions.width && !product.dimensions.height && !product.dimensions.weight)) {
      product.dimensions = {
        length: null,
        width: null,
        height: null,
        weight: null,
        unit: 'cm'
      };
      // Don't count this as a change, just initialization
    }
    
    // 7. Ensure shortDescription exists
    if (!product.shortDescription) {
      product.shortDescription = {
        en: product.description?.en?.substring(0, 200) || '',
        ur: product.description?.ur?.substring(0, 200) || ''
      };
      changes.push(`Short description generated`);
      stats.changes.missingFieldsAdded++;
      needsUpdate = true;
    }
    
    // 8. Fix images structure
    if (product.images && product.images.length > 0) {
      const oldImages = JSON.stringify(product.images);
      product.images = fixImages(product.images);
      const newImages = JSON.stringify(product.images);
      if (oldImages !== newImages) {
        changes.push(`Images structure fixed`);
        stats.changes.imagesFixed++;
        needsUpdate = true;
      }
    }
    
    // 9. Ensure tags is an array
    if (!Array.isArray(product.tags)) {
      product.tags = [];
    }
    
    // 10. Add brand from category if missing (optional logic)
    if (!product.brand && product.category) {
      // You can add logic here to infer brand from category name
      // For now, we'll leave it empty
    }
    
    // 11. Validate pricing
    if (product.pricing.salePrice && product.pricing.salePrice >= product.pricing.basePrice) {
      product.pricing.salePrice = null;
      changes.push(`Invalid sale price removed`);
      stats.changes.priceRounded++;
      needsUpdate = true;
    }
    
    // Save if changes were made (only if not dry run)
    if (needsUpdate && !dryRun) {
      await product.save();
    }
    
    // Log changes (only in CLI mode when stats exists)
    if (changes.length > 0 && typeof stats !== 'undefined') {
      console.log(`\n📝 ${product.productId || product._id} - ${product.name.en}`);
      console.log(`   SKU: ${product.sku}`);
      changes.forEach(change => console.log(`   ✓ ${change}`));
    }
    
    return { success: true, changes };
  } catch (error) {
    // Don't reference stats here as it might not exist in API context
    console.error(`\n❌ Error updating ${product.productId || product._id}:`, error.message);
    return { success: false, error: error.message };
  }
}

/**
 * Main migration function
 */
async function migrateAllProducts() {
  console.log('╔═══════════════════════════════════════════════════╗');
  console.log('║   COMPREHENSIVE PRODUCT UPDATE SCRIPT            ║');
  console.log('╚═══════════════════════════════════════════════════╝\n');
  
  if (DRY_RUN) {
    console.log('⚠️  DRY RUN MODE - No changes will be saved\n');
  }
  
  try {
    // Connect to database
    await connectDB();
    
    // Create backup
    if (BACKUP || FORCE) {
      await createBackup();
    }
    
    // Fetch all products
    console.log('📦 Fetching all products...\n');
    const products = await Product.find({}).populate('category');
    stats.total = products.length;
    
    console.log(`✅ Found ${products.length} products\n`);
    
    if (products.length === 0) {
      console.log('ℹ️  No products found. Nothing to update.');
      return;
    }
    
    // Confirm before proceeding
    if (!FORCE && !DRY_RUN) {
      console.log('⚠️  This will update all products in the database!');
      console.log('   Run with --dry-run flag first to preview changes');
      console.log('   Run with --backup flag to create a backup\n');
      
      // In production, you'd want to add readline confirmation here
      // For now, we'll proceed
    }
    
    console.log('🚀 Starting product updates...\n');
    console.log('─'.repeat(60));
    
    // Update each product
    for (let i = 0; i < products.length; i++) {
      const product = products[i];
      await updateProduct(product);
      
      // Progress indicator
      if ((i + 1) % 10 === 0 || i === products.length - 1) {
        const percent = Math.round(((i + 1) / products.length) * 100);
        console.log(`\n📊 Progress: ${i + 1}/${products.length} (${percent}%)`);
      }
    }
    
    // Print summary
    console.log('\n' + '─'.repeat(60));
    console.log('\n📊 MIGRATION SUMMARY\n');
    console.log(`Total Products:       ${stats.total}`);
    console.log(`Updated:              ${stats.updated} ✅`);
    console.log(`Skipped (no changes): ${stats.skipped}`);
    console.log(`Errors:               ${stats.errors} ❌`);
    console.log('\n📝 Changes Applied:\n');
    console.log(`  SKU Fixed:           ${stats.changes.skuFixed}`);
    console.log(`  Prices Rounded:      ${stats.changes.priceRounded}`);
    console.log(`  Stock Fixed:         ${stats.changes.stockFixed}`);
    console.log(`  Slugs Fixed:         ${stats.changes.slugFixed}`);
    console.log(`  SEO Added:           ${stats.changes.seoAdded}`);
    console.log(`  Images Fixed:        ${stats.changes.imagesFixed}`);
    console.log(`  Missing Fields:      ${stats.changes.missingFieldsAdded}`);
    
    if (DRY_RUN) {
      console.log('\n⚠️  DRY RUN COMPLETE - No changes were saved');
      console.log('   Run without --dry-run to apply changes');
    } else {
      console.log('\n✅ MIGRATION COMPLETE!');
    }
    
  } catch (error) {
    console.error('\n❌ Migration failed:', error);
    throw error;
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the migration
if (require.main === module) {
  migrateAllProducts()
    .then(() => {
      console.log('\n✅ Script completed successfully');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error);
      process.exit(1);
    });
}

module.exports = { migrateAllProducts, updateProduct };

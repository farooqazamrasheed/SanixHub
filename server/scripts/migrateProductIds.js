/**
 * Migration Script: Add Product IDs to Existing Products
 * 
 * This script assigns Product IDs to all products that don't have one yet.
 * It maintains chronological order based on createdAt date.
 * 
 * Usage:
 *   node server/scripts/migrateProductIds.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateProductIds = async () => {
  try {
    console.log('🚀 Starting Product ID migration...\n');

    // Find all products without productId
    const products = await Product.find({ 
      $or: [
        { productId: { $exists: false } },
        { productId: null },
        { productId: '' }
      ]
    }).sort('createdAt');

    if (products.length === 0) {
      console.log('✅ No products need migration. All products already have IDs!');
      process.exit(0);
    }

    console.log(`📦 Found ${products.length} products without Product IDs`);
    console.log('🔄 Assigning Product IDs based on creation date...\n');

    let migrated = 0;
    let failed = 0;
    const errors = [];

    for (const product of products) {
      try {
        // Get the date when product was created
        const createdDate = new Date(product.createdAt);
        const dateStr = createdDate.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Find last product with this date prefix
        const lastProduct = await Product.findOne({
          productId: new RegExp(`^PRD-${dateStr}-`)
        }).sort({ productId: -1 });
        
        let sequence = 1;
        if (lastProduct && lastProduct.productId) {
          const lastSequence = parseInt(lastProduct.productId.split('-')[2]);
          sequence = lastSequence + 1;
        }
        
        // Assign productId
        product.productId = `PRD-${dateStr}-${sequence.toString().padStart(4, '0')}`;
        await product.save({ validateBeforeSave: false });
        
        migrated++;
        console.log(`✅ ${migrated}/${products.length} - ${product.name.en}: ${product.productId}`);
      } catch (error) {
        failed++;
        errors.push({
          product: product.name.en,
          error: error.message
        });
        console.log(`❌ Failed: ${product.name.en} - ${error.message}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ product, error }) => {
        console.log(`   - ${product}: ${error}`);
      });
    }

    console.log('\n🎉 Migration completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
};

// Handle MongoDB connection
mongoose.connection.on('connected', () => {
  console.log('✅ Connected to MongoDB');
  migrateProductIds();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

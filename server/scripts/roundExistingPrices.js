/**
 * Script to round all existing product prices to whole numbers (PKR)
 * Run this once to update all existing products in the database
 */

const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

// Round price to nearest whole number
const roundPrice = (price) => {
  return Math.round(price);
};

const roundExistingPrices = async () => {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database\n');

    console.log('📊 Fetching all products...');
    const products = await Product.find({});
    console.log(`Found ${products.length} products\n`);

    let updatedCount = 0;
    let skippedCount = 0;

    console.log('🔄 Processing products...\n');

    for (const product of products) {
      let needsUpdate = false;
      const oldSalePrice = product.pricing?.salePrice;
      const oldBasePrice = product.pricing?.basePrice;

      // Round sale price
      if (product.pricing?.salePrice) {
        const roundedSalePrice = roundPrice(product.pricing.salePrice);
        if (product.pricing.salePrice !== roundedSalePrice) {
          product.pricing.salePrice = roundedSalePrice;
          needsUpdate = true;
        }
      }

      // Round base price
      if (product.pricing?.basePrice) {
        const roundedBasePrice = roundPrice(product.pricing.basePrice);
        if (product.pricing.basePrice !== roundedBasePrice) {
          product.pricing.basePrice = roundedBasePrice;
          needsUpdate = true;
        }
      }

      // Round compare at price if exists
      if (product.pricing?.compareAtPrice) {
        const roundedComparePrice = roundPrice(product.pricing.compareAtPrice);
        if (product.pricing.compareAtPrice !== roundedComparePrice) {
          product.pricing.compareAtPrice = roundedComparePrice;
          needsUpdate = true;
        }
      }

      if (needsUpdate) {
        await product.save();
        updatedCount++;
        console.log(`✅ Updated: ${product.name.en}`);
        console.log(`   Sale Price: ${oldSalePrice} → ${product.pricing.salePrice}`);
        console.log(`   Base Price: ${oldBasePrice} → ${product.pricing.basePrice}\n`);
      } else {
        skippedCount++;
      }
    }

    console.log('\n═══════════════════════════════════════');
    console.log('✅ Price rounding complete!');
    console.log('═══════════════════════════════════════');
    console.log(`📊 Total products: ${products.length}`);
    console.log(`✅ Updated: ${updatedCount}`);
    console.log(`⏭️  Skipped (already rounded): ${skippedCount}`);
    console.log('═══════════════════════════════════════\n');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Database connection closed');
    process.exit(0);
  }
};

// Run the script
roundExistingPrices();

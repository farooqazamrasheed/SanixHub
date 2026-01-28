/**
 * Migration script to add brandId to existing brands
 * Run this once after deploying the brandId feature
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Brand = require('../models/Brand');

/**
 * Generate unique brand ID in format: BRD-YYYYMMDD-XXXX
 */
async function generateBrandId(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const dateStr = `${year}${month}${day}`;
  const prefix = `BRD-${dateStr}`;

  // Find the latest brand with this date prefix
  const latestBrand = await Brand.findOne({
    brandId: { $regex: `^${prefix}` }
  }).sort({ brandId: -1 });

  let sequence = 1;
  if (latestBrand) {
    const lastSequence = parseInt(latestBrand.brandId.split('-')[2]);
    sequence = lastSequence + 1;
  }

  const sequenceStr = String(sequence).padStart(4, '0');
  return `${prefix}-${sequenceStr}`;
}

async function migrateBrands() {
  try {
    console.log('🔄 Connecting to database...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to database');

    // Find all brands without brandId
    const brandsWithoutId = await Brand.find({ 
      $or: [
        { brandId: { $exists: false } },
        { brandId: null },
        { brandId: '' }
      ]
    }).sort({ createdAt: 1 });

    console.log(`\n📊 Found ${brandsWithoutId.length} brands without brandId`);

    if (brandsWithoutId.length === 0) {
      console.log('✅ All brands already have brandId!');
      process.exit(0);
    }

    let updated = 0;
    let errors = 0;

    for (const brand of brandsWithoutId) {
      try {
        // Use the brand's creation date for the ID
        const createdDate = brand.createdAt || new Date();
        const brandId = await generateBrandId(createdDate);
        
        // Update the brand with the new ID
        brand.brandId = brandId;
        await brand.save();
        
        console.log(`✅ Updated: ${brand.name} -> ${brandId}`);
        updated++;
      } catch (error) {
        console.error(`❌ Error updating ${brand.name}:`, error.message);
        errors++;
      }
    }

    console.log('\n📈 Migration Summary:');
    console.log(`   ✅ Successfully updated: ${updated}`);
    console.log(`   ❌ Errors: ${errors}`);
    console.log(`   📊 Total processed: ${brandsWithoutId.length}`);

    process.exit(0);
  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  }
}

// Run migration
migrateBrands();

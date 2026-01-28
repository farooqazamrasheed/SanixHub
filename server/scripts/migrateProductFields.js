/**
 * Migration Script: Add Missing Fields to Existing Products
 * 
 * This script updates all existing products in the database to include
 * the newly added fields with default values.
 * 
 * Fields to be added:
 * - brand (empty string)
 * - manufacturer (empty string)
 * - origin (empty string)
 * - tags (empty array)
 * - dimensions (default object)
 * - shortDescription (default object with en/ur)
 * - seo (default object with en/ur)
 * 
 * Usage: node server/scripts/migrateProductFields.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Product = require('../models/Product');

const defaultValues = {
  brand: '',
  manufacturer: '',
  origin: '',
  tags: [],
  dimensions: {
    length: null,
    width: null,
    height: null,
    weight: null,
    unit: 'cm'
  },
  shortDescription: {
    en: '',
    ur: ''
  },
  seo: {
    metaTitle: { en: '', ur: '' },
    metaDescription: { en: '', ur: '' },
    keywords: []
  }
};

async function migrateProducts() {
  try {
    // Connect to MongoDB
    console.log('🔌 Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB\n');

    // Get all products
    const products = await Product.find({});
    console.log(`📦 Found ${products.length} products to migrate\n`);

    if (products.length === 0) {
      console.log('ℹ️  No products found. Nothing to migrate.');
      await mongoose.connection.close();
      return;
    }

    let updatedCount = 0;
    let skippedCount = 0;

    for (const product of products) {
      let needsUpdate = false;
      const updates = {};

      // Check and add missing fields
      if (!product.brand && product.brand !== '') {
        updates.brand = defaultValues.brand;
        needsUpdate = true;
      }

      if (!product.manufacturer && product.manufacturer !== '') {
        updates.manufacturer = defaultValues.manufacturer;
        needsUpdate = true;
      }

      if (!product.origin && product.origin !== '') {
        updates.origin = defaultValues.origin;
        needsUpdate = true;
      }

      if (!product.tags || product.tags.length === 0) {
        updates.tags = defaultValues.tags;
        needsUpdate = true;
      }

      if (!product.dimensions || Object.keys(product.dimensions).length === 0) {
        updates.dimensions = defaultValues.dimensions;
        needsUpdate = true;
      }

      if (!product.shortDescription || !product.shortDescription.en) {
        updates.shortDescription = defaultValues.shortDescription;
        needsUpdate = true;
      }

      if (!product.seo || !product.seo.metaTitle) {
        updates.seo = defaultValues.seo;
        needsUpdate = true;
      }

      if (needsUpdate) {
        await Product.updateOne(
          { _id: product._id },
          { $set: updates }
        );
        updatedCount++;
        console.log(`✓ Updated: ${product.name.en} (${product.sku})`);
      } else {
        skippedCount++;
        console.log(`⊘ Skipped: ${product.name.en} (${product.sku}) - Already has all fields`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`   Total Products: ${products.length}`);
    console.log(`   ✅ Updated: ${updatedCount}`);
    console.log(`   ⊘ Skipped: ${skippedCount}`);
    console.log('\n✨ Migration completed successfully!');

  } catch (error) {
    console.error('❌ Migration failed:', error);
    process.exit(1);
  } finally {
    await mongoose.connection.close();
    console.log('\n🔌 Database connection closed');
  }
}

// Run migration
migrateProducts();

/**
 * Migration Script: Add Category IDs to Existing Categories
 * 
 * This script assigns Category IDs to all categories that don't have one yet.
 * It maintains chronological order based on createdAt date.
 * 
 * Usage:
 *   node server/scripts/migrateCategoryIds.js
 */

require('dotenv').config();
const mongoose = require('mongoose');
const Category = require('../models/Category');

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

const migrateCategoryIds = async () => {
  try {
    console.log('🚀 Starting Category ID migration...\n');

    // Find all categories without categoryId
    const categories = await Category.find({ 
      $or: [
        { categoryId: { $exists: false } },
        { categoryId: null },
        { categoryId: '' }
      ]
    }).sort('createdAt');

    if (categories.length === 0) {
      console.log('✅ No categories need migration. All categories already have IDs!');
      process.exit(0);
    }

    console.log(`📁 Found ${categories.length} categories without Category IDs`);
    console.log('🔄 Assigning Category IDs based on creation date...\n');

    let migrated = 0;
    let failed = 0;
    const errors = [];

    for (const category of categories) {
      try {
        // Get the date when category was created
        const createdDate = new Date(category.createdAt);
        const dateStr = createdDate.toISOString().slice(0, 10).replace(/-/g, '');
        
        // Find last category with this date prefix
        const lastCategory = await Category.findOne({
          categoryId: new RegExp(`^CAT-${dateStr}-`)
        }).sort({ categoryId: -1 });
        
        let sequence = 1;
        if (lastCategory && lastCategory.categoryId) {
          const lastSequence = parseInt(lastCategory.categoryId.split('-')[2]);
          sequence = lastSequence + 1;
        }
        
        // Assign categoryId
        category.categoryId = `CAT-${dateStr}-${sequence.toString().padStart(4, '0')}`;
        await category.save({ validateBeforeSave: false });
        
        migrated++;
        console.log(`✅ ${migrated}/${categories.length} - ${category.name.en}: ${category.categoryId}`);
      } catch (error) {
        failed++;
        errors.push({
          category: category.name.en,
          error: error.message
        });
        console.log(`❌ Failed: ${category.name.en} - ${error.message}`);
      }
    }

    console.log('\n📊 Migration Summary:');
    console.log(`✅ Successfully migrated: ${migrated}`);
    console.log(`❌ Failed: ${failed}`);

    if (errors.length > 0) {
      console.log('\n⚠️  Errors encountered:');
      errors.forEach(({ category, error }) => {
        console.log(`   - ${category}: ${error}`);
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
  migrateCategoryIds();
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB connection error:', err);
  process.exit(1);
});

const mongoose = require('mongoose');
const Product = require('../models/Product');
require('dotenv').config();

async function generateProductIds() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Find all products without productId
    const productsWithoutId = await Product.find({
      $or: [
        { productId: { $exists: false } },
        { productId: null },
        { productId: '' }
      ]
    }).sort({ createdAt: 1 }); // Sort by creation date

    console.log(`\n📊 Found ${productsWithoutId.length} products without Product ID`);

    if (productsWithoutId.length === 0) {
      console.log('✅ All products already have Product IDs!');
      await mongoose.connection.close();
      process.exit(0);
    }

    console.log('\n🔄 Starting Product ID generation...\n');

    // Group products by creation date
    const productsByDate = {};
    productsWithoutId.forEach(product => {
      const date = new Date(product.createdAt);
      const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
      
      if (!productsByDate[dateStr]) {
        productsByDate[dateStr] = [];
      }
      productsByDate[dateStr].push(product);
    });

    let totalUpdated = 0;

    // Generate IDs for each date group
    for (const [dateStr, products] of Object.entries(productsByDate)) {
      console.log(`📅 Processing ${products.length} products from ${dateStr}`);
      
      // Check if any products already exist with this date prefix
      const existingProducts = await Product.find({
        productId: new RegExp(`^PRD-${dateStr}-`)
      }).sort({ productId: -1 });

      let startSequence = 1;
      if (existingProducts.length > 0) {
        const lastSequence = parseInt(existingProducts[0].productId.split('-')[2]);
        startSequence = lastSequence + 1;
        console.log(`   ℹ️  Starting from sequence ${startSequence} (${existingProducts.length} existing IDs found)`);
      }

      // Assign IDs to products
      for (let i = 0; i < products.length; i++) {
        const product = products[i];
        const sequence = startSequence + i;
        const productId = `PRD-${dateStr}-${sequence.toString().padStart(4, '0')}`;
        
        product.productId = productId;
        await product.save();
        
        console.log(`   ✅ ${product.sku || 'NO-SKU'} → ${productId} (${product.name?.en || 'Unnamed'})`);
        totalUpdated++;
      }
      
      console.log(''); // Empty line for readability
    }

    console.log('═══════════════════════════════════════════════════════');
    console.log(`✅ Successfully generated Product IDs for ${totalUpdated} products!`);
    console.log('═══════════════════════════════════════════════════════\n');
    
    await mongoose.connection.close();
    console.log('🔒 Database connection closed');
    process.exit(0);

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error);
    await mongoose.connection.close();
    process.exit(1);
  }
}

// Run the migration
generateProductIds();

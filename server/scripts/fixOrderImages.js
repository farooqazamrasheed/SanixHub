/**
 * Script to fix order images
 * This will update existing orders to have correct image URLs
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
require('dotenv').config();

async function fixOrderImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB');

    // Get all orders
    const orders = await Order.find({});
    console.log(`Found ${orders.length} orders`);

    let updatedCount = 0;

    for (const order of orders) {
      let needsUpdate = false;

      for (const item of order.items) {
        // Check if image is missing or invalid
        if (!item.productSnapshot.image || !item.productSnapshot.image.startsWith('/uploads')) {
          console.log(`\nOrder ${order.orderNumber} - Item: ${item.productSnapshot.name.en}`);
          console.log(`Current image: "${item.productSnapshot.image}"`);

          // Try to find the product and get its image
          const product = await Product.findById(item.product);
          if (product && product.images && product.images.length > 0) {
            const primaryImage = product.images.find(img => img.isPrimary);
            const imageUrl = primaryImage?.url || product.images[0]?.url;
            
            if (imageUrl) {
              item.productSnapshot.image = imageUrl;
              console.log(`✓ Fixed to: "${imageUrl}"`);
              needsUpdate = true;
            } else {
              console.log(`✗ No image found in product`);
            }
          } else {
            console.log(`✗ Product not found or has no images`);
          }
        }
      }

      if (needsUpdate) {
        await order.save();
        updatedCount++;
        console.log(`✓ Order ${order.orderNumber} updated`);
      }
    }

    console.log(`\n✓ Fixed ${updatedCount} orders`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixOrderImages();

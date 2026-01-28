/**
 * Script to check what's stored in order images
 */

const mongoose = require('mongoose');
const Order = require('../models/Order');
require('dotenv').config();

async function checkOrderImages() {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log('Connected to MongoDB\n');

    // Get recent orders
    const orders = await Order.find({})
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('items.product', 'name images');

    console.log(`Checking ${orders.length} most recent orders:\n`);

    orders.forEach((order, idx) => {
      console.log(`\n${'='.repeat(60)}`);
      console.log(`Order #${idx + 1}: ${order.orderNumber}`);
      console.log(`Created: ${order.createdAt.toLocaleDateString()}`);
      console.log(`Status: ${order.status}`);
      console.log(`${'='.repeat(60)}`);

      order.items.forEach((item, itemIdx) => {
        console.log(`\n  Item ${itemIdx + 1}:`);
        console.log(`  Product Name: ${item.productSnapshot.name.en}`);
        console.log(`  SKU: ${item.productSnapshot.sku}`);
        console.log(`  Image in snapshot: "${item.productSnapshot.image}"`);
        
        if (item.product && item.product.images) {
          console.log(`  Product has ${item.product.images.length} images:`);
          item.product.images.forEach((img, imgIdx) => {
            console.log(`    ${imgIdx + 1}. ${img.url} ${img.isPrimary ? '(PRIMARY)' : ''}`);
          });
        }
        
        console.log(`  Analysis:`);
        if (!item.productSnapshot.image) {
          console.log(`    ✗ Image is NULL or undefined`);
        } else if (!item.productSnapshot.image.startsWith('/uploads')) {
          console.log(`    ✗ Image path is invalid: "${item.productSnapshot.image}"`);
        } else {
          console.log(`    ✓ Image path looks correct`);
        }
      });
    });

    console.log(`\n${'='.repeat(60)}\n`);
    process.exit(0);
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

checkOrderImages();

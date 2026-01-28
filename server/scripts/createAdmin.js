/**
 * Script to create admin user
 * Run: node scripts/createAdmin.js
 */

require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("../models/User");

const createAdmin = async () => {
  try {
    // Connect to database
    await mongoose.connect(
      process.env.MONGODB_URI || "mongodb://localhost:27017/sanixhub"
    );
    console.log("✅ Connected to MongoDB");

    // Admin credentials from .env or defaults
    const adminEmail = process.env.ADMIN_EMAIL || "admin@sanixhub.com";
    const adminPassword = process.env.ADMIN_PASSWORD || "admin@123";
    const adminName = process.env.ADMIN_NAME || "System Administrator";
    const adminPhone = process.env.ADMIN_PHONE || "+923001234567";

    // Check if admin already exists
    const existingAdmin = await User.findOne({ email: adminEmail });

    if (existingAdmin) {
      console.log("⚠️  Admin user already exists!");
      console.log(`Email: ${adminEmail}`);
      console.log(`Role: ${existingAdmin.role}`);

      // Update to superadmin if not already
      if (existingAdmin.role !== "superadmin") {
        existingAdmin.role = "superadmin";
        await existingAdmin.save();
        console.log("✅ Updated existing user to superadmin role");
      }

      console.log("\n📧 Admin Login Credentials:");
      console.log(`Email: ${adminEmail}`);
      console.log(`Password: ${adminPassword}`);

      process.exit(0);
    }

    // Split admin name
    const nameParts = adminName.trim().split(" ");
    const firstName = nameParts[0];
    const lastName = nameParts.slice(1).join(" ") || "Administrator";

    // Create admin user (password will be hashed by the pre-save hook)
    const admin = await User.create({
      email: adminEmail,
      password: adminPassword,
      role: "superadmin",
      isEmailVerified: true,
      profile: {
        firstName: firstName,
        lastName: lastName,
        phone: adminPhone,
      },
      addresses: [],
    });

    console.log("✅ Admin user created successfully!");
    console.log("\n📧 Admin Login Credentials:");
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log(`Name: ${adminName}`);
    console.log(`Phone: ${adminPhone}`);
    console.log("\n🔐 You can now login at: http://localhost:3000/login");
    console.log("\n⚠️  IMPORTANT: Change the password after first login!");

    process.exit(0);
  } catch (error) {
    console.error("❌ Error creating admin:", error.message);
    process.exit(1);
  }
};

createAdmin();

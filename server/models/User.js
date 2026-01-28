const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: [true, "Email is required"],
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please provide a valid email"],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [8, "Password must be at least 8 characters"],
      select: false,
    },
    role: {
      type: String,
      enum: ["customer", "superadmin"],
      default: "customer",
    },
    profile: {
      firstName: {
        type: String,
        required: [true, "First name is required"],
        trim: true,
      },
      lastName: {
        type: String,
        required: [true, "Last name is required"],
        trim: true,
      },
      phone: {
        type: String,
        required: [true, "Phone number is required"],
        match: [
          /^(\+92|0)?[0-9]{10}$/,
          "Please provide a valid Pakistani phone number",
        ],
      },
      whatsapp: {
        type: String,
        match: [
          /^(\+92|0)?[0-9]{10}$/,
          "Please provide a valid WhatsApp number",
        ],
      },
      language: {
        type: String,
        enum: ["en", "ur"],
        default: "en",
      },
    },
    addresses: [
      {
        label: {
          type: String,
          enum: ["home", "work", "other"],
          default: "home",
        },
        street: String,
        area: String,
        city: {
          type: String,
          required: true,
        },
        postalCode: String,
        isDefault: {
          type: Boolean,
          default: false,
        },
      },
    ],
    isActive: {
      type: Boolean,
      default: true,
    },
    isVerified: {
      type: Boolean,
      default: false,
    },
    refreshToken: {
      type: String,
      select: false,
    },
    lastLogin: Date,
    settings: {
      account: {
        language: { type: String, enum: ["en", "ur"], default: "en" },
        timezone: { type: String, default: "Asia/Karachi" },
      },
      notifications: {
        email: {
          orderUpdates: { type: Boolean, default: true },
          promotions: { type: Boolean, default: false },
          newsletter: { type: Boolean, default: false },
          priceAlerts: { type: Boolean, default: true },
          stockAlerts: { type: Boolean, default: true },
        },
        push: {
          orderUpdates: { type: Boolean, default: true },
          promotions: { type: Boolean, default: false },
          priceAlerts: { type: Boolean, default: true },
          stockAlerts: { type: Boolean, default: true },
        },
        sms: {
          orderUpdates: { type: Boolean, default: true },
          deliveryUpdates: { type: Boolean, default: true },
          promotions: { type: Boolean, default: false },
        },
      },
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ role: 1 });
userSchema.index({ "profile.phone": 1 });
userSchema.index({ isActive: 1, role: 1 });
// Text search index for user search functionality
userSchema.index({
  "profile.firstName": "text",
  "profile.lastName": "text",
  email: "text",
  "profile.phone": "text",
});

// Hash password before saving
userSchema.pre("save", async function () {
  if (!this.isModified("password")) {
    return;
  }

  this.password = await bcrypt.hash(this.password, 12);
});

// Ensure only one default address
userSchema.pre("save", function () {
  if (this.addresses && this.addresses.length > 0) {
    let defaultCount = 0;
    this.addresses.forEach((addr) => {
      if (addr.isDefault) defaultCount++;
    });

    if (defaultCount === 0) {
      this.addresses[0].isDefault = true;
    } else if (defaultCount > 1) {
      let foundDefault = false;
      this.addresses.forEach((addr) => {
        if (!foundDefault && addr.isDefault) {
          foundDefault = true;
        } else {
          addr.isDefault = false;
        }
      });
    }
  }
});

// Compare password method
userSchema.methods.comparePassword = async function (candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

// Get user full name
userSchema.virtual("fullName").get(function () {
  return `${this.profile.firstName} ${this.profile.lastName}`;
});

// Remove sensitive data when converting to JSON
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.refreshToken;
  delete user.__v;
  return user;
};

module.exports = mongoose.model("User", userSchema);

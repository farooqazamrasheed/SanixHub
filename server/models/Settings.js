const mongoose = require('mongoose');

const settingsSchema = new mongoose.Schema({
  // General Store Settings
  store: {
    name: {
      type: String,
      required: true,
      default: 'My E-Commerce Store'
    },
    tagline: {
      type: String,
      default: 'Your trusted shopping destination'
    },
    description: {
      type: String,
      default: ''
    },
    logo: {
      type: String,
      default: ''
    },
    favicon: {
      type: String,
      default: ''
    },
    contactEmail: {
      type: String,
      required: true,
      default: 'contact@store.com',
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email']
    },
    contactPhone: {
      type: String,
      required: true,
      default: '+92 300 0000000'
    },
    whatsappNumber: {
      type: String
    },
    address: {
      street: String,
      area: String,
      city: String,
      state: String,
      country: { type: String, default: 'Pakistan' },
      postalCode: String
    },
    socialMedia: {
      facebook: String,
      instagram: String,
      twitter: String,
      youtube: String,
      linkedin: String
    },
    businessHours: {
      timezone: { type: String, default: 'Asia/Karachi' },
      monday: { open: String, close: String, closed: { type: Boolean, default: false } },
      tuesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      wednesday: { open: String, close: String, closed: { type: Boolean, default: false } },
      thursday: { open: String, close: String, closed: { type: Boolean, default: false } },
      friday: { open: String, close: String, closed: { type: Boolean, default: false } },
      saturday: { open: String, close: String, closed: { type: Boolean, default: false } },
      sunday: { open: String, close: String, closed: { type: Boolean, default: true } }
    },
    maintenance: {
      enabled: { type: Boolean, default: false },
      message: String,
      allowedIPs: [String]
    }
  },

  // Payment Settings
  payment: {
    currency: {
      code: { type: String, default: 'PKR' },
      symbol: { type: String, default: '₨' },
      position: { type: String, enum: ['before', 'after'], default: 'before' }
    },
    methods: {
      cashOnDelivery: {
        enabled: { type: Boolean, default: true },
        extraFee: { type: Number, default: 0 },
        feeType: { type: String, enum: ['fixed', 'percentage'], default: 'fixed' }
      },
      bankTransfer: {
        enabled: { type: Boolean, default: true },
        bankName: String,
        accountTitle: String,
        accountNumber: String,
        iban: String,
        swiftCode: String,
        instructions: String
      },
      easypaisa: {
        enabled: { type: Boolean, default: false },
        accountNumber: String,
        accountTitle: String
      },
      jazzcash: {
        enabled: { type: Boolean, default: false },
        accountNumber: String,
        accountTitle: String
      },
      stripe: {
        enabled: { type: Boolean, default: false },
        publishableKey: String,
        secretKey: String,
        webhookSecret: String
      },
      paypal: {
        enabled: { type: Boolean, default: false },
        clientId: String,
        clientSecret: String,
        mode: { type: String, enum: ['sandbox', 'live'], default: 'sandbox' }
      }
    },
    taxSettings: {
      enableTax: { type: Boolean, default: false },
      taxRate: { type: Number, default: 0 },
      taxLabel: { type: String, default: 'GST' },
      pricesIncludeTax: { type: Boolean, default: false },
      displayTaxSeparately: { type: Boolean, default: true }
    },
    minimumOrder: {
      enabled: { type: Boolean, default: false },
      amount: { type: Number, default: 0 }
    }
  },

  // Shipping Settings
  shipping: {
    defaultMethod: { type: String, default: 'standard' },
    methods: [{
      id: String,
      name: String,
      description: String,
      enabled: { type: Boolean, default: true },
      cost: Number,
      costType: { type: String, enum: ['flat', 'weight-based', 'distance-based'], default: 'flat' },
      estimatedDays: { min: Number, max: Number },
      conditions: {
        minOrderAmount: Number,
        maxOrderAmount: Number,
        weightLimit: Number,
        regions: [String]
      },
      freeShipping: {
        enabled: { type: Boolean, default: false },
        minimumAmount: Number
      }
    }],
    zones: [{
      name: String,
      regions: [String],
      cities: [String],
      shippingCost: Number,
      estimatedDays: { min: Number, max: Number }
    }],
    weightUnit: { type: String, enum: ['kg', 'lbs'], default: 'kg' },
    dimensionUnit: { type: String, enum: ['cm', 'inch'], default: 'cm' },
    packaging: {
      includePackagingCost: { type: Boolean, default: false },
      defaultCost: { type: Number, default: 0 }
    },
    tracking: {
      enabled: { type: Boolean, default: false },
      provider: String,
      apiKey: String
    }
  },

  // Invoice Settings
  invoice: {
    prefix: { type: String, default: 'INV' },
    startNumber: { type: Number, default: 1000 },
    currentNumber: { type: Number, default: 1000 },
    format: { type: String, default: '{prefix}-{year}-{number}' },
    logo: String,
    companyDetails: {
      name: String,
      registrationNumber: String,
      taxNumber: String,
      address: {
        street: String,
        city: String,
        state: String,
        postalCode: String,
        country: String
      },
      phone: String,
      email: String,
      website: String
    },
    terms: {
      paymentTerms: { type: String, default: 'Payment due upon receipt' },
      returnPolicy: String,
      notes: String,
      footer: String
    },
    template: {
      headerColor: { type: String, default: '#3b82f6' },
      accentColor: { type: String, default: '#1e40af' },
      fontSize: { type: String, enum: ['small', 'medium', 'large'], default: 'medium' },
      showOrderItems: { type: Boolean, default: true },
      showCustomerInfo: { type: Boolean, default: true },
      showPaymentMethod: { type: Boolean, default: true },
      showShippingInfo: { type: Boolean, default: true },
      showBarcode: { type: Boolean, default: true },
      showQRCode: { type: Boolean, default: false }
    },
    email: {
      sendAutomatically: { type: Boolean, default: true },
      subject: { type: String, default: 'Your Invoice - Order #{orderId}' },
      message: String,
      attachPDF: { type: Boolean, default: true }
    }
  },

  // Email Settings
  email: {
    provider: { type: String, enum: ['smtp', 'sendgrid', 'mailgun'], default: 'smtp' },
    smtp: {
      host: String,
      port: { type: Number, default: 587 },
      secure: { type: Boolean, default: false },
      user: String,
      password: String
    },
    sendgrid: {
      apiKey: String
    },
    mailgun: {
      apiKey: String,
      domain: String
    },
    fromEmail: String,
    fromName: String,
    notifications: {
      orderPlaced: { type: Boolean, default: true },
      orderConfirmed: { type: Boolean, default: true },
      orderShipped: { type: Boolean, default: true },
      orderDelivered: { type: Boolean, default: true },
      orderCancelled: { type: Boolean, default: true },
      lowStockAlert: { type: Boolean, default: true },
      newReview: { type: Boolean, default: true }
    }
  },

  // SEO Settings
  seo: {
    metaTitle: String,
    metaDescription: String,
    metaKeywords: [String],
    ogImage: String,
    twitterCard: { type: String, enum: ['summary', 'summary_large_image'], default: 'summary_large_image' },
    googleAnalyticsId: String,
    facebookPixelId: String,
    googleTagManagerId: String
  },

  // Security Settings
  security: {
    enableRateLimiting: { type: Boolean, default: true },
    maxLoginAttempts: { type: Number, default: 5 },
    lockoutDuration: { type: Number, default: 15 }, // minutes
    sessionTimeout: { type: Number, default: 30 }, // minutes
    requireEmailVerification: { type: Boolean, default: true },
    enableTwoFactor: { type: Boolean, default: false },
    allowedDomains: [String],
    blockedIPs: [String]
  },

  // Notification Settings
  notifications: {
    adminEmail: [String],
    enablePushNotifications: { type: Boolean, default: false },
    enableSMSNotifications: { type: Boolean, default: false },
    smsProvider: String,
    smsApiKey: String
  }
}, {
  timestamps: true
});

// Ensure only one settings document exists
settingsSchema.statics.getSettings = async function() {
  let settings = await this.findOne();
  if (!settings) {
    // Create with default values
    settings = await this.create({
      store: {
        name: 'My E-Commerce Store',
        tagline: 'Your trusted shopping destination',
        contactEmail: 'contact@store.com',
        contactPhone: '+92 300 0000000'
      },
      payment: {
        currency: {
          code: 'PKR',
          symbol: '₨',
          position: 'before'
        },
        methods: {
          cashOnDelivery: {
            enabled: true,
            extraFee: 0,
            feeType: 'fixed'
          }
        }
      },
      shipping: {
        defaultMethod: 'standard',
        methods: [],
        zones: []
      },
      invoice: {
        prefix: 'INV',
        startNumber: 1000,
        currentNumber: 1000,
        format: '{prefix}-{year}-{number}'
      },
      email: {
        provider: 'smtp',
        notifications: {
          orderPlaced: true,
          orderConfirmed: true,
          orderShipped: true,
          orderDelivered: true,
          orderCancelled: true,
          lowStockAlert: true,
          newReview: true
        }
      }
    });
  }
  return settings;
};

// Method to increment invoice number
settingsSchema.methods.getNextInvoiceNumber = function() {
  const currentNumber = this.invoice.currentNumber;
  this.invoice.currentNumber += 1;
  return currentNumber;
};

// Method to format invoice number
settingsSchema.methods.formatInvoiceNumber = function(number) {
  const year = new Date().getFullYear();
  const month = String(new Date().getMonth() + 1).padStart(2, '0');
  
  return this.invoice.format
    .replace('{prefix}', this.invoice.prefix)
    .replace('{year}', year)
    .replace('{month}', month)
    .replace('{number}', String(number).padStart(4, '0'));
};

module.exports = mongoose.model('Settings', settingsSchema);

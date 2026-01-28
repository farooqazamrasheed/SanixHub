const User = require('../models/User');
const Settings = require('../models/Settings');
const { getIO } = require('../socket');
const { emitSettingsUpdate, emitMaintenanceModeChange } = require('../socket/handlers/settingsHandler');

// @desc    Get all user settings
// @route   GET /api/settings
// @access  Private
exports.getSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Ensure settings structure exists with defaults
    const settings = {
      account: user.settings?.account || {},
      notifications: user.settings?.notifications || {
        email: {},
        push: {},
        sms: {}
      }
    };

    res.json({
      success: true,
      settings
    });
  } catch (error) {
    console.error('Get settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to load settings' }
    });
  }
};

// @desc    Get account settings
// @route   GET /api/settings/account
// @access  Private
exports.getAccountSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings.account');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    res.json({
      success: true,
      settings: user.settings?.account || {}
    });
  } catch (error) {
    console.error('Get account settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to load account settings' }
    });
  }
};

// @desc    Update account settings
// @route   PUT /api/settings/account
// @access  Private
exports.updateAccountSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: { message: 'Settings data is required' }
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Initialize settings if not exists
    if (!user.settings) {
      user.settings = {};
    }

    // Update account settings
    user.settings.account = {
      ...user.settings.account,
      ...settings
    };

    await user.save();

    res.json({
      success: true,
      message: 'Account settings updated successfully',
      settings: user.settings.account
    });
  } catch (error) {
    console.error('Update account settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update account settings' }
    });
  }
};

// @desc    Get notification settings
// @route   GET /api/settings/notifications
// @access  Private
exports.getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findById(req.user.id).select('settings.notifications');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    const notifications = user.settings?.notifications || {
      email: {},
      push: {},
      sms: {}
    };

    res.json({
      success: true,
      settings: notifications
    });
  } catch (error) {
    console.error('Get notification settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to load notification settings' }
    });
  }
};

// @desc    Update notification settings
// @route   PUT /api/settings/notifications
// @access  Private
exports.updateNotificationSettings = async (req, res) => {
  try {
    const { settings } = req.body;

    if (!settings) {
      return res.status(400).json({
        success: false,
        error: { message: 'Settings data is required' }
      });
    }

    const user = await User.findById(req.user.id);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: { message: 'User not found' }
      });
    }

    // Initialize settings if not exists
    if (!user.settings) {
      user.settings = {};
    }
    if (!user.settings.notifications) {
      user.settings.notifications = {
        email: {},
        push: {},
        sms: {}
      };
    }

    // Update notification settings
    if (settings.email) {
      user.settings.notifications.email = {
        ...user.settings.notifications.email,
        ...settings.email
      };
    }
    if (settings.push) {
      user.settings.notifications.push = {
        ...user.settings.notifications.push,
        ...settings.push
      };
    }
    if (settings.sms) {
      user.settings.notifications.sms = {
        ...user.settings.notifications.sms,
        ...settings.sms
      };
    }

    await user.save();

    res.json({
      success: true,
      message: 'Notification settings updated successfully',
      settings: user.settings.notifications
    });
  } catch (error) {
    console.error('Update notification settings error:', error);
    res.status(500).json({
      success: false,
      error: { message: 'Failed to update notification settings' }
    });
  }
};

// ==================== ADMIN SETTINGS ====================

// @desc    Get all store settings
// @route   GET /api/settings/store
// @access  Private/Admin
exports.getStoreSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.status(200).json({
      success: true,
      settings: {
        store: settings.store,
        seo: settings.seo,
        security: settings.security,
        notifications: settings.notifications
      }
    });
  } catch (error) {
    console.error('Get store settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching store settings'
    });
  }
};

// @desc    Update store settings
// @route   PUT /api/settings/store
// @access  Private/Admin
exports.updateStoreSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { store, seo, security, notifications } = req.body;
    
    if (store) {
      settings.store = { ...settings.store.toObject(), ...store };
    }
    
    if (seo) {
      settings.seo = { ...settings.seo.toObject(), ...seo };
    }
    
    if (security) {
      settings.security = { ...settings.security.toObject(), ...security };
    }
    
    if (notifications) {
      settings.notifications = { ...settings.notifications.toObject(), ...notifications };
    }
    
    await settings.save();
    
    // Emit real-time update
    const io = require('../socket').getIO();
    if (io) {
      emitSettingsUpdate(io, {
        category: 'store',
        settings: {
          store: settings.store,
          seo: settings.seo,
          security: settings.security,
          notifications: settings.notifications
        }
      });
      
      // Check if maintenance mode changed
      if (store?.maintenance?.enabled !== undefined) {
        emitMaintenanceModeChange(io, store.maintenance.enabled);
      }
    }
    
    res.status(200).json({
      success: true,
      message: 'Store settings updated successfully',
      settings: {
        store: settings.store,
        seo: settings.seo,
        security: settings.security,
        notifications: settings.notifications
      }
    });
  } catch (error) {
    console.error('Update store settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating store settings'
    });
  }
};

// @desc    Get payment settings
// @route   GET /api/settings/payment
// @access  Private/Admin
exports.getPaymentSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Mask sensitive data
    const paymentSettings = JSON.parse(JSON.stringify(settings.payment));
    if (paymentSettings.methods?.stripe?.secretKey) {
      paymentSettings.methods.stripe.secretKey = '****' + paymentSettings.methods.stripe.secretKey.slice(-4);
    }
    if (paymentSettings.methods?.stripe?.webhookSecret) {
      paymentSettings.methods.stripe.webhookSecret = '****';
    }
    if (paymentSettings.methods?.paypal?.clientSecret) {
      paymentSettings.methods.paypal.clientSecret = '****' + paymentSettings.methods.paypal.clientSecret.slice(-4);
    }
    
    res.status(200).json({
      success: true,
      settings: paymentSettings
    });
  } catch (error) {
    console.error('Get payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching payment settings'
    });
  }
};

// @desc    Update payment settings
// @route   PUT /api/settings/payment
// @access  Private/Admin
exports.updatePaymentSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { currency, methods, taxSettings, minimumOrder } = req.body;
    
    if (currency) {
      settings.payment.currency = { ...settings.payment.currency.toObject(), ...currency };
    }
    
    if (methods) {
      Object.keys(methods).forEach(method => {
        if (settings.payment.methods[method]) {
          settings.payment.methods[method] = { 
            ...settings.payment.methods[method].toObject(), 
            ...methods[method] 
          };
        }
      });
    }
    
    if (taxSettings) {
      settings.payment.taxSettings = { ...settings.payment.taxSettings.toObject(), ...taxSettings };
    }
    
    if (minimumOrder !== undefined) {
      settings.payment.minimumOrder = { ...settings.payment.minimumOrder.toObject(), ...minimumOrder };
    }
    
    await settings.save();
    
    // Emit real-time update
    const io = require('../socket').getIO();
    if (io) {
      emitSettingsUpdate(io, {
        category: 'payment',
        settings: settings.payment
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Payment settings updated successfully',
      settings: settings.payment
    });
  } catch (error) {
    console.error('Update payment settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating payment settings'
    });
  }
};

// @desc    Get shipping settings
// @route   GET /api/settings/shipping
// @access  Private/Admin
exports.getShippingSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.status(200).json({
      success: true,
      settings: settings.shipping
    });
  } catch (error) {
    console.error('Get shipping settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching shipping settings'
    });
  }
};

// @desc    Update shipping settings
// @route   PUT /api/settings/shipping
// @access  Private/Admin
exports.updateShippingSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { defaultMethod, methods, zones, weightUnit, dimensionUnit, packaging, tracking } = req.body;
    
    if (defaultMethod) settings.shipping.defaultMethod = defaultMethod;
    if (methods) settings.shipping.methods = methods;
    if (zones) settings.shipping.zones = zones;
    if (weightUnit) settings.shipping.weightUnit = weightUnit;
    if (dimensionUnit) settings.shipping.dimensionUnit = dimensionUnit;
    if (packaging) settings.shipping.packaging = { ...settings.shipping.packaging.toObject(), ...packaging };
    if (tracking) settings.shipping.tracking = { ...settings.shipping.tracking.toObject(), ...tracking };
    
    await settings.save();
    
    // Emit real-time update
    const io = require('../socket').getIO();
    if (io) {
      emitSettingsUpdate(io, {
        category: 'shipping',
        settings: settings.shipping
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Shipping settings updated successfully',
      settings: settings.shipping
    });
  } catch (error) {
    console.error('Update shipping settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating shipping settings'
    });
  }
};

// @desc    Get invoice settings
// @route   GET /api/settings/invoice
// @access  Private/Admin
exports.getInvoiceSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    res.status(200).json({
      success: true,
      settings: settings.invoice
    });
  } catch (error) {
    console.error('Get invoice settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching invoice settings'
    });
  }
};

// @desc    Update invoice settings
// @route   PUT /api/settings/invoice
// @access  Private/Admin
exports.updateInvoiceSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { prefix, startNumber, format, logo, companyDetails, terms, template, email } = req.body;
    
    if (prefix) settings.invoice.prefix = prefix;
    if (startNumber) settings.invoice.startNumber = startNumber;
    if (format) settings.invoice.format = format;
    if (logo) settings.invoice.logo = logo;
    if (companyDetails) settings.invoice.companyDetails = { ...settings.invoice.companyDetails.toObject(), ...companyDetails };
    if (terms) settings.invoice.terms = { ...settings.invoice.terms.toObject(), ...terms };
    if (template) settings.invoice.template = { ...settings.invoice.template.toObject(), ...template };
    if (email) settings.invoice.email = { ...settings.invoice.email.toObject(), ...email };
    
    await settings.save();
    
    // Emit real-time update
    const io = require('../socket').getIO();
    if (io) {
      emitSettingsUpdate(io, {
        category: 'invoice',
        settings: settings.invoice
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Invoice settings updated successfully',
      settings: settings.invoice
    });
  } catch (error) {
    console.error('Update invoice settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating invoice settings'
    });
  }
};

// @desc    Get email settings
// @route   GET /api/settings/email
// @access  Private/Admin
exports.getEmailSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    
    // Mask sensitive data
    const emailSettings = JSON.parse(JSON.stringify(settings.email));
    if (emailSettings.smtp?.password) {
      emailSettings.smtp.password = '****';
    }
    if (emailSettings.sendgrid?.apiKey) {
      emailSettings.sendgrid.apiKey = '****' + (emailSettings.sendgrid.apiKey.length > 4 ? emailSettings.sendgrid.apiKey.slice(-4) : '');
    }
    if (emailSettings.mailgun?.apiKey) {
      emailSettings.mailgun.apiKey = '****' + (emailSettings.mailgun.apiKey.length > 4 ? emailSettings.mailgun.apiKey.slice(-4) : '');
    }
    
    res.status(200).json({
      success: true,
      settings: emailSettings
    });
  } catch (error) {
    console.error('Get email settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error fetching email settings'
    });
  }
};

// @desc    Update email settings
// @route   PUT /api/settings/email
// @access  Private/Admin
exports.updateEmailSettings = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const { provider, smtp, sendgrid, mailgun, fromEmail, fromName, notifications } = req.body;
    
    if (provider) settings.email.provider = provider;
    if (smtp) settings.email.smtp = { ...settings.email.smtp.toObject(), ...smtp };
    if (sendgrid) settings.email.sendgrid = { ...settings.email.sendgrid.toObject(), ...sendgrid };
    if (mailgun) settings.email.mailgun = { ...settings.email.mailgun.toObject(), ...mailgun };
    if (fromEmail) settings.email.fromEmail = fromEmail;
    if (fromName) settings.email.fromName = fromName;
    if (notifications) settings.email.notifications = { ...settings.email.notifications.toObject(), ...notifications };
    
    await settings.save();
    
    // Emit real-time update
    const io = require('../socket').getIO();
    if (io) {
      emitSettingsUpdate(io, {
        category: 'email',
        settings: settings.email
      });
    }
    
    res.status(200).json({
      success: true,
      message: 'Email settings updated successfully',
      settings: settings.email
    });
  } catch (error) {
    console.error('Update email settings error:', error);
    res.status(500).json({
      success: false,
      message: 'Error updating email settings'
    });
  }
};

// @desc    Get next invoice number
// @route   GET /api/settings/invoice/next-number
// @access  Private/Admin
exports.getNextInvoiceNumber = async (req, res) => {
  try {
    const settings = await Settings.getSettings();
    const nextNumber = settings.getNextInvoiceNumber();
    const formattedNumber = settings.formatInvoiceNumber(nextNumber);
    
    await settings.save();
    
    res.status(200).json({
      success: true,
      invoiceNumber: formattedNumber,
      rawNumber: nextNumber
    });
  } catch (error) {
    console.error('Get next invoice number error:', error);
    res.status(500).json({
      success: false,
      message: 'Error generating invoice number'
    });
  }
};

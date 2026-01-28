const nodemailer = require('nodemailer');

// Create transporter
const createTransporter = () => {
  // Check if email is configured
  if (!process.env.EMAIL_HOST || !process.env.EMAIL_USER) {
    console.warn('⚠️  Email service not configured. Set EMAIL_HOST, EMAIL_USER, EMAIL_PASSWORD in .env');
    return null;
  }

  return nodemailer.createTransporter({
    host: process.env.EMAIL_HOST,
    port: process.env.EMAIL_PORT || 587,
    secure: process.env.EMAIL_SECURE === 'true', // true for 465, false for other ports
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

/**
 * Send order confirmation email
 */
exports.sendOrderConfirmation = async (order, user) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Confirmation - #${order.orderNumber}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .order-details { background: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .item { border-bottom: 1px solid #eee; padding: 10px 0; }
            .total { font-size: 18px; font-weight: bold; margin-top: 15px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Confirmed!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>Thank you for your order! We've received your order and will process it shortly.</p>
              
              <div class="order-details">
                <h2>Order #${order.orderNumber}</h2>
                <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleDateString()}</p>
                <p><strong>Status:</strong> ${order.status}</p>
                
                <h3>Items:</h3>
                ${order.items.map(item => `
                  <div class="item">
                    <strong>${item.product.name?.en || item.product.name}</strong><br>
                    Quantity: ${item.quantity} × Rs. ${item.price.toFixed(2)}<br>
                    Subtotal: Rs. ${(item.quantity * item.price).toFixed(2)}
                  </div>
                `).join('')}
                
                <div class="total">
                  <p>Subtotal: Rs. ${order.pricing.subtotal.toFixed(2)}</p>
                  ${order.pricing.discount > 0 ? `<p>Discount: -Rs. ${order.pricing.discount.toFixed(2)}</p>` : ''}
                  <p>Shipping: Rs. ${order.pricing.shipping.toFixed(2)}</p>
                  <p>Total: Rs. ${order.pricing.total.toFixed(2)}</p>
                </div>
              </div>
              
              <div class="order-details">
                <h3>Shipping Address:</h3>
                <p>
                  ${order.shippingAddress.fullName}<br>
                  ${order.shippingAddress.address}<br>
                  ${order.shippingAddress.city}, ${order.shippingAddress.postalCode}<br>
                  ${order.shippingAddress.phone}
                </p>
              </div>
              
              <p>We'll send you another email when your order ships.</p>
              <p>Thank you for shopping with us!</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order confirmation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending order confirmation email:', error);
    return false;
  }
};

/**
 * Send order status update email
 */
exports.sendOrderStatusUpdate = async (order, user, oldStatus, newStatus) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const statusMessages = {
      processing: 'Your order is being processed',
      shipped: 'Your order has been shipped!',
      delivered: 'Your order has been delivered',
      cancelled: 'Your order has been cancelled',
    };

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: `Order Update - #${order.orderNumber} - ${statusMessages[newStatus] || 'Status Updated'}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .status-badge { display: inline-block; padding: 8px 16px; border-radius: 20px; font-weight: bold; margin: 10px 0; }
            .status-${newStatus} { background: #10B981; color: white; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Order Status Update</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>Your order status has been updated:</p>
              
              <h2>Order #${order.orderNumber}</h2>
              <p>
                Status: <span class="status-badge status-${newStatus}">${newStatus.toUpperCase()}</span>
              </p>
              
              <p><strong>${statusMessages[newStatus] || 'Your order status has changed'}</strong></p>
              
              ${order.trackingNumber ? `<p><strong>Tracking Number:</strong> ${order.trackingNumber}</p>` : ''}
              
              ${order.trackingUrl ? `<p><a href="${order.trackingUrl}" style="color: #4F46E5;">Track Your Order</a></p>` : ''}
              
              <p>Thank you for shopping with us!</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Order status update email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending order status email:', error);
    return false;
  }
};

/**
 * Send welcome email to new users
 */
exports.sendWelcomeEmail = async (user) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Welcome to Our Store!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .cta { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Welcome to Our Store!</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>Thank you for creating an account with us! We're excited to have you as part of our community.</p>
              
              <p>Here's what you can do now:</p>
              <ul>
                <li>Browse our wide selection of products</li>
                <li>Add items to your wishlist</li>
                <li>Track your orders</li>
                <li>Get exclusive deals and discounts</li>
              </ul>
              
              <div class="cta">
                <a href="${process.env.CLIENT_URL || 'http://localhost:3000'}" class="button">Start Shopping</a>
              </div>
              
              <p>If you have any questions, feel free to contact us.</p>
              <p>Happy shopping!</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Welcome email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending welcome email:', error);
    return false;
  }
};

/**
 * Send low stock alert to admin
 */
exports.sendLowStockAlert = async (products, adminEmail) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: adminEmail || process.env.ADMIN_EMAIL || process.env.EMAIL_USER,
      subject: `⚠️ Low Stock Alert - ${products.length} Product(s)`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #EF4444; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .product-list { background: white; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .product { border-bottom: 1px solid #eee; padding: 10px 0; }
            .alert { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 10px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>⚠️ Low Stock Alert</h1>
            </div>
            <div class="content">
              <div class="alert">
                <strong>Attention:</strong> ${products.length} product(s) are running low on stock!
              </div>
              
              <div class="product-list">
                <h2>Products Need Restocking:</h2>
                ${products.map(p => `
                  <div class="product">
                    <strong>${p.name?.en || p.name}</strong><br>
                    SKU: ${p.sku}<br>
                    Current Stock: <strong style="color: #EF4444;">${p.stock}</strong><br>
                    Threshold: ${p.lowStockThreshold}
                  </div>
                `).join('')}
              </div>
              
              <p>Please restock these products as soon as possible to avoid stockouts.</p>
            </div>
            <div class="footer">
              <p>This is an automated alert from your inventory system.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Low stock alert sent`);
    return true;
  } catch (error) {
    console.error('❌ Error sending low stock alert:', error);
    return false;
  }
};

/**
 * Send password reset email
 */
exports.sendPasswordResetEmail = async (user, resetToken) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const resetUrl = `${process.env.CLIENT_URL || 'http://localhost:3000'}/reset-password?token=${resetToken}`;

    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Password Reset Request',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #4F46E5; color: white; padding: 20px; text-align: center; }
            .content { padding: 20px; background: #f9f9f9; }
            .cta { text-align: center; margin: 30px 0; }
            .button { display: inline-block; padding: 12px 30px; background: #4F46E5; color: white; text-decoration: none; border-radius: 5px; }
            .warning { background: #FEF2F2; border-left: 4px solid #EF4444; padding: 10px; margin: 10px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <h1>Password Reset Request</h1>
            </div>
            <div class="content">
              <p>Hi ${user.name},</p>
              <p>We received a request to reset your password. Click the button below to create a new password:</p>
              
              <div class="cta">
                <a href="${resetUrl}" class="button">Reset Password</a>
              </div>
              
              <p>Or copy and paste this link into your browser:</p>
              <p style="word-break: break-all; color: #4F46E5;">${resetUrl}</p>
              
              <div class="warning">
                <strong>Note:</strong> This link will expire in 1 hour.
              </div>
              
              <p>If you didn't request a password reset, please ignore this email.</p>
            </div>
            <div class="footer">
              <p>This is an automated email. Please do not reply.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Password reset email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending password reset email:', error);
    return false;
  }
};

/**
 * Send account deactivation email
 */
exports.sendAccountDeactivationEmail = async (user) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Account Deactivated - Action Required',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #DC2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
            .warning-box { background: #FEF2F2; border-left: 4px solid #DC2626; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .info-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
            .contact-info { background: #EEF2FF; padding: 15px; margin: 20px 0; border-radius: 8px; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .icon { font-size: 48px; margin-bottom: 10px; }
            h1 { margin: 0; }
            h2 { color: #1F2937; margin-top: 0; }
            ul { padding-left: 20px; }
            .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">⚠️</div>
              <h1>Account Deactivated</h1>
            </div>
            <div class="content">
              <p>Dear ${user.profile.firstName} ${user.profile.lastName},</p>
              
              <div class="warning-box">
                <p style="margin: 0; font-weight: bold; color: #991B1B;">
                  Your account has been deactivated by our administrator.
                </p>
              </div>
              
              <p>This means:</p>
              <ul>
                <li>You cannot log in to your account</li>
                <li>You cannot place new orders</li>
                <li>Your saved information is preserved</li>
                <li>Your order history remains accessible once reactivated</li>
              </ul>
              
              <div class="info-box">
                <h2>Why was my account deactivated?</h2>
                <p>Your account may have been deactivated for various reasons including:</p>
                <ul>
                  <li>Violation of terms of service</li>
                  <li>Suspicious activity detected</li>
                  <li>Account security concerns</li>
                  <li>Request from the account holder</li>
                  <li>Administrative decision</li>
                </ul>
              </div>
              
              <div class="contact-info">
                <h2>Need to reactivate your account?</h2>
                <p>If you believe this was done in error or would like to discuss reactivating your account, please contact our support team:</p>
                <p>
                  <strong>📧 Email:</strong> ${process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@example.com'}<br>
                  <strong>📞 Phone:</strong> ${process.env.SUPPORT_PHONE || '+92 300 1234567'}<br>
                  <strong>💬 WhatsApp:</strong> ${process.env.SUPPORT_WHATSAPP || process.env.SUPPORT_PHONE || '+92 300 1234567'}
                </p>
              </div>
              
              <p style="margin-top: 30px;">
                We appreciate your understanding and are here to help resolve any issues.
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Account Details:</strong><br>
                Email: ${user.email}<br>
                Account ID: ${user._id}<br>
                Deactivation Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div class="footer">
              <p>This is an automated notification from ${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}.</p>
              <p>Please do not reply to this email. Contact our support team for assistance.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Account deactivation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending account deactivation email:', error);
    return false;
  }
};

/**
 * Send account activation email
 */
exports.sendAccountActivationEmail = async (user) => {
  const transporter = createTransporter();
  if (!transporter) return false;

  try {
    const mailOptions = {
      from: `"${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}" <${process.env.EMAIL_FROM || process.env.EMAIL_USER}>`,
      to: user.email,
      subject: 'Account Activated - Welcome Back!',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #10B981; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { padding: 30px; background: #f9f9f9; border-radius: 0 0 8px 8px; }
            .success-box { background: #F0FDF4; border-left: 4px solid #10B981; padding: 15px; margin: 20px 0; border-radius: 4px; }
            .features-box { background: white; padding: 20px; margin: 20px 0; border-radius: 8px; border: 1px solid #e5e7eb; }
            .cta-box { text-align: center; padding: 20px; margin: 20px 0; }
            .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
            .icon { font-size: 48px; margin-bottom: 10px; }
            h1 { margin: 0; }
            h2 { color: #1F2937; margin-top: 0; }
            ul { padding-left: 20px; }
            .btn { display: inline-block; padding: 12px 24px; background: #4F46E5; color: white; text-decoration: none; border-radius: 6px; margin: 10px 0; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="icon">🎉</div>
              <h1>Welcome Back!</h1>
            </div>
            <div class="content">
              <p>Dear ${user.profile.firstName} ${user.profile.lastName},</p>
              
              <div class="success-box">
                <p style="margin: 0; font-weight: bold; color: #065F46;">
                  Great news! Your account has been reactivated.
                </p>
              </div>
              
              <p>We're happy to inform you that your account is now active and you can:</p>
              <ul>
                <li>✅ Log in to your account</li>
                <li>✅ Browse our products</li>
                <li>✅ Place new orders</li>
                <li>✅ Access your order history</li>
                <li>✅ Manage your profile and addresses</li>
              </ul>
              
              <div class="features-box">
                <h2>What's Available Now:</h2>
                <p><strong>🛍️ Shop Products:</strong> Browse our full catalog and add items to cart</p>
                <p><strong>🚚 Track Orders:</strong> View your order history and track shipments</p>
                <p><strong>⭐ Leave Reviews:</strong> Share your experience with products</p>
                <p><strong>💝 Wishlist:</strong> Save your favorite items for later</p>
                <p><strong>🎫 Use Coupons:</strong> Apply discount codes at checkout</p>
              </div>
              
              <div class="cta-box">
                <p style="font-size: 16px; margin-bottom: 20px;">Ready to start shopping?</p>
                <a href="${process.env.FRONTEND_URL || 'http://localhost:3000'}/login" class="btn">
                  Log In Now
                </a>
              </div>
              
              <p style="margin-top: 30px;">
                If you have any questions or need assistance, our support team is here to help!
              </p>
              
              <p style="background: #EEF2FF; padding: 15px; border-radius: 8px; margin-top: 20px;">
                <strong>📞 Need Help?</strong><br>
                Email: ${process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || 'support@example.com'}<br>
                Phone: ${process.env.SUPPORT_PHONE || '+92 300 1234567'}<br>
                WhatsApp: ${process.env.SUPPORT_WHATSAPP || process.env.SUPPORT_PHONE || '+92 300 1234567'}
              </p>
              
              <p style="color: #666; font-size: 14px; margin-top: 30px;">
                <strong>Account Details:</strong><br>
                Email: ${user.email}<br>
                Activation Date: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
              </p>
            </div>
            <div class="footer">
              <p>Thank you for being a valued customer!</p>
              <p>This is an automated notification from ${process.env.EMAIL_FROM_NAME || 'E-Commerce Store'}.</p>
            </div>
          </div>
        </body>
        </html>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`✅ Account activation email sent to ${user.email}`);
    return true;
  } catch (error) {
    console.error('❌ Error sending account activation email:', error);
    return false;
  }
};

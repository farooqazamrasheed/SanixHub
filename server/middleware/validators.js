const { body, param, query, validationResult } = require('express-validator');

/**
 * Middleware to handle validation errors
 */
exports.validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Validation failed',
        details: errors.array()
      }
    });
  }
  next();
};

/**
 * User Registration Validation
 */
exports.registerValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .isLength({ min: 8 })
    .withMessage('Password must be at least 8 characters')
    .matches(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
    .withMessage('Password must contain uppercase, lowercase, and number'),
  body('profile.firstName')
    .trim()
    .notEmpty()
    .withMessage('First name is required')
    .isLength({ max: 50 })
    .withMessage('First name must not exceed 50 characters'),
  body('profile.lastName')
    .trim()
    .notEmpty()
    .withMessage('Last name is required')
    .isLength({ max: 50 })
    .withMessage('Last name must not exceed 50 characters'),
  body('profile.phone')
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Please provide a valid Pakistani phone number'),
  body('profile.language')
    .optional()
    .isIn(['en', 'ur'])
    .withMessage('Language must be either en or ur')
];

/**
 * User Login Validation
 */
exports.loginValidation = [
  body('email')
    .isEmail()
    .normalizeEmail()
    .withMessage('Please provide a valid email'),
  body('password')
    .notEmpty()
    .withMessage('Password is required')
];

/**
 * Product Creation Validation
 */
exports.productValidation = [
  body('name.en')
    .trim()
    .notEmpty()
    .withMessage('English product name is required'),
  body('name.ur')
    .trim()
    .notEmpty()
    .withMessage('Urdu product name is required'),
  body('slug')
    .trim()
    .notEmpty()
    .isSlug()
    .withMessage('Valid slug is required'),
  body('sku')
    .trim()
    .notEmpty()
    .withMessage('SKU is required'),
  body('category')
    .notEmpty()
    .isMongoId()
    .withMessage('Valid category ID is required'),
  body('pricing.basePrice')
    .isFloat({ min: 0 })
    .withMessage('Base price must be a positive number'),
  body('pricing.salePrice')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Sale price must be a positive number'),
  // New field validations
  body('brand')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Brand name must not exceed 100 characters'),
  body('manufacturer')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Manufacturer name must not exceed 100 characters'),
  body('origin')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Country of origin must not exceed 100 characters'),
  body('tags')
    .optional()
    .isArray()
    .withMessage('Tags must be an array'),
  body('tags.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each tag must not exceed 50 characters'),
  body('shortDescription.en')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Short description must not exceed 200 characters'),
  body('shortDescription.ur')
    .optional()
    .trim()
    .isLength({ max: 200 })
    .withMessage('Short description must not exceed 200 characters'),
  body('dimensions.length')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Length must be a positive number'),
  body('dimensions.width')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Width must be a positive number'),
  body('dimensions.height')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Height must be a positive number'),
  body('dimensions.weight')
    .optional()
    .isFloat({ min: 0 })
    .withMessage('Weight must be a positive number'),
  body('dimensions.unit')
    .optional()
    .isIn(['cm', 'inch', 'kg', 'g'])
    .withMessage('Unit must be cm, inch, kg, or g'),
  body('seo.metaTitle.en')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Meta title must not exceed 60 characters'),
  body('seo.metaTitle.ur')
    .optional()
    .trim()
    .isLength({ max: 60 })
    .withMessage('Meta title must not exceed 60 characters'),
  body('seo.metaDescription.en')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description must not exceed 160 characters'),
  body('seo.metaDescription.ur')
    .optional()
    .trim()
    .isLength({ max: 160 })
    .withMessage('Meta description must not exceed 160 characters'),
  body('seo.keywords')
    .optional()
    .isArray()
    .withMessage('SEO keywords must be an array'),
  body('seo.keywords.*')
    .optional()
    .trim()
    .isLength({ max: 50 })
    .withMessage('Each keyword must not exceed 50 characters')
];

/**
 * Brand Creation Validation
 */
exports.brandValidation = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Brand name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Brand name must be between 2 and 100 characters'),
  body('description')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Description must not exceed 500 characters'),
  body('website')
    .optional()
    .trim()
    .isURL()
    .withMessage('Please provide a valid URL'),
  body('logo')
    .optional()
    .trim()
    .isURL()
    .withMessage('Logo must be a valid URL'),
  body('isActive')
    .optional()
    .isBoolean()
    .withMessage('isActive must be a boolean value')
];

/**
 * Order Creation Validation
 */
exports.orderValidation = [
  body('items')
    .isArray({ min: 1 })
    .withMessage('Order must have at least one item'),
  body('items.*.product')
    .isMongoId()
    .withMessage('Valid product ID is required'),
  body('items.*.quantity')
    .isInt({ min: 1 })
    .withMessage('Quantity must be at least 1'),
  body('pickupDetails.customerName')
    .trim()
    .notEmpty()
    .withMessage('Customer name is required'),
  body('pickupDetails.phone')
    .matches(/^(\+92|0)?[0-9]{10}$/)
    .withMessage('Valid phone number is required')
];

/**
 * Review Creation Validation
 */
exports.reviewValidation = [
  body('rating')
    .isInt({ min: 1, max: 5 })
    .withMessage('Rating must be between 1 and 5'),
  body('title')
    .optional()
    .trim()
    .isLength({ max: 100 })
    .withMessage('Title must not exceed 100 characters'),
  body('comment')
    .optional()
    .trim()
    .isLength({ max: 1000 })
    .withMessage('Comment must not exceed 1000 characters')
];

/**
 * Coupon Creation Validation
 */
exports.couponValidation = [
  body('code')
    .trim()
    .notEmpty()
    .isLength({ min: 3, max: 20 })
    .withMessage('Coupon code must be between 3 and 20 characters'),
  body('type')
    .isIn(['percentage', 'fixed'])
    .withMessage('Type must be either percentage or fixed'),
  body('value')
    .isFloat({ min: 0 })
    .withMessage('Value must be a positive number'),
  body('validity.startDate')
    .isISO8601()
    .withMessage('Valid start date is required'),
  body('validity.endDate')
    .isISO8601()
    .withMessage('Valid end date is required')
];

/**
 * Pagination Validation
 */
exports.paginationValidation = [
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 1000 })
    .withMessage('Limit must be between 1 and 1000')
];

/**
 * MongoDB ObjectId Validation
 */
exports.objectIdValidation = (paramName = 'id') => [
  param(paramName)
    .isMongoId()
    .withMessage('Invalid ID format')
];

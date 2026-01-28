/**
 * Price Calculator Utility
 * Handles all price calculation logic with validation
 */

const MAX_PERCENTAGE_INCREASE = 40; // Maximum 40% increase allowed
const MAX_PERCENTAGE_DECREASE = 90; // Maximum 90% decrease allowed
const MIN_PRICE = 1; // Minimum product price (PKR - whole number)
const MAX_PRICE = 9999999; // Maximum product price (PKR - whole number)

/**
 * Calculate new price based on change type
 */
const calculateNewPrice = (oldPrice, changeType, changeValue, direction) => {
  let newPrice;

  switch (changeType) {
    case 'fixed':
      // Fixed amount change
      if (direction === 'increase') {
        newPrice = oldPrice + changeValue;
      } else if (direction === 'decrease') {
        newPrice = oldPrice - changeValue;
      } else {
        newPrice = changeValue; // 'set' direction
      }
      break;

    case 'percentage':
      // Percentage change
      if (direction === 'increase') {
        newPrice = oldPrice * (1 + changeValue / 100);
      } else if (direction === 'decrease') {
        newPrice = oldPrice * (1 - changeValue / 100);
      } else {
        newPrice = changeValue; // 'set' direction (shouldn't happen with percentage)
      }
      break;

    case 'override':
      // Override to specific price
      newPrice = changeValue;
      break;

    default:
      throw new Error(`Invalid change type: ${changeType}`);
  }

  // Round to 2 decimal places with .99 ending
  newPrice = roundPrice(newPrice);

  return newPrice;
};

/**
 * Round price to nearest whole number for PKR currency
 * Examples: 135.24 → 136, 146.2 → 147, 158.6 → 159, 176.9 → 177
 */
const roundPrice = (price) => {
  // Round to nearest whole number (no decimals for PKR)
  return Math.round(price);
};

/**
 * Validate price change request
 */
const validatePriceChange = (oldPrice, changeType, changeValue, direction) => {
  const errors = [];

  // Validate old price
  if (oldPrice < MIN_PRICE) {
    errors.push(`Old price must be at least $${MIN_PRICE}`);
  }

  // Validate change value
  if (changeValue < 0) {
    errors.push('Change value cannot be negative');
  }

  // Validate percentage limits
  if (changeType === 'percentage') {
    if (direction === 'increase' && changeValue > MAX_PERCENTAGE_INCREASE) {
      errors.push(`Maximum increase is ${MAX_PERCENTAGE_INCREASE}%`);
    }
    if (direction === 'decrease' && changeValue > MAX_PERCENTAGE_DECREASE) {
      errors.push(`Maximum decrease is ${MAX_PERCENTAGE_DECREASE}%`);
    }
  }

  // Calculate and validate new price
  try {
    const newPrice = calculateNewPrice(oldPrice, changeType, changeValue, direction);
    
    if (newPrice < MIN_PRICE) {
      errors.push(`New price cannot be less than $${MIN_PRICE}`);
    }
    
    if (newPrice > MAX_PRICE) {
      errors.push(`New price cannot exceed $${MAX_PRICE}`);
    }

    // Additional validation: check if decrease is too drastic
    if (direction === 'decrease' && changeType === 'fixed') {
      const decreasePercentage = (changeValue / oldPrice) * 100;
      if (decreasePercentage > MAX_PERCENTAGE_DECREASE) {
        errors.push(`This fixed decrease represents ${decreasePercentage.toFixed(1)}% which exceeds maximum ${MAX_PERCENTAGE_DECREASE}%`);
      }
    }

  } catch (error) {
    errors.push(error.message);
  }

  return {
    valid: errors.length === 0,
    errors
  };
};

/**
 * Preview price changes for multiple products
 */
const previewBulkPriceChange = (products, changeType, changeValue, direction) => {
  const preview = products.map(product => {
    const oldPrice = product.pricing?.salePrice || product.pricing?.basePrice || 0;
    let newPrice;
    let errors = [];

    // Validate first
    const validation = validatePriceChange(oldPrice, changeType, changeValue, direction);
    
    if (validation.valid) {
      newPrice = calculateNewPrice(oldPrice, changeType, changeValue, direction);
    } else {
      newPrice = oldPrice;
      errors = validation.errors;
    }

    const changeAmount = newPrice - oldPrice;
    const changePercentage = oldPrice > 0 ? ((changeAmount / oldPrice) * 100) : 0;

    return {
      productId: product._id,
      productName: product.name,
      sku: product.sku,
      oldPrice: roundPrice(oldPrice),
      newPrice: roundPrice(newPrice),
      changeAmount: roundPrice(changeAmount),
      changePercentage: roundPrice(changePercentage),
      valid: validation.valid,
      errors
    };
  });

  // Calculate summary statistics
  const validChanges = preview.filter(p => p.valid);
  const totalImpact = validChanges.reduce((sum, p) => sum + p.changeAmount, 0);
  const averageChange = validChanges.length > 0 
    ? totalImpact / validChanges.length 
    : 0;

  return {
    preview,
    summary: {
      totalProducts: products.length,
      validChanges: validChanges.length,
      invalidChanges: preview.length - validChanges.length,
      totalImpact: roundPrice(totalImpact),
      averageChange: roundPrice(averageChange),
      maxChange: validChanges.length > 0 
        ? Math.max(...validChanges.map(p => Math.abs(p.changeAmount))) 
        : 0,
      minChange: validChanges.length > 0 
        ? Math.min(...validChanges.map(p => Math.abs(p.changeAmount))) 
        : 0
    }
  };
};

/**
 * Calculate analytics for completed price change
 */
const calculateAnalytics = (affectedProducts) => {
  if (!affectedProducts || affectedProducts.length === 0) {
    return {
      totalRevenueImpact: 0,
      averagePriceChange: 0,
      maxPriceChange: 0,
      minPriceChange: 0
    };
  }

  const changes = affectedProducts.map(p => p.newPrice - p.oldPrice);
  const totalImpact = changes.reduce((sum, change) => sum + change, 0);
  const averageChange = totalImpact / affectedProducts.length;

  return {
    totalRevenueImpact: roundPrice(totalImpact),
    averagePriceChange: roundPrice(averageChange),
    maxPriceChange: roundPrice(Math.max(...changes)),
    minPriceChange: roundPrice(Math.min(...changes))
  };
};

/**
 * Validate conflict: Check if another operation is in progress
 */
const checkConflict = async (PriceChangeHistory, targetId, targetModel) => {
  const inProgress = await PriceChangeHistory.findOne({
    targetId,
    targetModel,
    status: { $in: ['pending', 'in_progress'] }
  });

  return {
    hasConflict: !!inProgress,
    conflictOperation: inProgress
  };
};

module.exports = {
  calculateNewPrice,
  roundPrice,
  validatePriceChange,
  previewBulkPriceChange,
  calculateAnalytics,
  checkConflict,
  MAX_PERCENTAGE_INCREASE,
  MAX_PERCENTAGE_DECREASE,
  MIN_PRICE,
  MAX_PRICE
};

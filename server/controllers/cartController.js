const Cart = require('../models/Cart');
const Product = require('../models/Product');
const { emitCartUpdated } = require('../socket/handlers/cartHandler');

/**
 * @desc    Get user's cart
 * @route   GET /api/cart
 * @access  Private
 */
exports.getCart = async (req, res, next) => {
  try {
    let cart = await Cart.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name slug images pricing inventory isActive'
      });

    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Filter out inactive products
    cart.items = cart.items.filter(item => item.product && item.product.isActive);
    await cart.save();

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add item to cart
 * @route   POST /api/cart/items
 * @access  Private
 */
exports.addToCart = async (req, res, next) => {
  try {
    const { productId, quantity = 1 } = req.body;

    // Validate quantity
    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1'
        }
      });
    }

    // Check if product exists and is active
    const product = await Product.findOne({ _id: productId, isActive: true });
    if (!product) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or inactive'
        }
      });
    }

    // Check if product is out of stock
    if (product.inventory.trackInventory && product.inventory.stockQuantity === 0 && !product.inventory.allowBackorder) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: 'This product is currently out of stock'
        }
      });
    }

    let cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      cart = await Cart.create({ user: req.user._id, items: [] });
    }

    // Check if item already in cart
    const existingItemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    let newTotalQuantity = quantity;
    if (existingItemIndex > -1) {
      // Calculate total quantity (existing + new)
      newTotalQuantity = cart.items[existingItemIndex].quantity + quantity;
    }

    // Check stock availability for total quantity
    if (product.inventory.trackInventory && !product.inventory.allowBackorder) {
      if (newTotalQuantity > product.inventory.stockQuantity) {
        const availableToAdd = product.inventory.stockQuantity - (existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0);
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Only ${product.inventory.stockQuantity} items available in stock. You already have ${existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0} in cart. You can add ${availableToAdd} more.`,
            data: {
              available: product.inventory.stockQuantity,
              inCart: existingItemIndex > -1 ? cart.items[existingItemIndex].quantity : 0,
              canAdd: availableToAdd
            }
          }
        });
      }
    }

    if (existingItemIndex > -1) {
      // Update quantity
      cart.items[existingItemIndex].quantity = newTotalQuantity;
    } else {
      // Add new item
      cart.items.push({
        product: productId,
        quantity
      });
    }

    await cart.save();
    await cart.populate({
      path: 'items.product',
      select: 'name slug images pricing inventory isActive'
    });

    // Emit real-time cart update via WebSocket
    try {
      const io = req.app.get('io');
      if (io) {
        emitCartUpdated(io, req.user._id.toString(), cart);
      }
    } catch (wsError) {
      console.error('WebSocket emit error:', wsError);
    }

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update cart item quantity
 * @route   PUT /api/cart/items/:productId
 * @access  Private
 */
exports.updateCartItem = async (req, res, next) => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    if (quantity < 1) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_QUANTITY',
          message: 'Quantity must be at least 1'
        }
      });
    }

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found'
        }
      });
    }

    const itemIndex = cart.items.findIndex(
      item => item.product.toString() === productId
    );

    if (itemIndex === -1) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'ITEM_NOT_FOUND',
          message: 'Item not found in cart'
        }
      });
    }

    // Check product and stock
    const product = await Product.findById(productId);
    
    if (!product || !product.isActive) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'PRODUCT_NOT_FOUND',
          message: 'Product not found or inactive'
        }
      });
    }

    // Check if out of stock
    if (product.inventory.trackInventory && product.inventory.stockQuantity === 0 && !product.inventory.allowBackorder) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'OUT_OF_STOCK',
          message: 'This product is currently out of stock'
        }
      });
    }

    // Check stock availability
    if (product.inventory.trackInventory && !product.inventory.allowBackorder) {
      if (quantity > product.inventory.stockQuantity) {
        return res.status(400).json({
          success: false,
          error: {
            code: 'INSUFFICIENT_STOCK',
            message: `Only ${product.inventory.stockQuantity} items available in stock`,
            data: {
              available: product.inventory.stockQuantity,
              requested: quantity
            }
          }
        });
      }
    }

    cart.items[itemIndex].quantity = quantity;
    await cart.save();
    await cart.populate({
      path: 'items.product',
      select: 'name slug images pricing inventory isActive'
    });

    // Emit real-time cart update via WebSocket
    try {
      const io = req.app.get('io');
      if (io) {
        emitCartUpdated(io, req.user._id.toString(), cart);
      }
    } catch (wsError) {
      console.error('WebSocket emit error:', wsError);
    }

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove item from cart
 * @route   DELETE /api/cart/items/:productId
 * @access  Private
 */
exports.removeFromCart = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found'
        }
      });
    }

    cart.items = cart.items.filter(
      item => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate({
      path: 'items.product',
      select: 'name slug images pricing inventory isActive'
    });

    // Emit real-time cart update via WebSocket
    try {
      const io = req.app.get('io');
      if (io) {
        emitCartUpdated(io, req.user._id.toString(), cart);
      }
    } catch (wsError) {
      console.error('WebSocket emit error:', wsError);
    }

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear cart
 * @route   DELETE /api/cart
 * @access  Private
 */
exports.clearCart = async (req, res, next) => {
  try {
    const cart = await Cart.findOne({ user: req.user._id });
    if (!cart) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CART_NOT_FOUND',
          message: 'Cart not found'
        }
      });
    }

    cart.items = [];
    await cart.save();

    // Emit real-time cart cleared via WebSocket
    try {
      const io = req.app.get('io');
      if (io) {
        const { emitCartCleared } = require('../socket/handlers/cartHandler');
        emitCartCleared(io, req.user._id.toString());
      }
    } catch (wsError) {
      console.error('WebSocket emit error:', wsError);
    }

    res.status(200).json({
      success: true,
      data: { cart }
    });
  } catch (error) {
    next(error);
  }
};

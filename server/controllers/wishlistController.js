const Wishlist = require('../models/Wishlist');
const Product = require('../models/Product');
const { emitWishlistAdded, emitWishlistRemoved, emitWishlistCleared } = require('../socket/handlers/wishlistHandler');

/**
 * @desc    Get user's wishlist
 * @route   GET /api/wishlist
 * @access  Private
 */
exports.getWishlist = async (req, res, next) => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user._id })
      .populate({
        path: 'items.product',
        select: 'name slug images pricing inventory category isActive',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      })
      .lean();

    if (!wishlist) {
      wishlist = { user: req.user._id, items: [] };
    }

    // Transform products to include stock field
    if (wishlist.items) {
      wishlist.items = wishlist.items.map(item => {
        if (item.product) {
          return {
            ...item,
            product: {
              ...item.product,
              stock: item.product.inventory?.stockQuantity || 0,
              price: item.product.pricing?.salePrice || item.product.pricing?.basePrice
            }
          };
        }
        return item;
      }).filter(item => item.product && item.product.isActive);
    }

    res.status(200).json({
      success: true,
      data: { wishlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Add product to wishlist
 * @route   POST /api/wishlist/:productId
 * @access  Private
 */
exports.addToWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    // Verify product exists and is active
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

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user._id,
        items: []
      });
    }

    // Check if product already in wishlist
    const existingItem = wishlist.items.find(
      item => item.product.toString() === productId
    );

    if (existingItem) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'ALREADY_IN_WISHLIST',
          message: 'Product already in wishlist'
        }
      });
    }

    // Add product to wishlist
    wishlist.items.unshift({
      product: productId,
      addedAt: new Date()
    });

    await wishlist.save();

    // Populate and return
    await wishlist.populate({
      path: 'items.product',
      select: 'name slug images pricing inventory category',
      populate: {
        path: 'category',
        select: 'name slug'
      }
    });

    // Calculate stats for real-time update
    const totalValue = wishlist.items.reduce((sum, item) => {
      const price = item.product?.pricing?.salePrice || item.product?.pricing?.basePrice || 0;
      return sum + price;
    }, 0);

    // Emit real-time update
    try {
      emitWishlistAdded(req.user._id.toString(), {
        item: wishlist.items[0], // The newly added item
        itemCount: wishlist.items.length,
        totalValue,
        userName: `${req.user.profile?.firstName} ${req.user.profile?.lastName}`,
        userEmail: req.user.email
      });
    } catch (error) {
      console.error('WebSocket emit error:', error);
    }

    res.status(200).json({
      success: true,
      data: { wishlist },
      message: 'Product added to wishlist'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Remove product from wishlist
 * @route   DELETE /api/wishlist/:productId
 * @access  Private
 */
exports.removeFromWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WISHLIST_NOT_FOUND',
          message: 'Wishlist not found'
        }
      });
    }

    // Get product info before removing (for event)
    const removedItem = wishlist.items.find(item => item.product.toString() === productId);
    
    // Remove product from wishlist
    wishlist.items = wishlist.items.filter(
      item => item.product.toString() !== productId
    );

    await wishlist.save();

    // Populate to get product name
    await wishlist.populate({
      path: 'items.product',
      select: 'name pricing'
    });

    // Calculate stats
    const totalValue = wishlist.items.reduce((sum, item) => {
      const price = item.product?.pricing?.salePrice || item.product?.pricing?.basePrice || 0;
      return sum + price;
    }, 0);

    // Emit real-time update
    try {
      const Product = require('../models/Product');
      const product = await Product.findById(productId).select('name');
      
      emitWishlistRemoved(req.user._id.toString(), {
        productId,
        productName: product?.name?.en || 'Unknown Product',
        itemCount: wishlist.items.length,
        totalValue,
        userName: `${req.user.profile?.firstName} ${req.user.profile?.lastName}`,
        userEmail: req.user.email
      });
    } catch (error) {
      console.error('WebSocket emit error:', error);
    }

    res.status(200).json({
      success: true,
      data: { wishlist },
      message: 'Product removed from wishlist'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Clear entire wishlist
 * @route   DELETE /api/wishlist
 * @access  Private
 */
exports.clearWishlist = async (req, res, next) => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WISHLIST_NOT_FOUND',
          message: 'Wishlist not found'
        }
      });
    }

    wishlist.items = [];
    await wishlist.save();

    // Emit real-time update
    try {
      emitWishlistCleared(req.user._id.toString(), {
        userName: `${req.user.profile?.firstName} ${req.user.profile?.lastName}`,
        userEmail: req.user.email
      });
    } catch (error) {
      console.error('WebSocket emit error:', error);
    }

    res.status(200).json({
      success: true,
      data: { wishlist },
      message: 'Wishlist cleared'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Check if product is in wishlist
 * @route   GET /api/wishlist/check/:productId
 * @access  Private
 */
exports.checkWishlist = async (req, res, next) => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    const inWishlist = wishlist?.items.some(
      item => item.product.toString() === productId
    ) || false;

    res.status(200).json({
      success: true,
      data: { inWishlist }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Move wishlist items to cart
 * @route   POST /api/wishlist/move-to-cart
 * @access  Private
 */
exports.moveToCart = async (req, res, next) => {
  try {
    const { productIds } = req.body; // Array of product IDs to move

    const wishlist = await Wishlist.findOne({ user: req.user._id });

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WISHLIST_NOT_FOUND',
          message: 'Wishlist not found'
        }
      });
    }

    // This would integrate with cart system
    // For now, just return the products to move
    const productsToMove = wishlist.items.filter(
      item => productIds.includes(item.product.toString())
    );

    res.status(200).json({
      success: true,
      data: { products: productsToMove },
      message: 'Ready to add to cart'
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get all customer wishlists (Admin only)
 * @route   GET /api/admin/wishlists
 * @access  Private/Admin
 */
exports.getAllWishlists = async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search = '' } = req.query;
    const skip = (page - 1) * limit;

    // Build query
    let userQuery = { role: 'customer' };
    if (search) {
      userQuery.$or = [
        { 'profile.firstName': { $regex: search, $options: 'i' } },
        { 'profile.lastName': { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } }
      ];
    }

    // Get users with wishlists
    const User = require('../models/User');
    const users = await User.find(userQuery)
      .select('_id email profile.firstName profile.lastName')
      .lean();

    const userIds = users.map(u => u._id);

    // Get wishlists for these users
    const wishlists = await Wishlist.find({ user: { $in: userIds } })
      .populate({
        path: 'user',
        select: 'email profile.firstName profile.lastName'
      })
      .populate({
        path: 'items.product',
        select: 'name slug images pricing inventory'
      })
      .sort({ updatedAt: -1 })
      .skip(skip)
      .limit(parseInt(limit))
      .lean();

    // Filter out inactive products and calculate stats
    const processedWishlists = wishlists.map(wishlist => {
      const activeItems = wishlist.items.filter(item => 
        item.product && item.product.isActive !== false
      );
      
      return {
        ...wishlist,
        items: activeItems,
        itemCount: activeItems.length,
        totalValue: activeItems.reduce((sum, item) => {
          const price = item.product?.pricing?.salePrice || item.product?.pricing?.basePrice || 0;
          return sum + price;
        }, 0)
      };
    }).filter(w => w.itemCount > 0); // Only show wishlists with items

    const total = processedWishlists.length;

    res.status(200).json({
      success: true,
      data: {
        wishlists: processedWishlists,
        pagination: {
          currentPage: parseInt(page),
          totalPages: Math.ceil(total / limit),
          totalItems: total,
          itemsPerPage: parseInt(limit)
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get specific customer's wishlist (Admin only)
 * @route   GET /api/admin/wishlists/:userId
 * @access  Private/Admin
 */
exports.getCustomerWishlist = async (req, res, next) => {
  try {
    const { userId } = req.params;

    const wishlist = await Wishlist.findOne({ user: userId })
      .populate({
        path: 'user',
        select: 'email profile.firstName profile.lastName profile.phone'
      })
      .populate({
        path: 'items.product',
        select: 'name slug images pricing inventory category isActive',
        populate: {
          path: 'category',
          select: 'name slug'
        }
      })
      .lean();

    if (!wishlist) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'WISHLIST_NOT_FOUND',
          message: 'Wishlist not found for this customer'
        }
      });
    }

    // Filter active products and add stats
    const activeItems = wishlist.items.filter(item => 
      item.product && item.product.isActive !== false
    );

    const totalValue = activeItems.reduce((sum, item) => {
      const price = item.product?.pricing?.salePrice || item.product?.pricing?.basePrice || 0;
      return sum + price;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        wishlist: {
          ...wishlist,
          items: activeItems,
          stats: {
            itemCount: activeItems.length,
            totalValue
          }
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

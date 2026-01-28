const Category = require('../models/Category');

/**
 * @desc    Get all categories
 * @route   GET /api/categories
 * @access  Public
 */
exports.getCategories = async (req, res, next) => {
  try {
    const { parent, includeInactive } = req.query;

    const query = {};
    // Convert string "true"/"false" to boolean
    const shouldIncludeInactive = includeInactive === 'true' || includeInactive === true;
    if (!shouldIncludeInactive) query.isActive = true;
    if (parent) query.parentCategory = parent === 'root' ? null : parent;

    const categories = await Category.find(query)
      .populate('parentCategory', 'name slug')
      .sort('displayOrder')
      .lean();

    res.status(200).json({
      success: true,
      data: { categories }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get category tree (hierarchical structure)
 * @route   GET /api/categories/tree
 * @access  Public
 */
exports.getCategoryTree = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true })
      .sort('displayOrder')
      .lean();

    // Build tree structure
    const tree = categories
      .filter(cat => !cat.parentCategory)
      .map(parent => ({
        ...parent,
        children: categories.filter(child => 
          child.parentCategory?.toString() === parent._id.toString()
        )
      }));

    res.status(200).json({
      success: true,
      data: { categories: tree }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get single category
 * @route   GET /api/categories/:slug
 * @access  Public
 */
exports.getCategory = async (req, res, next) => {
  try {
    const category = await Category.findOne({ 
      slug: req.params.slug,
      isActive: true 
    })
      .populate('parentCategory', 'name slug')
      .lean();

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Get subcategories
    const subcategories = await Category.find({
      parentCategory: category._id,
      isActive: true
    })
      .sort('displayOrder')
      .lean();

    res.status(200).json({
      success: true,
      data: { 
        category: {
          ...category,
          subcategories
        }
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Create category
 * @route   POST /api/categories
 * @access  Private (Admin only)
 */
exports.createCategory = async (req, res, next) => {
  try {
    // Sanitize parentCategory: convert empty string to null
    const categoryData = {
      ...req.body,
      parentCategory: req.body.parentCategory || null,
    };
    
    const category = await Category.create(categoryData);

    // Emit WebSocket event for real-time updates
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      
      if (io) {
        io.to('admin').emit('category:created', {
          type: 'CATEGORY_CREATED',
          category: {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            parentCategory: category.parentCategory,
            isActive: category.isActive
          },
          timestamp: new Date()
        });
        
        console.log(`✅ Category created and broadcasted: ${category.slug}`);
      }
    } catch (socketError) {
      console.error('Failed to emit WebSocket event:', socketError);
    }

    res.status(201).json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Update category
 * @route   PUT /api/categories/:id
 * @access  Private (Admin only)
 */
exports.updateCategory = async (req, res, next) => {
  try {
    // Sanitize parentCategory: convert empty string to null
    const categoryData = {
      ...req.body,
      parentCategory: req.body.parentCategory || null,
    };
    
    const category = await Category.findByIdAndUpdate(
      req.params.id,
      categoryData,
      { new: true, runValidators: true }
    ).populate('parentCategory', 'name slug');

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Emit WebSocket event for real-time updates
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      
      if (io) {
        io.to('admin').emit('category:updated', {
          type: 'CATEGORY_UPDATED',
          category: {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            parentCategory: category.parentCategory,
            isActive: category.isActive,
            displayOrder: category.displayOrder,
            image: category.image
          },
          timestamp: new Date()
        });
        
        // Also emit to public users
        io.emit('category:updated', {
          type: 'CATEGORY_UPDATED',
          category: {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            isActive: category.isActive
          },
          timestamp: new Date()
        });
        
        console.log(`✅ Category updated and broadcasted: ${category.slug}`);
      }
    } catch (socketError) {
      console.error('Failed to emit WebSocket event:', socketError);
    }

    res.status(200).json({
      success: true,
      data: { category }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete category (soft delete)
 * @route   DELETE /api/categories/:id
 * @access  Private (Admin only)
 */
exports.deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findById(req.params.id);

    if (!category) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'CATEGORY_NOT_FOUND',
          message: 'Category not found'
        }
      });
    }

    // Check if category has subcategories
    const subcategories = await Category.findOne({ 
      parentCategory: category._id,
      isActive: true 
    });

    if (subcategories) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'HAS_SUBCATEGORIES',
          message: 'Cannot delete category with active subcategories'
        }
      });
    }

    // Soft delete
    category.isActive = false;
    await category.save();

    // Emit WebSocket event for real-time updates
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      
      if (io) {
        io.to('admin').emit('category:deleted', {
          type: 'CATEGORY_DELETED',
          category: {
            _id: category._id,
            categoryId: category.categoryId,
            name: category.name,
            slug: category.slug,
            isActive: false
          },
          timestamp: new Date()
        });
        
        // Also emit to public users
        io.emit('category:deleted', {
          type: 'CATEGORY_DELETED',
          categoryId: category._id,
          slug: category.slug,
          timestamp: new Date()
        });
        
        console.log(`✅ Category deleted and broadcasted: ${category.slug}`);
      }
    } catch (socketError) {
      console.error('Failed to emit WebSocket event:', socketError);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Category deleted successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Bulk update category display order
 * @route   PUT /api/categories/bulk/reorder
 * @access  Private (Admin only)
 */
exports.bulkReorderCategories = async (req, res, next) => {
  try {
    const { categories } = req.body;

    if (!categories || !Array.isArray(categories)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_DATA',
          message: 'Categories array is required'
        }
      });
    }

    // Update display order for each category
    const updatePromises = categories.map((cat) =>
      Category.findByIdAndUpdate(cat._id, { displayOrder: cat.displayOrder })
    );

    await Promise.all(updatePromises);

    // Emit WebSocket event for real-time updates
    try {
      const { getIO } = require('../socket');
      const io = getIO();
      
      if (io) {
        io.to('admin').emit('category:reordered', {
          type: 'CATEGORY_REORDERED',
          categories: categories.map(cat => ({
            _id: cat._id,
            displayOrder: cat.displayOrder
          })),
          timestamp: new Date()
        });
        
        console.log(`✅ Categories reordered and broadcasted`);
      }
    } catch (socketError) {
      console.error('Failed to emit WebSocket event:', socketError);
    }

    res.status(200).json({
      success: true,
      data: {
        message: 'Categories reordered successfully'
      }
    });
  } catch (error) {
    next(error);
  }
};

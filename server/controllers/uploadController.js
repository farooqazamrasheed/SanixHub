const { processImage, createThumbnail } = require('../utils/imageProcessor');
const path = require('path');

/**
 * @desc    Upload product images
 * @route   POST /api/upload/products
 * @access  Private (Admin only)
 */
exports.uploadProductImages = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'NO_FILES',
          message: 'No files uploaded',
        },
      });
    }

    const processedImages = [];

    for (const file of req.files) {
      try {
        // Process image (resize and optimize)
        const processedPath = await processImage(file.path, {
          width: 1000,
          height: 1000,
          quality: 85,
          format: 'webp',
        });

        // Create thumbnail
        const thumbnailPath = await createThumbnail(processedPath, 300);

        // Get relative paths for database storage
        const relativePath = processedPath.replace(/\\/g, '/').replace('uploads/', '');
        const relativeThumbnailPath = thumbnailPath.replace(/\\/g, '/').replace('uploads/', '');

        // Get base URL from environment or use default
        const baseUrl = process.env.BASE_URL || 'http://localhost:5000';

        processedImages.push({
          url: `${baseUrl}/uploads/${relativePath}`,
          thumbnail: `${baseUrl}/uploads/${relativeThumbnailPath}`,
          filename: path.basename(processedPath),
        });
      } catch (error) {
        console.error('Error processing image:', error);
      }
    }

    res.status(200).json({
      success: true,
      data: {
        images: processedImages,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Delete uploaded image
 * @route   DELETE /api/upload/:filename
 * @access  Private (Admin only)
 */
exports.deleteImage = async (req, res, next) => {
  try {
    const { filename } = req.params;
    const filePath = path.join('./uploads/products', filename);

    const { deleteImage } = require('../utils/imageProcessor');
    await deleteImage(filePath);

    res.status(200).json({
      success: true,
      data: {
        message: 'Image deleted successfully',
      },
    });
  } catch (error) {
    next(error);
  }
};

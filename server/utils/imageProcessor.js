const sharp = require('sharp');
const path = require('path');
const fs = require('fs').promises;

/**
 * Process and optimize uploaded image
 * @param {string} filePath - Path to the uploaded file
 * @param {Object} options - Processing options
 * @returns {Promise<string>} - Path to processed image
 */
async function processImage(filePath, options = {}) {
  const {
    width = 800,
    height = 800,
    quality = 80,
    format = 'webp',
  } = options;

  const ext = path.extname(filePath);
  const filename = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  
  const outputPath = path.join(dir, `${filename}.${format}`);

  try {
    await sharp(filePath)
      .resize(width, height, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .toFormat(format, { quality })
      .toFile(outputPath);

    // Delete original file if format changed
    if (format !== ext.substring(1)) {
      await fs.unlink(filePath);
    }

    return outputPath;
  } catch (error) {
    console.error('Error processing image:', error);
    throw error;
  }
}

/**
 * Create thumbnail from image
 * @param {string} filePath - Path to the image file
 * @param {number} size - Thumbnail size
 * @returns {Promise<string>} - Path to thumbnail
 */
async function createThumbnail(filePath, size = 200) {
  const ext = path.extname(filePath);
  const filename = path.basename(filePath, ext);
  const dir = path.dirname(filePath);
  
  const thumbnailPath = path.join(dir, `${filename}_thumb${ext}`);

  try {
    await sharp(filePath)
      .resize(size, size, {
        fit: 'cover',
        position: 'center',
      })
      .toFile(thumbnailPath);

    return thumbnailPath;
  } catch (error) {
    console.error('Error creating thumbnail:', error);
    throw error;
  }
}

/**
 * Process multiple images
 * @param {Array} files - Array of file objects
 * @param {Object} options - Processing options
 * @returns {Promise<Array>} - Array of processed image paths
 */
async function processMultipleImages(files, options = {}) {
  const promises = files.map(file => processImage(file.path, options));
  return Promise.all(promises);
}

/**
 * Delete image file
 * @param {string} filePath - Path to the file
 */
async function deleteImage(filePath) {
  try {
    await fs.unlink(filePath);
    
    // Also try to delete thumbnail if exists
    const ext = path.extname(filePath);
    const filename = path.basename(filePath, ext);
    const dir = path.dirname(filePath);
    const thumbnailPath = path.join(dir, `${filename}_thumb${ext}`);
    
    try {
      await fs.unlink(thumbnailPath);
    } catch (err) {
      // Thumbnail might not exist, that's okay
    }
  } catch (error) {
    console.error('Error deleting image:', error);
    throw error;
  }
}

module.exports = {
  processImage,
  createThumbnail,
  processMultipleImages,
  deleteImage,
};

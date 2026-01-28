const express = require('express');
const router = express.Router();
const { uploadProductImages, deleteImage } = require('../controllers/uploadController');
const { protect, authorize } = require('../middleware/auth');
const upload = require('../middleware/upload');

// All upload routes require admin access
router.use(protect, authorize('superadmin'));

// Upload product images (max 5 files)
router.post('/products', upload.array('images', 5), uploadProductImages);

// Delete image
router.delete('/:filename', deleteImage);

module.exports = router;

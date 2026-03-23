const router = require('express').Router();
const { authenticate } = require('../middleware/auth');
const { upload } = require('../middleware/upload');
const { sendSuccess, sendError } = require('../utils/response');

// POST /api/uploads — single image upload
router.post(
  '/',
  authenticate,
  (req, res, next) => {
    upload.single('image')(req, res, (err) => {
      if (err) {
        const msg = err.code === 'LIMIT_FILE_SIZE'
          ? 'File too large — max 5 MB'
          : err.message || 'Upload failed';
        return sendError(res, msg, 400);
      }
      next();
    });
  },
  (req, res) => {
    if (!req.file) return sendError(res, 'No image file provided', 400);
    const url = `/uploads/${req.file.filename}`;
    return sendSuccess(res, 'Image uploaded', { url, filename: req.file.filename });
  }
);

module.exports = router;

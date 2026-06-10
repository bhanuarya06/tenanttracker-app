const multer = require('multer');
const path = require('path');
const crypto = require('crypto');

const UPLOAD_DIR = path.join(__dirname, '../../uploads');

const ALLOWED_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
};

const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5 MB

const fileFilter = (_req, file, cb) => {
  if (ALLOWED_TYPES[file.mimetype]) {
    cb(null, true);
  } else {
    cb(new Error('Only JPEG, PNG, and WebP images are allowed'), false);
  }
};

let storage;

if (process.env.UPLOADS_BUCKET) {
  // Lambda: store in S3 under uploads/ prefix
  const { S3Client } = require('@aws-sdk/client-s3');
  const multerS3 = require('multer-s3');
  const s3 = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });

  storage = multerS3({
    s3,
    bucket: process.env.UPLOADS_BUCKET,
    contentType: multerS3.AUTO_CONTENT_TYPE,
    key: (_req, file, cb) => {
      const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
      cb(null, `uploads/${crypto.randomUUID()}${ext}`);
    },
  });
} else {
  // Local / ECS: store on disk
  storage = multer.diskStorage({
    destination: (_req, _file, cb) => cb(null, UPLOAD_DIR),
    filename: (_req, file, cb) => {
      const ext = ALLOWED_TYPES[file.mimetype] || path.extname(file.originalname);
      cb(null, `${crypto.randomUUID()}${ext}`);
    },
  });
}

const upload = multer({ storage, fileFilter, limits: { fileSize: MAX_FILE_SIZE } });

module.exports = { upload, UPLOAD_DIR };

import multer from 'multer';
import fs from 'fs';
import path from 'path';

// Ensure base upload directory exists
const baseDir = path.join(process.cwd(), 'uploads', 'images');
if (!fs.existsSync(baseDir)) {
  fs.mkdirSync(baseDir, { recursive: true });
}

// Disk storage strategy
const storage = multer.diskStorage({
  destination: function (_req, _file, cb) {
    cb(null, baseDir);
  },
  filename: function (_req, file, cb) {
    const timestamp = Date.now();
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${timestamp}_${safeName}`);
  }
});

// Accept common image mime types
const allowed = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/bmp',
  'image/heic',
  'image/tiff'
]);

function fileFilter(_req, file, cb) {
  if (allowed.has(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Unsupported image type'));
  }
}

// 100 MB max image size
export const imageUpload = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: 100 * 1024 * 1024 // 100MB
  }
});



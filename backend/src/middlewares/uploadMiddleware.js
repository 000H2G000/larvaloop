import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import multer from 'multer';
import { config } from '../config/environment.js';
import { ApiError } from '../utils/ApiError.js';

const EXTENSIONS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp' };

export const IMAGES_SUBDIR = 'images';

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    const dir = path.join(config.uploads.dir, IMAGES_SUBDIR);
    fs.mkdir(dir, { recursive: true }, (err) => cb(err, dir));
  },
  // Random server-side names: the client's filename never touches the filesystem.
  filename: (_req, file, cb) => cb(null, `${Date.now()}-${crypto.randomUUID()}${EXTENSIONS[file.mimetype]}`),
});

const upload = multer({
  storage,
  limits: { fileSize: config.uploads.maxBytes, files: 1 },
  fileFilter: (_req, file, cb) => {
    if (EXTENSIONS[file.mimetype]) return cb(null, true);
    cb(new ApiError(415, 'Only JPEG, PNG or WebP images are accepted', { code: 'UNSUPPORTED_MEDIA_TYPE' }));
  },
});

/** Single image in multipart field "image". Translates multer errors into ApiError. */
export const uploadImage = (req, res, next) => {
  upload.single('image')(req, res, (err) => {
    if (!err) {
      if (!req.file) return next(ApiError.badRequest('Missing file in multipart field "image"'));
      return next();
    }
    if (err instanceof multer.MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return next(new ApiError(413, `Image larger than ${config.uploads.maxBytes / 1024 / 1024} MB`, { code: 'PAYLOAD_TOO_LARGE' }));
      }
      return next(ApiError.badRequest(err.message, { code: 'UPLOAD_ERROR' }));
    }
    next(err);
  });
};

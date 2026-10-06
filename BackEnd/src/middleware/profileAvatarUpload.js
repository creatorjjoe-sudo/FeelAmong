const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const uploadDirectory = path.resolve(__dirname, '../../uploads/avatars');
const imageExtensions = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/gif': '.gif'
};

fs.mkdirSync(uploadDirectory, { recursive: true });

const upload = multer({
  storage: multer.diskStorage({
    destination: uploadDirectory,
    filename: (req, file, callback) => {
      callback(null, `${crypto.randomUUID()}${imageExtensions[file.mimetype] || ''}`);
    }
  }),
  limits: { fileSize: MAX_AVATAR_SIZE, files: 1 },
  fileFilter: (req, file, callback) => {
    if (!imageExtensions[file.mimetype]) {
      callback(new Error('Choose a JPEG, PNG, WebP, or GIF image.'));
      return;
    }
    callback(null, true);
  }
});

const uploadProfileAvatar = (req, res, next) => {
  upload.single('avatar')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    const message = error instanceof multer.MulterError
      ? error.code === 'LIMIT_FILE_SIZE'
        ? 'Profile pictures must be smaller than 5 MB.'
        : 'Choose one profile picture.'
      : error.message === 'Choose a JPEG, PNG, WebP, or GIF image.'
        ? error.message
        : 'Could not upload the profile picture.';
    res.status(400).json({ message });
  });
};

module.exports = { uploadProfileAvatar, uploadDirectory };

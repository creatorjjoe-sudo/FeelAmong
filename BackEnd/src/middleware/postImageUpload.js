const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_COUNT = 25;
const uploadDirectory = path.resolve(__dirname, '../../uploads/posts');

fs.mkdirSync(uploadDirectory, { recursive: true });

const storage = multer.diskStorage({
  destination: uploadDirectory,
  filename: (req, file, callback) => {
    callback(null, `${crypto.randomUUID()}${path.extname(file.originalname).toLowerCase()}`);
  }
});

const upload = multer({
  storage,
  limits: {
    fileSize: MAX_IMAGE_SIZE,
    files: MAX_IMAGE_COUNT
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('image/')) {
      callback(new Error('Only image files can be uploaded.'));
      return;
    }
    callback(null, true);
  }
});

const uploadPostImages = (req, res, next) => {
  upload.array('images', MAX_IMAGE_COUNT)(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'Each image must be smaller than 2 MB.'
        : `You can attach up to ${MAX_IMAGE_COUNT} images.`;
      res.status(400).json({ message });
      return;
    }

    if (error.message === 'Only image files can be uploaded.') {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Could not upload images.' });
  });
};

module.exports = { uploadPostImages };

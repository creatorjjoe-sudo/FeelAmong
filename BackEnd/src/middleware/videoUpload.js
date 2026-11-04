const crypto = require('crypto');
const fs = require('fs');
const multer = require('multer');
const path = require('path');

const MAX_VIDEO_SIZE = 50 * 1024 * 1024; // 50 MB
const uploadDirectory = path.resolve(__dirname, '../../uploads/videos');

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
    fileSize: MAX_VIDEO_SIZE,
    files: 1
  },
  fileFilter: (req, file, callback) => {
    if (!file.mimetype.startsWith('video/')) {
      callback(new Error('Only video files can be uploaded.'));
      return;
    }
    callback(null, true);
  }
});

const uploadVideo = (req, res, next) => {
  upload.single('video')(req, res, (error) => {
    if (!error) {
      next();
      return;
    }

    if (error instanceof multer.MulterError) {
      const message = error.code === 'LIMIT_FILE_SIZE'
        ? 'The video must be smaller than 50 MB.'
        : 'Only one video can be uploaded.';
      res.status(400).json({ message });
      return;
    }

    if (error.message === 'Only video files can be uploaded.') {
      res.status(400).json({ message: error.message });
      return;
    }

    res.status(500).json({ message: 'Could not upload the video.' });
  });
};

module.exports = { uploadVideo };

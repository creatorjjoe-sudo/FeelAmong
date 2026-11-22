const multer = require('multer');
const { uploadBuffer, deleteUploadedFiles } = require('../services/mediaStorage');

function createCloudinaryUpload({
  fieldName,
  folder,
  resourceType,
  maxFileSize,
  maxFiles,
  isAllowedFile,
  invalidFileMessage,
  fileSizeMessage,
  maxFilesMessage
}) {
  const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: maxFileSize, files: maxFiles },
    fileFilter: (req, file, callback) => {
      if (!isAllowedFile(file)) {
        callback(new Error(invalidFileMessage));
        return;
      }
      callback(null, true);
    }
  });
  const parseUpload = maxFiles === 1
    ? upload.single(fieldName)
    : upload.array(fieldName, maxFiles);

  return (req, res, next) => {
    parseUpload(req, res, async (parseError) => {
      if (parseError) {
        if (parseError instanceof multer.MulterError) {
          const message = parseError.code === 'LIMIT_FILE_SIZE'
            ? fileSizeMessage
            : maxFilesMessage;
          res.status(400).json({ message });
          return;
        }
        if (parseError.message === invalidFileMessage) {
          res.status(400).json({ message: invalidFileMessage });
          return;
        }
        res.status(500).json({ message: 'Could not process the uploaded file.' });
        return;
      }

      const files = maxFiles === 1
        ? (req.file ? [req.file] : [])
        : (req.files || []);

      try {
        for (const file of files) {
          file.cloudinaryAsset = await uploadBuffer(file, folder, resourceType);
          file.buffer = undefined;
        }
      } catch (error) {
        await deleteUploadedFiles(files);
        if (error.code === 'CLOUDINARY_CONFIG_MISSING') {
          res.status(503).json({ message: error.message });
          return;
        }
        console.error('Cloudinary upload failed:', error.message);
        res.status(502).json({ message: 'Could not upload media to Cloudinary.' });
        return;
      }

      next();
    });
  };
}

module.exports = createCloudinaryUpload;

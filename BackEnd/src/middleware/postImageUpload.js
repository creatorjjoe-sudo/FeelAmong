const createCloudinaryUpload = require('./cloudinaryUpload');

const MAX_IMAGE_SIZE = 2 * 1024 * 1024;
const MAX_IMAGE_COUNT = 25;

const uploadPostImages = createCloudinaryUpload({
  fieldName: 'images',
  folder: 'posts',
  resourceType: 'image',
  maxFileSize: MAX_IMAGE_SIZE,
  maxFiles: MAX_IMAGE_COUNT,
  isAllowedFile: (file) => file.mimetype.startsWith('image/'),
  invalidFileMessage: 'Only image files can be uploaded.',
  fileSizeMessage: 'Each image must be smaller than 2 MB.',
  maxFilesMessage: `You can attach up to ${MAX_IMAGE_COUNT} images.`
});

module.exports = { uploadPostImages };

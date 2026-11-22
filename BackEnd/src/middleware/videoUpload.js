const createCloudinaryUpload = require('./cloudinaryUpload');

const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

const uploadVideo = createCloudinaryUpload({
  fieldName: 'video',
  folder: 'videos',
  resourceType: 'video',
  maxFileSize: MAX_VIDEO_SIZE,
  maxFiles: 1,
  isAllowedFile: (file) => file.mimetype.startsWith('video/'),
  invalidFileMessage: 'Only video files can be uploaded.',
  fileSizeMessage: 'The video must be smaller than 50 MB.',
  maxFilesMessage: 'Only one video can be uploaded.'
});

module.exports = { uploadVideo };

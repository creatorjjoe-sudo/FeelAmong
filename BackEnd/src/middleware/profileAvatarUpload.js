const createCloudinaryUpload = require('./cloudinaryUpload');

const MAX_AVATAR_SIZE = 5 * 1024 * 1024;
const imageTypes = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);

const uploadProfileAvatar = createCloudinaryUpload({
  fieldName: 'avatar',
  folder: 'avatars',
  resourceType: 'image',
  maxFileSize: MAX_AVATAR_SIZE,
  maxFiles: 1,
  isAllowedFile: (file) => imageTypes.has(file.mimetype),
  invalidFileMessage: 'Choose a JPEG, PNG, WebP, or GIF image.',
  fileSizeMessage: 'Profile pictures must be smaller than 5 MB.',
  maxFilesMessage: 'Choose one profile picture.'
});

module.exports = { uploadProfileAvatar };

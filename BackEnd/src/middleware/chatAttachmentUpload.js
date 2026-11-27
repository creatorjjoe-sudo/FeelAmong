const createCloudinaryUpload = require('./cloudinaryUpload');

const MAX_ATTACHMENT_SIZE = 10 * 1024 * 1024;
const MAX_ATTACHMENT_COUNT = 10;
const IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp'
]);

const uploadChatAttachments = createCloudinaryUpload({
  fieldName: 'attachments',
  folder: 'chat',
  resourceType: (file) => IMAGE_MIME_TYPES.has(file.mimetype) ? 'image' : 'raw',
  maxFileSize: MAX_ATTACHMENT_SIZE,
  maxFiles: MAX_ATTACHMENT_COUNT,
  isAllowedFile: (file) => IMAGE_MIME_TYPES.has(file.mimetype)
    || (typeof file.mimetype === 'string' && !file.mimetype.startsWith('image/')),
  invalidFileMessage: 'Choose a supported image or a non-image file.',
  fileSizeMessage: 'Each chat attachment must be 10 MB or smaller.',
  maxFilesMessage: `You can attach up to ${MAX_ATTACHMENT_COUNT} files.`
});

module.exports = { uploadChatAttachments };

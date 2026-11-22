const fs = require('fs');
const path = require('path');
const { randomUUID } = require('crypto');
const { v2: cloudinary } = require('cloudinary');

const CLOUDINARY_HOST = 'res.cloudinary.com';

function configureCloudinary() {
  const { CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET } = process.env;
  if (!CLOUDINARY_CLOUD_NAME || !CLOUDINARY_API_KEY || !CLOUDINARY_API_SECRET) {
    const error = new Error(
      'Cloudinary is not configured. Set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
    );
    error.code = 'CLOUDINARY_CONFIG_MISSING';
    throw error;
  }

  cloudinary.config({
    cloud_name: CLOUDINARY_CLOUD_NAME,
    api_key: CLOUDINARY_API_KEY,
    api_secret: CLOUDINARY_API_SECRET,
    secure: true
  });
}

function uploadBuffer(file, folder, resourceType) {
  configureCloudinary();

  return new Promise((resolve, reject) => {
    const uploadStream = cloudinary.uploader.upload_stream({
      folder: `feelamong/${folder}`,
      public_id: randomUUID(),
      resource_type: resourceType,
      overwrite: false
    }, (error, result) => {
      if (error) {
        reject(error);
        return;
      }
      resolve({
        url: result.secure_url,
        publicId: result.public_id,
        resourceType
      });
    });

    uploadStream.end(file.buffer);
  });
}

async function deleteCloudinaryAsset(publicId, resourceType) {
  configureCloudinary();
  const result = await cloudinary.uploader.destroy(publicId, {
    resource_type: resourceType,
    invalidate: true
  });
  if (result.result !== 'ok' && result.result !== 'not found') {
    throw new Error(`Cloudinary did not delete asset ${publicId}: ${result.result}`);
  }
}

async function deleteUploadedFile(file) {
  if (file?.cloudinaryAsset) {
    const { publicId, resourceType } = file.cloudinaryAsset;
    await deleteCloudinaryAsset(publicId, resourceType);
    return;
  }

  if (file?.path) {
    try {
      await fs.promises.unlink(file.path);
    } catch (error) {
      if (error.code !== 'ENOENT') throw error;
    }
  }
}

function getCloudinaryPublicId(url, resourceType) {
  let parsedUrl;
  try {
    parsedUrl = new URL(url);
  } catch {
    return null;
  }
  if (parsedUrl.hostname !== CLOUDINARY_HOST) return null;

  const uploadPath = parsedUrl.pathname.split(`/${resourceType}/upload/`)[1];
  if (!uploadPath) return null;
  const publicIdWithExtension = uploadPath.replace(/^v\d+\//, '');
  const publicId = publicIdWithExtension.replace(/\.[^/.]+$/, '');
  if (!publicId) return null;
  try {
    return decodeURIComponent(publicId);
  } catch {
    return null;
  }
}

async function deleteStoredMedia(url, resourceType) {
  if (typeof url !== 'string') return;

  const publicId = getCloudinaryPublicId(url, resourceType);
  if (publicId) {
    await deleteCloudinaryAsset(publicId, resourceType);
    return;
  }

  if (!url.startsWith('/uploads/')) return;
  const category = resourceType === 'video' ? 'videos' : url.startsWith('/uploads/avatars/') ? 'avatars' : 'posts';
  const uploadDirectory = path.resolve(__dirname, `../../uploads/${category}`);
  const filePath = path.resolve(uploadDirectory, path.basename(url));
  if (path.dirname(filePath) !== uploadDirectory) return;

  try {
    await fs.promises.unlink(filePath);
  } catch (error) {
    if (error.code !== 'ENOENT') throw error;
  }
}

async function deleteUploadedFiles(files) {
  const results = await Promise.allSettled(files.map(deleteUploadedFile));
  results.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Could not remove uploaded media:', result.reason.message);
    }
  });
}

module.exports = {
  uploadBuffer,
  deleteUploadedFile,
  deleteUploadedFiles,
  deleteStoredMedia,
  getCloudinaryPublicId
};

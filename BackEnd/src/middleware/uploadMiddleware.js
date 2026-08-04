import multer from 'multer';
import path from 'path';

// Define where files should land and how they should be named
const storage = multer.diskStorage({
 destination: (req, file, cb) => {
  cb(null, 'uploads/'); // Make sure to create this folder in your backend root directory!
 },
 filename: (req, file, cb) => {
  // Generates unique name: fieldname-timestamp.extension
  cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`);
 }
});

// File validation filter checking image extensions
const fileFilter = (req, file, cb) => {
 const filetypes = /jpeg|jpg|png|webp/;
 const extname = filetypes.test(path.extname(file.originalname).toLowerCase());
 const mimetype = filetypes.test(file.mimetype);

 if (extname && mimetype) {
  return cb(null, true);
 } else {
  cb(new Error('Images files only are permitted (.jpg, .jpeg, .png, .webp)'));
 }
};

const upload = multer({
 storage,
 fileFilter,
 limits: { fileSize: 5 * 1024 * 1024 } // 5MB File Limit maximum rule allocation
});

export default upload;

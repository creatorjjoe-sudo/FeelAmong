import express from 'express';
import { signup, signin, getAllUsers, updateProfile } from '../controllers/authcontroller.js';
import { protect } from '../middleware/authmiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/users', protect, getAllUsers);

// Profile patch endpoint mapping configuration passing upload middleware layer explicitly
router.put('/profile', protect, upload.single('profilePic'), updateProfile);

export default router;

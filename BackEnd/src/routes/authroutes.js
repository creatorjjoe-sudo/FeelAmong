const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getLoginPreview, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/login-preview', getLoginPreview);
router.get('/profile', protect, getProfile);

module.exports = router;
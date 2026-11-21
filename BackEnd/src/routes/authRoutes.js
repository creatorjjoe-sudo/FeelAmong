const express = require('express');
const router = express.Router();
const { registerUser, loginUser, getLoginPreview, getProfile, forgotPassword, verifyResetCode, resetPassword } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/login-preview', getLoginPreview);
router.get('/profile', protect, getProfile);

// Password reset flow
router.post('/forgot-password', forgotPassword);
router.post('/verify-reset-code', verifyResetCode);
router.post('/reset-password', resetPassword);

module.exports = router;
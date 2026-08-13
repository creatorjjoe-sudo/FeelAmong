const express = require('express');
const router = express.Router();
const { registerUser, loginUser, guestLogin, getProfile } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);
router.get('/profile', protect, getProfile);

module.exports = router;
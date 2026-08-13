const express = require('express');
const router = express.Router();
const {
  registerUser,
  loginUser,
  guestLogin,
} = require('../controllers/authController');

router.post('/signup', registerUser);
router.post('/login', loginUser);
router.post('/guest', guestLogin);

module.exports = router;
const express = require('express');
const { getPublicProfile, updateProfile, reportUser, updateFriendship } = require('../controllers/userController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfileAvatar } = require('../middleware/profileAvatarUpload');

const router = express.Router();

router.get('/:id', getPublicProfile);
router.patch('/:id', protect, uploadProfileAvatar, updateProfile);
router.post('/:id/report', protect, reportUser);
router.put('/:id/friend', protect, updateFriendship);
router.delete('/:id/friend', protect, updateFriendship);

module.exports = router;

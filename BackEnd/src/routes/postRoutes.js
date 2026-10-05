const express = require('express');
const router = express.Router();
const { createPost, getPosts, toggleLikePost } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPostImages } = require('../middleware/postImageUpload');

router.route('/').get(getPosts).post(protect, uploadPostImages, createPost);
router.put('/:id/like', protect, toggleLikePost);

module.exports = router;
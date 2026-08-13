const express = require('express');
const router = express.Router();
const { createPost, getPosts, toggleLikePost } = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(getPosts).post(protect, createPost);
router.put('/:id/like', protect, toggleLikePost);

module.exports = router;
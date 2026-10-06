const express = require('express');
const router = express.Router();
const {
  createPost,
  getPosts,
  getPostForEdit,
  updatePost,
  deletePost,
  toggleLikePost,
  toggleSavePost,
  addComment,
  reportPost,
  incrementShareCount
} = require('../controllers/postController');
const { protect } = require('../middleware/authMiddleware');
const { uploadPostImages } = require('../middleware/postImageUpload');

router.route('/').get(getPosts).post(protect, uploadPostImages, createPost);
router.get('/:id/edit', protect, getPostForEdit);
router.patch('/:id', protect, uploadPostImages, updatePost);
router.delete('/:id', protect, deletePost);
router.put('/:id/like', protect, toggleLikePost);
router.put('/:id/save', protect, toggleSavePost);
router.post('/:id/comments', protect, addComment);
router.post('/:id/report', protect, reportPost);
router.post('/:id/share', incrementShareCount);

module.exports = router;
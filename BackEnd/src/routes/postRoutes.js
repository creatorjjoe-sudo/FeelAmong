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
  addCommentReply,
  toggleCommentLike,
  reportPost,
  incrementShareCount,
  createSharedPost
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
router.post('/:id/comments/:commentId/replies', protect, addCommentReply);
router.put('/:id/comments/:commentId/like', protect, toggleCommentLike);
router.post('/:id/report', protect, reportPost);
router.post('/:id/share', incrementShareCount);
router.post('/:id/repost', protect, createSharedPost);

module.exports = router;
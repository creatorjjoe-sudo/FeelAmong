const express = require('express');
const router = express.Router();
const {
  getVideos,
  createVideo,
  toggleVideoLike,
  addVideoComment,
  addVideoCommentReply,
  toggleVideoCommentLike,
  shareVideo,
  reportVideo,
  toggleNotInterested
} = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const { uploadVideo } = require('../middleware/videoUpload');

const requireCompanyAccount = (req, res, next) => {
  if (!req.user.isCompany) {
    return res.status(403).json({ message: 'Switch to a company account to create videos' });
  }
  next();
};

router.route('/').get(getVideos).post(protect, requireCompanyAccount, uploadVideo, createVideo);
router.put('/:id/like', protect, toggleVideoLike);
router.post('/:id/comments', protect, addVideoComment);
router.post('/:id/comments/:commentId/replies', protect, addVideoCommentReply);
router.put('/:id/comments/:commentId/like', protect, toggleVideoCommentLike);
router.post('/:id/share', protect, shareVideo);
router.post('/:id/report', protect, reportVideo);
router.put('/:id/not-interested', protect, toggleNotInterested);

module.exports = router;
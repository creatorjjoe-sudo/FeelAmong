const express = require('express');
const router = express.Router();
const { getVideos, createVideo, toggleVideoLike, addVideoComment, shareVideo, reportVideo, toggleNotInterested } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');
const { uploadVideo } = require('../middleware/videoUpload');

router.route('/').get(getVideos).post(protect, uploadVideo, createVideo);
router.put('/:id/like', protect, toggleVideoLike);
router.post('/:id/comments', protect, addVideoComment);
router.post('/:id/share', protect, shareVideo);
router.post('/:id/report', protect, reportVideo);
router.put('/:id/not-interested', protect, toggleNotInterested);

module.exports = router;
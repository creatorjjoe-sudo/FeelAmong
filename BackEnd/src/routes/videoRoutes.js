const express = require('express');
const router = express.Router();
const { getVideos, createVideo } = require('../controllers/videoController');
const { protect } = require('../middleware/authMiddleware');

router.route('/').get(getVideos).post(protect, createVideo);

module.exports = router;
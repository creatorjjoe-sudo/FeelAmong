const Video = require('../models/Video');

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('user', 'username avatar sex')
      .sort({ createdAt: -1 });
    res.json(videos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createVideo = async (req, res) => {
  try {
    const { videoUrl, caption } = req.body;
    if (!videoUrl) return res.status(400).json({ message: 'Video URL required' });

    const video = await Video.create({
      user: req.user._id,
      videoUrl,
      caption
    });

    res.status(201).json(video);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getVideos, createVideo };
const Video = require('../models/Video');
const VideoReport = require('../models/VideoReport');

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('user', 'username avatar sex')
      .populate('comments.user', 'username avatar sex')
      .sort({ createdAt: -1 });
    // Hide videos the caller marked as not interested.
    const visibleVideos = req.user && req.user._id
      ? videos.filter((video) => !video.notInterestedBy?.some((id) => String(id) === String(req.user._id)))
      : videos;
    res.json(visibleVideos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createVideo = async (req, res) => {
  try {
    // Accept either a file upload (multer puts it in req.file) or a raw videoUrl.
    const videoUrl = req.file ? `/uploads/videos/${req.file.filename}` : req.body.videoUrl;
    const { caption } = req.body;
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

const { createNotification } = require('../services/notificationService');

// Like / Unlike a video
const toggleVideoLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const isLiked = video.likes.includes(req.user._id);
    if (isLiked) {
      video.likes = video.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      video.likes.push(req.user._id);
    }

    await video.save();

    // Notify the video owner that someone liked their video
    if (!isLiked) {
      await createNotification({
        recipient: video.user,
        actor: req.user._id,
        type: 'video_like',
        target: video._id,
        targetModel: 'Video'
      });
    }

    res.json({
      videoId: video._id,
      likesCount: video.likes.length,
      userId: req.user._id,
      isLiked: !isLiked
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Add a comment to a video
const addVideoComment = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ message: 'Comment must be 1000 characters or fewer' });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    video.comments.push({ user: req.user._id, text });
    await video.save();
    const commentIndex = video.comments.length - 1;
    await video.populate(`comments.${commentIndex}.user`, 'username avatar sex');
    const comment = video.comments[commentIndex];

    // Notify the video owner about the new comment
    await createNotification({
      recipient: video.user,
      actor: req.user._id,
      type: 'video_comment',
      target: video._id,
      targetModel: 'Video',
      text: text.length > 80 ? `${text.slice(0, 80)}…` : text
    });

    res.status(201).json({ videoId: video._id, comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Share a video (increments the share counter)
const shareVideo = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    video.sharesCount += 1;
    await video.save();

    res.json({ videoId: video._id, sharesCount: video.sharesCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Report a video
const reportVideo = async (req, res) => {
  try {
    const reason = typeof req.body.reason === 'string' ? req.body.reason.trim() : '';
    const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Select a valid report reason' });
    }
    if (details.length > 1000) {
      return res.status(400).json({ message: 'Report details must be 1000 characters or fewer' });
    }

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });
    if (String(video.user) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot report your own video' });
    }

    const report = await VideoReport.findOneAndUpdate(
      { video: video._id, reporter: req.user._id },
      { reason, details },
      { new: true, upsert: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Report submitted', reportId: report._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Mark a video as not interested (hides it from the caller's feed)
const toggleNotInterested = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const userIdString = req.user._id.toString();
    const isMarked = video.notInterestedBy.some((id) => id.toString() === userIdString);
    if (isMarked) {
      video.notInterestedBy = video.notInterestedBy.filter((id) => id.toString() !== userIdString);
    } else {
      video.notInterestedBy.push(req.user._id);
    }

    await video.save();
    res.json({ videoId: video._id, isNotInterested: !isMarked });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getVideos, createVideo, toggleVideoLike, addVideoComment, shareVideo, reportVideo, toggleNotInterested };
const Video = require('../models/Video');
const VideoReport = require('../models/VideoReport');
const User = require('../models/User');
const { deleteUploadedFiles } = require('../services/mediaStorage');
const VIDEO_VISIBILITIES = ['public', 'private', 'friends'];

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];

const getVideos = async (req, res) => {
  try {
    const videos = await Video.find()
      .populate('user', 'username avatar sex isCompany')
      .populate('comments.likes', 'username avatar sex')
      .populate('comments.user', 'username avatar sex')
      .populate('comments.replies.user', 'username avatar sex')
      .populate('comments.replies.likes', 'username avatar sex')
      .populate('comments.replies.replies.user', 'username avatar sex')
      .populate('comments.replies.replies.likes', 'username avatar sex')
      .populate({
        path: 'sharedVideo',
        populate: { path: 'user', select: 'username avatar sex isCompany' }
      })
      .sort({ createdAt: -1 });
    // Hide videos the caller marked as not interested.
    const visibleVideos = req.user && req.user._id
      ? videos.filter((video) => !video.notInterestedBy?.some((id) => String(id) === String(req.user._id)))
      : videos;
    const followingCompanyIds = new Set(
      (req.user?.followingCompanies || []).map((companyId) => String(companyId))
    );
    const responseVideos = visibleVideos.map((video) => {
      const videoData = video.toObject();
      [videoData.user, videoData.sharedVideo?.user].forEach((creator) => {
        if (creator?.isCompany) {
          creator.isFollowing = followingCompanyIds.has(String(creator._id));
        }
      });
      return videoData;
    });
    res.json(responseVideos);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createVideo = async (req, res) => {
  let video;
  try {
    if (!req.user.isCompany) {
      await deleteUploadedFiles(req.file ? [req.file] : []);
      return res.status(403).json({ message: 'Switch to a company account to create videos' });
    }

    // Accept either a file upload (multer puts it in req.file) or a raw videoUrl.
    const videoUrl = req.file ? req.file.cloudinaryAsset.url : req.body.videoUrl;
    const { caption, title, visibility } = req.body;
    if (!videoUrl) {
      await deleteUploadedFiles(req.file ? [req.file] : []);
      return res.status(400).json({ message: 'Video URL required' });
    }

    video = await Video.create({
      user: req.user._id,
      videoUrl,
      title: typeof title === 'string' ? title.trim() : '',
      caption: typeof caption === 'string' ? caption.trim() : '',
      visibility: ['public', 'private', 'friends'].includes(visibility) ? visibility : 'public'
    });

    res.status(201).json(video);
  } catch (error) {
    if (!video) {
      await deleteUploadedFiles(req.file ? [req.file] : []);
    }
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
    await video.populate([
      { path: `comments.${commentIndex}.user`, select: 'username avatar sex' },
      { path: `comments.${commentIndex}.likes`, select: 'username avatar sex' }
    ]);
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

const addVideoCommentReply = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Reply cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ message: 'Reply must be 1000 characters or fewer' });

    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });
    if (req.body.replyToSubReplyId && !req.body.parentReplyId) {
      return res.status(400).json({ message: 'A parent reply is required for sub-reply targets' });
    }

    let reply;
    let replyRecipient = comment.user;
    if (req.body.parentReplyId) {
      const parentReply = comment.replies.id(req.body.parentReplyId);
      if (!parentReply) return res.status(404).json({ message: 'Reply not found' });
      replyRecipient = parentReply.user;
      if (req.body.replyToSubReplyId) {
        const targetSubReply = parentReply.replies.id(req.body.replyToSubReplyId);
        if (!targetSubReply) return res.status(404).json({ message: 'Sub-reply not found' });
        replyRecipient = targetSubReply.user;
      }
      parentReply.replies.push({ user: req.user._id, text });
      reply = parentReply.replies[parentReply.replies.length - 1];
    } else {
      comment.replies.push({ user: req.user._id, text });
      reply = comment.replies[comment.replies.length - 1];
    }

    await video.save();
    await video.populate([
      { path: 'user', select: 'username firstName lastName' },
      { path: 'comments.user', select: 'username avatar sex' },
      { path: 'comments.replies.user', select: 'username avatar sex' },
      { path: 'comments.replies.replies.user', select: 'username avatar sex' }
    ]);
    const savedComment = video.comments.id(comment._id);
    const savedReply = req.body.parentReplyId
      ? savedComment.replies.id(req.body.parentReplyId).replies.id(reply._id)
      : savedComment.replies.id(reply._id);
    const videoOwner = video.user;
    const videoOwnerId = videoOwner?._id || videoOwner;
    const videoOwnerName = [videoOwner?.firstName, videoOwner?.lastName].filter(Boolean).join(' ')
      || videoOwner?.username
      || 'the creator';
    const actorName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ')
      || req.user.username
      || 'Someone';
    const previewText = text.length > 80 ? `${text.slice(0, 80)}…` : text;

    await createNotification({
      recipient: videoOwnerId,
      actor: req.user._id,
      type: 'video_comment',
      target: video._id,
      targetModel: 'Video',
      text: previewText
    });
    if (String(replyRecipient) !== String(videoOwnerId)) {
      await createNotification({
        recipient: replyRecipient,
        actor: req.user._id,
        type: 'comment_reply',
        target: video._id,
        targetModel: 'Video',
        text: previewText,
        message: `${actorName} replied to your comment on ${videoOwnerName}'s video`
      });
    }

    res.status(201).json({
      videoId: video._id,
      commentId: comment._id,
      parentReplyId: req.body.parentReplyId || null,
      reply: savedReply.toObject()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleVideoCommentLike = async (req, res) => {
  try {
    const video = await Video.findById(req.params.id);
    if (!video) return res.status(404).json({ message: 'Video not found' });

    const comment = video.comments.id(req.params.commentId);
    if (!comment) return res.status(404).json({ message: 'Comment not found' });

    let target = comment;
    if (req.body.replyId) {
      target = comment.replies.id(req.body.replyId);
      if (!target) return res.status(404).json({ message: 'Reply not found' });
    }
    if (req.body.subReplyId) {
      if (!req.body.replyId) return res.status(400).json({ message: 'A parent reply is required' });
      target = target.replies.id(req.body.subReplyId);
      if (!target) return res.status(404).json({ message: 'Sub-reply not found' });
    }

    const userId = String(req.user._id);
    const alreadyLiked = target.likes.some((likeId) => String(likeId) === userId);
    target.likes = alreadyLiked
      ? target.likes.filter((likeId) => String(likeId) !== userId)
      : [...target.likes, req.user._id];
    await video.save();

    res.json({
      videoId: video._id,
      commentId: comment._id,
      replyId: req.body.replyId || null,
      subReplyId: req.body.subReplyId || null,
      isLiked: !alreadyLiked,
      likesCount: target.likes.length
    });
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

const createSharedVideo = async (req, res) => {
  try {
    const selectedVideo = await Video.findById(req.params.id);
    if (!selectedVideo) return res.status(404).json({ message: 'Video not found' });

    const sourceVideo = selectedVideo.sharedVideo
      ? await Video.findById(selectedVideo.sharedVideo)
      : selectedVideo;
    if (!sourceVideo) return res.status(404).json({ message: 'Video not found' });

    const ownerId = String(sourceVideo.user);
    const currentUserId = String(req.user._id);
    if (sourceVideo.visibility === 'private' && ownerId !== currentUserId) {
      return res.status(403).json({ message: 'This video cannot be shared' });
    }

    if (sourceVideo.visibility === 'friends' && ownerId !== currentUserId) {
      const owner = await User.findById(sourceVideo.user).select('friends');
      const isFriend = owner?.friends?.some((friendId) => String(friendId) === currentUserId);
      if (!isFriend) return res.status(403).json({ message: 'This video cannot be shared' });
    }

    const visibility = req.body.visibility || 'public';
    const shareCaption = typeof req.body.description === 'string'
      ? req.body.description.trim()
      : '';
    if (!VIDEO_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({ message: 'Visibility must be public, private, or friends' });
    }
    if (shareCaption.length > 1000) {
      return res.status(400).json({ message: 'Description must be 1000 characters or fewer' });
    }

    const updatedSource = await Video.findByIdAndUpdate(
      sourceVideo._id,
      { $inc: { sharesCount: 1 } },
      { new: true, select: 'sharesCount' }
    );
    if (!updatedSource) return res.status(404).json({ message: 'Video not found' });

    let sharedVideo;
    try {
      sharedVideo = await Video.create({
        user: req.user._id,
        videoUrl: sourceVideo.videoUrl,
        sharedVideo: sourceVideo._id,
        shareCaption,
        visibility
      });
    } catch (error) {
      await Video.updateOne({ _id: sourceVideo._id }, { $inc: { sharesCount: -1 } });
      throw error;
    }

    const populatedShare = await Video.findById(sharedVideo._id)
      .populate('user', 'username avatar sex')
      .populate({
        path: 'sharedVideo',
        populate: { path: 'user', select: 'username avatar sex' }
      });

    res.status(201).json({
      video: populatedShare,
      sourceVideoId: sourceVideo._id,
      sharesCount: updatedSource.sharesCount
    });
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

module.exports = {
  getVideos,
  createVideo,
  toggleVideoLike,
  addVideoComment,
  addVideoCommentReply,
  toggleVideoCommentLike,
  shareVideo,
  createSharedVideo,
  reportVideo,
  toggleNotInterested
};
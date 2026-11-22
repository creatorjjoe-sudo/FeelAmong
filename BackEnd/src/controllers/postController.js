const Post = require('../models/Post');
const User = require('../models/User');
const PostReport = require('../models/PostReport');
const SavedItem = require('../models/SavedItem');
const { getIO } = require('../config/socket');
const { deleteUploadedFiles, deleteStoredMedia } = require('../services/mediaStorage');
const POST_VISIBILITIES = ['public', 'private', 'friends'];
const POST_TYPES = ['text', 'image'];
const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];
const TEXT_POST_BACKGROUNDS = new Set([
  'none', '#f1f7f1', '#e5f3ff', '#fff1e6', '#fff8cc', '#f4eaff', '#ffe8ef',
  '#d8f3dc', '#dbeafe', '#1f2937', '#173b35', '#23395d', '#572b4a',
  '#ff0000', '#0000ff', '#009933', '#ff00ff', '#ffff00', '#808080',
  'linear-gradient(135deg, #ff0000, #0000ff)', '#006837',
  'linear-gradient(135deg, #0000ff, #000000)',
  'linear-gradient(135deg, #009933, #000000)',
  'linear-gradient(135deg, #ff00ff, #009933 50%, #808080)',
  'linear-gradient(135deg, #8a00ff, #ff00ff)',
  'linear-gradient(135deg, #ff00ff, #000000)',
  '#003399', '#dff4ef', '#d5efff', '#ffd2d8',
  '#ff8a00', '#00a6a6', '#7b2cbf', '#f4c430', '#e63946', '#2a9d8f', '#457b9d', '#f1c0e8'
]);

async function removeUploadedFiles(files) {
  await deleteUploadedFiles(files);
}

async function removePostImagePaths(imagePaths) {
  const cleanupResults = await Promise.allSettled(
    imagePaths.map((imagePath) => deleteStoredMedia(imagePath, 'image'))
  );

  cleanupResults.forEach((result) => {
    if (result.status === 'rejected') {
      console.error('Could not remove a post image:', result.reason.message);
    }
  });
}

function parseExistingImages(value) {
  if (typeof value !== 'string') return [];
  const parsed = JSON.parse(value);
  if (!Array.isArray(parsed) || parsed.some((imagePath) => typeof imagePath !== 'string')) {
    throw new Error('Existing images must be a list of image paths');
  }
  return parsed;
}


function isOwner(post, userId) {
  return String(post.user) === String(userId);
}

// Create Post
const createPost = async (req, res) => {
  try {
    const { title, description, images, visibility = 'public' } = req.body;
    const postType = req.body.postType || 'image';
    const uploadedFiles = req.files || [];
    if (!POST_TYPES.includes(postType)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Post type must be text or image' });
    }
    if (!POST_VISIBILITIES.includes(visibility)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Visibility must be public, private, or friends' });
    }

    const trimmedTitle = typeof title === 'string' ? title.trim() : '';
    const trimmedDescription = typeof description === 'string' ? description.trim() : '';
    const backgroundColor = postType === 'text' ? (req.body.backgroundColor || '#f1f7f1') : '#f1f7f1';
    if (!TEXT_POST_BACKGROUNDS.has(backgroundColor)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Select a valid text post background' });
    }
    const imagePaths = uploadedFiles.length > 0
      ? uploadedFiles.map((file) => file.cloudinaryAsset.url)
      : (Array.isArray(images) ? images : []);

    if (postType === 'image' && imagePaths.length === 0) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'At least one image is required for image posts' });
    }
    if (postType === 'text' && !trimmedDescription) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Text posts require content' });
    }
    let post;
    try {
      post = await Post.create({
        user: req.user._id,
        postType,
        title: postType === 'image' ? trimmedTitle : '',
        description: trimmedDescription,
        backgroundColor,
        images: imagePaths,
        visibility
      });
    } catch (error) {
      await removeUploadedFiles(uploadedFiles);
      throw error;
    }

    const populatedPost = await post.populate('user', 'username avatar sex');

    // Real-time broadcast for new post added to feed
    try {
      getIO().emit('new_post_created', populatedPost);
    } catch (err) {
      console.log('Socket error:', err.message);
    }

    res.status(201).json(populatedPost);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getPostForEdit = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!isOwner(post, req.user._id)) return res.status(403).json({ message: 'You can only edit your own posts' });
    res.json(post);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updatePost = async (req, res) => {
  const uploadedFiles = req.files || [];
  try {
    const post = await Post.findById(req.params.id);
    if (!post) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(404).json({ message: 'Post not found' });
    }
    if (!isOwner(post, req.user._id)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(403).json({ message: 'You can only edit your own posts' });
    }

    const postType = req.body.postType || post.postType;
    const visibility = req.body.visibility || post.visibility;
    if (!POST_TYPES.includes(postType)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Post type must be text or image' });
    }
    if (!POST_VISIBILITIES.includes(visibility)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Visibility must be public, private, or friends' });
    }

    let retainedImages;
    try {
      retainedImages = parseExistingImages(req.body.existingImages);
    } catch (error) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: error.message });
    }
    const previousImages = post.images.map(String);
    if (retainedImages.some((imagePath) => !previousImages.includes(imagePath))) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'One or more selected images do not belong to this post' });
    }

    const title = typeof req.body.title === 'string' ? req.body.title.trim() : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    const backgroundColor = postType === 'text'
      ? (req.body.backgroundColor || post.backgroundColor || '#f1f7f1')
      : '#f1f7f1';
    if (!TEXT_POST_BACKGROUNDS.has(backgroundColor)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Select a valid text post background' });
    }
    const nextImages = [...retainedImages, ...uploadedFiles.map((file) => file.cloudinaryAsset.url)];
    if (postType === 'image' && nextImages.length === 0) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'At least one image is required for image posts' });
    }
    if (nextImages.length > 25) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'You can attach up to 25 images.' });
    }
    if (postType === 'text' && !description) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Text posts require content' });
    }

    post.postType = postType;
    post.title = postType === 'image' ? title : '';
    post.description = description;
    post.backgroundColor = backgroundColor;
    post.visibility = visibility;
    post.images = nextImages;

    try {
      await post.save();
    } catch (error) {
      await removeUploadedFiles(uploadedFiles);
      throw error;
    }
    await removePostImagePaths(previousImages.filter((imagePath) => !nextImages.includes(imagePath)));
    res.json(await post.populate('user', 'username avatar sex'));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deletePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    if (!isOwner(post, req.user._id)) return res.status(403).json({ message: 'You can only delete your own posts' });

    const imagePaths = post.images.map(String);
    await post.deleteOne();
    await SavedItem.deleteMany({ itemType: 'post', item: post._id });
    await removePostImagePaths(imagePaths);
    res.json({ message: 'Post deleted', postId: post._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleSavePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isSaved = post.saves.some((userId) => String(userId) === String(req.user._id));
    post.saves = isSaved
      ? post.saves.filter((userId) => String(userId) !== String(req.user._id))
      : [...post.saves, req.user._id];
    await post.save();

    res.json({ postId: post._id, isSaved: !isSaved, savesCount: post.saves.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addComment = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Comment cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ message: 'Comment must be 1000 characters or fewer' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });
    post.comments.push({ user: req.user._id, text });
    await post.save();
    const commentIndex = post.comments.length - 1;
    await post.populate(`comments.${commentIndex}.user`, 'username avatar sex');
    const comment = post.comments[commentIndex];

    // Notify the post owner about the new comment
    await createNotification({
      recipient: post.user,
      actor: req.user._id,
      type: 'comment',
      target: post._id,
      targetModel: 'Post',
      text: text.length > 80 ? `${text.slice(0, 80)}…` : text
    });

    res.status(201).json({ postId: post._id, comment });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const addCommentReply = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Reply cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ message: 'Reply must be 1000 characters or fewer' });

    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
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

    await post.save();
    await post.populate([
      { path: 'user', select: 'username firstName lastName' },
      { path: 'comments.user', select: 'username avatar sex' },
      { path: 'comments.replies.user', select: 'username avatar sex' },
      { path: 'comments.replies.replies.user', select: 'username avatar sex' }
    ]);
    const savedComment = post.comments.id(comment._id);
    const savedReply = req.body.parentReplyId
      ? savedComment.replies.id(req.body.parentReplyId).replies.id(reply._id)
      : savedComment.replies.id(reply._id);
    const postOwner = post.user;
    const postOwnerId = postOwner?._id || postOwner;
    const postOwnerName = [postOwner?.firstName, postOwner?.lastName].filter(Boolean).join(' ')
      || postOwner?.username
      || 'the creator';
    const previewText = text.length > 80 ? `${text.slice(0, 80)}…` : text;

    await createNotification({
      recipient: postOwnerId,
      actor: req.user._id,
      type: 'comment',
      target: post._id,
      targetModel: 'Post',
      text: previewText
    });
    if (String(replyRecipient) !== String(postOwnerId)) {
      const actorName = [req.user.firstName, req.user.lastName].filter(Boolean).join(' ')
        || req.user.username
        || 'Someone';
      await createNotification({
        recipient: replyRecipient,
        actor: req.user._id,
        type: 'comment_reply',
        target: post._id,
        targetModel: 'Post',
        text: previewText,
        message: `${actorName} replied to your comment on ${postOwnerName}'s post`
      });
    }

    res.status(201).json({
      postId: post._id,
      commentId: comment._id,
      parentReplyId: req.body.parentReplyId || null,
      reply: savedReply.toObject()
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const toggleCommentLike = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const comment = post.comments.id(req.params.commentId);
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
    await post.save();

    res.json({
      postId: post._id,
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

const reportPost = async (req, res) => {
  try {
    const { reason } = req.body;
    const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Select a valid report reason' });
    }
    if (details.length > 1000) {
      return res.status(400).json({ message: 'Report details must be 1000 characters or fewer' });
    }
    const post = await Post.findById(req.params.id).select('_id');
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const report = await PostReport.findOneAndUpdate(
      { post: post._id, reporter: req.user._id },
      { reason, details },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Report submitted', reportId: report._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const incrementShareCount = async (req, res) => {
  try {
    const post = await Post.findByIdAndUpdate(
      req.params.id,
      { $inc: { sharesCount: 1 } },
      { new: true, select: 'sharesCount' }
    );
    if (!post) return res.status(404).json({ message: 'Post not found' });
    res.json({ postId: req.params.id, sharesCount: post.sharesCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createSharedPost = async (req, res) => {
  try {
    const sourcePost = await Post.findById(req.params.id);
    if (!sourcePost) return res.status(404).json({ message: 'Post not found' });

    const ownerId = String(sourcePost.user);
    const currentUserId = String(req.user._id);
    if (sourcePost.visibility === 'private' && ownerId !== currentUserId) {
      return res.status(403).json({ message: 'This post cannot be shared' });
    }

    if (sourcePost.visibility === 'friends' && ownerId !== currentUserId) {
      const owner = await User.findById(sourcePost.user).select('friends');
      const isFriend = owner?.friends?.some((friendId) => String(friendId) === currentUserId);
      if (!isFriend) return res.status(403).json({ message: 'This post cannot be shared' });
    }

    const visibility = req.body.visibility || 'public';
    const shareCaption = typeof req.body.description === 'string'
      ? req.body.description.trim()
      : '';
    if (!POST_VISIBILITIES.includes(visibility)) {
      return res.status(400).json({ message: 'Visibility must be public, private, or friends' });
    }
    if (shareCaption.length > 1000) {
      return res.status(400).json({ message: 'Description must be 1000 characters or fewer' });
    }

    const updatedSource = await Post.findByIdAndUpdate(
      sourcePost._id,
      { $inc: { sharesCount: 1 } },
      { new: true, select: 'sharesCount' }
    );
    if (!updatedSource) return res.status(404).json({ message: 'Post not found' });

    let sharedPost;
    try {
      sharedPost = await Post.create({
        user: req.user._id,
        postType: 'share',
        sharedPost: sourcePost._id,
        shareCaption,
        visibility
      });
    } catch (error) {
      await Post.updateOne({ _id: sourcePost._id }, { $inc: { sharesCount: -1 } });
      throw error;
    }

    const populatedShare = await Post.findById(sharedPost._id)
      .populate('user', 'username avatar sex')
      .populate({
        path: 'sharedPost',
        populate: { path: 'user', select: 'username avatar sex' }
      });

    try {
      getIO().emit('new_post_created', populatedShare);
    } catch (error) {
      console.error('Could not broadcast shared post:', error.message);
    }

    res.status(201).json({
      post: populatedShare,
      sourcePostId: sourcePost._id,
      sharesCount: updatedSource.sharesCount
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Get Feed Posts
const getPosts = async (req, res) => {
  try {
    const [posts, creatorRankings] = await Promise.all([
      Post.find()
        .populate('user', 'username avatar sex')
        .populate('likes', 'username avatar sex')
        .populate('comments.user', 'username avatar sex')
        .populate('comments.likes', 'username avatar sex')
        .populate('comments.replies.user', 'username avatar sex')
        .populate('comments.replies.likes', 'username avatar sex')
        .populate('comments.replies.replies.user', 'username avatar sex')
        .populate('comments.replies.replies.likes', 'username avatar sex')
        .populate({
          path: 'sharedPost',
          populate: { path: 'user', select: 'username avatar sex' }
        })
        .lean(),
      Post.aggregate([
        {
          $group: {
            _id: '$user',
            totalEngagement: {
              $sum: {
                $add: [
                  { $size: { $ifNull: ['$likes', []] } },
                  { $size: { $ifNull: ['$comments', []] } },
                  { $size: { $ifNull: ['$saves', []] } },
                  { $ifNull: ['$sharesCount', 0] }
                ]
              }
            }
          }
        }
      ])
    ]);

    const creatorEngagementById = new Map(
      creatorRankings.map(({ _id, totalEngagement }) => [String(_id), totalEngagement])
    );
    const getPostEngagement = (post) => (
      (post.likes?.length || 0)
      + (post.comments?.length || 0)
      + (post.saves?.length || 0)
      + (post.sharesCount || 0)
    );

    posts.sort((left, right) => {
      const creatorScoreDifference = (
        (creatorEngagementById.get(String(right.user?._id || right.user)) || 0)
        - (creatorEngagementById.get(String(left.user?._id || left.user)) || 0)
      );
      if (creatorScoreDifference) return creatorScoreDifference;

      const postScoreDifference = getPostEngagement(right) - getPostEngagement(left);
      if (postScoreDifference) return postScoreDifference;

      return new Date(right.createdAt) - new Date(left.createdAt);
    });

    res.json(posts);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createNotification = require('../services/notificationService').createNotification;

// Like / Unlike Post
const toggleLikePost = async (req, res) => {
  try {
    const post = await Post.findById(req.params.id);
    if (!post) return res.status(404).json({ message: 'Post not found' });

    const isLiked = post.likes.includes(req.user._id);
    if (isLiked) {
      post.likes = post.likes.filter((id) => id.toString() !== req.user._id.toString());
    } else {
      post.likes.push(req.user._id);
    }

    await post.save();

    const payload = {
      postId: post._id,
      likesCount: post.likes.length,
      userId: req.user._id,
      isLiked: !isLiked
    };

    // Broadcast updated like count to everyone online
    try {
      getIO().emit('post_liked_updated', payload);
    } catch (err) {
      console.log('Socket error:', err.message);
    }

    // Notify the post owner that someone liked their post
    if (!isLiked) {
      await createNotification({
        recipient: post.user,
        actor: req.user._id,
        type: 'like',
        target: post._id,
        targetModel: 'Post'
      });
    }

    res.json(payload);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
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
};
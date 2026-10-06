const Post = require('../models/Post');
const PostReport = require('../models/PostReport');
const { getIO } = require('../config/socket');
const fs = require('fs');
const path = require('path');
const POST_VISIBILITIES = ['public', 'private', 'friends'];
const POST_TYPES = ['text', 'image'];
const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];
const TEXT_POST_BACKGROUNDS = new Set([
  '#f1f7f1', '#e5f3ff', '#fff1e6', '#fff8cc', '#f4eaff', '#ffe8ef',
  '#d8f3dc', '#dbeafe', '#1f2937', '#173b35', '#23395d', '#572b4a'
]);

async function removeUploadedFiles(files) {
  const cleanupResults = await Promise.allSettled(
    files.map((file) => fs.promises.unlink(file.path))
  );

  cleanupResults.forEach((result) => {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
      console.error('Could not remove an uploaded image:', result.reason.message);
    }
  });
}

async function removePostImagePaths(imagePaths) {
  const uploadDirectory = path.resolve(__dirname, '../../uploads/posts');
  const removals = imagePaths
    .filter((imagePath) => typeof imagePath === 'string' && imagePath.startsWith('/uploads/posts/'))
    .map((imagePath) => path.resolve(uploadDirectory, path.basename(imagePath)));
  const cleanupResults = await Promise.allSettled(removals.map((filePath) => fs.promises.unlink(filePath)));

  cleanupResults.forEach((result) => {
    if (result.status === 'rejected' && result.reason.code !== 'ENOENT') {
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
    const backgroundColor = postType === 'text' ? req.body.backgroundColor || '#f1f7f1' : '#f1f7f1';
    if (!TEXT_POST_BACKGROUNDS.has(backgroundColor)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Select a valid text post background' });
    }
    const imagePaths = uploadedFiles.length > 0
      ? uploadedFiles.map((file) => `/uploads/posts/${file.filename}`)
      : (Array.isArray(images) ? images : []);

    if (postType === 'image' && !trimmedTitle) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Title is required for image posts' });
    }
    if (postType === 'image' && imagePaths.length === 0) {
      return res.status(400).json({ message: 'At least one image is required for image posts' });
    }
    if (postType === 'text' && !trimmedDescription) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Text posts require content' });
    }
    if (postType === 'text' && imagePaths.length > 0) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Text posts cannot include images' });
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
      ? req.body.backgroundColor || post.backgroundColor || '#f1f7f1'
      : '#f1f7f1';
    if (!TEXT_POST_BACKGROUNDS.has(backgroundColor)) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Select a valid text post background' });
    }
    const nextImages = postType === 'image'
      ? [...retainedImages, ...uploadedFiles.map((file) => `/uploads/posts/${file.filename}`)]
      : [];

    if (postType === 'text' && uploadedFiles.length > 0) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Text posts cannot include images' });
    }
    if (postType === 'image' && !title) {
      await removeUploadedFiles(uploadedFiles);
      return res.status(400).json({ message: 'Title is required for image posts' });
    }
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
    const comment = post.comments[post.comments.length - 1];
    await comment.populate('user', 'username avatar sex');
    res.status(201).json({ postId: post._id, comment });
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

// Get Feed Posts
const getPosts = async (req, res) => {
  try {
    const [posts, creatorRankings] = await Promise.all([
      Post.find()
        .populate('user', 'username avatar sex')
        .populate('likes', 'username avatar sex')
        .populate('comments.user', 'username avatar sex')
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
  reportPost,
  incrementShareCount
};
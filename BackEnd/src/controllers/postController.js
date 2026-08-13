const Post = require('../models/Post');
const { getIO } = require('../config/socket');

// Create Post
const createPost = async (req, res) => {
  try {
    const { title, description, images } = req.body;
    if (!title) return res.status(400).json({ message: 'Title is required' });

    const post = await Post.create({
      user: req.user._id,
      title,
      description,
      images: images || []
    });

    const populatedPost = await post.populate('user', 'username avatar');

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

// Get Feed Posts
const getPosts = async (req, res) => {
  try {
    const posts = await Post.find()
      .populate('user', 'username avatar')
      .sort({ createdAt: -1 });
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

module.exports = { createPost, getPosts, toggleLikePost };
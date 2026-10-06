const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');

const escapeRegex = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const searchAll = async (req, res) => {
  try {
    const query = String(req.query.q || '').trim().slice(0, 80);
    if (!query) return res.json([]);

    const matcher = new RegExp(
      Array.from(query).map((character) => escapeRegex(character)).join('.*'),
      'i'
    );
    const [users, posts, videos] = await Promise.all([
      User.find({ username: matcher, isAnonymous: { $ne: true } })
        .select('username avatar sex bio createdAt')
        .limit(8)
        .lean(),
      Post.find({ $or: [{ title: matcher }, { description: matcher }] })
        .populate('user', 'username avatar sex')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean(),
      Video.find({ caption: matcher })
        .populate('user', 'username avatar sex')
        .sort({ createdAt: -1 })
        .limit(8)
        .lean()
    ]);

    const results = [
      ...users.map((user) => ({
        id: String(user._id),
        type: 'user',
        title: user.username,
        description: user.bio,
        avatar: user.avatar,
        sex: user.sex,
        createdAt: user.createdAt
      })),
      ...posts.map((post) => ({
        id: String(post._id),
        type: 'post',
        title: post.title,
        description: post.user?.username || post.description,
        avatar: post.user?.avatar || '',
        sex: post.user?.sex || '',
        createdAt: post.createdAt
      })),
      ...videos.map((video) => ({
        id: String(video._id),
        type: 'video',
        title: video.caption || 'Untitled video',
        description: video.user?.username || '',
        avatar: video.user?.avatar || '',
        sex: video.user?.sex || '',
        createdAt: video.createdAt
      }))
    ].sort((left, right) => new Date(right.createdAt) - new Date(left.createdAt));

    res.json(results);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { searchAll };

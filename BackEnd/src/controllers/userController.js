const User = require('../models/User');
const mongoose = require('mongoose');
const UserReport = require('../models/UserReport');

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];

const getPublicProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const profile = await User.findById(req.params.id)
      .select('username firstName lastName avatar sex bio from status friends');
    if (!profile) return res.status(404).json({ message: 'User not found' });

    res.json({
      _id: profile._id,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      sex: profile.sex,
      bio: profile.bio,
      from: profile.from,
      status: profile.status,
      friendsCount: profile.friends.length
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  try {
    if (String(req.params.id) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own profile' });
    }

    const fields = ['firstName', 'lastName', 'bio', 'from', 'status'];
    const updates = {};
    for (const field of fields) {
      if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    }
    if (!updates.firstName || !updates.lastName) {
      return res.status(400).json({ message: 'First name and last name are required' });
    }
    if ((updates.bio || '').length > 500) {
      return res.status(400).json({ message: 'Bio must be 500 characters or fewer' });
    }

    const profile = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!profile) return res.status(404).json({ message: 'User not found' });
    res.json(profile);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const reportUser = async (req, res) => {
  try {
    if (String(req.params.id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot report your own profile' });
    }
    const reason = req.body.reason;
    const details = typeof req.body.details === 'string' ? req.body.details.trim() : '';
    if (!REPORT_REASONS.includes(reason)) {
      return res.status(400).json({ message: 'Select a valid report reason' });
    }
    if (details.length > 1000) {
      return res.status(400).json({ message: 'Report details must be 1000 characters or fewer' });
    }
    const targetUser = await User.findById(req.params.id).select('_id');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const report = await UserReport.findOneAndUpdate(
      { reportedUser: targetUser._id, reporter: req.user._id },
      { reason, details },
      { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
    );
    res.status(201).json({ message: 'Report submitted', reportId: report._id });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateFriendship = async (req, res) => {
  try {
    const targetUserId = req.params.id;
    const currentUserId = String(req.user._id);
    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot add or remove yourself as a friend' });
    }

    const targetUser = await User.findById(targetUserId).select('_id');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });

    const shouldAdd = req.method === 'PUT';
    const update = shouldAdd
      ? { $addToSet: { friends: req.user._id } }
      : { $pull: { friends: req.user._id } };
    const inverseUpdate = shouldAdd
      ? { $addToSet: { friends: targetUser._id } }
      : { $pull: { friends: targetUser._id } };

    await User.updateOne({ _id: req.user._id }, update);
    await User.updateOne({ _id: targetUser._id }, inverseUpdate);

    const currentUser = await User.findById(req.user._id).select('friends');
    res.json({
      friendId: targetUser._id,
      isFriend: shouldAdd,
      friends: currentUser.friends
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicProfile, updateProfile, reportUser, updateFriendship };

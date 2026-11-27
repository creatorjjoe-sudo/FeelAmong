const User = require('../models/User');
const mongoose = require('mongoose');
const Notification = require('../models/Notification');
const UserReport = require('../models/UserReport');
const { deleteUploadedFiles, deleteStoredMedia } = require('../services/mediaStorage');

const REPORT_REASONS = ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'];

const getFriendSuggestions = async (req, res) => {
  try {
    const currentUser = await User.findById(req.user._id).select('friends').lean();
    if (!currentUser) return res.status(404).json({ message: 'User not found' });

    const friends = currentUser.friends || [];
    const pendingRequests = await Notification.find({
      type: 'friend_request',
      status: 'pending',
      $or: [{ recipient: currentUser._id }, { actor: currentUser._id }]
    }).select('actor recipient').lean();
    const unavailableUserIds = pendingRequests.map((request) => (
      String(request.actor) === String(currentUser._id) ? request.recipient : request.actor
    ));
    const suggestions = await User.aggregate([
      {
        $match: {
          _id: { $nin: [currentUser._id, ...friends, ...unavailableUserIds] },
          isAnonymous: { $ne: true },
          isCompany: { $ne: true }
        }
      },
      {
        $addFields: {
          commonFriendsCount: {
            $size: {
              $setIntersection: [{ $ifNull: ['$friends', []] }, friends]
            }
          }
        }
      },
      { $sort: { commonFriendsCount: -1, createdAt: -1 } },
      { $limit: 20 },
      {
        $project: {
          username: 1,
          firstName: 1,
          lastName: 1,
          avatar: 1,
          sex: 1,
          commonFriendsCount: 1
        }
      }
    ]);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

async function removeUploadedAvatar(file) {
  if (file) await deleteUploadedFiles([file]);
}

async function removeStoredAvatar(avatar) {
  try {
    await deleteStoredMedia(avatar, 'image');
  } catch (error) {
    console.error('Could not remove a replaced profile picture:', error.message);
  }
}

const getPublicProfile = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    const profile = await User.findById(req.params.id)
      .select('username firstName lastName avatar sex bio from location status friends followingCompanies lastSeen isCompany');
    if (!profile) return res.status(404).json({ message: 'User not found' });
    const followersCount = profile.isCompany
      ? await User.countDocuments({ followingCompanies: profile._id })
      : null;
    let friendRequest = null;
    if (!profile.isCompany && req.user && String(req.user._id) !== String(profile._id)) {
      friendRequest = await Notification.findOne({
        type: 'friend_request',
        status: 'pending',
        $or: [
          { recipient: req.user._id, actor: profile._id },
          { recipient: profile._id, actor: req.user._id }
        ]
      }).select('_id recipient actor').lean();
    }

    res.json({
      _id: profile._id,
      username: profile.username,
      firstName: profile.firstName,
      lastName: profile.lastName,
      avatar: profile.avatar,
      sex: profile.sex,
      bio: profile.bio,
      from: profile.from,
      location: profile.location,
      status: profile.status,
      lastSeen: profile.lastSeen,
      isCompany: profile.isCompany,
      isFollowing: Boolean(
        profile.isCompany
        && req.user
        && String(req.user._id) !== String(profile._id)
        && (req.user.followingCompanies || []).some(
          (companyId) => String(companyId) === String(profile._id)
        )
      ),
      friendRequestStatus: friendRequest
        ? (String(friendRequest.actor) === String(req.user._id) ? 'outgoing' : 'incoming')
        : null,
      friendRequestId: friendRequest ? String(friendRequest._id) : null,
      companyDescription: profile.isCompany ? profile.bio : '',
      friendsCount: profile.friends.length,
      followersCount,
      followingCount: profile.isCompany ? profile.followingCompanies.length : null,
      commonFriendsCount: !profile.isCompany && req.user && String(req.user._id) !== String(profile._id)
        ? profile.friends.filter((friendId) => (req.user.friends || []).some(
          (viewerFriendId) => String(viewerFriendId) === String(friendId)
        )).length
        : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateProfile = async (req, res) => {
  let profileUpdated = false;
  let previousAvatar = '';
  try {
    if (String(req.params.id) !== String(req.user._id)) {
      await removeUploadedAvatar(req.file);
      return res.status(403).json({ message: 'You can only edit your own profile' });
    }

    const fields = ['firstName', 'lastName', 'bio', 'from', 'location', 'status'];
    const updates = {};
    for (const field of fields) {
      if (typeof req.body[field] === 'string') updates[field] = req.body[field].trim();
    }
    if (!updates.firstName || !updates.lastName) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'First name and last name are required' });
    }
    if ((updates.bio || '').length > 500) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Bio must be 500 characters or fewer' });
    }
    if ((updates.location || '').length > 120) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Location must be 120 characters or fewer' });
    }
    if (req.file) updates.avatar = req.file.cloudinaryAsset.url;

    if (req.file) {
      const currentProfile = await User.findById(req.user._id).select('avatar');
      if (!currentProfile) {
        await removeUploadedAvatar(req.file);
        return res.status(404).json({ message: 'User not found' });
      }
      previousAvatar = currentProfile.avatar;
    }

    const profile = await User.findByIdAndUpdate(req.user._id, updates, {
      new: true,
      runValidators: true
    }).select('-password');
    if (!profile) {
      await removeUploadedAvatar(req.file);
      return res.status(404).json({ message: 'User not found' });
    }
    profileUpdated = true;
    if (req.file) await removeStoredAvatar(previousAvatar);
    res.json(profile);
  } catch (error) {
    if (!profileUpdated) await removeUploadedAvatar(req.file);
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
    if (!mongoose.Types.ObjectId.isValid(targetUserId)) {
      return res.status(400).json({ message: 'Invalid user ID' });
    }
    if (targetUserId === currentUserId) {
      return res.status(400).json({ message: 'You cannot add or remove yourself as a friend' });
    }

    const targetUser = await User.findById(targetUserId).select('_id friends isCompany');
    if (!targetUser) return res.status(404).json({ message: 'User not found' });
    if (targetUser.isCompany || req.user.isCompany) {
      return res.status(400).json({ message: 'Friend requests are only available between personal accounts' });
    }

    const shouldAdd = req.method === 'PUT';
    if (shouldAdd) {
      const currentUser = await User.findById(req.user._id).select('friends');
      if (currentUser.friends.some((friendId) => String(friendId) === String(targetUser._id))) {
        await Notification.deleteMany({
          type: 'friend_request',
          status: 'pending',
          $or: [
            { recipient: targetUser._id, actor: req.user._id },
            { recipient: req.user._id, actor: targetUser._id }
          ]
        });
        return res.json({ friendId: targetUser._id, isFriend: true, requestStatus: 'friends' });
      }

      const existingRequest = await Notification.findOne({
        type: 'friend_request',
        status: 'pending',
        $or: [
          { recipient: targetUser._id, actor: req.user._id },
          { recipient: req.user._id, actor: targetUser._id }
        ]
      }).select('_id recipient actor');
      if (existingRequest) {
        const requestStatus = String(existingRequest.actor) === currentUserId ? 'outgoing' : 'incoming';
        return res.json({
          friendId: targetUser._id,
          isFriend: false,
          requestStatus,
          requestId: String(existingRequest._id)
        });
      }

      const { createNotification } = require('../services/notificationService');
      const notification = await createNotification({
        recipient: targetUser._id,
        actor: req.user._id,
        type: 'friend_request',
        target: req.user._id,
        targetModel: 'User',
        status: 'pending'
      });
      if (!notification) {
        return res.status(500).json({ message: 'Could not send the friend request.' });
      }

      return res.status(201).json({
        friendId: targetUser._id,
        isFriend: false,
        requestStatus: 'outgoing',
        requestId: String(notification._id)
      });
    }

    const currentUser = await User.findById(req.user._id).select('friends');
    const isFriend = currentUser.friends.some((friendId) => String(friendId) === String(targetUser._id));
    if (isFriend) {
      await User.updateOne({ _id: req.user._id }, { $pull: { friends: targetUser._id } });
      await User.updateOne({ _id: targetUser._id }, { $pull: { friends: req.user._id } });
      await Notification.deleteMany({
        type: 'friend_request',
        status: 'pending',
        $or: [
          { recipient: targetUser._id, actor: req.user._id },
          { recipient: req.user._id, actor: targetUser._id }
        ]
      });
    } else {
      await Notification.deleteOne({
        recipient: targetUser._id,
        actor: req.user._id,
        type: 'friend_request',
        status: 'pending'
      });
    }

    res.json({
      friendId: targetUser._id,
      isFriend: false,
      requestStatus: null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPublicProfile, getFriendSuggestions, updateProfile, reportUser, updateFriendship };

const Notification = require('../models/Notification');
const User = require('../models/User');

const listNotifications = async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 30, 100);
    const skip = Math.max(parseInt(req.query.skip, 10) || 0, 0);

    const [notifications, unreadCount, total] = await Promise.all([
      Notification.find({ recipient: req.user._id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .populate('actor', 'username firstName lastName avatar')
        .populate('target', 'title description caption shareCaption postType'),
      Notification.countDocuments({ recipient: req.user._id, isRead: false }),
      Notification.countDocuments({ recipient: req.user._id })
    ]);

    res.json({ notifications, unreadCount, total, hasMore: skip + notifications.length < total });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadCount = async (req, res) => {
  try {
    const unreadCount = await Notification.countDocuments({ recipient: req.user._id, isRead: false });
    res.json({ unreadCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAsRead = async (req, res) => {
  try {
    const notification = await Notification.findOneAndUpdate(
      { _id: req.params.id, recipient: req.user._id },
      { isRead: true },
      { new: true }
    );
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markAllAsRead = async (req, res) => {
  try {
    const result = await Notification.updateMany(
      { recipient: req.user._id, isRead: false },
      { isRead: true }
    );
    res.json({ modifiedCount: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteNotification = async (req, res) => {
  try {
    const notification = await Notification.findOneAndDelete({ _id: req.params.id, recipient: req.user._id });
    if (!notification) return res.status(404).json({ message: 'Notification not found' });
    res.json({ message: 'Notification deleted' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Respond to a friend-request notification (accept / decline)
const respondToFriendRequest = async (req, res) => {
  try {
    const { action } = req.body;
    if (!['accepted', 'declined'].includes(action)) {
      return res.status(400).json({ message: 'Action must be accepted or declined' });
    }

    const notification = await Notification.findOne({
      _id: req.params.id,
      recipient: req.user._id,
      type: 'friend_request',
      status: 'pending'
    });
    if (!notification) return res.status(404).json({ message: 'Friend request not found or already handled' });

    notification.status = action;
    notification.isRead = true;
    await notification.save();

    if (action === 'accepted' && notification.actor) {
      // Add each user to the other's friends list
      await User.findByIdAndUpdate(req.user._id, { $addToSet: { friends: notification.actor } });
      await User.findByIdAndUpdate(notification.actor, { $addToSet: { friends: req.user._id } });

      // Tell the original requester their request was accepted
      const { createNotification } = require('../services/notificationService');
      await createNotification({
        recipient: notification.actor,
        actor: req.user._id,
        type: 'friend_accept'
      });
    }

    res.json({ notification });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  respondToFriendRequest
};

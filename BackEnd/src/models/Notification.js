const mongoose = require('mongoose');

// Actions a notification can represent
const NOTIFICATION_TYPES = ['like', 'comment', 'friend_request', 'friend_accept', 'share', 'video_like', 'video_comment', 'post'];

const notificationSchema = new mongoose.Schema(
  {
    // Who receives the notification
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    // Who performed the action (null for system notifications)
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    // What kind of activity happened
    type: { type: String, enum: NOTIFICATION_TYPES, required: true },
    // The content the activity happened on (post, video, user for friend requests)
    target: { type: mongoose.Schema.Types.ObjectId, refPath: 'targetModel', default: null },
    targetModel: { type: String, enum: ['Post', 'Video', 'User'], default: null },
    // Whether the recipient has seen it
    isRead: { type: Boolean, default: false },
    // For friend requests: pending / accepted / declined
    status: { type: String, enum: ['pending', 'accepted', 'declined'], default: null },
    // Optional extra text (e.g. comment preview)
    text: { type: String, default: '' }
  },
  { timestamps: true }
);

// Newest first when listing, and fast unread-count lookups
notificationSchema.index({ recipient: 1, isRead: 1 });
notificationSchema.index({ recipient: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);
module.exports.NOTIFICATION_TYPES = NOTIFICATION_TYPES;

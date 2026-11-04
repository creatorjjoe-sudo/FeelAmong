const Notification = require('../models/Notification');

/**
 * Central notification service.
 * Creates a notification and, if the recipient is connected, pushes it live
 * over socket.io to their personal room (userId).
 */

// Human-readable sentence per notification type, e.g.
// "Creator Joe liked your post", "Glory Jombo sent you a friend request"
function buildMessage(type, actorName) {
  const name = actorName || 'Someone';
  switch (type) {
    case 'like':
      return `${name} liked your post`;
    case 'video_like':
      return `${name} liked your video`;
    case 'comment':
      return `${name} commented on your post`;
    case 'video_comment':
      return `${name} commented on your video`;
    case 'share':
      return `${name} shared your post`;
    case 'post':
      return `${name} published a new post`;
    case 'friend_request':
      return `${name} sent you a friend request`;
    case 'friend_accept':
      return `${name} accepted your friend request`;
    default:
      return `${name} interacted with you`;
  }
}

/**
 * Create a notification and emit it in real time.
 * Never throws — a failed notification must not break the primary action.
 *
 * @param {Object} options
 * @param {String|ObjectId} options.recipient  user receiving the notification
 * @param {String|ObjectId|null} options.actor  user who performed the action
 * @param {String} options.type  one of Notification.NOTIFICATION_TYPES
 * @param {String|ObjectId|null} options.target  post / video / user id
 * @param {String|null} options.targetModel  'Post' | 'Video' | 'User'
 * @param {String} [options.text]  optional preview text (e.g. comment snippet)
 * @param {String} [options.status]  for friend requests: 'pending' | 'accepted' | 'declined'
 */
async function createNotification({ recipient, actor, type, target = null, targetModel = null, text = '', status = null }) {
  try {
    if (!recipient) return null;
    // Skip self-notifications: you don't need to be told you liked your own post
    if (actor && String(actor) === String(recipient)) return null;

    let actorName = '';
    if (actor) {
      const actorUser = await actor && typeof actor === 'object' && actor.username
        ? actor
        : (await require('../models/User').findById(actor).select('username firstName lastName'));
      if (actorUser) {
        actorName = [actorUser.firstName, actorUser.lastName].filter(Boolean).join(' ') || actorUser.username || '';
      }
    }

    const notification = await Notification.create({
      recipient,
      actor: actor || undefined,
      type,
      target: target || undefined,
      targetModel: targetModel || undefined,
      text,
      status: status || undefined
    });

    const payload = {
      _id: String(notification._id),
      recipient: String(recipient),
      actor: actor ? String(actor) : null,
      actorName,
      type,
      target: target ? String(target) : null,
      targetModel: targetModel || null,
      text,
      status: status || null,
      isRead: false,
      message: buildMessage(type, actorName),
      createdAt: notification.createdAt
    };

    // Push live to the recipient's personal socket room
    try {
      const { getIO } = require('../config/socket');
      getIO().to(String(recipient)).emit('notification', payload);
    } catch (socketErr) {
      // Socket not initialized or recipient offline — the DB record still exists
    }

    return notification;
  } catch (error) {
    console.error('Notification error:', error.message);
    return null;
  }
}

const { NOTIFICATION_TYPES } = require('../models/Notification');

module.exports = { createNotification, buildMessage, NOTIFICATION_TYPES };

const Message = require('../models/Message');
const { getIO } = require('../config/socket');
const { deleteUploadedFiles } = require('../services/mediaStorage');

function getSafeFilename(filename) {
  return String(filename || 'attachment')
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .split(/[\\/]/)
    .pop()
    .slice(0, 255) || 'attachment';
}

async function markMessagesRead(senderId, recipientId) {
  const unreadMessages = await Message.find({
    sender: senderId,
    recipient: recipientId,
    read: false
  }).select('_id');
  if (!unreadMessages.length) return [];

  const readAt = new Date();
  const messageIds = unreadMessages.map((message) => String(message._id));
  await Message.updateMany(
    { _id: { $in: unreadMessages.map((message) => message._id) } },
    { $set: { read: true, readAt } }
  );

  try {
    getIO().to(String(senderId)).emit('messages_read', {
      messageIds,
      readBy: String(recipientId),
      readAt
    });
  } catch (error) {
    console.error('Could not send message read receipts:', error.message);
  }

  return messageIds;
}

const sendMessage = async (req, res) => {
  const uploadedFiles = req.files || [];
  let messagePersisted = false;

  try {
    const { recipientId, text, replyTo } = req.body || {};
    const messageText = typeof text === 'string' ? text.trim() : '';
    if (!recipientId || (!messageText && !uploadedFiles.length)) {
      return res.status(400).json({ message: 'Add a recipient and either a note or an attachment.' });
    }

    // Validate the reply target belongs to this conversation.
    let replyToId = null;
    if (replyTo) {
      const target = await Message.findById(replyTo).select('sender recipient');
      if (!target) return res.status(400).json({ message: 'Message to reply to was not found' });
      const involved = [target.sender, target.recipient].map(String);
      if (!involved.includes(String(req.user._id))) {
        return res.status(403).json({ message: 'You cannot reply to that message' });
      }
      replyToId = target._id;
    }

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      text: messageText,
      replyTo: replyToId,
      attachments: uploadedFiles.map((file) => ({
        url: file.cloudinaryAsset.url,
        publicId: file.cloudinaryAsset.publicId,
        resourceType: file.cloudinaryAsset.resourceType,
        filename: getSafeFilename(file.originalname),
        mimeType: file.mimetype,
        size: file.size
      }))
    });
    messagePersisted = true;

    const populated = await Message.findById(message._id)
      .populate('replyTo', 'text sender createdAt attachments.filename');

    // Real-Time Socket Emit to Recipient's Room
    try {
      const io = getIO();
      io.to(recipientId).emit('receive_message', populated);
    } catch (err) {
      console.log('Socket emit error:', err.message);
    }

    res.status(201).json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  } finally {
    if (!messagePersisted && uploadedFiles.length) {
      await deleteUploadedFiles(uploadedFiles);
    }
  }
};

const editMessage = async (req, res) => {
  try {
    const text = typeof req.body.text === 'string' ? req.body.text.trim() : '';
    if (!text) return res.status(400).json({ message: 'Message cannot be empty' });
    if (text.length > 1000) return res.status(400).json({ message: 'Message must be 1000 characters or fewer' });

    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });
    if (String(message.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only edit your own messages' });
    }

    message.text = text;
    message.editedAt = new Date();
    await message.save();

    const populated = await Message.findById(message._id)
      .populate('replyTo', 'text sender createdAt attachments.filename');

    try {
      const io = getIO();
      io.to(String(message.recipient)).emit('message_updated', populated);
      io.to(String(message.sender)).emit('message_updated', populated);
    } catch (err) {
      console.log('Socket emit error:', err.message);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const deleteMessage = async (req, res) => {
  try {
    const message = await Message.findById(req.params.messageId);
    if (!message) return res.status(404).json({ message: 'Message not found' });

    const scope = req.body?.scope || 'everyone';

    if (scope === 'me') {
      // "Delete for me": hide the message for this user only. Either
      // participant can do this; the other still sees the message.
      if (String(message.sender) !== String(req.user._id) && String(message.recipient) !== String(req.user._id)) {
        return res.status(403).json({ message: 'This message is not in your chats' });
      }
      if (!message.deletedFor.some((id) => String(id) === String(req.user._id))) {
        message.deletedFor.push(req.user._id);
      }
      await message.save();
      return res.json({ _id: message._id, deletedForMe: true });
    }

    // "Delete for everyone": only the sender may tombstone the message.
    if (String(message.sender) !== String(req.user._id)) {
      return res.status(403).json({ message: 'You can only delete your own messages for everyone' });
    }

    message.text = 'This message was deleted';
    message.deletedAt = new Date();
    message.replyTo = null;
    const attachmentsToDelete = (message.attachments || []).map((attachment) => ({
      cloudinaryAsset: {
        publicId: attachment.publicId,
        resourceType: attachment.resourceType
      }
    }));
    message.attachments = [];
    await message.save();
    await deleteUploadedFiles(attachmentsToDelete);

    const populated = await Message.findById(message._id);

    try {
      const io = getIO();
      io.to(String(message.recipient)).emit('message_updated', populated);
      io.to(String(message.sender)).emit('message_updated', populated);
    } catch (err) {
      console.log('Socket emit error:', err.message);
    }

    res.json(populated);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    await markMessagesRead(userId, req.user._id);
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ],
      deletedFor: { $ne: req.user._id }
    }).populate('replyTo', 'text sender createdAt attachments.filename').sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadMessageCount = async (req, res) => {
  try {
    const unreadSenders = await Message.distinct('sender', {
      recipient: req.user._id,
      read: false
    });
    const count = unreadSenders.length;
    res.json({ count });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getConversations = async (req, res) => {
  try {
    const userId = req.user._id;
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ sender: userId }, { recipient: userId }]
        }
      },
      {
        $addFields: {
          contactId: {
            $cond: [{ $eq: ['$sender', userId] }, '$recipient', '$sender']
          }
        }
      },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: '$contactId',
          latestMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                { $and: [{ $eq: ['$recipient', userId] }, { $eq: ['$read', false] }] },
                1,
                0
              ]
            }
          }
        }
      },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'contact'
        }
      },
      { $unwind: '$contact' },
      {
        $project: {
          _id: '$_id',
          username: '$contact.username',
          avatar: '$contact.avatar',
          sex: '$contact.sex',
          lastMessage: {
            $cond: [
              { $ne: [{ $ifNull: ['$latestMessage.text', ''] }, ''] },
              '$latestMessage.text',
              {
                $cond: [
                  { $gt: [{ $size: { $ifNull: ['$latestMessage.attachments', []] } }, 0] },
                  { $arrayElemAt: ['$latestMessage.attachments.filename', 0] },
                  ''
                ]
              }
            ]
          },
          lastMessageSender: '$latestMessage.sender',
          lastMessageAt: '$latestMessage.createdAt',
          unreadCount: 1
        }
      },
      { $sort: { lastMessageAt: -1 } }
    ]);

    res.json(conversations);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const markConversationRead = async (req, res) => {
  try {
    const messageIds = await markMessagesRead(req.params.userId, req.user._id);
    res.json({ markedRead: messageIds.length });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  getConversations,
  markConversationRead,
  editMessage,
  deleteMessage
};
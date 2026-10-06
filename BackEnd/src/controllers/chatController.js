const Message = require('../models/Message');
const { getIO } = require('../config/socket');

const sendMessage = async (req, res) => {
  try {
    const { recipientId, text } = req.body;
    if (!recipientId || !text) return res.status(400).json({ message: 'Missing recipient or text' });

    const message = await Message.create({
      sender: req.user._id,
      recipient: recipientId,
      text
    });

    // Real-Time Socket Emit to Recipient's Room
    try {
      const io = getIO();
      io.to(recipientId).emit('receive_message', message);
    } catch (err) {
      console.log('Socket emit error:', err.message);
    }

    res.status(201).json(message);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getMessages = async (req, res) => {
  try {
    const { userId } = req.params;
    await Message.updateMany(
      { sender: userId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    const messages = await Message.find({
      $or: [
        { sender: req.user._id, recipient: userId },
        { sender: userId, recipient: req.user._id }
      ]
    }).sort({ createdAt: 1 });

    res.json(messages);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getUnreadMessageCount = async (req, res) => {
  try {
    const count = await Message.countDocuments({ recipient: req.user._id, read: false });
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
          lastMessage: '$latestMessage.text',
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
    const result = await Message.updateMany(
      { sender: req.params.userId, recipient: req.user._id, read: false },
      { $set: { read: true } }
    );
    res.json({ markedRead: result.modifiedCount });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  getConversations,
  markConversationRead
};
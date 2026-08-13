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

module.exports = { sendMessage, getMessages };
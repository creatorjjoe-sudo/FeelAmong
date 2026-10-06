const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  getConversations,
  markConversationRead
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');

router.post('/send', protect, sendMessage);
router.get('/unread/count', protect, getUnreadMessageCount);
router.get('/conversations', protect, getConversations);
router.put('/:userId/read', protect, markConversationRead);
router.get('/:userId', protect, getMessages);

module.exports = router;
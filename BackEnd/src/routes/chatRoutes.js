const express = require('express');
const router = express.Router();
const {
  sendMessage,
  getMessages,
  getUnreadMessageCount,
  getConversations,
  markConversationRead,
  editMessage,
  deleteMessage
} = require('../controllers/chatController');
const { protect } = require('../middleware/authMiddleware');
const { uploadChatAttachments } = require('../middleware/chatAttachmentUpload');

router.post('/send', protect, uploadChatAttachments, sendMessage);
router.put('/messages/:messageId', protect, editMessage);
router.delete('/messages/:messageId', protect, deleteMessage);
router.get('/unread/count', protect, getUnreadMessageCount);
router.get('/conversations', protect, getConversations);
router.put('/:userId/read', protect, markConversationRead);
router.get('/:userId', protect, getMessages);

module.exports = router;
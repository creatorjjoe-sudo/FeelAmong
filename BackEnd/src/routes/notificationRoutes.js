const express = require('express');
const router = express.Router();
const {
  listNotifications,
  getUnreadCount,
  getPendingFriendRequestCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  respondToFriendRequest
} = require('../controllers/notificationController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);

router.route('/').get(listNotifications);
router.get('/unread-count', getUnreadCount);
router.get('/friend-requests/count', getPendingFriendRequestCount);
router.put('/read-all', markAllAsRead);
router.put('/:id/read', markAsRead);
router.put('/:id/respond', respondToFriendRequest);
router.delete('/:id', deleteNotification);

module.exports = router;

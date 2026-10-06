const express = require('express');
const router = express.Router();
const {
  listSavedItems,
  createSavedFolder,
  saveItemToFolder,
  removeSavedItem
} = require('../controllers/savedItemController');
const { protect } = require('../middleware/authMiddleware');

router.use(protect);
router.get('/', listSavedItems);
router.post('/folders', createSavedFolder);
router.put('/items', saveItemToFolder);
router.delete('/items/:itemType/:itemId', removeSavedItem);

module.exports = router;

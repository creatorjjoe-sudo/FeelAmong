import express from 'express';
import {sendMessage, getConversation} from '../controllers/messagecontroller.js';
import {protect} from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/', protect, sendMessage);
router.get('/:targetUserId', protect, getConversation);

export default router;

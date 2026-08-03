import express from 'express';
import {signup, signin, getAllUsers} from '../controllers/authcontrollers.js';
import {protect} from '../middleware/authmiddleware.js';

const router = express.Router();

router.post('/signup', signup);
router.post('/signin', signin);
router.get('/users', protect, getAllUsers);

export default router;

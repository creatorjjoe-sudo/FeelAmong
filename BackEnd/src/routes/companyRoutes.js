const express = require('express');
const { listCompanies, createCompany, switchToCompany } = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfileAvatar } = require('../middleware/profileAvatarUpload');

const router = express.Router();

router.use(protect);
router.get('/', listCompanies);
router.post('/', uploadProfileAvatar, createCompany);
router.post('/:id/switch', switchToCompany);

module.exports = router;

const express = require('express');
const {
  listCompanies,
  createCompany,
  switchToCompany,
  updateCompany,
  getCompanySuggestions,
  updateCompanyFollow,
  dismissCompanySuggestion
} = require('../controllers/companyController');
const { protect } = require('../middleware/authMiddleware');
const { uploadProfileAvatar } = require('../middleware/profileAvatarUpload');

const router = express.Router();

router.use(protect);
router.get('/', listCompanies);
router.get('/suggestions', getCompanySuggestions);
router.post('/', uploadProfileAvatar, createCompany);
router.put('/:id/follow', updateCompanyFollow);
router.delete('/:id/follow', updateCompanyFollow);
router.delete('/:id/suggestion', dismissCompanySuggestion);
router.post('/:id/switch', switchToCompany);
router.patch('/:id', uploadProfileAvatar, updateCompany);

module.exports = router;

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const Post = require('../models/Post');
const Video = require('../models/Video');
const { deleteUploadedFiles, deleteStoredMedia } = require('../services/mediaStorage');

const removeUploadedAvatar = async (file) => {
  if (file) await deleteUploadedFiles([file]);
};

const listCompanies = async (req, res) => {
  try {
    if (req.user.isCompany || req.user.isAnonymous) {
      return res.status(403).json({ message: 'Only a personal account can manage company accounts' });
    }
    const companies = await User.find({
      companyOwner: req.user._id,
      isCompany: true
    }).select('username avatar bio isCompany').sort({ createdAt: 1 });
    res.json(companies.map((company) => ({
      _id: company._id,
      username: company.username,
      avatar: company.avatar,
      description: company.bio,
      isCompany: true
    })));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const createCompany = async (req, res) => {
  let createdCompany;
  try {
    if (req.user.isCompany || req.user.isAnonymous) {
      await removeUploadedAvatar(req.file);
      return res.status(403).json({ message: 'Only a personal account can create a company account' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (name.length < 2 || name.length > 80) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Company name must be between 2 and 80 characters' });
    }
    if (description.length > 500) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Company description must be 500 characters or fewer' });
    }

    let username = name;
    let suffix = 2;
    while (await User.exists({ username })) {
      username = `${name} ${suffix}`;
      suffix += 1;
    }

    createdCompany = await User.create({
      username,
      firstName: name,
      bio: description,
      avatar: req.file ? req.file.cloudinaryAsset.url : '',
      isCompany: true,
      companyOwner: req.user._id,
      isAnonymous: false
    });

    res.status(201).json({
      _id: createdCompany._id,
      username: createdCompany.username,
      avatar: createdCompany.avatar,
      description: createdCompany.bio,
      isCompany: true
    });
  } catch (error) {
    if (!createdCompany) await removeUploadedAvatar(req.file);
    res.status(500).json({ message: error.message });
  }
};

const switchToCompany = async (req, res) => {
  try {
    if (req.user.isCompany || req.user.isAnonymous) {
      return res.status(403).json({ message: 'Switching companies requires your personal account' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company account' });
    }
    const company = await User.findOne({
      _id: req.params.id,
      companyOwner: req.user._id,
      isCompany: true
    }).select('-password');
    if (!company) return res.status(404).json({ message: 'Company account not found' });

    res.json({
      _id: company._id,
      username: company.username,
      firstName: company.firstName,
      lastName: company.lastName,
      avatar: company.avatar,
      bio: company.bio,
      isCompany: true,
      token: jwt.sign({ id: company._id }, process.env.JWT_SECRET, { expiresIn: '30d' })
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCompany = async (req, res) => {
  let previousAvatar = '';
  try {
    if (req.user.isAnonymous) {
      await removeUploadedAvatar(req.file);
      return res.status(403).json({ message: 'Sign in to your personal account to edit a company' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Invalid company account' });
    }

    const company = await User.findOne({
      _id: req.params.id,
      companyOwner: req.user._id,
      isCompany: true
    });
    if (!company) {
      await removeUploadedAvatar(req.file);
      return res.status(404).json({ message: 'Company account not found' });
    }

    const name = typeof req.body.name === 'string' ? req.body.name.trim().replace(/\s+/g, ' ') : '';
    const description = typeof req.body.description === 'string' ? req.body.description.trim() : '';
    if (name.length < 2 || name.length > 80) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Company name must be between 2 and 80 characters' });
    }
    if (description.length > 500) {
      await removeUploadedAvatar(req.file);
      return res.status(400).json({ message: 'Company description must be 500 characters or fewer' });
    }

    if (name !== company.firstName) {
      let username = name;
      let suffix = 2;
      while (await User.exists({ _id: { $ne: company._id }, username })) {
        username = `${name} ${suffix}`;
        suffix += 1;
      }
      company.username = username;
    }
    company.firstName = name;
    company.bio = description;

    if (req.file) {
      previousAvatar = company.avatar;
      company.avatar = req.file.cloudinaryAsset.url;
    }
    await company.save();

    if (previousAvatar && previousAvatar !== company.avatar) {
      await deleteStoredMedia(previousAvatar, 'image');
    }

    res.json({
      _id: company._id,
      username: company.username,
      firstName: company.firstName,
      lastName: '',
      avatar: company.avatar,
      bio: company.bio,
      isCompany: true
    });
  } catch (error) {
    await removeUploadedAvatar(req.file);
    res.status(500).json({ message: error.message });
  }
};

const INTEREST_STOP_WORDS = new Set([
  'about', 'after', 'again', 'also', 'and', 'are', 'because', 'been', 'before', 'being',
  'but', 'can', 'could', 'did', 'does', 'for', 'from', 'have', 'here', 'how', 'into',
  'just', 'more', 'most', 'not', 'our', 'out', 'over', 'she', 'some', 'than', 'that',
  'the', 'their', 'them', 'then', 'there', 'these', 'they', 'this', 'those', 'through',
  'too', 'very', 'was', 'were', 'what', 'when', 'where', 'which', 'who', 'will', 'with',
  'you', 'your'
]);

function getInterestTerms(text) {
  const terms = new Map();
  for (const word of text.toLowerCase().match(/[a-z0-9]{3,}/g) || []) {
    if (INTEREST_STOP_WORDS.has(word)) continue;
    terms.set(word, (terms.get(word) || 0) + 1);
  }
  return terms;
}

const getCompanySuggestions = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.status(403).json({ message: 'Sign in to get company suggestions' });
    }

    const [likedPosts, likedVideos] = await Promise.all([
      Post.find({ likes: req.user._id, visibility: 'public' })
        .select('title description')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean(),
      Video.find({ likes: req.user._id, visibility: 'public' })
        .select('title caption')
        .sort({ updatedAt: -1 })
        .limit(50)
        .lean()
    ]);
    const interestTerms = getInterestTerms([
      ...likedPosts.flatMap((post) => [post.title, post.description]),
      ...likedVideos.flatMap((video) => [video.title, video.caption])
    ].filter(Boolean).join(' '));
    const excludedIds = [
      req.user._id,
      ...(req.user.followingCompanies || []),
      ...(req.user.dismissedCompanySuggestions || [])
    ];
    const companyOwnerId = req.user.isCompany && req.user.companyOwner
      ? req.user.companyOwner
      : req.user._id;
    const companies = await User.find({
      _id: { $nin: excludedIds },
      isCompany: true,
      companyOwner: { $ne: companyOwnerId },
      isAnonymous: { $ne: true }
    }).select('username firstName avatar bio createdAt').sort({ createdAt: -1 }).limit(100).lean();

    const suggestions = companies.map((company) => {
      const companyTerms = getInterestTerms(`${company.username} ${company.bio || ''}`);
      let relevanceScore = 0;
      companyTerms.forEach((frequency, term) => {
        relevanceScore += frequency * (interestTerms.get(term) || 0);
      });
      return { ...company, isCompany: true, isFollowing: false, relevanceScore };
    }).sort((first, second) => (
      second.relevanceScore - first.relevanceScore
      || new Date(second.createdAt).getTime() - new Date(first.createdAt).getTime()
    )).map(({ relevanceScore, ...company }) => company);

    res.json({ suggestions });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const updateCompanyFollow = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.status(403).json({ message: 'Sign in to follow companies' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company account' });
    }
    const company = await User.findOne({ _id: req.params.id, isCompany: true }).select('_id');
    if (!company) return res.status(404).json({ message: 'Company account not found' });
    if (String(company._id) === String(req.user._id)) {
      return res.status(400).json({ message: 'You cannot follow your own company account' });
    }

    const shouldFollow = req.method === 'PUT';
    const update = shouldFollow
      ? { $addToSet: { followingCompanies: company._id }, $pull: { dismissedCompanySuggestions: company._id } }
      : { $pull: { followingCompanies: company._id } };
    const currentUser = await User.findByIdAndUpdate(req.user._id, update, { new: true })
      .select('followingCompanies');
    res.json({
      companyId: company._id,
      isFollowing: currentUser.followingCompanies.some((id) => String(id) === String(company._id))
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const dismissCompanySuggestion = async (req, res) => {
  try {
    if (req.user.isAnonymous) {
      return res.status(403).json({ message: 'Sign in to manage company suggestions' });
    }
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid company account' });
    }
    const company = await User.findOne({ _id: req.params.id, isCompany: true }).select('_id');
    if (!company) return res.status(404).json({ message: 'Company account not found' });
    await User.updateOne(
      { _id: req.user._id },
      { $addToSet: { dismissedCompanySuggestions: company._id } }
    );
    res.json({ companyId: company._id, dismissed: true });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  listCompanies,
  createCompany,
  switchToCompany,
  updateCompany,
  getCompanySuggestions,
  updateCompanyFollow,
  dismissCompanySuggestion
};

const jwt = require('jsonwebtoken');
const mongoose = require('mongoose');
const User = require('../models/User');
const { deleteUploadedFiles } = require('../services/mediaStorage');

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

module.exports = { listCompanies, createCompany, switchToCompany };

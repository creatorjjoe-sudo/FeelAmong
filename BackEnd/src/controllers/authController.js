const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const generateToken = (id) => {
  return jwt.sign({ id }, process.env.JWT_SECRET, { expiresIn: '30d' });
};

const registerUser = async (req, res) => {
  try {
    const { email, firstName, lastName, password, dateOfBirth, sex, status, from, bio } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    const normalizedFirstName = typeof firstName === 'string' ? firstName.trim().replace(/\s+/g, ' ') : '';
    const normalizedLastName = typeof lastName === 'string' ? lastName.trim().replace(/\s+/g, ' ') : '';

    if (!normalizedEmail || !normalizedFirstName || !normalizedLastName || !password) {
      return res.status(400).json({ message: 'Please add all required fields' });
    }

    const userExists = await User.findOne({ email: normalizedEmail });
    if (userExists) {
      return res.status(400).json({ message: 'A user with this email already exists' });
    }

    const baseUsername = `${normalizedFirstName} ${normalizedLastName}`;
    let username = baseUsername;
    let suffix = 2;
    while (await User.exists({ username })) {
      username = `${baseUsername} ${suffix}`;
      suffix += 1;
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const user = await User.create({
      email: normalizedEmail,
      username,
      firstName: normalizedFirstName,
      lastName: normalizedLastName,
      password: hashedPassword,
      dateOfBirth: dateOfBirth || '',
      sex: sex || '',
      status: status || 'Single',
      from: from || '',
      bio: bio || '',
      isAnonymous: false
    });

    res.status(201).json({
      _id: user._id,
      username: user.username,
      firstName: user.firstName,
      lastName: user.lastName,
      sex: user.sex,
      avatar: user.avatar,
      email: user.email,
      friends: user.friends,
      token: generateToken(user._id)
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { loginIdentifier, password } = req.body;

    if (!loginIdentifier || !password) {
      return res.status(400).json({ message: 'Please provide login details and password' });
    }

    const user = await User.findOne({
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }]
    });

    if (user && (await bcrypt.compare(password, user.password))) {
      res.json({
        _id: user._id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        sex: user.sex,
        avatar: user.avatar,
        email: user.email,
        friends: user.friends,
        token: generateToken(user._id)
      });
    } else {
      res.status(401).json({ message: 'Invalid credentials' });
    }
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getLoginPreview = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email, isAnonymous: { $ne: true } })
      .select('firstName avatar sex')
      .lean();

    res.json({
      profile: user
        ? { firstName: user.firstName, avatar: user.avatar, sex: user.sex }
        : null
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

const getProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id).select('-password');
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getLoginPreview, getProfile };
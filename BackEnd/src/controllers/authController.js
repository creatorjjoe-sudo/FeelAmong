const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');
const nodemailer = require('nodemailer');

// --- Password reset helpers ---------------------------------------------

const buildTransporter = () => {
  // If SMTP credentials are not configured, fall back to a development
  // transporter that logs the message instead of sending a real email.
  if (process.env.SMTP_HOST) {
    return nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT) || 587,
      secure: String(process.env.SMTP_SECURE) === 'true',
      auth: process.env.SMTP_USER
        ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
        : undefined
    });
  }
  return {
    sendMail: async (mailOptions) => {
      console.log('=== SMTP not configured: reset email not sent ===');
      console.log(`To: ${mailOptions.to}`);
      console.log(`Subject: ${mailOptions.subject}`);
      console.log(mailOptions.text || '');
      return { accepted: [mailOptions.to] };
    }
  };
};

const sendResetCodeEmail = async (user, code) => {
  const transporter = buildTransporter();
  const from = process.env.SMTP_FROM || 'feelamong <no-reply@feelamong.app>';
  await transporter.sendMail({
    from,
    to: user.email,
    subject: `Your feelamong password reset code: ${code}`,
    text: `Hi ${user.firstName || 'there'},\n\n` +
      `You requested a password reset for your feelamong account.\n\n` +
      `Your verification code is:\n\n    ${code}\n\n` +
      `It expires in 10 minutes. If you did not request this, you can safely ignore this email.\n\n` +
      `— The feelamong team`,
    html: `<p>Hi ${user.firstName || 'there'},</p>` +
      `<p>You requested a password reset for your feelamong account.</p>` +
      `<p>Your verification code is:</p>` +
      `<p style="font-size:28px;letter-spacing:8px;font-weight:bold;">${code}</p>` +
      `<p>It expires in <strong>10 minutes</strong>. If you did not request this, you can safely ignore this email.</p>` +
      `<p>— The feelamong team</p>`
  });
};

// Step 1: user submits their email; a 6-digit code is emailed to them.
const forgotPassword = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    if (!/^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    const user = await User.findOne({ email, isAnonymous: { $ne: true } });

    // Always respond the same way so the endpoint cannot be used to
    // discover which email addresses have accounts.
    if (!user) {
      return res.json({ message: 'If an account with this email exists, a reset code has been sent' });
    }

    const code = String(crypto.randomInt(100000, 1000000));
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000);

    user.resetPasswordCode = code;
    user.resetPasswordCodeExpiresAt = expiresAt;
    // Invalidate any previously issued reset token.
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    await user.save();

    await sendResetCodeEmail(user, code);

    res.json({ message: 'If an account with this email exists, a reset code has been sent' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Step 2: user submits the emailed code; it is exchanged for a reset token.
const verifyResetCode = async (req, res) => {
  try {
    const email = typeof req.body.email === 'string' ? req.body.email.trim().toLowerCase() : '';
    const code = typeof req.body.code === 'string' ? req.body.code.trim() : '';

    if (!email || !code) {
      return res.status(400).json({ message: 'Please provide your email and reset code' });
    }

    const user = await User.findOne({ email, isAnonymous: { $ne: true } });

    if (!user || !user.resetPasswordCode || user.resetPasswordCode !== code) {
      return res.status(400).json({ message: 'Invalid or incorrect code' });
    }
    if (!user.resetPasswordCodeExpiresAt || user.resetPasswordCodeExpiresAt < new Date()) {
      return res.status(400).json({ message: 'This code has expired, please request a new one' });
    }

    const token = crypto.randomBytes(32).toString('hex');
    user.resetPasswordToken = token;
    user.resetPasswordTokenExpiresAt = new Date(Date.now() + 15 * 60 * 1000);
    // A code can only be exchanged once.
    user.resetPasswordCode = null;
    user.resetPasswordCodeExpiresAt = null;
    await user.save();

    res.json({ message: 'Code verified', resetToken: token });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// Step 3: user sets a new password using the reset token.
const resetPassword = async (req, res) => {
  try {
    const { email, resetToken, password } = req.body;
    const normalizedEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';

    if (!normalizedEmail || !resetToken || !password) {
      return res.status(400).json({ message: 'Please provide your email, reset token and a new password' });
    }
    if (typeof password !== 'string' || password.length < 6) {
      return res.status(400).json({ message: 'Your new password must be at least 6 characters' });
    }

    const user = await User.findOne({ email: normalizedEmail, isAnonymous: { $ne: true } });

    if (!user || user.resetPasswordToken !== resetToken) {
      return res.status(400).json({ message: 'Invalid reset request, please start again' });
    }
    if (!user.resetPasswordTokenExpiresAt || user.resetPasswordTokenExpiresAt < new Date()) {
      return res.status(400).json({ message: 'This reset request has expired, please start again' });
    }

    const salt = await bcrypt.genSalt(10);
    user.password = await bcrypt.hash(password, salt);
    user.resetPasswordToken = null;
    user.resetPasswordTokenExpiresAt = null;
    await user.save();

    res.json({ message: 'Your password has been reset, you can now log in' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// ------------------------------------------------------------------------

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
      isCompany: false,
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
      $or: [{ email: loginIdentifier }, { username: loginIdentifier }],
      isCompany: { $ne: true }
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
        isCompany: false,
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
    if (user?.isCompany) {
      const followersCount = await User.countDocuments({ followingCompanies: user._id });
      return res.json({
        ...user.toObject(),
        followersCount,
        followingCount: user.followingCompanies.length
      });
    }
    res.json(user);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { registerUser, loginUser, getLoginPreview, getProfile, forgotPassword, verifyResetCode, resetPassword };
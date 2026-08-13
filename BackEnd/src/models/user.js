const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: function () { return !this.isAnonymous; },
      unique: true,
      sparse: true,
      lowercase: true,
      trim: true
    },
    username: {
      type: String,
      required: function () { return !this.isAnonymous; },
      unique: true,
      sparse: true,
      trim: true
    },
    password: {
      type: String,
      required: function () { return !this.isAnonymous; }
    },
    dateOfBirth: { type: String, default: '' },
    sex: { type: String, default: '' },
    status: { type: String, default: 'Single' },
    from: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isAnonymous: { type: Boolean, default: false }
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
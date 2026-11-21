const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    email: {
      type: String,
      required: function () { return !this.isAnonymous && !this.isCompany; },
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
    firstName: { type: String, trim: true, default: '' },
    lastName: { type: String, trim: true, default: '' },
    password: {
      type: String,
      required: function () { return !this.isAnonymous && !this.isCompany; }
    },
    dateOfBirth: { type: String, default: '' },
    sex: { type: String, default: '' },
    status: { type: String, default: 'Single' },
    from: { type: String, default: '' },
    location: { type: String, default: '' },
    bio: { type: String, default: '' },
    avatar: { type: String, default: '' },
    isCompany: { type: Boolean, default: false },
    companyOwner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    lastSeen: { type: Date, default: null },
    friends: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    isAnonymous: { type: Boolean, default: false },
    resetPasswordToken: { type: String, default: null },
    resetPasswordTokenExpiresAt: { type: Date, default: null },
    resetPasswordCode: { type: String, default: null },
    resetPasswordCodeExpiresAt: { type: Date, default: null }
  },
  { timestamps: true, autoIndex: false }
);

userSchema.index(
  { email: 1 },
  { unique: true, partialFilterExpression: { email: { $type: 'string' } } }
);

module.exports = mongoose.model('User', userSchema);
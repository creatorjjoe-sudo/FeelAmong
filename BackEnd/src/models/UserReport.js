const mongoose = require('mongoose');

const userReportSchema = new mongoose.Schema(
  {
    reportedUser: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reporter: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    reason: {
      type: String,
      enum: ['Spam', 'Harassment', 'Inappropriate content', 'False information', 'Other'],
      required: true
    },
    details: { type: String, trim: true, maxlength: 1000, default: '' }
  },
  { timestamps: true }
);

userReportSchema.index({ reportedUser: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model('UserReport', userReportSchema);

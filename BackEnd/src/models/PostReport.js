const mongoose = require('mongoose');

const postReportSchema = new mongoose.Schema(
  {
    post: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', required: true },
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

postReportSchema.index({ post: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model('PostReport', postReportSchema);

const mongoose = require('mongoose');

const videoReportSchema = new mongoose.Schema(
  {
    video: { type: mongoose.Schema.Types.ObjectId, ref: 'Video', required: true },
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

videoReportSchema.index({ video: 1, reporter: 1 }, { unique: true });

module.exports = mongoose.model('VideoReport', videoReportSchema);

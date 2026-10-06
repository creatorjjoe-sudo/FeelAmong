const mongoose = require('mongoose');

const savedFolderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true, trim: true, maxlength: 50 }
  },
  { timestamps: true }
);

savedFolderSchema.index({ user: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('SavedFolder', savedFolderSchema);

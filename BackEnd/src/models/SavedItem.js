const mongoose = require('mongoose');

const savedItemSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    folder: { type: mongoose.Schema.Types.ObjectId, ref: 'SavedFolder', required: true },
    itemType: { type: String, enum: ['post', 'video'], required: true },
    item: { type: mongoose.Schema.Types.ObjectId, required: true }
  },
  { timestamps: true }
);

savedItemSchema.index({ user: 1, itemType: 1, item: 1 }, { unique: true });

module.exports = mongoose.model('SavedItem', savedItemSchema);

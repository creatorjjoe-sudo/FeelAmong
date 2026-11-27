const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema(
  {
    sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    recipient: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, default: '' },
    attachments: [{
      url: { type: String, required: true },
      publicId: { type: String, required: true },
      resourceType: { type: String, enum: ['image', 'raw'], required: true },
      filename: { type: String, required: true },
      mimeType: { type: String, required: true },
      size: { type: Number, required: true }
    }],
    read: { type: Boolean, default: false },
    readAt: { type: Date, default: null },
    // Optional reply reference for chat replies.
    replyTo: { type: mongoose.Schema.Types.ObjectId, ref: 'Message', default: null },
    editedAt: { type: Date, default: null },
    deletedAt: { type: Date, default: null },
    // Users who chose "delete for me": the message stays visible to the
    // other participant but is hidden for these users.
    deletedFor: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]

  },
  { timestamps: true }
);

module.exports = mongoose.model('Message', messageSchema);
const mongoose = require('mongoose');

const subReplySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }]
  },
  { timestamps: true }
);

const replySchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [subReplySchema]
  },
  { timestamps: true }
);

const commentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    replies: [replySchema]
  },
  { timestamps: true }
);

const postSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    postType: { type: String, enum: ['text', 'image', 'share'], default: 'image' },
    title: { type: String, trim: true, default: '' },
    description: { type: String, default: '' },
    backgroundColor: { type: String, default: '#f1f7f1' },
    images: [{ type: String }], // Array of image URLs for multi-image grid layouts
    sharedPost: { type: mongoose.Schema.Types.ObjectId, ref: 'Post', default: null },
    shareCaption: { type: String, trim: true, default: '' },
    visibility: {
      type: String,
      enum: ['public', 'private', 'friends'],
      default: 'public'
    },
    likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    saves: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
    sharesCount: { type: Number, default: 0 },
    comments: [commentSchema]
  },
  { timestamps: true }
);

module.exports = mongoose.model('Post', postSchema);
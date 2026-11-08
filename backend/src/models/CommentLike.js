const mongoose = require('mongoose');

const commentLikeSchema = new mongoose.Schema(
  {
    comment: { type: mongoose.Schema.Types.ObjectId, ref: 'Comment', required: true, index: true },
    viewerId: { type: String, required: true, trim: true },
  },
  { timestamps: true },
);

commentLikeSchema.index({ comment: 1, viewerId: 1 }, { unique: true });

module.exports = mongoose.model('CommentLike', commentLikeSchema);

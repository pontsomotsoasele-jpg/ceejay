const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema(
  {
    recipientEmail: { type: String, required: true, lowercase: true, trim: true, index: true },
    recipientId: { type: String, default: '', trim: true, maxlength: 100, index: true },
    actorId: { type: String, default: '', trim: true, maxlength: 100 },
    actorName: { type: String, required: true, trim: true, maxlength: 80 },
    type: { type: String, enum: ['like', 'comment', 'share', 'milestone'], required: true },
    content: { type: mongoose.Schema.Types.ObjectId, ref: 'Content', default: null },
    contentTitle: { type: String, required: true, trim: true, maxlength: 140 },
    message: { type: String, required: true, trim: true, maxlength: 300 },
    readAt: { type: Date, default: null },
    eventKey: { type: String, default: undefined, unique: true, sparse: true },
  },
  { timestamps: true },
);

notificationSchema.index({ recipientEmail: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);

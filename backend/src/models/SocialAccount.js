const mongoose = require('mongoose');

const socialAccountSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['google', 'facebook'], required: true },
    accountId: { type: String, required: true },
    accountName: { type: String, required: true },
    email: { type: String, lowercase: true, trim: true, default: '' },
    pageId: { type: String, default: '' },
    pageName: { type: String, default: '' },
    pageAbout: { type: String, default: '', maxlength: 5000 },
    pageCategory: { type: String, default: '', maxlength: 120 },
    pageWebsite: { type: String, default: '', maxlength: 500 },
    pagePictureUrl: { type: String, default: '', maxlength: 2000 },
    pageLink: { type: String, default: '', maxlength: 2000 },
    accessToken: { type: String, required: true, select: false },
    refreshToken: { type: String, default: '', select: false },
    expiresAt: { type: Date, default: null },
    connectedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    lastSyncedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

socialAccountSchema.index({ provider: 1, accountId: 1 }, { unique: true });

module.exports = mongoose.model('SocialAccount', socialAccountSchema);

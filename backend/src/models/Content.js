const mongoose = require('mongoose');

const contentSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String, required: true, trim: true, maxlength: 5000 },
    category: { type: String, required: true, trim: true, maxlength: 60 },
    type: { type: String, enum: ['Video', 'Article', 'Image', 'Podcast'], required: true },
    thumbnailUrl: { type: String, trim: true, default: '' },
    mediaUrl: { type: String, trim: true, default: '' },
    articleContent: { type: String, default: '' },
    status: { type: String, enum: ['Draft', 'Published', 'Scheduled'], default: 'Draft' },
    scheduledAt: { type: Date, default: null },
    publishedAt: { type: Date, default: null },
    platform: { type: String, enum: ['Ethera', 'Facebook', 'YouTube'], default: 'Ethera' },
    externalId: { type: String, default: '' },
    platformUrl: { type: String, default: '' },
    views: { type: Number, default: 0, min: 0 },
    likesCount: { type: Number, default: 0, min: 0 },
    featured: { type: Boolean, default: false },
  },
  { timestamps: true },
);

contentSchema.index({ status: 1, publishedAt: -1 });
contentSchema.index({ title: 'text', description: 'text', category: 'text' });
contentSchema.index(
  { platform: 1, externalId: 1 },
  { unique: true, partialFilterExpression: { externalId: { $type: 'string', $gt: '' } } },
);

module.exports = mongoose.model('Content', contentSchema);

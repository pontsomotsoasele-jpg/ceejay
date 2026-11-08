import mongoose from 'mongoose';

const postSchema = new mongoose.Schema(
  {
    seedKey: { type: String, unique: true, sparse: true },
    title: { type: String, required: true, trim: true, maxlength: 120 },
    description: { type: String, trim: true, maxlength: 2000, default: '' },
    category: { type: String, required: true, trim: true, maxlength: 40 },
    source: {
      type: String,
      enum: ['Original', 'YouTube', 'Facebook', 'Link'],
      default: 'Original',
    },
    url: { type: String, trim: true, maxlength: 2048, default: '' },
    thumbnailUrl: { type: String, trim: true, maxlength: 2048, default: '' },
    status: { type: String, enum: ['published', 'draft'], default: 'published' },
    createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  },
  { timestamps: true },
);

export default mongoose.model('Post', postSchema);

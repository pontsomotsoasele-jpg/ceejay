const mongoose = require('mongoose');

const viewerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    imageUrl: { type: String, trim: true, default: '' },
    passwordHash: { type: String, select: false },
    googleId: { type: String, default: undefined },
    facebookId: { type: String, default: undefined },
  },
  { timestamps: true },
);

viewerSchema.index({ googleId: 1 }, { unique: true, sparse: true });
viewerSchema.index({ facebookId: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Viewer', viewerSchema);

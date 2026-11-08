const User = require('../models/User');
const SocialAccount = require('../models/SocialAccount');

async function getProfile(req, res, next) {
  try {
    const email = (process.env.CREATOR_EMAIL || 'ariesavy9@gmail.com').trim().toLowerCase();
    const creator = await User.findOne({ email }).select('name imageUrl publicAge').lean();
    const [youtubeAccount, facebookAccount] = creator
      ? await Promise.all([
        SocialAccount.findOne({ provider: 'google', connectedBy: creator._id }).select('accountName').lean(),
        SocialAccount.findOne({ provider: 'facebook', connectedBy: creator._id })
          .select('pageName pageAbout pageCategory pageWebsite pagePictureUrl pageLink')
          .lean(),
      ])
      : [null, null];

    return res.json({
      profile: {
        name: facebookAccount?.pageName || youtubeAccount?.accountName || creator?.name || process.env.CREATOR_NAME || 'Creator',
        imageUrl: facebookAccount?.pagePictureUrl || creator?.imageUrl || '',
        introduction: 'Videos, ideas, and updates shared by the creator.',
        publicAge: creator?.publicAge || null,
        facebookPage: facebookAccount ? {
          name: facebookAccount.pageName,
          about: facebookAccount.pageAbout,
          category: facebookAccount.pageCategory,
          website: facebookAccount.pageWebsite,
          imageUrl: facebookAccount.pagePictureUrl,
          url: facebookAccount.pageLink,
        } : null,
      },
    });
  } catch (error) {
    return next(error);
  }
}

async function updatePublicProfile(req, res, next) {
  try {
    const rawAge = req.body?.publicAge;
    let publicAge = null;
    if (rawAge !== null && rawAge !== undefined && rawAge !== '') {
      publicAge = Number(rawAge);
      if (!Number.isInteger(publicAge) || publicAge < 13 || publicAge > 120) {
        return res.status(400).json({ message: 'Public age must be a whole number between 13 and 120, or left blank.' });
      }
    }
    const email = (process.env.CREATOR_EMAIL || 'ariesavy9@gmail.com').trim().toLowerCase();
    const creator = await User.findOneAndUpdate(
      { email },
      { $set: { publicAge } },
      { new: true, runValidators: true },
    ).select('publicAge').lean();
    if (!creator) return res.status(404).json({ message: 'Creator profile was not found.' });
    return res.json({ publicAge: creator.publicAge });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getProfile, updatePublicProfile };

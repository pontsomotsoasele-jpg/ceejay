const Content = require('../models/Content');
const Comment = require('../models/Comment');
const Like = require('../models/Like');

async function getStats(req, res, next) {
  try {
    const [total, published, drafts, scheduled, comments, views, likes, popular] = await Promise.all([
      Content.countDocuments(),
      Content.countDocuments({ status: 'Published' }),
      Content.countDocuments({ status: 'Draft' }),
      Content.countDocuments({ status: 'Scheduled' }),
      Comment.countDocuments(),
      Content.aggregate([{ $group: { _id: null, total: { $sum: '$views' } } }]),
      Like.countDocuments(),
      Content.find({ status: 'Published' }).sort({ views: -1 }).limit(5).select('title views likesCount').lean(),
    ]);
    return res.json({
      stats: {
        total,
        published,
        drafts,
        scheduled,
        comments,
        views: views[0]?.total || 0,
        likes,
      },
      popular,
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = { getStats };

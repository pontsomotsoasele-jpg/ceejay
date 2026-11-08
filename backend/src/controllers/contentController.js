const Content = require('../models/Content');
const Comment = require('../models/Comment');
const CommentLike = require('../models/CommentLike');
const Like = require('../models/Like');
const slugify = require('../utils/slug');
const createNotification = require('../services/createNotification');

const contentFields = ['title', 'description', 'category', 'type', 'thumbnailUrl', 'mediaUrl', 'articleContent', 'status', 'scheduledAt', 'featured'];
const publishedFilter = {
  status: 'Published',
  $or: [{ publishedAt: null }, { publishedAt: { $lte: new Date() } }],
};

function validateContent(body) {
  const values = {};
  contentFields.forEach((field) => {
    if (Object.hasOwn(body, field)) values[field] = body[field];
  });
  if (values.title !== undefined && !String(values.title).trim()) throw new Error('Title is required.');
  if (values.description !== undefined && !String(values.description).trim()) throw new Error('Description is required.');
  if (values.category !== undefined && !String(values.category).trim()) throw new Error('Category is required.');
  if (values.status === 'Scheduled' && !values.scheduledAt) throw new Error('A publish date is required for scheduled content.');
  if (values.status === 'Published' && !values.publishedAt) values.publishedAt = new Date();
  if (values.status && !['Draft', 'Published', 'Scheduled'].includes(values.status)) throw new Error('Choose Draft, Published, or Scheduled status.');
  if (values.type && !['Video', 'Article', 'Image', 'Podcast'].includes(values.type)) throw new Error('Choose a valid content type.');
  if (values.thumbnailUrl && !isValidUrl(values.thumbnailUrl)) throw new Error('Thumbnail URL must be a valid URL.');
  if (values.mediaUrl && !isValidUrl(values.mediaUrl)) throw new Error('Media URL must be a valid URL.');
  return values;
}

function isValidUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

async function listContents(req, res, next) {
  try {
    const { category, search, all, type } = req.query;
    const filter = all === 'true' && req.creator
      ? {}
      : { ...publishedFilter };
    if (category && category !== 'All') filter.category = category;
    if (search) filter.$text = { $search: String(search).slice(0, 100) };
    if (type && ['Video', 'Article', 'Image', 'Podcast'].includes(type)) filter.type = type;
    if (req.query.platform && ['Ethera', 'Facebook', 'YouTube'].includes(req.query.platform)) {
      filter.platform = req.query.platform;
    }
    const contents = await Content.find(filter).sort({ publishedAt: -1, createdAt: -1 }).lean();
    if (contents.length) {
      const commentCounts = await Comment.aggregate([
        { $match: { content: { $in: contents.map((content) => content._id) }, status: 'Approved' } },
        { $group: { _id: '$content', count: { $sum: 1 } } },
      ]);
      const countsByContent = new Map(commentCounts.map(({ _id, count }) => [String(_id), count]));
      contents.forEach((content) => {
        content.commentsCount = countsByContent.get(String(content._id)) || 0;
      });
    }
    return res.json({ contents });
  } catch (error) {
    return next(error);
  }
}

async function getContent(req, res, next) {
  try {
    const filter = req.creator ? { _id: req.params.id } : { _id: req.params.id, ...publishedFilter };
    const content = await Content.findOne(filter).lean();
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    return res.json({ content });
  } catch (error) {
    return next(error);
  }
}

async function createContent(req, res, next) {
  try {
    const values = validateContent(req.body);
    const content = await Content.create({ ...values, slug: slugify(values.title) });
    return res.status(201).json({ content });
  } catch (error) {
    if (error.message.includes('required') || error.message.startsWith('Choose') || error.message.startsWith('Thumbnail') || error.message.startsWith('Media')) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function updateContent(req, res, next) {
  try {
    const values = validateContent(req.body);
    if (values.title) values.slug = slugify(values.title);
    const content = await Content.findByIdAndUpdate(req.params.id, values, {
      new: true,
      runValidators: true,
    });
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    return res.json({ content });
  } catch (error) {
    if (error.message.includes('required') || error.message.startsWith('Choose') || error.message.startsWith('Thumbnail') || error.message.startsWith('Media')) {
      return res.status(400).json({ message: error.message });
    }
    return next(error);
  }
}

async function deleteContent(req, res, next) {
  try {
    const content = await Content.findByIdAndDelete(req.params.id);
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    const commentIds = await Comment.find({ content: content._id }).distinct('_id');
    await Promise.all([
      Comment.deleteMany({ content: content._id }),
      CommentLike.deleteMany({ comment: { $in: commentIds } }),
      Like.deleteMany({ content: content._id }),
    ]);
    return res.json({ message: 'Content deleted.' });
  } catch (error) {
    return next(error);
  }
}

async function recordView(req, res, next) {
  try {
    const content = await Content.findOneAndUpdate(
      { _id: req.params.id, ...publishedFilter },
      { $inc: { views: 1 } },
      { new: true, projection: { views: 1 } },
    );
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    return res.json({ views: content.views });
  } catch (error) {
    return next(error);
  }
}

async function getLikeStatus(req, res, next) {
  try {
    const liked = await Like.exists({
      content: req.params.id,
      viewerId: req.authUser.id,
    });
    return res.json({ liked: Boolean(liked) });
  } catch (error) {
    return next(error);
  }
}

async function toggleLike(req, res, next) {
  try {
    const viewerId = req.authUser.id;
    const content = await Content.findOne({ _id: req.params.id, ...publishedFilter });
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    const existing = await Like.findOne({ content: content._id, viewerId });
    let liked;
    let updatedContent;
    if (existing) {
      await existing.deleteOne();
      liked = false;
      updatedContent = await Content.findByIdAndUpdate(
        content._id,
        { $inc: { likesCount: -1 } },
        { new: true, projection: { likesCount: 1 } },
      );
    } else {
      const like = await Like.create({ content: content._id, viewerId });
      liked = true;
      updatedContent = await Content.findByIdAndUpdate(
        content._id,
        { $inc: { likesCount: 1 } },
        { new: true, projection: { likesCount: 1 } },
      );
      await createNotification({
        actor: req.authUser,
        content,
        type: 'like',
        message: 'liked your content.',
        eventKey: `like:${like.id}`,
      });
    }
    const likesCount = updatedContent?.likesCount || 0;
    if (liked && likesCount === 100) {
      try {
        await createNotification({
          actor: { id: 'system', name: 'Ethera' },
          content,
          type: 'milestone',
          message: 'Your content reached 100 likes!',
          eventKey: `milestone:${content.id}:100`,
        });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
    }
    return res.json({ liked, likesCount });
  } catch (error) {
    return next(error);
  }
}

async function recordShare(req, res, next) {
  try {
    const messages = {
      whatsapp: 'opened a WhatsApp share for your content.',
      facebook: 'opened a Facebook share for your content.',
      instagram: 'copied the link and opened Instagram to share your content.',
      copy: 'copied the link to your content.',
    };
    const message = messages[req.body.method];
    if (!message) return res.status(400).json({ message: 'Choose WhatsApp, Facebook, Instagram, or copy to share.' });

    const content = await Content.findOne({ _id: req.params.id, ...publishedFilter });
    if (!content) return res.status(404).json({ message: 'Content not found.' });
    const notification = await createNotification({
      actor: req.authUser,
      content,
      type: 'share',
      message,
    });
    return res.status(201).json({ notification: { id: notification.id }, message: 'Share recorded.' });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listContents,
  getContent,
  createContent,
  updateContent,
  deleteContent,
  recordView,
  getLikeStatus,
  toggleLike,
  recordShare,
};

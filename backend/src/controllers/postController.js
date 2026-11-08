import mongoose from 'mongoose';
import Category from '../models/Category.js';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Post from '../models/Post.js';

function isValidPostUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && ['youtube.com', 'www.youtube.com', 'youtu.be', 'facebook.com', 'www.facebook.com', 'm.facebook.com', 'fb.watch'].includes(url.hostname);
  } catch {
    return false;
  }
}

function isValidImageUrl(value) {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'data:';
  } catch {
    return false;
  }
}

function validId(id) {
  return mongoose.isValidObjectId(id);
}

export async function listPosts(request, response, next) {
  try {
    const filter = request.user?.role === 'creator' && request.query.includeDrafts === 'true'
      ? {}
      : { status: 'published' };
    const posts = await Post.find(filter).sort({ createdAt: -1 }).lean();
    const ids = posts.map((post) => post._id);
    const [comments, likes, viewerLikes] = await Promise.all([
      Comment.aggregate([{ $match: { post: { $in: ids } } }, { $group: { _id: '$post', count: { $sum: 1 } } }]),
      Like.aggregate([{ $match: { post: { $in: ids } } }, { $group: { _id: '$post', count: { $sum: 1 } } }]),
      request.user
        ? Like.find({ post: { $in: ids }, user: request.user._id }).select('post').lean()
        : [],
    ]);
    const commentCounts = new Map(comments.map((entry) => [entry._id.toString(), entry.count]));
    const likeCounts = new Map(likes.map((entry) => [entry._id.toString(), entry.count]));
    const likedIds = new Set(viewerLikes.map((entry) => entry.post.toString()));

    response.json(posts.map((post) => ({
      ...post,
      likesCount: likeCounts.get(post._id.toString()) || 0,
      commentsCount: commentCounts.get(post._id.toString()) || 0,
      likedByMe: likedIds.has(post._id.toString()),
    })));
  } catch (error) {
    next(error);
  }
}

export async function getPost(request, response, next) {
  try {
    if (!validId(request.params.id)) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    const post = await Post.findById(request.params.id).lean();
    if (!post || (post.status !== 'published' && request.user?.role !== 'creator')) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    const [comments, likesCount, likedByMe] = await Promise.all([
      Comment.find({ post: post._id })
        .populate('author', 'name')
        .sort({ createdAt: 1 })
        .lean(),
      Like.countDocuments({ post: post._id }),
      request.user ? Like.exists({ post: post._id, user: request.user._id }) : false,
    ]);
    response.json({
      ...post,
      likesCount,
      commentsCount: comments.length,
      likedByMe: Boolean(likedByMe),
      comments: comments.map((comment) => ({
        id: comment._id,
        body: comment.body,
        author: comment.author.name,
        createdAt: comment.createdAt,
      })),
    });
  } catch (error) {
    next(error);
  }
}

export async function createPost(request, response, next) {
  try {
    const { title, description = '', category, source = 'Original', url = '', thumbnailUrl = '', status = 'published' } = request.body;
    if (typeof title !== 'string' || title.trim().length < 3 || title.trim().length > 120) {
      return response.status(400).json({ message: 'Post titles must be between 3 and 120 characters.' });
    }
    if (typeof description !== 'string' || description.length > 2000) {
      return response.status(400).json({ message: 'Descriptions can be up to 2,000 characters.' });
    }
    if (typeof category !== 'string' || !(await Category.exists({ name: category.trim() }))) {
      return response.status(400).json({ message: 'Choose a category that exists.' });
    }
    if (!['Original', 'YouTube', 'Facebook', 'Link'].includes(source)) {
      return response.status(400).json({ message: 'Choose a valid post type.' });
    }
    if (typeof url !== 'string' || !isValidPostUrl(url.trim())) {
      return response.status(400).json({ message: 'Use a valid HTTPS YouTube or Facebook link.' });
    }
    if (typeof thumbnailUrl !== 'string' || !isValidImageUrl(thumbnailUrl.trim())) {
      return response.status(400).json({ message: 'Thumbnail must be a valid HTTPS image URL.' });
    }
    if (!['published', 'draft'].includes(status)) {
      return response.status(400).json({ message: 'Choose published or draft status.' });
    }

    const post = await Post.create({
      title: title.trim(),
      description: description.trim(),
      category: category.trim(),
      source,
      url: url.trim(),
      thumbnailUrl: thumbnailUrl.trim(),
      status,
      createdBy: request.user._id,
    });
    response.status(201).json(post);
  } catch (error) {
    next(error);
  }
}

export async function deletePost(request, response, next) {
  try {
    if (!validId(request.params.id)) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    const post = await Post.findByIdAndDelete(request.params.id);
    if (!post) return response.status(404).json({ message: 'Post not found.' });
    await Promise.all([
      Comment.deleteMany({ post: post._id }),
      Like.deleteMany({ post: post._id }),
    ]);
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

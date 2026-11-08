import mongoose from 'mongoose';
import Comment from '../models/Comment.js';
import Like from '../models/Like.js';
import Post from '../models/Post.js';

export async function createComment(request, response, next) {
  try {
    const postId = request.params.id;
    const body = typeof request.body.body === 'string' ? request.body.body.trim() : '';
    if (!mongoose.isValidObjectId(postId)) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    if (body.length < 1 || body.length > 1000) {
      return response.status(400).json({ message: 'Comments must be between 1 and 1,000 characters.' });
    }
    if (!(await Post.exists({ _id: postId, status: 'published' }))) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    const comment = await Comment.create({ post: postId, author: request.user._id, body });
    response.status(201).json({
      id: comment._id,
      body: comment.body,
      author: request.user.name,
      createdAt: comment.createdAt,
    });
  } catch (error) {
    next(error);
  }
}

export async function toggleLike(request, response, next) {
  try {
    const postId = request.params.id;
    if (!mongoose.isValidObjectId(postId) || !(await Post.exists({ _id: postId, status: 'published' }))) {
      return response.status(404).json({ message: 'Post not found.' });
    }
    const existing = await Like.findOne({ post: postId, user: request.user._id });
    let likedByMe;
    if (existing) {
      await existing.deleteOne();
      likedByMe = false;
    } else {
      try {
        await Like.create({ post: postId, user: request.user._id });
      } catch (error) {
        if (error.code !== 11000) throw error;
      }
      likedByMe = true;
    }
    const likesCount = await Like.countDocuments({ post: postId });
    response.json({ likedByMe, likesCount });
  } catch (error) {
    next(error);
  }
}

export async function deleteComment(request, response, next) {
  try {
    if (!mongoose.isValidObjectId(request.params.id)) {
      return response.status(404).json({ message: 'Comment not found.' });
    }
    const comment = await Comment.findByIdAndDelete(request.params.id);
    if (!comment) return response.status(404).json({ message: 'Comment not found.' });
    response.status(204).end();
  } catch (error) {
    next(error);
  }
}

export async function listComments(_request, response, next) {
  try {
    const comments = await Comment.find()
      .populate('author', 'name')
      .populate('post', 'title')
      .sort({ createdAt: -1 })
      .lean();
    response.json(comments.map((comment) => ({
      id: comment._id,
      body: comment.body,
      author: comment.author.name,
      postId: comment.post._id,
      postTitle: comment.post.title,
      createdAt: comment.createdAt,
    })));
  } catch (error) {
    next(error);
  }
}

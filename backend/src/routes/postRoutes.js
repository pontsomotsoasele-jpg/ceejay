import { Router } from 'express';
import { createPost, deletePost, getPost, listPosts } from '../controllers/postController.js';
import { createComment, listComments, toggleLike } from '../controllers/commentController.js';
import { optionalAuth, requireAuth, requireCreator } from '../middleware/auth.js';

const router = Router();

router.get('/', optionalAuth, listPosts);
router.get('/comments/manage', requireAuth, requireCreator, listComments);
router.get('/:id', optionalAuth, getPost);
router.post('/:id/comments', requireAuth, createComment);
router.post('/:id/likes', requireAuth, toggleLike);
router.post('/', requireAuth, requireCreator, createPost);
router.delete('/:id', requireAuth, requireCreator, deletePost);

export default router;

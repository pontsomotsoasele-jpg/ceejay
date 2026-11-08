import { Router } from 'express';
import { deleteComment } from '../controllers/commentController.js';
import { requireAuth, requireCreator } from '../middleware/auth.js';

const router = Router();

router.delete('/:id', requireAuth, requireCreator, deleteComment);

export default router;

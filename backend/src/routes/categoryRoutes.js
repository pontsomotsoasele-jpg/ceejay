import { Router } from 'express';
import { createCategory, listCategories } from '../controllers/categoryController.js';
import { requireAuth, requireCreator } from '../middleware/auth.js';

const router = Router();

router.get('/', listCategories);
router.post('/', requireAuth, requireCreator, createCategory);

export default router;

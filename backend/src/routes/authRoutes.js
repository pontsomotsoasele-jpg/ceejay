import { Router } from 'express';
import { rateLimit } from 'express-rate-limit';
import { login, register } from '../controllers/authController.js';

const router = Router();
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
  message: { message: 'Too many attempts. Please wait a few minutes and try again.' },
});

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);

export default router;

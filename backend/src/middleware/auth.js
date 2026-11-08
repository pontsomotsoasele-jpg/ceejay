import jwt from 'jsonwebtoken';
import { jwtSecret } from '../app.js';
import User from '../models/User.js';

export async function optionalAuth(request, _response, next) {
  const token = request.headers.authorization?.replace(/^Bearer\s+/i, '');
  if (token) {
    try {
      const payload = jwt.verify(token, jwtSecret);
      request.user = await User.findById(payload.sub).select('_id name email role');
    } catch {
      request.user = null;
    }
  }
  next();
}

export async function requireAuth(request, response, next) {
  await optionalAuth(request, response, () => {});
  if (!request.user) {
    return response.status(401).json({ message: 'Please sign in to continue.' });
  }
  next();
}

export function requireCreator(request, response, next) {
  if (request.user?.role !== 'creator') {
    return response.status(403).json({ message: 'Creator access is required.' });
  }
  next();
}

import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { jwtSecret } from '../app.js';
import User from '../models/User.js';

function createToken(user) {
  return jwt.sign({ sub: user._id.toString() }, jwtSecret, { expiresIn: '7d' });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    role: user.role,
  };
}

export async function register(request, response, next) {
  try {
    const name = typeof request.body.name === 'string' ? request.body.name.trim() : '';
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';

    if (name.length < 2 || name.length > 40) {
      return response.status(400).json({ message: 'Your name must be between 2 and 40 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return response.status(400).json({ message: 'Enter a valid email address.' });
    }
    if (password.length < 8 || password.length > 128) {
      return response.status(400).json({ message: 'Your password must be between 8 and 128 characters.' });
    }
    if (email === (process.env.CREATOR_EMAIL || 'zinnia@gmail.com').toLowerCase()) {
      return response.status(409).json({ message: 'This email is reserved for the creator account.' });
    }
    if (await User.exists({ email })) {
      return response.status(409).json({ message: 'An account with this email already exists.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await User.create({ name, email, passwordHash, role: 'viewer' });
    response.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    if (error.code === 11000) {
      return response.status(409).json({ message: 'An account with this email already exists.' });
    }
    next(error);
  }
}

export async function login(request, response, next) {
  try {
    const email = typeof request.body.email === 'string' ? request.body.email.trim().toLowerCase() : '';
    const password = typeof request.body.password === 'string' ? request.body.password : '';
    if (!email || !password || password.length > 128) {
      return response.status(400).json({ message: 'Enter your email and password.' });
    }

    const user = await User.findOne({ email }).select('+passwordHash');
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return response.status(401).json({ message: 'Email or password is incorrect.' });
    }

    response.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
}

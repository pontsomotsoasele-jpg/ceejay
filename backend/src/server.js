require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const bcrypt = require('bcryptjs');
const connectDatabase = require('./config/db');
const { getAllowedFrontendOrigins } = require('./config/frontendOrigins');
const authRoutes = require('./routes/authRoutes');
const contentRoutes = require('./routes/contentRoutes');
const commentRoutes = require('./routes/commentRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const socialRoutes = require('./routes/socialRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const profileController = require('./controllers/profileController');
const { notFound, errorHandler } = require('./middleware/errorHandler');
const requireDatabase = require('./middleware/requireDatabase');
const requireCreator = require('./middleware/auth');
const publishScheduledContents = require('./services/publishScheduledContents');
const User = require('./models/User');
const Content = require('./models/Content');
const slugify = require('./utils/slug');
const app = express();
const port = process.env.PORT || 5000;

async function ensureCreatorAccount() {
  const email = (process.env.CREATOR_EMAIL || '').trim().toLowerCase();
  const password = process.env.CREATOR_PASSWORD || '';

  if (!email || !password) {
    return;
  }

  const user = await User.findOne({ email });
  if (user) {
    return;
  }

  await User.create({
    name: process.env.CREATOR_NAME || 'Ethera Media',
    email,
    passwordHash: await bcrypt.hash(password, 12),
    role: 'creator',
  });
}

async function ensureStarterContent() {
  const count = await Content.countDocuments();
  if (count > 0) {
    return;
  }

  const starterContent = [
    {
      title: 'The story behind Ethera Media',
      description: 'A behind-the-scenes look at how this creator builds thoughtful content for an engaged audience.',
      category: 'Education',
      type: 'Video',
      thumbnailUrl: 'https://images.unsplash.com/photo-1522202176988-66273c2fd55f?auto=format&fit=crop&w=900&q=80',
      mediaUrl: 'https://www.youtube.com/watch?v=ysz5S6PUM-U',
      articleContent: '',
      status: 'Published',
      publishedAt: new Date(),
      platform: 'Ethera',
      featured: true,
      views: 177,
      likesCount: 24,
    },
    {
      title: '3 habits that make your content more engaging',
      description: 'A quick breakdown of practical content habits that help creators build trust and keep audiences coming back.',
      category: 'Technology',
      type: 'Article',
      thumbnailUrl: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=900&q=80',
      mediaUrl: 'https://example.com/3-habits',
      articleContent: 'Content works best when it is clear, consistent, and helpful. Focus on value first, then package it in a way that feels personal and easy to share.',
      status: 'Published',
      publishedAt: new Date(Date.now() - 86400000),
      platform: 'Ethera',
      featured: false,
      views: 98,
      likesCount: 17,
    },
    {
      title: 'Creators are building communities, not just channels',
      description: 'Why a good creator strategy is not only about views, but also about loyalty, interaction and support.',
      category: 'Lifestyle',
      type: 'Image',
      thumbnailUrl: 'https://images.unsplash.com/photo-1529156069898-49953e39b3ac?auto=format&fit=crop&w=900&q=80',
      mediaUrl: 'https://example.com/community-building',
      articleContent: 'The strongest creator brands are built on trust and action. Audiences stay when they feel seen, heard, and part of something meaningful.',
      status: 'Published',
      publishedAt: new Date(Date.now() - 172800000),
      platform: 'Ethera',
      featured: false,
      views: 61,
      likesCount: 13,
    },
  ];

  const items = starterContent.map((item) => ({
    ...item,
    slug: slugify(item.title),
    description: item.description || item.articleContent,
  }));

  await Content.insertMany(items);
}

app.use(helmet());
app.use(cors({
  origin: getAllowedFrontendOrigins(),
}));
app.use(express.json({ limit: '1mb' }));

app.get('/api/health', (req, res) => res.json({ status: 'ok', service: 'ethera-api' }));
app.get('/api/health/database', (req, res) => {
  const connected = require('mongoose').connection.readyState === 1;
  return res.status(connected ? 200 : 503).json({ database: connected ? 'connected' : 'disconnected' });
});
app.use('/api', requireDatabase);
app.get('/api/profile', profileController.getProfile);
app.put('/api/profile', requireCreator, profileController.updatePublicProfile);
app.use('/api/auth', authRoutes);
app.use('/api/contents', contentRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/social', socialRoutes);
app.use('/api/notifications', notificationRoutes);
app.use(notFound);
app.use(errorHandler);

app.listen(port, () => {
  console.log(`Ethera API listening on port ${port}.`);
});

async function initializeDatabase() {
  while (true) {
    try {
      if (!process.env.JWT_SECRET) throw new Error('JWT_SECRET is required to start the API.');
      await connectDatabase();
      await ensureCreatorAccount();
      await ensureStarterContent();
      await publishScheduledContents();
      const scheduler = setInterval(() => {
        publishScheduledContents().catch((error) => console.error(`Scheduled publishing failed: ${error.message}`));
      }, 60 * 1000);
      scheduler.unref();
      return;
    } catch (error) {
      console.error(`Database initialization failed: ${error.message}`);
      console.error('The API remains online and will retry the MongoDB Atlas connection in 15 seconds.');
      await new Promise((resolve) => setTimeout(resolve, 15_000));
    }
  }
}

initializeDatabase();

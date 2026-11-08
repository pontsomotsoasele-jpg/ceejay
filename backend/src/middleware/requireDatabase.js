const mongoose = require('mongoose');

function requireDatabase(req, res, next) {
  const isSocialOAuthFlow = req.path === '/social/connect/google'
    || req.path === '/social/connect/facebook'
    || req.path === '/social/google/callback'
    || req.path === '/social/facebook/callback';
  if (isSocialOAuthFlow) return next();

  if (mongoose.connection.readyState === 1) return next();
  return res.status(503).json({
    message: 'Database is not connected. Check Atlas network access and MONGODB_URI in backend/.env.',
  });
}

module.exports = requireDatabase;

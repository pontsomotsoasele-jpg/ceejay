const express = require('express');
const requireCreator = require('../middleware/auth');
const controller = require('../controllers/socialController');

const router = express.Router();

router.get('/accounts', requireCreator, controller.listAccounts);
router.post('/connect/google', requireCreator, controller.startConnect('google'));
router.post('/connect/facebook', requireCreator, controller.startConnect('facebook'));
router.get('/google/callback', controller.handleCallback.bind(null, 'google'));
router.get('/facebook/callback', controller.handleCallback.bind(null, 'facebook'));
router.post('/sync/:provider', requireCreator, controller.syncAccount);

module.exports = router;

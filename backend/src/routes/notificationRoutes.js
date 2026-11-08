const express = require('express');
const { requireViewerOrCreator } = require('../middleware/auth');
const controller = require('../controllers/notificationController');

const router = express.Router();

router.get('/', requireViewerOrCreator, controller.listNotifications);
router.patch('/read-all', requireViewerOrCreator, controller.markAllNotificationsRead);
router.patch('/:id/read', requireViewerOrCreator, controller.markNotificationRead);

module.exports = router;

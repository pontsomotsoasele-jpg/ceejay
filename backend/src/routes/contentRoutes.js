const express = require('express');
const requireCreator = require('../middleware/auth');
const { requireViewerOrCreator, optionalViewerOrCreator } = require('../middleware/auth');
const controller = require('../controllers/contentController');

const router = express.Router();

router.get('/', optionalViewerOrCreator, controller.listContents);
router.get('/:id', optionalViewerOrCreator, controller.getContent);
router.post('/', requireCreator, controller.createContent);
router.put('/:id', requireCreator, controller.updateContent);
router.delete('/:id', requireCreator, controller.deleteContent);
router.post('/:id/view', controller.recordView);
router.get('/:id/like', requireViewerOrCreator, controller.getLikeStatus);
router.post('/:id/like', requireViewerOrCreator, controller.toggleLike);
router.post('/:id/share', requireViewerOrCreator, controller.recordShare);

module.exports = router;

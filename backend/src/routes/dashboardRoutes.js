const express = require('express');
const requireCreator = require('../middleware/auth');
const { getStats } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/stats', requireCreator, getStats);

module.exports = router;

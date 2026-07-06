const express = require('express');
const router = express.Router();
const { sendMessage } = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { chatLimiter } = require('../middleware/chatRateLimit');

router.post('/', protect, chatLimiter, sendMessage);

module.exports = router;

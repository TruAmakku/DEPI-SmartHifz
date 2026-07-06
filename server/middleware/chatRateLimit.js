const { rateLimit, ipKeyGenerator } = require('express-rate-limit');

const chatLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.id || ipKeyGenerator(req.ip),
  handler: (req, res) => {
    res.status(429).json({
      success: false,
      message: "You're sending messages too fast. Please wait a moment and try again.",
    });
  },
});

module.exports = { chatLimiter };

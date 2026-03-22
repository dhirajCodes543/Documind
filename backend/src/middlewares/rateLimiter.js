const rateLimit = require("express-rate-limit");

// ✅ Upload limiter — 10 uploads per hour per IP
const uploadLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many uploads. You can upload up to 10 files per hour. Please wait.",
  },
});

// ✅ Message limiter — 30 messages per minute per IP
const messageLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "You're sending too many messages. Please slow down.",
  },
});

// ✅ Auth limiter — 10 login attempts per 15 minutes per IP
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many login attempts. Please wait 15 minutes before trying again.",
  },
});

// ✅ YouTube/Website limiter — 20 per hour per IP
const sourceLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    error: "Too many requests. You can process up to 20 sources per hour.",
  },
});

module.exports = { uploadLimiter, messageLimiter, authLimiter, sourceLimiter };
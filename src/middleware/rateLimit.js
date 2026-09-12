const rateLimit = require("express-rate-limit");

// Note: express-rate-limit's default store is in-memory, which only works
// correctly on a single server process. If you scale to multiple instances,
// switch to a shared store (e.g. rate-limit-redis) so limits are enforced
// across all of them — see README "Scaling" section.

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 20, // 20 signup/login attempts per IP per 15 minutes
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many attempts. Please wait a few minutes and try again." },
});

const likeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 30, // generous, but stops scripted like-flooding
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down a little." },
});

const writeLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests. Slow down a little." },
});

module.exports = { authLimiter, likeLimiter, writeLimiter };

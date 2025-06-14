// Simple rate limiting middleware
const rateLimitStore = new Map();

// Generic rate limiter
const createRateLimit = (options = {}) => {
  const {
    windowMs = 15 * 60 * 1000, // 15 minutes
    maxAttempts = 100,
    message = 'Terlalu banyak request, coba lagi nanti',
    skipSuccessfulRequests = false,
    keyGenerator = (req) => req.ip || req.connection.remoteAddress
  } = options;

  return (req, res, next) => {
    const key = keyGenerator(req);
    const now = Date.now();
    
    // Clean up expired entries
    for (const [k, v] of rateLimitStore.entries()) {
      if (now > v.resetTime) {
        rateLimitStore.delete(k);
      }
    }

    if (!rateLimitStore.has(key)) {
      rateLimitStore.set(key, {
        count: 1,
        resetTime: now + windowMs,
        firstRequest: now
      });
      return next();
    }

    const record = rateLimitStore.get(key);

    if (now > record.resetTime) {
      record.count = 1;
      record.resetTime = now + windowMs;
      record.firstRequest = now;
      return next();
    }

    if (record.count >= maxAttempts) {
      const timeLeft = Math.ceil((record.resetTime - now) / 1000);
      return res.status(429).json({
        success: false,
        message: message,
        error: 'RATE_LIMIT_EXCEEDED',
        retry_after: timeLeft
      });
    }

    record.count++;
    
    // Add rate limit headers
    res.set({
      'X-RateLimit-Limit': maxAttempts,
      'X-RateLimit-Remaining': Math.max(0, maxAttempts - record.count),
      'X-RateLimit-Reset': new Date(record.resetTime).toISOString()
    });

    next();
  };
};

// Specific rate limiters
const loginRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 5,
  message: 'Terlalu banyak percobaan login, coba lagi dalam 15 menit',
  keyGenerator: (req) => `login_${req.ip}`
});

const apiRateLimit = createRateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  maxAttempts: 1000,
  message: 'Terlalu banyak request API, coba lagi nanti'
});

const strictRateLimit = createRateLimit({
  windowMs: 60 * 1000, // 1 minute
  maxAttempts: 10,
  message: 'Terlalu banyak request, coba lagi dalam 1 menit'
});

module.exports = {
  createRateLimit,
  loginRateLimit,
  apiRateLimit,
  strictRateLimit
};

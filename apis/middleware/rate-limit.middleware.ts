import rateLimit from 'express-rate-limit';
import config from '../config';

export const rateLimitMiddleware = rateLimit({
  windowMs: config.rateLimit.windowMs,
  max: config.rateLimit.max,
  skip: (req) => {
    // GET /api/v1/auth/verify is JWT validation, not a brute-force target.
    // Must be excluded because Docker NAT makes all clients share one IP,
    // and AuthProvider calls this on every page load.
    return req.method === 'GET' && req.path === '/api/v1/auth/verify';
  },
  message: { code: 429, message: '请求过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

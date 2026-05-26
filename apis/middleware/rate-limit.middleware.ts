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

// H-2 fix: 登录端点独立严格限流（防止暴力破解）
const isTest = process.env.NODE_ENV === 'test';
export const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 分钟
  max: isTest ? 5000 : 10,  // 每个 IP 最多 10 次尝试
  message: { code: 429, message: '登录尝试过于频繁，请15分钟后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// L-1 fix: 高价值操作独立限流——删除/审核/重新生成
export const articleActionLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: isTest ? 5000 : 20,
  message: { code: 429, message: '操作过于频繁，请稍后再试' },
  standardHeaders: true,
  legacyHeaders: false,
});

// 别名: 用于非 article 的高价值操作限流（如项目删除）
export const destructiveActionLimiter = articleActionLimiter;

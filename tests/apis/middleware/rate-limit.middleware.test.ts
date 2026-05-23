/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express';

// Mock express-rate-limit
jest.mock('express-rate-limit', () => {
  return jest.fn().mockImplementation((options: any) => {
    // 返回一个中间件函数，模拟限流行为
    const handler = (req: Request, res: Response, next: NextFunction) => {
      next();
    };
    return handler;
  });
});

describe('rateLimitMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100';

    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = { headers: {} } as Partial<Request>;
    mockRes = { status: statusFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  // =========================================================
  // 1. 导入和初始化
  // =========================================================
  describe('导入和初始化', () => {
    test('应成功导入 rateLimitMiddleware', () => {
      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe('function');
    });

    test('rateLimitMiddleware 应为可调用函数', () => {
      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      expect(typeof rateLimitMiddleware).toBe('function');
    });
  });

  // =========================================================
  // 2. express-rate-limit 调用参数验证
  // =========================================================
  describe('express-rate-limit 调用参数', () => {
    test('应使用正确的 windowMs 配置', () => {
      const rateLimit = require('express-rate-limit');
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.windowMs).toBeDefined();
      expect(typeof callArgs.windowMs).toBe('number');
    });

    test('应使用正确的 max 配置', () => {
      const rateLimit = require('express-rate-limit');
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.max).toBeDefined();
      expect(typeof callArgs.max).toBe('number');
    });

    test('应设置正确的错误消息', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.message).toEqual({ code: 429, message: '请求过于频繁，请稍后再试' });
    });

    test('应启用 standardHeaders', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.standardHeaders).toBe(true);
    });

    test('应禁用 legacyHeaders', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.legacyHeaders).toBe(false);
    });
  });

  // =========================================================
  // 3. 中间件行为测试
  // =========================================================
  describe('中间件行为', () => {
    test('正常请求应调用 next()', () => {
      // 使用真实的 express-rate-limit mock，模拟正常通过
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation((options: any) => {
          return (req: Request, res: Response, next: NextFunction) => {
            next();
          };
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
    });

    test('模拟限流时返回 429 状态码', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation((options: any) => {
          return (req: Request, res: Response, next: NextFunction) => {
            // 模拟限流：返回 429
            res.status(429).json(options.message);
          };
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      rateLimitMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(429);
      expect(jsonFn).toHaveBeenCalledWith({ code: 429, message: '请求过于频繁，请稍后再试' });
    });

    test('连续多次正常请求应全部通过', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation(() => {
          return (req: Request, res: Response, next: NextFunction) => {
            next();
          };
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');

      for (let i = 0; i < 5; i++) {
        const next = jest.fn();
        rateLimitMiddleware(mockReq as Request, mockRes as Response, next);
        expect(next).toHaveBeenCalled();
      }
    });
  });

  // =========================================================
  // 4. 配置集成测试
  // =========================================================
  describe('配置集成', () => {
    test('使用环境变量中的 windowMs 值', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '120000';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      // config 将读取 RATE_LIMIT_WINDOW_MS 环境变量
      expect(callArgs.windowMs).toBe(120000);
    });

    test('使用环境变量中的 max 值', () => {
      process.env.RATE_LIMIT_MAX = '50';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.max).toBe(50);
    });

    test('默认配置值（无环境变量）', () => {
      delete process.env.RATE_LIMIT_WINDOW_MS;
      delete process.env.RATE_LIMIT_MAX;
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.windowMs).toBe(60000);
      expect(callArgs.max).toBe(100);
    });
  });

  // =========================================================
  // 5. 边界情况
  // =========================================================
  describe('边界情况', () => {
    test('windowMs 为最小值 1 时应正确传递', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '1';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.windowMs).toBe(1);
    });

    test('windowMs 为 0 时应抛出配置错误', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '0';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be >= 1, got: 0');
    });

    test('max 为最小值 1 时应正确传递', () => {
      process.env.RATE_LIMIT_MAX = '1';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.max).toBe(1);
    });

    test('max 为 0 时应抛出配置错误', () => {
      process.env.RATE_LIMIT_MAX = '0';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_MAX must be >= 1, got: 0');
    });

    test('极大的 max 值应正确传递', () => {
      process.env.RATE_LIMIT_MAX = '999999';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.max).toBe(999999);
    });
  });

  // =========================================================
  // 6. middleware/index.ts 重导出测试
  // =========================================================
  describe('middleware/index.ts 重导出', () => {
    test('rateLimitMiddleware 应通过 index.ts 正确导出', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const { rateLimitMiddleware } = require('../../../apis/middleware/index');
      expect(rateLimitMiddleware).toBeDefined();
      expect(typeof rateLimitMiddleware).toBe('function');
    });

    test('index.ts 同时导出 authMiddleware 和 roleMiddleware', () => {
      jest.resetModules();
      const index = require('../../../apis/middleware/index');
      expect(index.authMiddleware).toBeDefined();
      expect(index.roleMiddleware).toBeDefined();
    });

    test('index.ts 同时导出 antiCrawlMiddleware', () => {
      jest.resetModules();
      const index = require('../../../apis/middleware/index');
      expect(index.antiCrawlMiddleware).toBeDefined();
    });
  });
});

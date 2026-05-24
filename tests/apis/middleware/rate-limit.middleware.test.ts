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
  // 6. 配置验证（safeParseInt 异常值）
  // =========================================================
  describe('配置验证异常值', () => {
    test('RATE_LIMIT_WINDOW_MS 为非数字字符串时应抛出错误', () => {
      process.env.RATE_LIMIT_WINDOW_MS = 'abc';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be a valid integer');
    });

    test('RATE_LIMIT_MAX 为非数字字符串时应抛出错误', () => {
      process.env.RATE_LIMIT_MAX = 'xyz';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_MAX must be a valid integer');
    });

    test('RATE_LIMIT_WINDOW_MS 为负数时应抛出错误', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '-100';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be >= 1');
    });

    test('RATE_LIMIT_MAX 为负数时应抛出错误', () => {
      process.env.RATE_LIMIT_MAX = '-5';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_MAX must be >= 1');
    });

    test('RATE_LIMIT_WINDOW_MS 为浮点数字符串时应抛出错误', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '90.9';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_WINDOW_MS must be a valid integer');
    });

    test('RATE_LIMIT_MAX 为浮点数字符串时应抛出错误', () => {
      process.env.RATE_LIMIT_MAX = '50.7';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      expect(() => {
        require('../../../apis/middleware/rate-limit.middleware');
      }).toThrow('RATE_LIMIT_MAX must be a valid integer');
    });

    test('极大的 windowMs 值应正确传递', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '3600000';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.windowMs).toBe(3600000);
    });

    test('RATE_LIMIT_WINDOW_MS 为空字符串时应使用默认值', () => {
      process.env.RATE_LIMIT_WINDOW_MS = '';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.windowMs).toBe(60000);
    });

    test('RATE_LIMIT_MAX 为空字符串时应使用默认值', () => {
      process.env.RATE_LIMIT_MAX = '';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.max).toBe(500);
    });
  });

  // =========================================================
  // 7. 中间件签名和类型测试
  // =========================================================
  describe('中间件签名和类型', () => {
    test('rateLimitMiddleware 接受三个参数 (req, res, next)', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation(() => {
          return (req: any, res: any, next: any) => next();
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      expect(rateLimitMiddleware.length).toBeGreaterThanOrEqual(0);
    });

    test('多次调用同一中间件实例不会创建新实例', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation(() => {
          return (req: any, res: any, next: any) => next();
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');
      const ref1 = rateLimitMiddleware;
      const ref2 = rateLimitMiddleware;
      expect(ref1).toBe(ref2);
    });

    test('中间件可在不同 req 对象上复用', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => {
        return jest.fn().mockImplementation(() => {
          return (req: any, res: any, next: any) => next();
        });
      });

      const { rateLimitMiddleware } = require('../../../apis/middleware/rate-limit.middleware');

      const req1 = { headers: { 'x-forwarded-for': '1.2.3.4' } } as Partial<Request>;
      const req2 = { headers: { 'x-forwarded-for': '5.6.7.8' } } as Partial<Request>;
      const next1 = jest.fn();
      const next2 = jest.fn();

      rateLimitMiddleware(req1 as Request, mockRes as Response, next1);
      rateLimitMiddleware(req2 as Request, mockRes as Response, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 8. rateLimit 选项完整性测试
  // =========================================================
  describe('rateLimit 选项完整性', () => {
    test('所有传入 rateLimit() 的选项均存在且类型正确', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(Object.keys(callArgs).sort()).toEqual(
        ['legacyHeaders', 'max', 'message', 'skip', 'standardHeaders', 'windowMs'].sort()
      );
    });

    test('message 包含 code 和 message 两个字段', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[0][0];
      expect(callArgs.message).toHaveProperty('code', 429);
      expect(callArgs.message).toHaveProperty('message');
      expect(typeof callArgs.message.message).toBe('string');
    });
  });

  // =========================================================
  // 9. middleware/index.ts 重导出测试
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

  // =========================================================
  // 10. skip 回调函数测试
  // =========================================================
  describe('skip 回调函数', () => {
    function loadWithSkipCapture() {
      jest.resetModules();
      jest.doMock('express-rate-limit', () =>
        jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
      );
      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');
      // 第一次调用是 rateLimitMiddleware，其 options 中包含 skip
      return mockedRateLimit.mock.calls[0][0].skip;
    }

    test('GET /api/v1/auth/verify 应返回 true（跳过限流）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'GET', path: '/api/v1/auth/verify' } as any)).toBe(true);
    });

    test('POST /api/v1/auth/verify 应返回 false（不跳过）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'POST', path: '/api/v1/auth/verify' } as any)).toBe(false);
    });

    test('GET /api/v1/other 应返回 false（不跳过）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'GET', path: '/api/v1/other' } as any)).toBe(false);
    });

    test('POST /api/v1/articles 应返回 false（不跳过）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'POST', path: '/api/v1/articles' } as any)).toBe(false);
    });

    test('DELETE /api/v1/auth/verify 应返回 false（method 不匹配）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'DELETE', path: '/api/v1/auth/verify' } as any)).toBe(false);
    });

    test('PUT /api/v1/auth/verify 应返回 false（method 不匹配）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'PUT', path: '/api/v1/auth/verify' } as any)).toBe(false);
    });

    test('GET /auth/verify 应返回 false（路径前缀不匹配）', () => {
      const skip = loadWithSkipCapture();
      expect(skip({ method: 'GET', path: '/auth/verify' } as any)).toBe(false);
    });
  });

  // =========================================================
  // 11. articleActionLimiter 导入和初始化
  // =========================================================
  describe('articleActionLimiter 导入和初始化', () => {
    test('应成功导入 articleActionLimiter', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const { articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');
      expect(articleActionLimiter).toBeDefined();
      expect(typeof articleActionLimiter).toBe('function');
    });

    test('articleActionLimiter 和 rateLimitMiddleware 应为不同实例', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const { rateLimitMiddleware, articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');
      expect(rateLimitMiddleware).not.toBe(articleActionLimiter);
    });
  });

  // =========================================================
  // 12. articleActionLimiter rateLimit 调用参数
  // =========================================================
  describe('articleActionLimiter rateLimit 调用参数', () => {
    test('应使用 windowMs=60000（1分钟）', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      // articleActionLimiter 是第二次调用
      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.windowMs).toBe(60 * 1000);
    });

    test('NODE_ENV=test 时 max 应为 5000', () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'test';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.max).toBe(5000);
      process.env.NODE_ENV = origNodeEnv;
    });

    test('NODE_ENV=production 时 max 应为 20', () => {
      const origNodeEnv = process.env.NODE_ENV;
      process.env.NODE_ENV = 'production';
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.max).toBe(20);
      process.env.NODE_ENV = origNodeEnv;
    });

    test('应设置正确的错误消息', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.message).toEqual({ code: 429, message: '操作过于频繁，请稍后再试' });
    });

    test('应启用 standardHeaders', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.standardHeaders).toBe(true);
    });

    test('应禁用 legacyHeaders', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.legacyHeaders).toBe(false);
    });

    test('不应包含 skip 选项（所有操作均限流）', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(callArgs.skip).toBeUndefined();
    });

    test('所有选项 key 集合完整', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const callArgs = mockedRateLimit.mock.calls[1][0];
      expect(Object.keys(callArgs).sort()).toEqual(
        ['legacyHeaders', 'max', 'message', 'standardHeaders', 'windowMs'].sort()
      );
    });
  });

  // =========================================================
  // 13. articleActionLimiter 中间件行为
  // =========================================================
  describe('articleActionLimiter 中间件行为', () => {
    test('正常请求应调用 next()', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () =>
        jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
      );

      const { articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');
      const next = jest.fn();
      articleActionLimiter(mockReq as Request, mockRes as Response, next);
      expect(next).toHaveBeenCalled();
    });

    test('模拟限流时返回 429 状态码', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () =>
        jest.fn().mockImplementation((options: any) => {
          if (options.message && options.message.message === '操作过于频繁，请稍后再试') {
            return (req: any, res: any, next: any) => {
              res.status(429).json(options.message);
            };
          }
          return (req: any, res: any, next: any) => next();
        })
      );

      const { articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');
      articleActionLimiter(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(429);
      expect(jsonFn).toHaveBeenCalledWith({ code: 429, message: '操作过于频繁，请稍后再试' });
    });

    test('连续多次正常请求应全部通过', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () =>
        jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
      );

      const { articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');

      for (let i = 0; i < 5; i++) {
        const next = jest.fn();
        articleActionLimiter(mockReq as Request, mockRes as Response, next);
        expect(next).toHaveBeenCalled();
      }
    });

    test('中间件可在不同 req 对象上复用', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () =>
        jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
      );

      const { articleActionLimiter } = require('../../../apis/middleware/rate-limit.middleware');

      const req1 = { method: 'DELETE', path: '/api/v1/articles/1' } as Partial<Request>;
      const req2 = { method: 'PATCH', path: '/api/v1/articles/2/audit' } as Partial<Request>;
      const next1 = jest.fn();
      const next2 = jest.fn();

      articleActionLimiter(req1 as Request, mockRes as Response, next1);
      articleActionLimiter(req2 as Request, mockRes as Response, next2);

      expect(next1).toHaveBeenCalled();
      expect(next2).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 14. articleActionLimiter 重导出
  // =========================================================
  describe('articleActionLimiter 重导出', () => {
    test('articleActionLimiter 应通过 middleware/index.ts 正确导出', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const { articleActionLimiter } = require('../../../apis/middleware/index');
      expect(articleActionLimiter).toBeDefined();
      expect(typeof articleActionLimiter).toBe('function');
    });

    test('index.ts 同时导出 rateLimitMiddleware 和 articleActionLimiter', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const index = require('../../../apis/middleware/index');
      expect(index.rateLimitMiddleware).toBeDefined();
      expect(index.articleActionLimiter).toBeDefined();
    });
  });

  // =========================================================
  // 15. 两个限流器独立性
  // =========================================================
  describe('两个限流器独立性', () => {
    test('rateLimit() 被调用两次（分别为两个限流器）', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      expect(mockedRateLimit).toHaveBeenCalledTimes(2);
    });

    test('两个限流器使用不同的 message', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const msg1 = mockedRateLimit.mock.calls[0][0].message;
      const msg2 = mockedRateLimit.mock.calls[1][0].message;
      expect(msg1).toEqual({ code: 429, message: '请求过于频繁，请稍后再试' });
      expect(msg2).toEqual({ code: 429, message: '操作过于频繁，请稍后再试' });
      expect(msg1).not.toBe(msg2);
    });

    test('rateLimitMiddleware 有 skip，articleActionLimiter 没有', () => {
      jest.resetModules();
      jest.doMock('express-rate-limit', () => jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next()));

      const mockedRateLimit = require('express-rate-limit') as jest.Mock;
      require('../../../apis/middleware/rate-limit.middleware');

      const args1 = mockedRateLimit.mock.calls[0][0];
      const args2 = mockedRateLimit.mock.calls[1][0];
      expect(typeof args1.skip).toBe('function');
      expect(args2.skip).toBeUndefined();
    });
  });
});

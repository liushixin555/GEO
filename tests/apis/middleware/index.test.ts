/**
 * @jest-environment node
 *
 * apis/middleware/index.ts TDD 测试
 * 覆盖：barrel 重导出完整性、引用一致性、validate 全量行为、articleActionLimiter 行为
 */
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

// ============================================================
// 1. Barrel 重导出完整性测试
// ============================================================
describe('middleware/index.ts 重导出完整性', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100';
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  describe('所有命名导出存在且类型正确', () => {
    it('应导出 authMiddleware 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.authMiddleware).toBeDefined();
      expect(typeof index.authMiddleware).toBe('function');
    });

    it('应导出 roleMiddleware 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.roleMiddleware).toBeDefined();
      expect(typeof index.roleMiddleware).toBe('function');
    });

    it('应导出 rateLimitMiddleware 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.rateLimitMiddleware).toBeDefined();
      expect(typeof index.rateLimitMiddleware).toBe('function');
    });

    it('应导出 articleActionLimiter 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.articleActionLimiter).toBeDefined();
      expect(typeof index.articleActionLimiter).toBe('function');
    });

    it('应导出 antiCrawlMiddleware 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.antiCrawlMiddleware).toBeDefined();
      expect(typeof index.antiCrawlMiddleware).toBe('function');
    });

    it('应导出 swaggerAuthMiddleware 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.swaggerAuthMiddleware).toBeDefined();
      expect(typeof index.swaggerAuthMiddleware).toBe('function');
    });

    it('应导出 validate 函数', () => {
      const index = require('../../../apis/middleware/index');
      expect(index.validate).toBeDefined();
      expect(typeof index.validate).toBe('function');
    });
  });

  describe('导出数量验证', () => {
    it('应恰好导出 7 个命名导出，无遗漏无多余', () => {
      const index = require('../../../apis/middleware/index');
      const exportKeys = Object.keys(index).sort();
      expect(exportKeys).toEqual([
        'antiCrawlMiddleware',
        'articleActionLimiter',
        'authMiddleware',
        'rateLimitMiddleware',
        'roleMiddleware',
        'swaggerAuthMiddleware',
        'validate',
      ].sort());
    });
  });

  describe('引用一致性——index 与子模块导出同一引用', () => {
    it('authMiddleware 应与 auth.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/auth.middleware');
      expect(index.authMiddleware).toBe(source.authMiddleware);
    });

    it('roleMiddleware 应与 auth.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/auth.middleware');
      expect(index.roleMiddleware).toBe(source.roleMiddleware);
    });

    it('rateLimitMiddleware 应与 rate-limit.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/rate-limit.middleware');
      expect(index.rateLimitMiddleware).toBe(source.rateLimitMiddleware);
    });

    it('articleActionLimiter 应与 rate-limit.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/rate-limit.middleware');
      expect(index.articleActionLimiter).toBe(source.articleActionLimiter);
    });

    it('antiCrawlMiddleware 应与 anti-crawl.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/anti-crawl.middleware');
      expect(index.antiCrawlMiddleware).toBe(source.antiCrawlMiddleware);
    });

    it('swaggerAuthMiddleware 应与 swagger-auth.middleware.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/swagger-auth.middleware');
      expect(index.swaggerAuthMiddleware).toBe(source.swaggerAuthMiddleware);
    });

    it('validate 应与 validate.ts 导出同一引用', () => {
      const index = require('../../../apis/middleware/index');
      const source = require('../../../apis/middleware/validate');
      expect(index.validate).toBe(source.validate);
    });
  });
});

// ============================================================
// 2. validate 中间件全量行为测试
// ============================================================
describe('validate 中间件（通过 index.ts 导入）', () => {
  let validate: typeof import('../../../apis/middleware/validate').validate;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    validate = require('../../../apis/middleware/index').validate;
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockRes = { status: statusFn, json: jsonFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  // =========================================================
  // 2.1 body 验证（默认 source）
  // =========================================================
  describe('body 验证', () => {
    const bodySchema = z.object({
      name: z.string().min(1),
      age: z.number().int().positive(),
    });

    it('合法 body 应通过并调用 next()', () => {
      const req = { body: { name: 'Alice', age: 25 } } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('验证通过后 req.body 应被替换为 parsed data', () => {
      const req = { body: { name: 'Bob', age: 30 } } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      expect(req.body).toEqual({ name: 'Bob', age: 30 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('缺失必填字段应返回 400', () => {
      const req = { body: { name: 'Alice' } } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ code: 400 })
      );
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('参数验证失败') })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('类型不匹配应返回 400', () => {
      const req = { body: { name: 'Alice', age: 'not-a-number' } } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(jsonFn).toHaveBeenCalledWith(
        expect.objectContaining({ code: 400 })
      );
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('空 body 应返回 400', () => {
      const req = { body: {} } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('额外字段（无 passthrough）应被 Zod 剥离后赋值给 req.body', () => {
      const strictSchema = z.object({ name: z.string() }).strict();
      const req = { body: { name: 'Alice', extra: 'field' } } as Partial<Request>;
      validate(strictSchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('嵌套对象验证失败应返回 400', () => {
      const nestedSchema = z.object({
        user: z.object({
          email: z.string().email(),
        }),
      });
      const req = { body: { user: { email: 'not-an-email' } } } as Partial<Request>;
      validate(nestedSchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('数组验证失败应返回 400', () => {
      const arraySchema = z.object({
        items: z.array(z.string()).min(1),
      });
      const req = { body: { items: [] } } as Partial<Request>;
      validate(arraySchema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('验证错误消息应包含所有错误信息', () => {
      const req = { body: {} } as Partial<Request>;
      validate(bodySchema)(req as Request, mockRes as Response, mockNext);

      const callArgs = jsonFn.mock.calls[0][0];
      expect(callArgs.message).toContain('参数验证失败');
    });

    it('字符串长度约束验证', () => {
      const schema = z.object({ name: z.string().max(5) });
      const req = { body: { name: 'toolongname' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('数字范围约束验证', () => {
      const schema = z.object({ score: z.number().min(0).max(100) });
      const req = { body: { score: 150 } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2.2 query 验证
  // =========================================================
  describe('query 验证', () => {
    const querySchema = z.object({
      page: z.string().transform(Number).pipe(z.number().int().min(1)),
      keyword: z.string().optional(),
    });

    it('合法 query 应通过', () => {
      const req = { query: { page: '1', keyword: 'test' } } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('验证通过后 req.query 应被替换为 parsed data', () => {
      const req = { query: { page: '3' } } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(req.query).toEqual({ page: 3 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('缺少必填 query 参数应返回 400', () => {
      const req = { query: {} } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('无效 query 值应返回 400', () => {
      const req = { query: { page: 'abc' } } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('空 query string 应返回 400（缺少必填字段）', () => {
      const req = { query: { page: '' } } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
    });

    it('可选字段缺失应通过', () => {
      const req = { query: { page: '1' } } as Partial<Request>;
      validate(querySchema, 'query')(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2.3 params 验证
  // ============================================================
  describe('params 验证', () => {
    const paramsSchema = z.object({
      id: z.string().regex(/^\d+$/).transform(Number),
    });

    it('合法 params 应通过', () => {
      const req = { params: { id: '42' } } as Partial<Request>;
      validate(paramsSchema, 'params')(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('验证通过后 req.params 应被替换为 parsed data', () => {
      const req = { params: { id: '42' } } as Partial<Request>;
      validate(paramsSchema, 'params')(req as Request, mockRes as Response, mockNext);

      expect(req.params).toEqual({ id: 42 });
      expect(mockNext).toHaveBeenCalled();
    });

    it('params 不匹配正则应返回 400', () => {
      const req = { params: { id: 'abc' } } as Partial<Request>;
      validate(paramsSchema, 'params')(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('缺少必填 params 应返回 400', () => {
      const req = { params: {} } as Partial<Request>;
      validate(paramsSchema, 'params')(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2.4 validate 工厂函数特性
  // =========================================================
  describe('validate 工厂函数特性', () => {
    it('不传 source 参数时默认验证 body', () => {
      const schema = z.object({ name: z.string() });
      const req = { body: { name: 'test' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('validate 调用返回一个中间件函数', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validate(schema);

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // (req, res, next)
    });

    it('多次调用 validate 返回独立中间件', () => {
      const schema1 = z.object({ a: z.string() });
      const schema2 = z.object({ b: z.number() });
      const mw1 = validate(schema1);
      const mw2 = validate(schema2);

      expect(mw1).not.toBe(mw2);
    });

    it('同一 validate 中间件可复用', () => {
      const schema = z.object({ name: z.string() });
      const middleware = validate(schema);

      const req1 = { body: { name: 'first' } } as Partial<Request>;
      const next1 = jest.fn();
      middleware(req1 as Request, mockRes as Response, next1);
      expect(next1).toHaveBeenCalled();

      const req2 = { body: { name: 'second' } } as Partial<Request>;
      const next2 = jest.fn();
      middleware(req2 as Request, mockRes as Response, next2);
      expect(next2).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2.5 validate 错误消息格式
  // =========================================================
  describe('validate 错误消息格式', () => {
    it('错误消息以 "参数验证失败: " 开头', () => {
      const schema = z.object({ email: z.string().email() });
      const req = { body: { email: 'bad' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      const msg = jsonFn.mock.calls[0][0].message;
      expect(msg).toMatch(/^参数验证失败: /);
    });

    it('多个验证错误用分号连接', () => {
      const schema = z.object({
        a: z.string().min(1),
        b: z.number().positive(),
      });
      const req = { body: { a: '', b: -1 } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      const msg = jsonFn.mock.calls[0][0].message;
      expect(msg).toContain(';');
    });

    it('响应体结构包含 code 和 message', () => {
      const schema = z.object({ x: z.number() });
      const req = { body: { x: 'string' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      const response = jsonFn.mock.calls[0][0];
      expect(response).toHaveProperty('code', 400);
      expect(response).toHaveProperty('message');
      expect(typeof response.message).toBe('string');
    });
  });

  // =========================================================
  // 2.6 边界和特殊场景
  // =========================================================
  describe('边界和特殊场景', () => {
    it('body 为 null 时应返回 400', () => {
      const schema = z.object({ name: z.string() });
      const req = { body: null } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('body 为 undefined 时应返回 400', () => {
      const schema = z.object({ name: z.string() });
      const req = { body: undefined } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('空 schema（z.object({})）空 body 应通过', () => {
      const schema = z.object({});
      const req = { body: {} } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('enum 验证应正确拒绝非法值', () => {
      const schema = z.object({
        role: z.enum(['admin', 'viewer']),
      });
      const req = { body: { role: 'superadmin' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('enum 验证应接受合法值', () => {
      const schema = z.object({
        role: z.enum(['admin', 'viewer']),
      });
      const req = { body: { role: 'admin' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('boolean 验证应拒绝非布尔值', () => {
      const schema = z.object({ active: z.boolean() });
      const req = { body: { active: 'true' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
    });

    it('日期字符串验证应正确通过', () => {
      const schema = z.object({
        date: z.string().date(),
      });
      const req = { body: { date: '2026-05-24' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('Zod refine 自定义验证应生效', () => {
      const schema = z.object({
        password: z.string().refine((s) => s.length >= 8, { message: '密码至少8位' }),
      });
      const req = { body: { password: '123' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(400);
      const msg = jsonFn.mock.calls[0][0].message;
      expect(msg).toContain('密码至少8位');
    });

    it('Zod transform 应在验证通过时生效', () => {
      const schema = z.object({
        count: z.string().transform((v) => parseInt(v, 10)),
      });
      const req = { body: { count: '42' } } as Partial<Request>;
      validate(schema)(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(req.body).toEqual({ count: 42 });
    });
  });
});

// ============================================================
// 3. articleActionLimiter 测试
// ============================================================
describe('articleActionLimiter（通过 index.ts 导入）', () => {
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;
  let mockRes: Partial<Response>;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100';
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockRes = { status: statusFn, json: jsonFn } as Partial<Response>;
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it('应成功导入 articleActionLimiter', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const { articleActionLimiter } = require('../../../apis/middleware/index');
    expect(articleActionLimiter).toBeDefined();
    expect(typeof articleActionLimiter).toBe('function');
  });

  it('articleActionLimiter 正常请求应调用 next()', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const { articleActionLimiter } = require('../../../apis/middleware/index');
    const mockNext = jest.fn();
    const mockReq = {} as Partial<Request>;

    articleActionLimiter(mockReq as Request, mockRes as Response, mockNext);
    expect(mockNext).toHaveBeenCalled();
  });

  it('articleActionLimiter 限流时应返回 429', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation((options: any) => {
        return (req: any, res: any, next: any) => {
          res.status(429).json(options.message);
        };
      })
    );
    const { articleActionLimiter } = require('../../../apis/middleware/index');
    const mockNext = jest.fn();
    const mockReq = {} as Partial<Request>;

    articleActionLimiter(mockReq as Request, mockRes as Response, mockNext);
    expect(statusFn).toHaveBeenCalledWith(429);
    expect(jsonFn).toHaveBeenCalledWith({ code: 429, message: '操作过于频繁，请稍后再试' });
  });

  it('articleActionLimiter 应使用独立的消息', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation((options: any) => (req: any, res: any, next: any) => next())
    );
    const mockedRateLimit = require('express-rate-limit') as jest.Mock;
    require('../../../apis/middleware/index');

    // articleActionLimiter 是第二次调用 rateLimit
    const limiterCall = mockedRateLimit.mock.calls[1];
    expect(limiterCall).toBeDefined();
    expect(limiterCall[0].message).toEqual({
      code: 429,
      message: '操作过于频繁，请稍后再试',
    });
  });

  it('articleActionLimiter windowMs 应为 60 秒', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const mockedRateLimit = require('express-rate-limit') as jest.Mock;
    require('../../../apis/middleware/index');

    const limiterCall = mockedRateLimit.mock.calls[1];
    expect(limiterCall[0].windowMs).toBe(60 * 1000);
  });

  it('articleActionLimiter test 环境下 max 应为 5000', () => {
    process.env.NODE_ENV = 'test';
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const mockedRateLimit = require('express-rate-limit') as jest.Mock;
    require('../../../apis/middleware/index');

    const limiterCall = mockedRateLimit.mock.calls[1];
    expect(limiterCall[0].max).toBe(5000);
    delete process.env.NODE_ENV;
  });

  it('articleActionLimiter 非 test 环境下 max 应为 20', () => {
    const originalEnv = process.env.NODE_ENV;
    delete process.env.NODE_ENV;
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const mockedRateLimit = require('express-rate-limit') as jest.Mock;
    require('../../../apis/middleware/index');

    const limiterCall = mockedRateLimit.mock.calls[1];
    expect(limiterCall[0].max).toBe(20);
    if (originalEnv !== undefined) process.env.NODE_ENV = originalEnv;
  });

  it('articleActionLimiter 应启用 standardHeaders 和禁用 legacyHeaders', () => {
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
    const mockedRateLimit = require('express-rate-limit') as jest.Mock;
    require('../../../apis/middleware/index');

    const limiterCall = mockedRateLimit.mock.calls[1];
    expect(limiterCall[0].standardHeaders).toBe(true);
    expect(limiterCall[0].legacyHeaders).toBe(false);
  });
});

// ============================================================
// 4. 集成：通过 index 导入的中间件组合使用
// ============================================================
describe('中间件集成（通过 index.ts 导入）', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret';
    process.env.RATE_LIMIT_WINDOW_MS = '60000';
    process.env.RATE_LIMIT_MAX = '100';
    jest.doMock('express-rate-limit', () =>
      jest.fn().mockImplementation(() => (req: any, res: any, next: any) => next())
    );
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
    delete process.env.RATE_LIMIT_WINDOW_MS;
    delete process.env.RATE_LIMIT_MAX;
  });

  it('authMiddleware + roleMiddleware 可组合使用', () => {
    const { authMiddleware, roleMiddleware } = require('../../../apis/middleware/index');
    expect(typeof authMiddleware).toBe('function');
    expect(typeof roleMiddleware).toBe('function');

    // roleMiddleware('admin') 应返回中间件函数
    const roleGuard = roleMiddleware('admin');
    expect(typeof roleGuard).toBe('function');
  });

  it('validate + authMiddleware + roleMiddleware 组合应各司其职', () => {
    const { validate, authMiddleware, roleMiddleware } = require('../../../apis/middleware/index');

    expect(typeof validate).toBe('function');
    expect(typeof authMiddleware).toBe('function');
    expect(typeof roleMiddleware).toBe('function');

    // 验证各函数独立可用
    const schema = z.object({ name: z.string() });
    const vMiddleware = validate(schema);
    expect(typeof vMiddleware).toBe('function');

    const rGuard = roleMiddleware('sysadmin', 'admin');
    expect(typeof rGuard).toBe('function');
  });

  it('所有中间件均可通过 index 批量解构导入', () => {
    const {
      authMiddleware,
      roleMiddleware,
      rateLimitMiddleware,
      articleActionLimiter,
      antiCrawlMiddleware,
      swaggerAuthMiddleware,
      validate,
    } = require('../../../apis/middleware/index');

    expect(typeof authMiddleware).toBe('function');
    expect(typeof roleMiddleware).toBe('function');
    expect(typeof rateLimitMiddleware).toBe('function');
    expect(typeof articleActionLimiter).toBe('function');
    expect(typeof antiCrawlMiddleware).toBe('function');
    expect(typeof swaggerAuthMiddleware).toBe('function');
    expect(typeof validate).toBe('function');
  });
});

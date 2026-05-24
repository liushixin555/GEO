/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express';

// Helper: 创建 mock request
function createMockReq(overrides: { authorization?: string; user?: any } = {}) {
  const req: any = {
    headers: {
      authorization: overrides.authorization,
    },
    user: overrides.user,
  };
  return req as Partial<Request>;
}

// Helper: 创建 mock response（与 anti-crawl 测试一致的模式）
function createMockRes() {
  const jsonFn = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  return { status: statusFn, json: jsonFn } as Partial<Response>;
}

describe('authMiddleware', () => {
  let authMiddleware: (req: Request, res: Response, next: NextFunction) => void;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret-key-for-auth';
    authMiddleware = require('../../../apis/middleware/auth.middleware').authMiddleware;

    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = createMockReq();
    mockRes = { status: statusFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  // =========================================================
  // 1. authMiddleware — 无 authorization header
  // =========================================================
  describe('无 authorization header', () => {
    it('应该返回 401 当 authorization header 缺失时', () => {
      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 authorization header 为空字符串时', () => {
      mockReq = createMockReq({ authorization: '' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2. authMiddleware — authorization header 格式错误
  // =========================================================
  describe('authorization header 格式错误', () => {
    it('应该返回 401 当 header 以 Basic 开头', () => {
      mockReq = createMockReq({ authorization: 'Basic abc123' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 header 是 Bearer 但没有空格分隔', () => {
      mockReq = createMockReq({ authorization: 'Bearer' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 header 是 Token xxx 格式', () => {
      mockReq = createMockReq({ authorization: 'Token abc123' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 3. authMiddleware — 无效 token
  // =========================================================
  describe('无效 token', () => {
    it('应该返回 401 当 token 完全无效时', () => {
      mockReq = createMockReq({ authorization: 'Bearer invalid.token.here' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 token 已过期时', () => {
      const jwt = require('jsonwebtoken');
      const expiredToken = jwt.sign(
        { userId: 1, username: 'test', role: 'admin' },
        process.env.JWT_SECRET!,
        { expiresIn: '1ms' }
      );

      mockReq = createMockReq({ authorization: `Bearer ${expiredToken}` });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 token 用错误密钥签名时', () => {
      const jwt = require('jsonwebtoken');
      const wrongSecretToken = jwt.sign(
        { userId: 1, username: 'test', role: 'admin' },
        'wrong-secret-key',
        { expiresIn: '1h' }
      );

      mockReq = createMockReq({ authorization: `Bearer ${wrongSecretToken}` });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 Bearer 后跟空 token 时', () => {
      mockReq = createMockReq({ authorization: 'Bearer ' });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 4. authMiddleware — 有效 token
  // =========================================================
  describe('有效 token', () => {
    it('应该调用 next() 并设置 req.user 当 token 有效时', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 1, username: 'admin', role: 'admin', companyId: 10 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
      expect(mockReq.user).toMatchObject({
        userId: 1,
        username: 'admin',
        role: 'admin',
        companyId: 10,
      });
    });

    it('应该正确解析包含 companyId 为 null 的 payload', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 2, username: 'sysadmin', role: 'sysadmin', companyId: null };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toMatchObject({
        userId: 2,
        username: 'sysadmin',
        role: 'sysadmin',
        companyId: null,
      });
    });

    it('应该正确解析不包含 companyId 的 payload', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 3, username: 'viewer', role: 'view' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authMiddleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toMatchObject({
        userId: 3,
        username: 'viewer',
        role: 'view',
      });
    });
  });
});

describe('roleMiddleware', () => {
  let roleMiddleware: (...allowedRoles: string[]) => (req: Request, res: Response, next: NextFunction) => void;
  let mockReq: any;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jest.resetModules();
    process.env.JWT_SECRET = 'test-secret-key-for-auth';
    roleMiddleware = require('../../../apis/middleware/auth.middleware').roleMiddleware;

    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockRes = { status: statusFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  afterEach(() => {
    delete process.env.JWT_SECRET;
  });

  // =========================================================
  // 5. roleMiddleware — req.user 不存在
  // =========================================================
  describe('req.user 不存在', () => {
    it('应该返回 401 当 req.user 未设置时', () => {
      mockReq = createMockReq();
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 req.user 为 undefined 时', () => {
      mockReq = { headers: {}, user: undefined };
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 6. roleMiddleware — 角色不匹配
  // =========================================================
  describe('角色不匹配', () => {
    it('应该返回 403 当用户角色不在允许列表中', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'viewer', role: 'view' } });
      const middleware = roleMiddleware('admin', 'sysadmin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '无权限访问' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 403 当用户角色为 view 但只允许 admin', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'viewer', role: 'view' } });
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 403 当允许列表为空时（任何角色都不匹配）', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });
      const middleware = roleMiddleware();

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 7. roleMiddleware — 角色匹配
  // =========================================================
  describe('角色匹配', () => {
    it('应该调用 next() 当用户角色匹配单个允许角色', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该调用 next() 当用户角色匹配多个允许角色之一', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });
      const middleware = roleMiddleware('sysadmin', 'admin', 'view');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该调用 next() 当用户角色为 sysadmin 且允许 sysadmin', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'sysadmin', role: 'sysadmin' } });
      const middleware = roleMiddleware('sysadmin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('应该调用 next() 当用户角色为 view 且允许 view', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'viewer', role: 'view' } });
      const middleware = roleMiddleware('view');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 8. AuthPayload 接口验证（通过 authMiddleware + roleMiddleware 集成）
  // =========================================================
  describe('AuthPayload 集成验证', () => {
    let authMiddlewareFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      authMiddlewareFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('应该正确携带 userId, username, role, companyId 字段', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 99, username: 'testuser', role: 'admin', companyId: 42 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authMiddlewareFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockReq.user).toBeDefined();
      expect(mockReq.user.userId).toBe(99);
      expect(mockReq.user.username).toBe('testuser');
      expect(mockReq.user.role).toBe('admin');
      expect(mockReq.user.companyId).toBe(42);
    });
  });

  // =========================================================
  // 9. authMiddleware — 安全边界测试
  // =========================================================
  describe('authMiddleware 安全边界', () => {
    let authFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      authFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('应该拒绝 "bearer"（小写）开头的 header', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      mockReq = createMockReq({ authorization: `bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝 "BEARER"（大写）开头的 header', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      mockReq = createMockReq({ authorization: `BEARER ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝被篡改的 token（payload 被修改）', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'admin', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      // 篡改 token 尾部字符
      const tamperedToken = token.slice(0, -5) + 'XXXXX';
      mockReq = createMockReq({ authorization: `Bearer ${tamperedToken}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该正确解析 companyId 为 0 的 payload', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 5, username: 'user0', role: 'view', companyId: 0 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.companyId).toBe(0);
    });

    it('应该正确解析包含额外字段的 token payload', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 6, username: 'extra', role: 'admin', companyId: 1, extraField: 'should-be-kept' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.userId).toBe(6);
      expect(mockReq.user.username).toBe('extra');
      // jwt.verify 保留所有字段
      expect((mockReq.user as any).extraField).toBe('should-be-kept');
    });

    it('应该拒绝 Authorization header 只有空格的情况', () => {
      mockReq = createMockReq({ authorization: '   ' });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝 undefined authorization header', () => {
      mockReq = createMockReq({ authorization: undefined as any });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝已被撤销（黑名单）的 token', () => {
      const jwt = require('jsonwebtoken');
      const { revokeToken, clearBlacklist } = require('../../../apis/utils/token-blacklist.util');
      clearBlacklist();

      const payload = { userId: 1, username: 'admin', role: 'admin', companyId: 10 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      // Revoke the token
      revokeToken(token, 7_200_000);

      mockReq = createMockReq({ authorization: `Bearer ${token}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '登录已过期，请重新登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该接受未被撤销的有效 token', () => {
      const jwt = require('jsonwebtoken');
      const { clearBlacklist } = require('../../../apis/utils/token-blacklist.util');
      clearBlacklist();

      const payload = { userId: 1, username: 'admin', role: 'admin', companyId: 10 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 10. roleMiddleware — 工厂函数特性验证
  // =========================================================
  describe('roleMiddleware 工厂函数特性', () => {
    it('应该返回一个函数', () => {
      const middleware = roleMiddleware('admin');
      expect(typeof middleware).toBe('function');
    });

    it('每次调用应该返回独立的中间件实例', () => {
      const middleware1 = roleMiddleware('admin');
      const middleware2 = roleMiddleware('view');

      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });

      middleware1(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();

      // 重置
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();

      middleware2(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(403);
    });

    it('应该正确处理角色完全相同但不同对象引用的匹配', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });
      const role = 'admin';
      const middleware = roleMiddleware(role);

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 11. authMiddleware + roleMiddleware 集成流程
  // =========================================================
  describe('完整认证+鉴权流程', () => {
    it('有效 token + 角色匹配 → 通过', () => {
      const jwt = require('jsonwebtoken');
      const { authMiddleware: authFn } = require('../../../apis/middleware/auth.middleware');
      const { roleMiddleware: roleFn } = require('../../../apis/middleware/auth.middleware');

      const payload = { userId: 1, username: 'admin', role: 'admin', companyId: 1 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });
      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      // 先走 authMiddleware
      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user).toBeDefined();

      // 重置 mockNext
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();

      // 再走 roleMiddleware
      const roleGuard = roleFn('admin', 'sysadmin');
      roleGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('有效 token + 角色不匹配 → 403', () => {
      const jwt = require('jsonwebtoken');
      const { authMiddleware: authFn } = require('../../../apis/middleware/auth.middleware');
      const { roleMiddleware: roleFn } = require('../../../apis/middleware/auth.middleware');

      const payload = { userId: 2, username: 'viewer', role: 'view', companyId: 1 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });
      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      // 先走 authMiddleware
      authFn(mockReq as Request, mockRes as Response, mockNext);
      (mockNext as jest.Mock).mockClear();
      statusFn.mockClear();

      // 再走 roleMiddleware
      const roleGuard = roleFn('admin');
      roleGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '无权限访问' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('无效 token → 后续 roleMiddleware 也会 401（未设置 user）', () => {
      const { authMiddleware: authFn } = require('../../../apis/middleware/auth.middleware');
      const { roleMiddleware: roleFn } = require('../../../apis/middleware/auth.middleware');

      mockReq = createMockReq({ authorization: 'Bearer invalid.token' });

      // authMiddleware 失败
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockReq.user).toBeUndefined();

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // 模拟：即使客户端忽略 401 继续调用 roleMiddleware
      const roleGuard = roleFn('admin');
      roleGuard(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
    });
  });

  // =========================================================
  // 12. authMiddleware — 黑名单交互深入测试
  // =========================================================
  describe('authMiddleware 黑名单交互', () => {
    let authFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      const { clearBlacklist } = require('../../../apis/utils/token-blacklist.util');
      clearBlacklist();
      authFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('应该拒绝多个已被撤销的不同 token', () => {
      const jwt = require('jsonwebtoken');
      const { revokeToken } = require('../../../apis/utils/token-blacklist.util');

      const token1 = jwt.sign({ userId: 1, username: 'user1', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      const token2 = jwt.sign({ userId: 2, username: 'user2', role: 'view' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      revokeToken(token1, 7_200_000);
      revokeToken(token2, 7_200_000);

      // token1 被拒绝
      mockReq = createMockReq({ authorization: `Bearer ${token1}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // token2 也被拒绝
      mockReq = createMockReq({ authorization: `Bearer ${token2}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该允许未撤销的 token 同时拒绝已撤销的 token', () => {
      const jwt = require('jsonwebtoken');
      const { revokeToken } = require('../../../apis/utils/token-blacklist.util');

      const revokedToken = jwt.sign({ userId: 1, username: 'revoked', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      const validToken = jwt.sign({ userId: 2, username: 'valid', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      revokeToken(revokedToken, 7_200_000);

      // 撤销的 token 被拒绝
      mockReq = createMockReq({ authorization: `Bearer ${revokedToken}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // 未撤销的 token 通过
      mockReq = createMockReq({ authorization: `Bearer ${validToken}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('同一个 token 多次请求应保持被撤销状态', () => {
      const jwt = require('jsonwebtoken');
      const { revokeToken } = require('../../../apis/utils/token-blacklist.util');

      const token = jwt.sign({ userId: 1, username: 'user', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      revokeToken(token, 7_200_000);

      // 第一次请求被拒绝
      mockReq = createMockReq({ authorization: `Bearer ${token}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // 第二次请求仍然被拒绝
      mockReq = createMockReq({ authorization: `Bearer ${token}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 13. authMiddleware — Bearer 前缀精确边界测试
  // =========================================================
  describe('authMiddleware Bearer 前缀精确边界', () => {
    let authFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      authFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('应该拒绝 "BearerX token"（Bearer 后紧跟非空格字符）', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `BearerX ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝 "Bearer\t"（tab 而非空格）开头的 header', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer\t${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该拒绝 " Bearer token"（前导空格）的 header', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: ` Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该接受 "Bearer " 后跟正常 token', () => {
      const jwt = require('jsonwebtoken');
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 14. authMiddleware — Unicode / 特殊 payload 测试
  // =========================================================
  describe('authMiddleware 特殊 payload', () => {
    let authFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      authFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('应该正确解析包含中文字符的 username', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 1, username: '测试用户', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.username).toBe('测试用户');
    });

    it('应该正确解析包含 emoji 的 username', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 2, username: 'user🎉test', role: 'view' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.username).toBe('user🎉test');
    });

    it('应该正确解析大 userId 值', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: Number.MAX_SAFE_INTEGER, username: 'bigId', role: 'admin' };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.userId).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('应该正确解析包含负数 companyId 的 payload', () => {
      const jwt = require('jsonwebtoken');
      const payload = { userId: 3, username: 'neg', role: 'admin', companyId: -1 };
      const token = jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: '2h' });

      mockReq = createMockReq({ authorization: `Bearer ${token}` });

      authFn(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(mockReq.user.companyId).toBe(-1);
    });
  });

  // =========================================================
  // 15. roleMiddleware — 边界值深入测试
  // =========================================================
  describe('roleMiddleware 边界值', () => {
    it('应该返回 401 当 req.user 显式设为 null', () => {
      mockReq = { headers: {}, user: null } as any;
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith({ code: 401, message: '未登录，请先登录' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 403 当用户 role 为空字符串', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'empty', role: '' } });
      const middleware = roleMiddleware('admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith({ code: 403, message: '无权限访问' });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该正确匹配包含重复角色的 allowedRoles', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'admin', role: 'admin' } });
      const middleware = roleMiddleware('admin', 'admin', 'admin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该返回 403 当 allowedRoles 包含其他角色但不含用户角色', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'viewer', role: 'view' } });
      const middleware = roleMiddleware('admin', 'sysadmin');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该正确处理包含所有三种角色的 allowedRoles（sysadmin 通过）', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'sysadmin', role: 'sysadmin' } });
      const middleware = roleMiddleware('admin', 'sysadmin', 'view');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该正确处理包含所有三种角色的 allowedRoles（view 通过）', () => {
      mockReq = createMockReq({ user: { userId: 1, username: 'viewer', role: 'view' } });
      const middleware = roleMiddleware('admin', 'sysadmin', 'view');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 16. authMiddleware — 错误响应格式一致性验证
  // =========================================================
  describe('authMiddleware 错误响应格式一致性', () => {
    let authFn: (req: Request, res: Response, next: NextFunction) => void;

    beforeEach(() => {
      authFn = require('../../../apis/middleware/auth.middleware').authMiddleware;
    });

    it('所有 401 响应应该包含 code 和 message 字段', () => {
      const scenarios = [
        { authorization: undefined as any },
        { authorization: '' },
        { authorization: 'Basic abc' },
        { authorization: 'Bearer invalid.token' },
      ];

      for (const scenario of scenarios) {
        statusFn.mockClear();
        jsonFn.mockClear();
        (mockNext as jest.Mock).mockClear();

        mockReq = createMockReq(scenario);
        authFn(mockReq as Request, mockRes as Response, mockNext);

        expect(statusFn).toHaveBeenCalledWith(401);
        const callArgs = jsonFn.mock.calls[0][0];
        expect(callArgs).toHaveProperty('code');
        expect(callArgs).toHaveProperty('message');
        expect(typeof callArgs.code).toBe('number');
        expect(typeof callArgs.message).toBe('string');
      }
    });

    it('未登录消息（无 Bearer）和过期消息（有 Bearer 但无效）应该不同', () => {
      const jwt = require('jsonwebtoken');
      const { revokeToken, clearBlacklist } = require('../../../apis/utils/token-blacklist.util');
      clearBlacklist();

      // 无 Bearer → '未登录，请先登录'
      mockReq = createMockReq({ authorization: '' });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      const noBearerMsg = jsonFn.mock.calls[0][0].message;

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // 无效 token → '登录已过期，请重新登录'
      mockReq = createMockReq({ authorization: 'Bearer invalid.token' });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      const invalidTokenMsg = jsonFn.mock.calls[0][0].message;

      statusFn.mockClear();
      jsonFn.mockClear();
      (mockNext as jest.Mock).mockClear();

      // 被撤销 token → '登录已过期，请重新登录'
      const token = jwt.sign({ userId: 1, username: 'test', role: 'admin' }, process.env.JWT_SECRET!, { expiresIn: '2h' });
      revokeToken(token, 7_200_000);
      mockReq = createMockReq({ authorization: `Bearer ${token}` });
      authFn(mockReq as Request, mockRes as Response, mockNext);
      const revokedTokenMsg = jsonFn.mock.calls[0][0].message;

      expect(noBearerMsg).toBe('未登录，请先登录');
      expect(invalidTokenMsg).toBe('登录已过期，请重新登录');
      expect(revokedTokenMsg).toBe('登录已过期，请重新登录');
      expect(noBearerMsg).not.toBe(invalidTokenMsg);
    });
  });

  // =========================================================
  // 17. authMiddleware + roleMiddleware — 完整角色组合矩阵
  // =========================================================
  describe('完整角色组合矩阵', () => {
    const roles: Array<{ role: string; username: string }> = [
      { role: 'sysadmin', username: 'sysadmin' },
      { role: 'admin', username: 'admin' },
      { role: 'view', username: 'viewer' },
    ];

    it.each([
      { allowedRoles: ['sysadmin'], expectedPass: ['sysadmin'], expectedFail: ['admin', 'view'] },
      { allowedRoles: ['admin'], expectedPass: ['admin'], expectedFail: ['sysadmin', 'view'] },
      { allowedRoles: ['view'], expectedPass: ['view'], expectedFail: ['sysadmin', 'admin'] },
      { allowedRoles: ['sysadmin', 'admin'], expectedPass: ['sysadmin', 'admin'], expectedFail: ['view'] },
      { allowedRoles: ['admin', 'view'], expectedPass: ['admin', 'view'], expectedFail: ['sysadmin'] },
      { allowedRoles: ['sysadmin', 'admin', 'view'], expectedPass: ['sysadmin', 'admin', 'view'], expectedFail: [] },
    ])(`allowedRoles=$allowedRoles → pass=$expectedPass fail=$expectedFail`, ({ allowedRoles, expectedPass, expectedFail }) => {
      const { roleMiddleware: roleFn } = require('../../../apis/middleware/auth.middleware');
      const middleware = roleFn(...allowedRoles);

      for (const role of expectedPass) {
        const user = roles.find(r => r.role === role)!;
        statusFn.mockClear();
        jsonFn.mockClear();
        (mockNext as jest.Mock).mockClear();

        mockReq = createMockReq({ user: { userId: 1, username: user.username, role: user.role } });
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(mockNext).toHaveBeenCalledWith();
        expect(statusFn).not.toHaveBeenCalled();
      }

      for (const role of expectedFail) {
        const user = roles.find(r => r.role === role)!;
        statusFn.mockClear();
        jsonFn.mockClear();
        (mockNext as jest.Mock).mockClear();

        mockReq = createMockReq({ user: { userId: 1, username: user.username, role: user.role } });
        middleware(mockReq as Request, mockRes as Response, mockNext);

        expect(statusFn).toHaveBeenCalledWith(403);
        expect(mockNext).not.toHaveBeenCalled();
      }
    });
  });
});

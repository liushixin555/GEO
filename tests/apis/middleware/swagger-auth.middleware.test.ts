/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express';

function encodeBasic(username: string, password: string): string {
  return `Basic ${Buffer.from(`${username}:${password}`).toString('base64')}`;
}

function createMockReq(overrides: { authorization?: string } = {}): Partial<Request> {
  return { headers: { authorization: overrides.authorization } } as Partial<Request>;
}

function createMockRes() {
  const jsonFn = jest.fn();
  const setHeaderFn = jest.fn();
  const statusFn = jest.fn().mockReturnValue({ json: jsonFn });
  return { status: statusFn, json: jsonFn, setHeader: setHeaderFn } as Partial<Response>;
}

// Re-acquire middleware + mock getPrisma after resetModules
function loadMiddleware(mockUserFindUnique: jest.Mock) {
  jest.resetModules();
  jest.doMock('../../../apis/utils/db.util', () => ({
    getPrisma: jest.fn().mockReturnValue({ user: { findUnique: mockUserFindUnique } }),
  }));
  const { swaggerAuthMiddleware } = require('../../../apis/middleware/swagger-auth.middleware');
  return swaggerAuthMiddleware;
}

describe('swaggerAuthMiddleware', () => {
  let mockNext: NextFunction;
  let mockRes: Partial<Response>;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;
  let setHeaderFn: jest.Mock;
  let mockUserFindUnique: jest.Mock;

  beforeEach(() => {
    mockUserFindUnique = jest.fn();
    jsonFn = jest.fn();
    setHeaderFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockRes = { status: statusFn, json: jsonFn, setHeader: setHeaderFn } as Partial<Response>;
    mockNext = jest.fn();
  });

  // =========================================================
  // 1. 缺少 Authorization header
  // =========================================================
  describe('缺少 Authorization header', () => {
    it('应该返回 401 当 authorization header 缺失时', async () => {
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq();
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ code: 401 }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 authorization 为空字符串时', async () => {
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: '' });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2. Authorization 格式错误（非 Basic）
  // =========================================================
  describe('Authorization 格式错误', () => {
    it('应该返回 401 当使用 Bearer token 时', async () => {
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: 'Bearer some.jwt.token' });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当 Basic credentials 中缺少冒号时', async () => {
      const middleware = loadMiddleware(mockUserFindUnique);
      const noColon = Buffer.from('justausername').toString('base64');
      const req = createMockReq({ authorization: `Basic ${noColon}` });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ message: '认证格式错误' }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 3. 用户不存在或已禁用
  // =========================================================
  describe('用户不存在或已禁用', () => {
    it('应该返回 401 当用户不存在时', async () => {
      mockUserFindUnique.mockResolvedValue(null);
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('nobody', 'pass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ message: '用户名或密码错误' }));
      expect(mockNext).not.toHaveBeenCalled();
    });

    it('应该返回 401 当用户已禁用（status: false）时', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 1, passwordHash: 'hash', role: 'admin', status: false,
      });
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('disabled', 'pass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 4. 角色不允许
  // =========================================================
  describe('角色不允许', () => {
    it('应该返回 403 当用户角色为 view 时', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 1, passwordHash: 'hash', role: 'view', status: true,
      });
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('viewer', 'pass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(403);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ code: 403, message: '无权限访问 API 文档' }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 5. 密码错误
  // =========================================================
  describe('密码错误', () => {
    it('应该返回 401 当密码不匹配时', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 1, passwordHash: '$2a$10$hashedvalue', role: 'admin', status: true,
      });
      jest.doMock('bcryptjs', () => ({ compare: jest.fn().mockResolvedValue(false) }));
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('admin', 'wrongpass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(401);
      expect(jsonFn).toHaveBeenCalledWith(expect.objectContaining({ message: '用户名或密码错误' }));
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 6. 正确凭证
  // =========================================================
  describe('正确凭证', () => {
    it('应该调用 next() 当 sysadmin 凭证正确时', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 1, passwordHash: '$2a$10$hashedvalue', role: 'sysadmin', status: true,
      });
      jest.doMock('bcryptjs', () => ({ compare: jest.fn().mockResolvedValue(true) }));
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('sysadmin', 'correctpass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });

    it('应该调用 next() 当 admin 凭证正确时', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 2, passwordHash: '$2a$10$hashedvalue', role: 'admin', status: true,
      });
      jest.doMock('bcryptjs', () => ({ compare: jest.fn().mockResolvedValue(true) }));
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('admin', 'correctpass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
      expect(statusFn).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 7. 数据库错误
  // =========================================================
  describe('数据库错误', () => {
    it('应该返回 500 当数据库查询抛出异常时', async () => {
      mockUserFindUnique.mockRejectedValue(new Error('DB connection lost'));
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('sysadmin', 'pass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(statusFn).toHaveBeenCalledWith(500);
      expect(jsonFn).toHaveBeenCalledWith({ code: 500, message: '服务器错误' });
      expect(mockNext).not.toHaveBeenCalled();
    });
  });

  // =========================================================
  // 8. WWW-Authenticate header
  // =========================================================
  describe('WWW-Authenticate header', () => {
    it('应该在 401 响应中设置 WWW-Authenticate header', async () => {
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq();
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(setHeaderFn).toHaveBeenCalledWith('WWW-Authenticate', 'Basic realm="API Docs"');
    });

    it('应该在 403 响应中不设置 WWW-Authenticate header', async () => {
      mockUserFindUnique.mockResolvedValue({
        id: 1, passwordHash: 'hash', role: 'view', status: true,
      });
      const middleware = loadMiddleware(mockUserFindUnique);
      const req = createMockReq({ authorization: encodeBasic('viewer', 'pass') });
      await middleware(req as Request, mockRes as Response, mockNext);

      expect(setHeaderFn).not.toHaveBeenCalled();
    });
  });
});

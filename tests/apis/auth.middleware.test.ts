/**
 * @jest-environment node
 */
import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

// Set env vars BEFORE any module imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

import { authMiddleware, roleMiddleware } from '../../apis/middleware/auth.middleware';

describe('authMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = { headers: {} };
    mockRes = { status: statusFn, json: jsonFn } as any;
    mockNext = jest.fn();
  });

  it('should return 401 when no authorization header', () => {
    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 401,
      message: '未登录，请先登录',
    });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it('should return 401 when authorization header does not start with Bearer', () => {
    mockReq.headers = { authorization: 'Basic abc123' };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 401,
      message: '未登录，请先登录',
    });
  });

  it('should return 401 when token is expired', () => {
    const expiredToken = jwt.sign(
      { userId: 1, username: 'test', role: 'admin', companyId: 1 },
      'test-secret',
      { expiresIn: '-1s' }
    );
    mockReq.headers = { authorization: `Bearer ${expiredToken}` };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 401,
      message: '登录已过期，请重新登录',
    });
  });

  it('should return 401 when token is malformed', () => {
    mockReq.headers = { authorization: 'Bearer invalid.token.here' };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 401,
      message: '登录已过期，请重新登录',
    });
  });

  it('should call next and set req.user for valid token', () => {
    const validToken = jwt.sign(
      { userId: 1, username: 'admin', role: 'admin', companyId: 1 },
      'test-secret',
      { expiresIn: '2h' }
    );
    mockReq.headers = { authorization: `Bearer ${validToken}` };

    authMiddleware(mockReq as Request, mockRes as Response, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect((mockReq as any).user).toEqual(
      expect.objectContaining({
        userId: 1,
        username: 'admin',
        role: 'admin',
        companyId: 1,
      })
    );
  });
});

describe('roleMiddleware', () => {
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;
  let jsonFn: jest.Mock;
  let statusFn: jest.Mock;

  beforeEach(() => {
    jsonFn = jest.fn();
    statusFn = jest.fn().mockReturnValue({ json: jsonFn });
    mockReq = {};
    mockRes = { status: statusFn, json: jsonFn } as any;
    mockNext = jest.fn();
  });

  it('should return 401 when no user on request', () => {
    roleMiddleware('admin')(mockReq as Request, mockRes as Response, mockNext);

    expect(statusFn).toHaveBeenCalledWith(401);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 401,
      message: '未登录，请先登录',
    });
  });

  it('should return 403 when user role is not allowed', () => {
    (mockReq as any).user = {
      userId: 3,
      username: 'viewer',
      role: 'view',
      companyId: 1,
    };

    roleMiddleware('sysadmin', 'admin')(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(statusFn).toHaveBeenCalledWith(403);
    expect(jsonFn).toHaveBeenCalledWith({
      code: 403,
      message: '无权限访问',
    });
  });

  it('should call next when user role is allowed', () => {
    (mockReq as any).user = {
      userId: 1,
      username: 'admin',
      role: 'admin',
      companyId: 1,
    };

    roleMiddleware('sysadmin', 'admin')(
      mockReq as Request,
      mockRes as Response,
      mockNext
    );

    expect(mockNext).toHaveBeenCalled();
  });
});

/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcryptjs';

// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '500';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { clearBlacklist } from '../../apis/utils/token-blacklist.util';
import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken(userId = 1, companyId = 1) {
  return jwt.sign(
    { userId, username: 'sysadmin', role: 'sysadmin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken(userId = 2, companyId = 2) {
  return jwt.sign(
    { userId, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken(userId = 3, companyId = 2) {
  return jwt.sign(
    { userId, username: 'viewer', role: 'view', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

const LOGIN = '/api/v1/auth/login';
const LOGOUT = '/api/v1/auth/logout';
const VERIFY = '/api/v1/auth/verify';
const SELECTION = '/api/v1/auth/selection';
const COMPANIES = '/api/v1/auth/companies';
const PROJECTS = '/api/v1/auth/projects';
const CONTEXT = '/api/v1/auth/context';

function mockPrisma(overrides: Record<string, any> = {}) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const prisma = {
    user: {
      findUnique: jest.fn().mockResolvedValue(null),
      update: jest.fn().mockResolvedValue(undefined),
      findMany: jest.fn().mockResolvedValue([]),
    },
    company: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    project: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    projectOperator: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    projectViewer: {
      findMany: jest.fn().mockResolvedValue([]),
    },
    ...overrides,
  };
  getPrisma.mockReturnValue(prisma);
  return prisma;
}

const hashedPassword = '$2a$10$abcdefghijklmnopqrstuuVWXYz0123456789A';

describe('Auth Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    clearBlacklist();
  });

  afterAll(() => {
    jest.restoreAllMocks();
  });

  // ============================================================
  // POST /api/auth/login
  // ============================================================
  describe('POST /api/auth/login', () => {
    it('should return 400 when username is missing', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ password: 'pass123' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空');
    });

    it('should return 400 when password is missing', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码不能为空');
    });

    it('should return 400 when both are missing', async () => {
      const response = await agent
        .post(LOGIN)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空; 密码不能为空');
    });

    it('should return 400 when username is empty string', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: '', password: 'pass123' });
      expect(response.status).toBe(400);
      // Zod string validation passes empty string — controller handles this
      expect(response.body.message).toBeDefined();
    });

    it('should return 400 when password is empty string', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: '' });
      expect(response.status).toBe(400);
      // Zod string validation passes empty string — controller handles this
      expect(response.body.message).toBeDefined();
    });

    // H-4: 类型验证
    it('should return 400 when username is not a string', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 123, password: 'pass123' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空');
    });

    it('should return 400 when password is not a string', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 123 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码不能为空');
    });

    it('should return 400 when username is an array', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: ['admin'], password: 'pass123' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空');
    });

    it('should return 400 when username exceeds max length', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'a'.repeat(101), password: 'pass123' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能超过100个字符');
    });

    it('should return 400 when password exceeds max length', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'p'.repeat(201) });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码不能超过200个字符');
    });

    it('should return 401 when user not found', async () => {
      const prisma = mockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'nonexistent', password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should return 401 when password is incorrect', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'admin', passwordHash: hashedPassword,
        cnName: 'Admin', role: 'admin', status: true, companyId: 1,
        selectedCompany: null, selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'wrongpass' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should return 403 when no accessible companies (LoginSelectionError)', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 5, username: 'newuser', passwordHash: hashedPassword,
        cnName: 'New', role: 'view', status: true, companyId: null,
        selectedCompany: null, selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([]);
      prisma.company.findUnique.mockResolvedValue(null);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'newuser', password: 'pass123' });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('没有权限访问任何公司');
    });

    it('should return 403 when view role has no accessible projects', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 5, username: 'viewer', passwordHash: hashedPassword,
        cnName: 'Viewer', role: 'view', status: true, companyId: 1,
        selectedCompany: null, selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findUnique.mockResolvedValue({ id: 1, shortName: 'C1', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([]);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'viewer', password: 'pass123' });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('没有权限访问任何项目');
    });

    it('should login successfully as sysadmin', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'sysadmin', passwordHash: hashedPassword,
        cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1,
        selectedCompany: { id: 1, shortName: 'Company A' },
        selectedProject: { id: 1, shortName: 'Project 1' },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
        { id: 2, shortName: 'Company B' },
      ]);
      prisma.project.findMany.mockResolvedValue([
        { id: 1, shortName: 'Project 1' },
      ]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'sysadmin', password: 'sysadmin123' });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.token).toBeDefined();
      expect(response.body.data.user.username).toBe('sysadmin');
      expect(response.body.data.user.role).toBe('sysadmin');
      expect(response.body.message).toBe('登录成功');
    });

    it('should login successfully as admin', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 2, username: 'admin', passwordHash: hashedPassword,
        cnName: '管理员', role: 'admin', status: true, companyId: 2,
        selectedCompany: { id: 2, shortName: 'Company B' },
        selectedProject: { id: 3, shortName: 'Project B' },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });
      prisma.projectOperator.findMany.mockResolvedValue([
        { project: { id: 3, shortName: 'Project B' } },
      ]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'pass123' });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.user.role).toBe('admin');
    });

    it('should login successfully as view role', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 3, username: 'viewer', passwordHash: hashedPassword,
        cnName: 'Viewer User', role: 'view', status: true, companyId: 2,
        selectedCompany: { id: 2, shortName: 'Company B' },
        selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'Project V' } },
      ]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'viewer', password: 'pass123' });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.user.role).toBe('view');
    });

    it('should fallback to first company when selected company not accessible', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'sysadmin', passwordHash: hashedPassword,
        cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1,
        selectedCompany: { id: 99, shortName: 'Deleted Co' },
        selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);
      prisma.project.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'sysadmin', password: 'sysadmin123' });
      expect(response.status).toBe(200);
      expect(response.body.data.user.selected_company.id).toBe(1);
    });

    it('should fallback to first project when selected project not accessible', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'sysadmin', passwordHash: hashedPassword,
        cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1,
        selectedCompany: { id: 1, shortName: 'Company A' },
        selectedProject: { id: 88, shortName: 'Deleted Project' },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);
      prisma.project.findMany.mockResolvedValue([
        { id: 1, shortName: 'Project 1' },
      ]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'sysadmin', password: 'sysadmin123' });
      expect(response.status).toBe(200);
      expect(response.body.data.user.selected_project.id).toBe(1);
    });

    it('should allow sysadmin with no projects (selected_project is null)', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'sysadmin', passwordHash: hashedPassword,
        cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1,
        selectedCompany: { id: 1, shortName: 'Company A' },
        selectedProject: null,
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);
      prisma.project.findMany.mockResolvedValue([]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'sysadmin', password: 'sysadmin123' });
      expect(response.status).toBe(200);
      expect(response.body.data.user.selected_project).toBeNull();
    });

    it('should handle login error with default message', async () => {
      const prisma = mockPrisma();
      prisma.user.findUnique.mockRejectedValue(new Error('DB connection failed'));

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should handle login error without message', async () => {
      const prisma = mockPrisma();
      prisma.user.findUnique.mockRejectedValue(new Error());

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('should not require auth middleware for login (public route)', async () => {
      // Login is a public route - no authMiddleware is applied
      // Verify it does NOT return middleware-level 401 message
      const prisma = mockPrisma();
      prisma.user.findUnique.mockResolvedValue(null);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'test', password: 'test' });
      // Controller-level 401 for wrong credentials, not middleware-level 401
      expect(response.body.message).not.toBe('未登录，请先登录');
    });
  });

  // ============================================================
  // POST /api/auth/logout
  // ============================================================
  describe('POST /api/auth/logout', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post(LOGOUT);
      expect(response.status).toBe(401);
    });

    it('should return success with valid token', async () => {
      const response = await agent
        .post(LOGOUT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('登出成功');
    });

    it('should return success for admin token', async () => {
      const response = await agent
        .post(LOGOUT)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('登出成功');
    });

    it('should return success for view token', async () => {
      const response = await agent
        .post(LOGOUT)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.message).toBe('登出成功');
    });

    it('should revoke token after logout — subsequent request gets 401', async () => {
      const token = sysadminToken(10, 10);
      // Logout with the token
      const logoutRes = await agent
        .post(LOGOUT)
        .set('Authorization', `Bearer ${token}`);
      expect(logoutRes.status).toBe(200);

      // Same token should now be rejected by auth middleware
      const verifyRes = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${token}`);
      expect(verifyRes.status).toBe(401);
      expect(verifyRes.body.message).toBe('登录已过期，请重新登录');
    });

    it('should not affect other tokens when one is revoked', async () => {
      const token1 = sysadminToken(10, 10);
      const token2 = sysadminToken(11, 11);

      // Logout with token1
      await agent.post(LOGOUT).set('Authorization', `Bearer ${token1}`);

      // token2 should still work
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 11, username: 'other', cnName: 'Other', role: 'sysadmin', companyId: 11,
          selectedCompany: null, selectedProject: null,
        })},
      });
      const verifyRes = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${token2}`);
      expect(verifyRes.status).toBe(200);
    });
  });

  // ============================================================
  // GET /api/auth/verify
  // ============================================================
  describe('GET /api/auth/verify', () => {
    it('should return 401 without authorization header (middleware)', async () => {
      const response = await agent.get(VERIFY);
      expect(response.status).toBe(401);
      // authMiddleware blocks before controller
      expect(response.body.message).toBe('未登录，请先登录');
    });

    it('should return 401 when Authorization has no Bearer prefix (middleware)', async () => {
      const response = await agent
        .get(VERIFY)
        .set('Authorization', 'InvalidFormat');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未登录，请先登录');
    });

    it('should return 401 when Authorization is Bearer with empty token (middleware)', async () => {
      const response = await agent
        .get(VERIFY)
        .set('Authorization', 'Bearer ');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未登录，请先登录');
    });

    it('should return valid for a valid token', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1, username: 'sysadmin', cnName: '系统管理员', role: 'sysadmin', companyId: 1,
            selectedCompany: { id: 1, shortName: '测试公司' },
            selectedProject: null,
          }),
        },
      });

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.valid).toBe(true);
      expect(response.body.message).toBe('token有效');
    });

    it('should return 401 for an expired token (middleware)', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );
      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
      // authMiddleware catches expired tokens
      expect(response.body.message).toBe('登录已过期，请重新登录');
    });

    it('should return 401 for a token with wrong secret (middleware)', async () => {
      const badToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'wrong-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${badToken}`);
      expect(response.status).toBe(401);
      // authMiddleware catches invalid tokens
      expect(response.body.message).toBe('登录已过期，请重新登录');
    });

    it('should return valid for admin token', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 2, username: 'admin', cnName: '管理员', role: 'admin', companyId: 2,
            selectedCompany: { id: 2, shortName: '测试公司2' },
            selectedProject: null,
          }),
        },
      });

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });

    it('should return valid for view token', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 3, username: 'viewer', cnName: '观察者', role: 'view', companyId: 2,
            selectedCompany: { id: 2, shortName: '测试公司2' },
            selectedProject: null,
          }),
        },
      });

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });
  });

  // ============================================================
  // PUT /api/auth/selection
  // ============================================================
  describe('PUT /api/auth/selection', () => {
    it('should return 401 without token', async () => {
      const response = await agent.put(SELECTION).send({ company_id: 1 });
      expect(response.status).toBe(401);
    });

    it('should return 400 when company_id is missing', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ project_id: 1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: company_id 必须为正整数');
    });

    it('should return 400 when body is empty', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: company_id 必须为正整数');
    });

    it('should return 400 when company_id is negative', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: -1 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: company_id 必须为正数');
    });

    it('should return 400 when company_id is zero', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 0 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: company_id 必须为正数');
    });

    it('should return 400 when project_id is negative', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, project_id: -5 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: project_id 必须为正数');
    });

    it('should return 403 when company_id is not accessible', async () => {
      const prisma = mockPrisma();
      // sysadmin sees all companies - but we return empty to simulate no accessible company
      prisma.company.findMany.mockResolvedValue([]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 999 });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权选择该公司');
    });

    it('should return 403 when project_id is not accessible', async () => {
      const prisma = mockPrisma();
      // Company is accessible
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      // But project is not
      prisma.project.findMany.mockResolvedValue([]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, project_id: 999 });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权选择该项目');
    });

    it('should save selection with company_id only', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('保存成功');
    });

    it('should save selection with company_id and project_id', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      prisma.project.findMany.mockResolvedValue([{ id: 2, shortName: 'Project 1' }]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, project_id: 2 });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('保存成功');
    });

    it('should return 500 with generic message when saveSelection throws error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      prisma.user.update.mockRejectedValue(new Error('DB error'));

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('保存失败，请稍后重试');
    });

    it('should return 500 with generic message when error has no message', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      prisma.user.update.mockRejectedValue(new Error());

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('保存失败，请稍后重试');
    });
  });

  // ============================================================
  // GET /api/auth/companies
  // ============================================================
  describe('GET /api/auth/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get(COMPANIES);
      expect(response.status).toBe(401);
    });

    it('should return companies for sysadmin', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
        { id: 2, shortName: 'Company B' },
      ]);

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({ id: 1, short_name: 'Company A' });
      expect(response.body.data[1]).toEqual({ id: 2, short_name: 'Company B' });
    });

    it('should return companies for admin (own company only)', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({ id: 2, short_name: 'Company B' });
    });

    it('should return companies for view role', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return empty array when admin has no company', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue(null);

      const noCompanyToken = jwt.sign(
        { userId: 10, username: 'admin', role: 'admin', companyId: null },
        'test-secret',
        { expiresIn: '2h' }
      );

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${noCompanyToken}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return empty array when company is disabled', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: false });

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 500 with generic message when service throws error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue(new Error('DB error'));

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司列表失败，请稍后重试');
    });

    it('should return 500 with generic message on error without message', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue(new Error());

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司列表失败，请稍后重试');
    });
  });

  // ============================================================
  // GET /api/auth/projects
  // ============================================================
  describe('GET /api/auth/projects', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get(PROJECTS);
      expect(response.status).toBe(401);
    });

    it('should return 400 when company_id is missing', async () => {
      const response = await agent
        .get(PROJECTS)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('should return 400 when company_id is NaN', async () => {
      const response = await agent
        .get(PROJECTS)
        .query({ company_id: 'abc' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('should return 400 when company_id is negative', async () => {
      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '-1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('should return projects for sysadmin', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockResolvedValue([
        { id: 1, shortName: 'Project 1' },
        { id: 2, shortName: 'Project 2' },
      ]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({ id: 1, short_name: 'Project 1' });
    });

    it('should return projects for admin', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });
      prisma.projectOperator.findMany.mockResolvedValue([
        { project: { id: 3, shortName: 'Project Admin' } },
      ]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({ id: 3, short_name: 'Project Admin' });
    });

    it('should return projects for view role', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'Project View' } },
      ]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({ id: 4, short_name: 'Project View' });
    });

    it('should return empty when company is disabled for non-sysadmin', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: false });

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 500 with generic message when service throws error', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockRejectedValue(new Error('DB error'));

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败，请稍后重试');
    });

    it('should return 500 with generic message on error without message', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockRejectedValue(new Error());

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败，请稍后重试');
    });
  });

  // ============================================================
  // GET /api/auth/context
  // ============================================================
  describe('GET /api/auth/context', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get(CONTEXT);
      expect(response.status).toBe(401);
    });

    it('should return companies and empty projects when no company_id', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);

      const response = await agent
        .get(CONTEXT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.companies).toHaveLength(1);
      expect(response.body.data.projects).toHaveLength(0);
      expect(response.body.message).toBe('获取成功');
    });

    it('should return companies and projects when company_id is provided', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
        { id: 2, shortName: 'Company B' },
      ]);
      prisma.project.findMany.mockResolvedValue([
        { id: 1, shortName: 'Project 1' },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.companies).toHaveLength(2);
      expect(response.body.data.projects).toHaveLength(1);
    });

    it('should return context for admin', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });
      prisma.projectOperator.findMany.mockResolvedValue([
        { project: { id: 3, shortName: 'Project Admin' } },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.companies).toHaveLength(1);
      expect(response.body.data.projects).toHaveLength(1);
    });

    it('should return context for view role', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'Company B', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'Project View' } },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.companies).toHaveLength(1);
      expect(response.body.data.projects).toHaveLength(1);
    });

    it('should return 500 with generic message when service throws error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue(new Error('DB error'));

      const response = await agent
        .get(CONTEXT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取上下文失败，请稍后重试');
    });

    it('should return 500 with generic message on error without message', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue(new Error());

      const response = await agent
        .get(CONTEXT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取上下文失败，请稍后重试');
    });
  });

  // ============================================================
  // GET /api/auth/companies/:id
  // ============================================================
  describe('GET /api/auth/companies/:id', () => {
    const url = (id: number | string) => `${COMPANIES}/${id}`;

    it('should return 401 without token', async () => {
      const response = await agent.get(url(1));
      expect(response.status).toBe(401);
    });

    it('should return 400 when id is not a number', async () => {
      const response = await agent
        .get(url('abc'))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when id is NaN', async () => {
      const response = await agent
        .get(url('xyz'))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when id is negative', async () => {
      const response = await agent
        .get(url(-1))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when id is zero', async () => {
      const response = await agent
        .get(url(0))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return company detail for sysadmin querying any company', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([
        { id: 2, role: 'admin', cnName: '张三', username: 'zhangsan' },
        { id: 3, role: 'view', cnName: '李四', username: 'lisi' },
      ]);

      const response = await agent
        .get(url(1))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.operators).toHaveLength(1);
      expect(response.body.data.operators[0]).toEqual({ id: 2, cn_name: '张三', username: 'zhangsan' });
      expect(response.body.data.viewers).toHaveLength(1);
      expect(response.body.data.viewers[0]).toEqual({ id: 3, cn_name: '李四', username: 'lisi' });
    });

    it('should return company detail for admin querying own company', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([
        { id: 2, role: 'admin', cnName: 'Admin', username: 'admin' },
      ]);

      const response = await agent
        .get(url(2))
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(1);
    });

    it('should return empty lists when no users found', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(url(2))
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(0);
      expect(response.body.data.viewers).toHaveLength(0);
    });

    it('should return 403 when admin queries different company', async () => {
      const response = await agent
        .get(url(999))
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权查看其他公司的用户');
    });

    it('should return 403 when view role queries any company', async () => {
      const response = await agent
        .get(url(2))
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('当前角色无权查看公司用户');
    });

    it('should allow sysadmin to query any company', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(url(999))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('should return 500 with generic message when service throws error', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockRejectedValue(new Error('DB error'));

      const response = await agent
        .get(url(1))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司用户失败，请稍后重试');
    });

    it('should return 500 with generic message on error without message', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockRejectedValue(new Error());

      const response = await agent
        .get(url(1))
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司用户失败，请稍后重试');
    });
  });

  // ============================================================
  // Additional edge cases for higher branch coverage
  // ============================================================
  describe('Additional edge cases', () => {
    it('saveSelection should return 400 when project_id is zero', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, project_id: 0 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: project_id 必须为正数');
    });

    it('saveSelection should return 400 when company_id is a non-numeric string', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 'abc' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: company_id 必须为正整数');
    });

    it('getContext should return 400 when company_id is invalid string', async () => {
      const response = await agent
        .get(CONTEXT)
        .query({ company_id: 'abc' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('getCompanyDetail should accept float id (parseInt truncates to valid int)', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(`${COMPANIES}/1.5`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      // parseInt('1.5') = 1, which is > 0, so it's valid
      expect(response.status).toBe(200);
    });

    it('login should return 400 when username is whitespace only (trim→empty→controller)', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: '   ', password: 'pass123' });
      expect(response.status).toBe(400);
      // Zod trim() runs AFTER .min(1), so '   ' passes Zod (length 3),
      // but controller receives '' after trim → !username triggers
      expect(response.body.message).toBe('用户名和密码不能为空');
    });

    it('login should handle non-Error thrown from service', async () => {
      const prisma = mockPrisma();
      prisma.user.findUnique.mockRejectedValue('unexpected string error');

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('saveSelection should accept project_id as explicit null', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, project_id: null });
      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('保存成功');
    });

    it('saveSelection should return 500 when service throws non-Error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      prisma.user.update.mockRejectedValue('string error');

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('保存失败，请稍后重试');
    });

    it('getAccessibleProjects should return 400 when company_id is zero', async () => {
      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '0' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('getContext should return 400 when company_id is zero', async () => {
      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '0' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('getCompanyDetail should return 403 when view role queries any company', async () => {
      const response = await agent
        .get(`${COMPANIES}/2`)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('当前角色无权查看公司用户');
    });

    it('getCompanyDetail should return 500 when service throws non-Error', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockRejectedValue('string error');

      const response = await agent
        .get(`${COMPANIES}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司用户失败，请稍后重试');
    });

    it('getAccessibleCompanies should return 500 when service throws non-Error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue('string error');

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司列表失败，请稍后重试');
    });

    it('getAccessibleProjects should return 500 when service throws non-Error', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockRejectedValue('string error');

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败，请稍后重试');
    });

    it('getContext should return 500 when service throws non-Error', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockRejectedValue('string error');

      const response = await agent
        .get(CONTEXT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取上下文失败，请稍后重试');
    });

    it('getCompanyDetail should return users with only operators and viewers', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([
        { id: 2, role: 'admin', cnName: '管理员A', username: 'admin_a' },
        { id: 3, role: 'admin', cnName: '管理员B', username: 'admin_b' },
        { id: 4, role: 'view', cnName: '查看者A', username: 'viewer_a' },
      ]);

      const response = await agent
        .get(`${COMPANIES}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(2);
      expect(response.body.data.viewers).toHaveLength(1);
    });
  });

  // ============================================================
  // Direct unit tests for !user defensive branches
  // These branches are unreachable via HTTP (authMiddleware guarantees req.user)
  // so we test by calling controller functions directly
  // ============================================================
  describe('Defensive !user checks (direct unit tests)', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('saveSelection should return 401 when req.user is undefined', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1 }, user: undefined as any };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('getAccessibleCompanies should return 401 when req.user is undefined', async () => {
      const { getAccessibleCompanies } = require('../../apis/controller/auth.controller');
      const req = { user: undefined as any };
      const res = mockRes();
      await getAccessibleCompanies(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('getAccessibleProjects should return 401 when req.user is undefined', async () => {
      const { getAccessibleProjects } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '1' }, user: undefined as any };
      const res = mockRes();
      await getAccessibleProjects(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('getContext should return 401 when req.user is undefined', async () => {
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: {}, user: undefined as any };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('getCompanyDetail should return 401 when req.user is undefined', async () => {
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '1' }, user: undefined as any };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('verify should return 401 when req.user is undefined', async () => {
      const { verify } = require('../../apis/controller/auth.controller');
      const req = { user: undefined as any };
      const res = mockRes();
      await verify(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('未登录');
    });

    it('verify should return 401 when getLatestUserState throws', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: {
          findUnique: jest.fn().mockRejectedValue(new Error('DB down')),
        },
      });
      const { verify } = require('../../apis/controller/auth.controller');
      const req = { user: { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await verify(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('登录已过期');
    });
  });

  // ============================================================
  // Direct unit tests for Zod-blocked controller branches
  // These branches are unreachable via HTTP (Zod validate middleware
  // rejects invalid input before controller runs), so we call
  // the controller functions directly.
  // ============================================================
  describe('Zod-blocked controller branches (direct unit tests)', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('login should return 400 when username is not a string', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 12345, password: 'pass123' } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码格式不正确');
    });

    it('login should return 400 when password is not a string', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 12345 } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码格式不正确');
    });

    it('login should return 400 when username is boolean', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: true, password: 'pass123' } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码格式不正确');
    });

    it('login should return 400 when password is an object', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: { val: 1 } } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码格式不正确');
    });

    it('login should return 400 when username exceeds 100 characters', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'a'.repeat(101), password: 'pass123' } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('输入长度超出限制');
    });

    it('login should return 400 when password exceeds 200 characters', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 'p'.repeat(201) } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('输入长度超出限制');
    });

    it('login should accept username at exactly 100 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'a'.repeat(100), password: 'pass123' } };
      const res = mockRes();
      await login(req, res);
      // Should NOT return 400 for length, but 401 for wrong credentials
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('login should accept password at exactly 200 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 'p'.repeat(200) } };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('saveSelection should return 400 when company_id parses to NaN', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 'abc' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('saveSelection should return 400 when company_id is 0', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 0 }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('saveSelection should return 400 when company_id is negative', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: -5 }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('saveSelection should return 400 when project_id is NaN', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1, project_id: 'abc' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('project_id 必须为正整数或 null');
    });

    it('saveSelection should return 400 when project_id is 0', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1, project_id: 0 }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('project_id 必须为正整数或 null');
    });

    it('saveSelection should return 400 when project_id is negative', async () => {
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1, project_id: -3 }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('project_id 必须为正整数或 null');
    });

    it('saveSelection should accept project_id as null (bypasses Zod)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const prisma = {
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
        user: { update: jest.fn().mockResolvedValue(undefined) },
      };
      getPrisma.mockReturnValue(prisma);
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1, project_id: null }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('保存成功');
    });

    it('saveSelection should accept project_id as undefined', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const prisma = {
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
        user: { update: jest.fn().mockResolvedValue(undefined) },
      };
      getPrisma.mockReturnValue(prisma);
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1 }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('保存成功');
    });
  });

  // ============================================================
  // Round 3: Additional direct unit tests for edge branches
  // Tests bypass middleware/Zod to cover controller-internal logic
  // ============================================================
  describe('Round 3: Logout direct unit tests', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('logout should return success when authHeader is undefined (no token to revoke)', async () => {
      const { logout } = require('../../apis/controller/auth.controller');
      const req = { headers: {}, user: { userId: 1, role: 'sysadmin' }, ip: '127.0.0.1' };
      const res = mockRes();
      await logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('登出成功');
    });

    it('logout should return success when authHeader does not start with Bearer', async () => {
      const { logout } = require('../../apis/controller/auth.controller');
      const req = { headers: { authorization: 'Basic dXNlcjpwYXNz' }, user: { userId: 1, role: 'sysadmin' }, ip: '127.0.0.1' };
      const res = mockRes();
      await logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('登出成功');
    });

    it('logout should revoke token when valid Bearer header present (direct call)', async () => {
      const testToken = jwt.sign(
        { userId: 99, username: 'direct_test', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const { logout } = require('../../apis/controller/auth.controller');
      const req = { headers: { authorization: `Bearer ${testToken}` }, user: { userId: 99, role: 'sysadmin' }, ip: '127.0.0.1' };
      const res = mockRes();
      await logout(req, res);
      expect(res.statusCode).toBe(200);
      // Verify token is blacklisted
      const { isTokenRevoked } = require('../../apis/utils/token-blacklist.util');
      expect(isTokenRevoked(testToken)).toBe(true);
    });

    it('logout should return success when req.user is undefined (no userId in log)', async () => {
      const { logout } = require('../../apis/controller/auth.controller');
      const req = { headers: {}, user: undefined as any, ip: '127.0.0.1' };
      const res = mockRes();
      await logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('登出成功');
    });
  });

  describe('Round 3: getCompanyDetail direct unit tests', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('getCompanyDetail should return 403 when admin has null companyId', async () => {
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '1' }, user: { userId: 5, role: 'admin', companyId: null }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('无权查看其他公司的用户');
    });

    it('getCompanyDetail should return 200 when admin queries own company with matching companyId', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findMany: jest.fn().mockResolvedValue([
          { id: 5, role: 'admin', cnName: '管理员A', username: 'admin_a' },
        ]) },
      });
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '2' }, user: { userId: 5, role: 'admin', companyId: 2 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.operators).toHaveLength(1);
    });

    it('getCompanyDetail should return 403 when admin queries different company', async () => {
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '99' }, user: { userId: 5, role: 'admin', companyId: 2 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('无权查看其他公司的用户');
    });

    it('getCompanyDetail should return 200 when sysadmin queries any company (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '55' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(200);
    });

    it('getCompanyDetail should return 400 when id is negative via direct call', async () => {
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '-5' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('无效的公司ID');
    });

    it('getCompanyDetail should return 400 when id is zero via direct call', async () => {
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '0' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('无效的公司ID');
    });
  });

  describe('Round 3: getContext direct unit tests', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('getContext should return 400 when company_id is negative string (direct)', async () => {
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '-1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getContext should return 400 when company_id is zero string (direct)', async () => {
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '0' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getContext should return 400 when company_id is NaN string (direct)', async () => {
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: 'xyz' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getContext should return companies only when company_id is empty string', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
      });
      const { getContext } = require('../../apis/controller/auth.controller');
      // Empty string is falsy, so targetCompanyId should not be set
      const req = { query: { company_id: '' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.companies).toHaveLength(1);
      expect(res.body.data.projects).toHaveLength(0);
    });

    it('getContext should return companies and projects with valid company_id (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([{ id: 10, shortName: 'P1' }]) },
      });
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.companies).toHaveLength(1);
      expect(res.body.data.projects).toHaveLength(1);
    });
  });

  describe('Round 3: getAccessibleProjects direct unit tests', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('getAccessibleProjects should return 400 when company_id is negative (direct)', async () => {
      const { getAccessibleProjects } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '-5' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await getAccessibleProjects(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getAccessibleProjects should return 400 when company_id is zero (direct)', async () => {
      const { getAccessibleProjects } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '0' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await getAccessibleProjects(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getAccessibleProjects should return 400 when company_id is NaN (direct)', async () => {
      const { getAccessibleProjects } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: 'abc' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await getAccessibleProjects(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    it('getAccessibleProjects should return projects with valid company_id (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'P1' }]) },
      });
      const { getAccessibleProjects } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 } };
      const res = mockRes();
      await getAccessibleProjects(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(1);
    });
  });

  describe('Round 3: getAccessibleCompanies direct unit tests', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('getAccessibleCompanies should return companies for sysadmin (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([
          { id: 1, shortName: 'C1' },
          { id: 2, shortName: 'C2' },
        ]) },
      });
      const { getAccessibleCompanies } = require('../../apis/controller/auth.controller');
      const req = { user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getAccessibleCompanies(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data).toHaveLength(2);
    });

    it('getAccessibleCompanies should return 500 when service throws (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockRejectedValue(new Error('DB error')) },
      });
      const { getAccessibleCompanies } = require('../../apis/controller/auth.controller');
      const req = { user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getAccessibleCompanies(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('获取公司列表失败，请稍后重试');
    });
  });

  describe('Round 3: Login direct unit tests (additional)', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('login should return 400 when both username and password are missing (direct)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: {}, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码不能为空');
    });

    it('login should return 400 when username is empty string (direct)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: '', password: 'pass' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码不能为空');
    });

    it('login should return 400 when password is empty string (direct)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: '' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码不能为空');
    });

    it('login should return 400 when both username and password are empty (direct)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: '', password: '' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(400);
      expect(res.body.message).toBe('用户名和密码不能为空');
    });

    it('login should return 401 when user not found (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'nobody', password: 'pass' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('login should return 401 for wrong password (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 1, username: 'admin', passwordHash: hashedPassword, cnName: 'Admin',
          role: 'admin', status: true, companyId: 1, selectedCompany: null, selectedProject: null,
        }) },
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(false as never);
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 'wrong' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('用户名或密码错误');
    });

    it('login should return 200 on success (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1, username: 'sysadmin', passwordHash: hashedPassword, cnName: '系统管理员',
            role: 'sysadmin', status: true, companyId: 1,
            selectedCompany: { id: 1, shortName: 'C1' }, selectedProject: null,
          }),
          update: jest.fn().mockResolvedValue(undefined),
        },
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
      });
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'sysadmin', password: 'pass' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.data.token).toBeDefined();
      expect(res.body.data.user.username).toBe('sysadmin');
    });

    it('login should return 401 on non-Error thrown (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockRejectedValue('string error') },
      });
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 'pass' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(401);
      expect(res.body.message).toBe('用户名或密码错误');
    });
  });

  describe('Round 3: saveSelection direct unit tests (additional)', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('saveSelection should return 403 on PermissionDeniedError (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([]) },
      });
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 999 }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('无权选择该公司');
    });

    it('saveSelection should return 500 on generic error (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
        user: { update: jest.fn().mockRejectedValue(new Error('DB error')) },
      });
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1 }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('保存失败，请稍后重试');
    });

    it('saveSelection should handle float company_id (parseInt truncation)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
        user: { update: jest.fn().mockResolvedValue(undefined) },
      });
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1.9 }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await saveSelection(req, res);
      // parseInt(1.9, 10) = 1, which is > 0, so it passes validation
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================
  // Round 4: Security & injection boundary tests
  // ============================================================
  describe('Round 4: Security & injection boundaries', () => {
    it('login should handle SQL injection in username', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: "admin' OR '1'='1", password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('login should handle SQL injection in password', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: "' OR '1'='1" });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('用户名或密码错误');
    });

    it('login should handle NoSQL injection in username', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: { $gt: '' }, password: 'pass123' });
      expect(response.status).toBe(400);
    });

    it('login should handle XSS payload in username', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: '<script>alert(1)</script>', password: 'pass123' });
      expect(response.status).toBe(401);
    });

    it('login should handle Unicode username', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: '用户名🎉', password: 'pass123' });
      expect(response.status).toBe(401);
    });

    it('login should handle null byte in username', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin\x00evil', password: 'pass123' });
      expect(response.status).toBe(401);
    });

    it('saveSelection should handle SQL injection in company_id via Zod', async () => {
      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: "1; DROP TABLE users--" });
      expect(response.status).toBe(400);
    });

    it('getAccessibleProjects should safely handle SQL injection in company_id (parseInt truncates)', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockResolvedValue([]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: "1 OR 1=1" })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      // parseInt("1 OR 1=1", 10) = 1 → valid, query executes safely (parameterized)
      expect(response.status).toBe(200);
    });

    it('getCompanyDetail should safely handle SQL injection in id param (parseInt truncates)', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(`${COMPANIES}/1;DROP TABLE users`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      // parseInt("1;DROP TABLE users", 10) = 1 → valid, query executes safely (parameterized)
      expect(response.status).toBe(200);
    });

    it('getContext should handle special characters in company_id', async () => {
      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '<script>' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('company_id 必须为正整数');
    });

    it('should reject token tampered payload (different user)', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      // Tamper by modifying a character in the payload section
      const parts = token.split('.');
      const payload = JSON.parse(Buffer.from(parts[1], 'base64url').toString());
      payload.role = 'superadmin';
      parts[1] = Buffer.from(JSON.stringify(payload)).toString('base64url').replace(/=/g, '');
      const tamperedToken = parts.join('.');

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${tamperedToken}`);
      expect(response.status).toBe(401);
    });
  });

  // ============================================================
  // Round 5: Boundary value tests
  // ============================================================
  describe('Round 5: Boundary value tests', () => {
    it('login should accept username at boundary 100 chars', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'a'.repeat(100), password: 'pass123' });
      // Should not be 400 for length — may be 401 for wrong creds
      expect(response.status).not.toBe(400);
      expect([200, 401]).toContain(response.status);
    });

    it('login should reject username at 101 chars', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'a'.repeat(101), password: 'pass123' });
      expect(response.status).toBe(400);
    });

    it('login should accept password at boundary 200 chars', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'p'.repeat(200) });
      expect(response.status).not.toBe(400);
      expect([200, 401]).toContain(response.status);
    });

    it('login should reject password at 201 chars', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'p'.repeat(201) });
      expect(response.status).toBe(400);
    });

    it('saveSelection should accept very large valid company_id', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 999999999, shortName: 'Big Co' }]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 999999999 });
      expect(response.status).toBe(200);
    });

    it('getAccessibleProjects should handle company_id as max safe integer', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockResolvedValue([]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '2147483647' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('getCompanyDetail should handle very large id', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(`${COMPANIES}/999999`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('getContext should return projects as empty when company has no projects', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'C1' }]);
      prisma.project.findMany.mockResolvedValue([]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.companies).toHaveLength(1);
      expect(response.body.data.projects).toHaveLength(0);
    });

    it('getContext should handle company_id at boundary 1 (minimum valid)', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'C1' }]);
      prisma.project.findMany.mockResolvedValue([]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('saveSelection should handle string number company_id via direct call', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const prisma = {
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([]) },
        user: { update: jest.fn().mockResolvedValue(undefined) },
      };
      getPrisma.mockReturnValue(prisma);
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const res = { statusCode: 200, body: {}, status(c: number) { res.statusCode = c; return res; }, json(d: any) { res.body = d; return res; } };
      const req = { body: { company_id: '1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      await saveSelection(req, res);
      // parseInt('1', 10) = 1 → valid
      expect(res.statusCode).toBe(200);
    });
  });

  // ============================================================
  // Round 6: Token lifecycle & concurrent access tests
  // ============================================================
  describe('Round 6: Token lifecycle tests', () => {
    it('should reject expired token on verify', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '0ms' }
      );
      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('登录已过期，请重新登录');
    });

    it('should allow multiple requests with same valid token', async () => {
      const token = sysadminToken(50, 50);
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 50, username: 'test', cnName: 'Test', role: 'sysadmin', companyId: 50,
          selectedCompany: null, selectedProject: null,
        })},
      });

      const responses = await Promise.all([
        agent.get(VERIFY).set('Authorization', `Bearer ${token}`),
        agent.get(VERIFY).set('Authorization', `Bearer ${token}`),
        agent.get(VERIFY).set('Authorization', `Bearer ${token}`),
      ]);
      responses.forEach(r => expect(r.status).toBe(200));
    });

    it('should handle token with missing username field', async () => {
      const incompleteToken = jwt.sign(
        { userId: 1, role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${incompleteToken}`);
      // Middleware may still pass but the verify may work
      expect([200, 401]).toContain(response.status);
    });

    it('should blacklist revoked token and reject subsequent requests', async () => {
      const token = sysadminToken(60, 60);
      // Logout to revoke
      await agent.post(LOGOUT).set('Authorization', `Bearer ${token}`);

      // Second request with same token should fail
      const verifyRes = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${token}`);
      expect(verifyRes.status).toBe(401);

      // Third request should also fail
      const contextRes = await agent
        .get(CONTEXT)
        .set('Authorization', `Bearer ${token}`);
      expect(contextRes.status).toBe(401);
    });

    it('should handle multiple tokens revoked independently', async () => {
      const token1 = sysadminToken(61, 61);
      const token2 = sysadminToken(62, 62);
      const token3 = sysadminToken(63, 63);

      // Revoke token1 and token3
      await agent.post(LOGOUT).set('Authorization', `Bearer ${token1}`);
      await agent.post(LOGOUT).set('Authorization', `Bearer ${token3}`);

      // token2 should still work
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 62, username: 'test2', cnName: 'Test2', role: 'sysadmin', companyId: 62,
          selectedCompany: null, selectedProject: null,
        })},
      });
      const res2 = await agent.get(VERIFY).set('Authorization', `Bearer ${token2}`);
      expect(res2.status).toBe(200);

      // token1 should fail
      const res1 = await agent.get(VERIFY).set('Authorization', `Bearer ${token1}`);
      expect(res1.status).toBe(401);

      // token3 should fail
      const res3 = await agent.get(VERIFY).set('Authorization', `Bearer ${token3}`);
      expect(res3.status).toBe(401);
    });

    it('logout with non-Bearer authorization should not revoke anything', async () => {
      const { logout } = require('../../apis/controller/auth.controller');
      const req = { headers: { authorization: 'Token abc123' }, user: { userId: 1, role: 'sysadmin' }, ip: '127.0.0.1' };
      const res = { statusCode: 200, body: {}, status(c: number) { res.statusCode = c; return res; }, json(d: any) { res.body = d; return res; } };
      await logout(req, res);
      expect(res.statusCode).toBe(200);
      expect(res.body.message).toBe('登出成功');
    });
  });

  // ============================================================
  // Round 7: Role-based access control depth tests
  // ============================================================
  describe('Round 7: RBAC depth tests', () => {
    it('view role should access verify endpoint', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 3, username: 'viewer', cnName: 'Viewer', role: 'view', companyId: 2,
          selectedCompany: { id: 2, shortName: 'C2' }, selectedProject: null,
        })},
      });

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });

    it('view role should access companies endpoint', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('view role should access projects endpoint', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'P4' } },
      ]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('view role should access context endpoint', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'P4' } },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '2' })
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.companies).toHaveLength(1);
      expect(response.body.data.projects).toHaveLength(1);
    });

    it('view role should be denied getCompanyDetail', async () => {
      const response = await agent
        .get(`${COMPANIES}/2`)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('当前角色无权查看公司用户');
    });

    it('view role should access saveSelection', async () => {
      const prisma = mockPrisma();
      prisma.company.findUnique.mockResolvedValue({ id: 2, shortName: 'C2', status: true });
      prisma.projectViewer.findMany.mockResolvedValue([
        { project: { id: 4, shortName: 'P4' } },
      ]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ company_id: 2, project_id: 4 });
      expect(response.status).toBe(200);
    });

    it('admin should be denied getCompanyDetail for different company', async () => {
      const response = await agent
        .get(`${COMPANIES}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权查看其他公司的用户');
    });

    it('admin should access getCompanyDetail for own company', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([
        { id: 2, role: 'admin', cnName: 'Admin', username: 'admin' },
      ]);

      const response = await agent
        .get(`${COMPANIES}/2`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(1);
    });

    it('sysadmin should access getCompanyDetail for any company', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(`${COMPANIES}/555`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });
  });

  // ============================================================
  // Round 8: Response format & data shape validation
  // ============================================================
  describe('Round 8: Response format validation', () => {
    it('login success response should have correct structure', async () => {
      const prisma = mockPrisma();
      const user = {
        id: 1, username: 'sysadmin', passwordHash: hashedPassword,
        cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1,
        selectedCompany: { id: 1, shortName: 'Company A' },
        selectedProject: { id: 1, shortName: 'Project 1' },
      };
      prisma.user.findUnique.mockResolvedValue(user);
      jest.spyOn(bcrypt, 'compare').mockResolvedValue(true as never);
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);
      prisma.project.findMany.mockResolvedValue([{ id: 1, shortName: 'Project 1' }]);
      prisma.user.update.mockResolvedValue(undefined);

      const response = await agent
        .post(LOGIN)
        .send({ username: 'sysadmin', password: 'pass123' });
      expect(response.body).toMatchObject({
        code: 0,
        message: '登录成功',
        data: {
          token: expect.any(String),
          user: expect.objectContaining({
            id: 1,
            username: 'sysadmin',
            role: 'sysadmin',
          }),
        },
      });
    });

    it('logout response should have correct structure', async () => {
      const response = await agent
        .post(LOGOUT)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.body).toMatchObject({
        code: 0,
        message: '登出成功',
        data: null,
      });
    });

    it('verify response should have correct structure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue({
          id: 1, username: 'sysadmin', cnName: '系统管理员', role: 'sysadmin', companyId: 1,
          selectedCompany: { id: 1, shortName: '测试公司' },
          selectedProject: null,
        })},
      });

      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.body).toMatchObject({
        code: 0,
        message: 'token有效',
        data: {
          valid: true,
          user: expect.objectContaining({
            id: 1,
            username: 'sysadmin',
          }),
        },
      });
    });

    it('saveSelection success response should have correct structure', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([{ id: 1, shortName: 'Company A' }]);

      const response = await agent
        .put(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect(response.body).toMatchObject({
        code: 0,
        message: '保存成功',
        data: null,
      });
    });

    it('getCompanies response should have snake_case keys', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);

      const response = await agent
        .get(COMPANIES)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.body.data[0]).toEqual({ id: 1, short_name: 'Company A' });
    });

    it('getProjects response should have snake_case keys', async () => {
      const prisma = mockPrisma();
      prisma.project.findMany.mockResolvedValue([
        { id: 1, shortName: 'Project A' },
      ]);

      const response = await agent
        .get(PROJECTS)
        .query({ company_id: '1' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.body.data[0]).toEqual({ id: 1, short_name: 'Project A' });
    });

    it('getCompanyDetail response should separate operators and viewers', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([
        { id: 1, role: 'sysadmin', cnName: '系统管理员', username: 'sysadmin' },
        { id: 2, role: 'admin', cnName: '管理员A', username: 'admin_a' },
        { id: 3, role: 'admin', cnName: '管理员B', username: 'admin_b' },
        { id: 4, role: 'view', cnName: '查看者1', username: 'viewer_1' },
        { id: 5, role: 'view', cnName: '查看者2', username: 'viewer_2' },
      ]);

      const response = await agent
        .get(`${COMPANIES}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.body.data.operators).toHaveLength(2); // only admin roles (sysadmin excluded)
      expect(response.body.data.viewers).toHaveLength(2);
      expect(response.body.data.operators[0]).toHaveProperty('cn_name');
      expect(response.body.data.operators[0]).toHaveProperty('username');
    });

    it('error responses should have code and message', async () => {
      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'wrong' });
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
      expect(typeof response.body.code).toBe('number');
      expect(typeof response.body.message).toBe('string');
    });
  });

  // ============================================================
  // Round 9: HTTP method & content-type tests
  // ============================================================
  describe('Round 9: HTTP method & content-type tests', () => {
    it('GET /login should return 404 or 405', async () => {
      const response = await agent.get(LOGIN);
      expect([404, 405]).toContain(response.status);
    });

    it('DELETE /login should return 404 or 405', async () => {
      const response = await agent.delete(LOGIN);
      expect([404, 405]).toContain(response.status);
    });

    it('GET /logout should return 404 or 405', async () => {
      const response = await agent.get(LOGOUT);
      expect([404, 405]).toContain(response.status);
    });

    it('GET /selection should return 404 or 405', async () => {
      const response = await agent
        .get(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect([404, 405]).toContain(response.status);
    });

    it('POST /selection should return 404 or 405', async () => {
      const response = await agent
        .post(SELECTION)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1 });
      expect([404, 405]).toContain(response.status);
    });

    it('POST /verify should return 404 or 405', async () => {
      const response = await agent
        .post(VERIFY)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect([404, 405]).toContain(response.status);
    });
  });

  // ============================================================
  // Round 10: Direct controller error path completeness
  // ============================================================
  describe('Round 10: Error path completeness (direct)', () => {
    function mockRes() {
      const res: any = {
        statusCode: 200,
        body: {},
        status(code: number) { res.statusCode = code; return res; },
        json(data: any) { res.body = data; return res; },
      };
      return res;
    }

    it('login should throw on undefined body (direct — unreachable via Express)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: undefined as any, ip: '127.0.0.1' };
      const res = mockRes();
      // Express always provides req.body, but direct call with undefined triggers destructuring error
      await expect(login(req, res)).rejects.toThrow();
    });

    it('login should throw on null body (direct — unreachable via Express)', async () => {
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: null as any, ip: '127.0.0.1' };
      const res = mockRes();
      await expect(login(req, res)).rejects.toThrow();
    });

    it('login should handle LoginSelectionError with custom message (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { LoginSelectionError } = require('../../apis/entity');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockRejectedValue(new LoginSelectionError('自定义错误')) },
      });
      const { login } = require('../../apis/controller/auth.controller');
      const req = { body: { username: 'admin', password: 'pass' }, ip: '127.0.0.1' };
      const res = mockRes();
      await login(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('自定义错误');
    });

    it('saveSelection should handle PermissionDeniedError with custom message (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockResolvedValue([{ id: 99, shortName: 'P99' }]) },
        user: { update: jest.fn().mockRejectedValue(new (require('../../apis/entity')).PermissionDeniedError('自定义禁止')) },
      });
      const { saveSelection } = require('../../apis/controller/auth.controller');
      const req = { body: { company_id: 1, project_id: 99 }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await saveSelection(req, res);
      expect(res.statusCode).toBe(403);
      expect(res.body.message).toBe('自定义禁止');
    });

    it('verify should handle undefined user in getLatestUserState (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findUnique: jest.fn().mockResolvedValue(null) },
      });
      const { verify } = require('../../apis/controller/auth.controller');
      const req = { user: { userId: 999 }, ip: '127.0.0.1' };
      const res = mockRes();
      await verify(req, res);
      // getLatestUserState throws because user not found
      expect(res.statusCode).toBe(401);
    });

    it('getCompanyDetail should log error on service failure (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        user: { findMany: jest.fn().mockRejectedValue(new Error('Connection timeout')) },
      });
      const { getCompanyDetail } = require('../../apis/controller/auth.controller');
      const req = { params: { id: '1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getCompanyDetail(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('获取公司用户失败，请稍后重试');
    });

    it('getContext should handle projects fetch error after companies succeed (direct)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      let callCount = 0;
      getPrisma.mockReturnValue({
        company: { findMany: jest.fn().mockResolvedValue([{ id: 1, shortName: 'C1' }]) },
        project: { findMany: jest.fn().mockRejectedValue(new Error('Project DB error')) },
      });
      const { getContext } = require('../../apis/controller/auth.controller');
      const req = { query: { company_id: '1' }, user: { userId: 1, role: 'sysadmin', companyId: 1 }, ip: '127.0.0.1' };
      const res = mockRes();
      await getContext(req, res);
      expect(res.statusCode).toBe(500);
      expect(res.body.message).toBe('获取上下文失败，请稍后重试');
    });
  });
});

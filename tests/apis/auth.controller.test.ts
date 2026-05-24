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
      expect(response.body.message).toBe('DB connection failed');
    });

    it('should handle login error without message', async () => {
      const prisma = mockPrisma();
      prisma.user.findUnique.mockRejectedValue(new Error());

      const response = await agent
        .post(LOGIN)
        .send({ username: 'admin', password: 'pass123' });
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('登录失败');
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
      const response = await agent
        .get(VERIFY)
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.valid).toBe(true);
    });

    it('should return valid for view token', async () => {
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
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(1);
    });

    it('should return empty lists when no users found', async () => {
      const prisma = mockPrisma();
      prisma.user.findMany.mockResolvedValue([]);

      const response = await agent
        .get(url(2))
        .set('Authorization', `Bearer ${viewToken()}`);
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

    it('should return 403 when view role queries different company', async () => {
      const response = await agent
        .get(url(999))
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权查看其他公司的用户');
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

    it('getContext should return empty projects when company_id is invalid string', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: 'abc' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      // Number('abc') = NaN, which is falsy, so projects = []
      expect(response.body.data.projects).toHaveLength(0);
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
      expect(response.body.message).toBe('登录失败');
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

    it('getContext should return companies without projects when company_id is zero', async () => {
      const prisma = mockPrisma();
      prisma.company.findMany.mockResolvedValue([
        { id: 1, shortName: 'Company A' },
      ]);

      const response = await agent
        .get(CONTEXT)
        .query({ company_id: '0' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      // Number('0') = 0, which is falsy, so projects = []
      expect(response.body.data.projects).toHaveLength(0);
    });

    it('getCompanyDetail should return 403 when view role queries different company', async () => {
      const response = await agent
        .get(`${COMPANIES}/999`)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权查看其他公司的用户');
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
  });
});

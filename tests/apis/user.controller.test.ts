/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken(companyId = 2) {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken() {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

describe('User Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/users', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/users');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken(2)}`);
      expect(response.status).toBe(403);
    });

    it('should return users list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should support search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users?search=admin')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { username: { contains: 'admin', mode: 'insensitive' } },
              { cnName: { contains: 'admin', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should support role filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users?role=admin')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ role: 'admin' }),
        })
      );
    });

    it('should support status filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users?status=true')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: true }),
        })
      );
    });

    it('should support pagination parameters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error());
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取用户列表失败');
    });

    it('should support status=false filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/users?status=false')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        })
      );
    });
  });

  describe('GET /api/users/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/users/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的用户ID');
    });

    it('should return user detail for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.username).toBe('admin1');
    });

    it('should return 404 for non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取用户详情失败');
    });
  });

  describe('POST /api/users', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when role is missing', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'pass', cn_name: 'Test' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when cn_name is missing', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'pass', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名、密码、姓名、角色不能为空');
    });

    it('should return 400 with correct message when required fields missing', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名、密码、姓名、角色不能为空');
    });

    it('should return 400 when role is not in whitelist', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('角色值不合法');
    });

    it('should return 400 when password is less than 8 characters', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'short', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('密码长度不能少于8位');
    });

    it('should create user successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 5, username: 'newuser', cnName: '新用户', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'newuser', password: 'Pass1234', cn_name: '新用户', role: 'admin', company_id: 1 });

      expect(response.status).toBe(201);
      expect(response.body.data.username).toBe('newuser');
    });

    it('should return 409 for duplicate username', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, username: 'existing' });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'existing', password: 'Pass1234', cn_name: '用户', role: 'admin', company_id: 1 });

      expect(response.status).toBe(409);
    });

    it('should return 500 on database error during create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when create error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建用户失败');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/users/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的用户ID');
    });

    it('should update user successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '新名称', company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(200);
      expect(response.body.data.cn_name).toBe('新名称');
    });

    it('should reject role change for sysadmin user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'sysadmin', cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('系统管理员角色不可修改');
    });

    it('should allow updating cn_name for sysadmin user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'sysadmin', cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '新名称', company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });

    it('should update password successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ password: 'newpass123' });

      expect(response.status).toBe(200);
    });

    it('should update status successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, status: false, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
    });

    it('should return 500 with fallback message when update error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新用户失败');
    });
  });

  describe('Admin permission denied (sysadmin-only)', () => {
    it('should return 403 for admin on list users', async () => {
      const response = await agent
        .get('/api/users')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on get user', async () => {
      const response = await agent
        .get('/api/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on create user', async () => {
      const response = await agent
        .post('/api/users')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ username: 'new', password: 'pass', cn_name: '用户', role: 'admin', company_id: 2 });

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on update user', async () => {
      const response = await agent
        .put('/api/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on delete user', async () => {
      const response = await agent
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/users/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的用户ID');
    });

    it('should return 404 for non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should delete user successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'test', role: 'admin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('删除用户成功');
    });

    it('should reject deleting sysadmin user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('系统管理员不可删除');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when delete error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除用户失败');
    });
  });
});

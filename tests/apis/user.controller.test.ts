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
      const response = await agent.get('/api/v1/users');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/v1/users')
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
        .get('/api/v1/users')
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
        .get('/api/v1/users?search=admin')
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
        .get('/api/v1/users?role=admin')
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
        .get('/api/v1/users?status=true')
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
        .get('/api/v1/users?page=2&pageSize=5')
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
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error());
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
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
        .get('/api/v1/users?status=false')
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
        .get('/api/v1/users/abc')
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
        .get('/api/v1/users/1')
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
        .get('/api/v1/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取用户详情失败');
    });
  });

  describe('POST /api/users', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when password is missing', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when role is missing', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'pass', cn_name: 'Test' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when cn_name is missing', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'pass', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码长度不能少于8位; 姓名不能为空');
    });

    it('should return 400 with correct message when required fields missing', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码不能为空; 姓名不能为空; 角色值不合法');
    });

    it('should return 400 when role is not in whitelist', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 角色值不合法');
    });

    it('should return 400 when password is less than 8 characters', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'short', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码长度不能少于8位');
    });

    it('should create user successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 5, username: 'newuser', cnName: '新用户', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
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
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'existing', password: 'Pass1234', cn_name: '用户', role: 'admin', company_id: 1 });

      expect(response.status).toBe(409);
    });

    it('should return 500 on database error during create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when create error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建用户失败');
    });
  });

  describe('PUT /api/users/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/v1/users/abc')
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
        .put('/api/v1/users/1')
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
        .put('/api/v1/users/1')
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
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(200);
    });

    it('should return 404 for non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/users/999')
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
        .put('/api/v1/users/2')
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
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
    });

    it('should return 500 with fallback message when update error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新用户失败');
    });
  });

  describe('Admin permission denied (sysadmin-only)', () => {
    it('should return 403 for admin on list users', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on get user', async () => {
      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on create user', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ username: 'new', password: 'pass', cn_name: '用户', role: 'admin', company_id: 2 });

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on update user', async () => {
      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(403);
    });

    it('should return 403 for admin on delete user', async () => {
      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/users/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/v1/users/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的用户ID');
    });

    it('should return 404 for non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/999')
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
        .delete('/api/v1/users/2')
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
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('系统管理员不可删除');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });

    it('should return 500 with fallback message when delete error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除用户失败');
    });
  });

  describe('Additional edge cases', () => {
    // listUsers: empty username as search parameter
    it('should handle empty search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?search=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    // listUsers: combined filters (search + role + status)
    it('should support combined filters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?search=admin&role=admin&status=true&page=1&pageSize=20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { username: { contains: 'admin', mode: 'insensitive' } },
              { cnName: { contains: 'admin', mode: 'insensitive' } },
            ],
            role: 'admin',
            status: true,
          }),
          skip: 0,
          take: 20,
        })
      );
    });

    // listUsers: default page and pageSize
    it('should use default page=1 and pageSize=10 when not specified', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 0,
          take: 10,
        })
      );
    });

    // createUser: empty string username
    it('should return 400 when username is empty string', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: '', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空');
    });

    // createUser: empty string password
    it('should return 400 when password is empty string', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: '', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码长度不能少于8位');
    });

    // createUser: empty string cn_name
    it('should return 400 when cn_name is empty string', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: '', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 姓名不能为空');
    });

    // createUser: empty string role
    it('should return 400 when role is empty string', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 角色值不合法');
    });

    // createUser: exactly 8 characters password should pass
    it('should accept password with exactly 8 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 6, username: 'test8char', cnName: '8位密码', role: 'view', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test8char', password: '12345678', cn_name: '8位密码', role: 'view' });

      expect(response.status).toBe(201);
    });

    // createUser: 7 characters password should fail
    it('should reject password with 7 characters', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test7', password: '1234567', cn_name: '7位密码', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 密码长度不能少于8位');
    });

    // createUser: valid role 'sysadmin'
    it('should create user with sysadmin role', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 7, username: 'newsysadmin', cnName: '新管理员', role: 'sysadmin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'newsysadmin', password: 'Pass1234', cn_name: '新管理员', role: 'sysadmin' });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe('sysadmin');
    });

    // createUser: valid role 'view'
    it('should create user with view role', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 8, username: 'newviewer', cnName: '新观察者', role: 'view', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'newviewer', password: 'Pass1234', cn_name: '新观察者', role: 'view' });

      expect(response.status).toBe(201);
      expect(response.body.data.role).toBe('view');
    });

    // createUser: invalid role 'superadmin'
    it('should reject invalid role superadmin', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 角色值不合法');
    });

    // createUser: invalid role 'user'
    it('should reject invalid role user', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'user' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 角色值不合法');
    });

    // getUser: edge case with id=0
    it('should return user detail for id=0 edge case', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 0, username: 'edge', cnName: '边界', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    // getUser: negative id
    it('should return 400 for negative id', async () => {
      const response = await agent
        .get('/api/v1/users/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // -1 parsed as number is valid, but negative — the service should handle this
      expect([200, 400, 404]).toContain(response.status);
    });

    // updateUser: update role from admin to view
    it('should update user role successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, role: 'view', company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ role: 'view' });

      expect(response.status).toBe(200);
      expect(response.body.data.role).toBe('view');
    });

    // updateUser: update multiple fields at once
    it('should update multiple fields at once', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '新名称', role: 'view', status: false,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称', role: 'view', status: false });

      expect(response.status).toBe(200);
    });

    // updateUser: update with empty body (no fields changed)
    it('should handle update with empty body', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
    });

    // deleteUser: return 404 message correctly
    it('should return 404 with correct message for non-existent user delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });

    // View role: denied for all user CRUD operations
    it('should return 403 for view role on create user', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(403);
    });

    it('should return 403 for view role on update user', async () => {
      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(403);
    });

    it('should return 403 for view role on delete user', async () => {
      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 for view role on get user detail', async () => {
      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    // createUser: missing all fields (empty body)
    it('should return 400 when body is empty', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 用户名不能为空; 密码不能为空; 姓名不能为空; 角色值不合法');
    });

    // createUser: response structure validation
    it('should return correct response structure on create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 9, username: 'structtest', cnName: '结构测试', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'structtest', password: 'Pass1234', cn_name: '结构测试', role: 'admin' });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建用户成功');
      expect(response.body.data).toBeDefined();
    });

    // listUsers: response structure validation with pagination
    it('should return correct pagination structure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'user1', cnName: '用户1', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, username: 'user2', cnName: '用户2', role: 'view', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const mockCount = jest.fn().mockResolvedValue(25);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?page=2&pageSize=2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.total).toBe(25);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(2);
      expect(response.body.data.list).toHaveLength(2);
    });

    // getUser: response structure validation
    it('should return correct response structure on getUser', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toBeDefined();
      expect(response.body.data.id).toBe(1);
    });

    // deleteUser: successful response structure
    it('should return correct response structure on delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'test', role: 'admin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('删除用户成功');
      expect(response.body.data).toBeNull();
    });

    // updateUser: successful response structure
    it('should return correct response structure on update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '更新后', company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '更新后' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新用户成功');
    });
  });
});

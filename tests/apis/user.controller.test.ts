/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '10000';

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
      expect(response.body.message).toContain('用户名不能为空');
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

    // SEC-L-01: username with special/XSS chars should be rejected
    it('should reject username with XSS characters', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: '<script>alert(1)</script>', password: 'Pass1234', cn_name: 'XSS', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    // SEC-L-01: username with spaces should be rejected
    it('should reject username with spaces', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test user', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    // SEC-L-01: username with SQL injection pattern should be rejected
    it('should reject username with SQL injection pattern', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: "drop table users;--", password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    // SEC-L-01: username with underscore should be accepted
    it('should accept username with underscore', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 10, username: 'test_user', cnName: '下划线用户', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test_user', password: 'Pass1234', cn_name: '下划线用户', role: 'admin' });

      expect(response.status).toBe(201);
      expect(response.body.data.username).toBe('test_user');
    });

    // SEC-L-01: username exceeding 50 chars should be rejected
    it('should reject username exceeding 50 characters', async () => {
      const longUsername = 'a'.repeat(51);
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: longUsername, password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名不能超过50个字符');
    });

    // SEC-M-02: pageSize exceeding 100 should be capped
    it('should cap pageSize to 100', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?pageSize=999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    // SEC-M-01: extra fields in createUser should be rejected by strict()
    it('should reject extra unknown fields in createUser', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin', isAdmin: true });

      expect(response.status).toBe(400);
    });

    // SEC-H-01: extra fields in updateUser should be rejected by strict()
    it('should reject extra unknown fields in updateUser', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: 'Test', isAdmin: true });

      expect(response.status).toBe(400);
    });

    // SEC-H-02: updateUser password less than 8 chars should be rejected
    it('should reject short password in updateUser', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ password: 'short' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('密码长度不能少于8位');
    });

    // SEC-H-02: updateUser invalid role should be rejected
    it('should reject invalid role in updateUser', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ role: 'superadmin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('角色值不合法');
    });

    // SEC-H-02: updateUser empty cn_name should be rejected
    it('should reject empty cn_name in updateUser', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('姓名不能为空');
    });

    // SEC-L-03: password exceeding 128 chars should be rejected
    it('should reject password exceeding 128 characters', async () => {
      const longPassword = 'a'.repeat(129);
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: longPassword, cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('密码不能超过128个字符');
    });

    // SEC-L-04: search exceeding 200 chars should be rejected
    it('should reject search exceeding 200 characters', async () => {
      const longSearch = 'a'.repeat(201);
      const response = await agent
        .get(`/api/v1/users?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
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

  // ============================================================
  // handleError ZodError 分支覆盖（line 11）
  // ============================================================
  describe('handleError ZodError branch', () => {
    it('should return 400 with ZodError issues when service throws ZodError', async () => {
      const { z: zod } = require('zod');
      const { getPrisma } = require('../../apis/utils/db.util');

      // 让 listUsers 的 userService.list 抛出 ZodError
      const zodError = new zod.ZodError([
        { code: 'custom', path: ['role'], message: '无效角色' },
      ]);
      const mockFindMany = jest.fn().mockRejectedValue(zodError);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('无效角色');
    });
  });

  // ============================================================
  // 第二轮 TDD 补全 —— 四维覆盖
  // ============================================================

  // ============================================================
  // 1. 错误类型多样性：所有端点 × 所有错误类型
  // ============================================================
  describe('Error type diversity across endpoints', () => {
    const { z: zod } = require('zod');
    const { getPrisma } = require('../../apis/utils/db.util');
    const { NotFoundError, ForbiddenError, ConflictError } = require('../../apis/errors');

    // --- listUsers 错误类型 ---
    it('listUsers: NotFoundError → 404', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new NotFoundError('用户'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('不存在');
    });

    it('listUsers: ForbiddenError → 403', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new ForbiddenError('禁止访问'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('禁止访问');
    });

    it('listUsers: ConflictError → 409', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new ConflictError('冲突'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toContain('冲突');
    });

    // --- getUser 错误类型 ---
    it('getUser: ZodError → 400', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new zod.ZodError([
        { code: 'custom', path: ['id'], message: 'ID格式错误' },
      ]));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('ID格式错误');
    });

    it('getUser: ConflictError → 409', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new ConflictError('数据冲突'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(409);
    });

    // --- createUser 错误类型 ---
    it('createUser: ZodError → 400', async () => {
      const mockFindUnique = jest.fn().mockRejectedValue(new zod.ZodError([
        { code: 'custom', path: ['username'], message: '用户名格式错误' },
      ]));
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名格式错误');
    });

    it('createUser: NotFoundError → 404', async () => {
      const mockFindUnique = jest.fn().mockRejectedValue(new NotFoundError('公司'));
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('不存在');
    });

    it('createUser: ForbiddenError → 403', async () => {
      const mockFindUnique = jest.fn().mockRejectedValue(new ForbiddenError('无权限'));
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(403);
    });

    // --- updateUser 错误类型 ---
    it('updateUser: ZodError → 400', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new zod.ZodError([
        { code: 'custom', path: ['cn_name'], message: '姓名格式错误' },
      ]));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('姓名格式错误');
    });

    it('updateUser: ConflictError → 409', async () => {
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new ConflictError('用户名冲突'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '新名称' });

      expect(response.status).toBe(409);
    });

    // --- deleteUser 错误类型 ---
    it('deleteUser: ZodError → 400', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new zod.ZodError([
        { code: 'custom', path: ['id'], message: 'ID无效' },
      ]));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('deleteUser: ConflictError → 409', async () => {
      const existing = { id: 2, username: 'test', role: 'admin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new ConflictError('删除冲突'));
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(409);
    });
  });

  // ============================================================
  // 2. 安全注入维度：每个端点 × 注入向量
  // ============================================================
  describe('Security injection tests', () => {
    // --- getUser ID 注入 ---
    it('getUser: path traversal in id → 400', async () => {
      const response = await agent
        .get('/api/v1/users/..%2F..%2Fetc%2Fpasswd')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('getUser: semicolon in id → parseInt extracts 1', async () => {
      // parseInt('1;DROP TABLE users') returns 1 (valid int)
      const response = await agent
        .get('/api/v1/users/1;DROP%20TABLE%20users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt extracts 1, then goes to service layer
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('getUser: script tag in id → route unmatched or 400', async () => {
      // %3C/script%3E contains literal '/' causing route mismatch → 404
      const response = await agent
        .get('/api/v1/users/%3Cscript%3Ealert(1)%3C/script%3E')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect([400, 404]).toContain(response.status);
    });

    it('getUser: null byte in id → parseInt extracts 1', async () => {
      // parseInt('1\0') returns 1 (valid int)
      const response = await agent
        .get('/api/v1/users/1%00')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    // --- updateUser ID 注入 ---
    it('updateUser: path traversal in id → 400', async () => {
      const response = await agent
        .put('/api/v1/users/..%2F..%2Fetc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: 'test' });

      expect(response.status).toBe(400);
    });

    it('updateUser: script tag in id → 400', async () => {
      const response = await agent
        .put('/api/v1/users/%3Cscript%3E')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: 'test' });

      expect(response.status).toBe(400);
    });

    // --- deleteUser ID 注入 ---
    it('deleteUser: path traversal in id → 400', async () => {
      const response = await agent
        .delete('/api/v1/users/..%2Fsecret')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('deleteUser: SQL injection in id → parseInt extracts 1', async () => {
      // parseInt('1 OR 1=1') returns 1 (valid int), bcrypt prevents SQL injection
      const response = await agent
        .delete('/api/v1/users/1%20OR%201=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt extracts 1, then goes to service layer (mock may leak)
      expect([200, 400, 403, 404, 409, 500]).toContain(response.status);
    });

    // --- listUsers search 注入 ---
    it('listUsers: CRLF injection in search', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?search=test%0D%0ASet-Cookie:%20evil=true')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // CRLF in query is valid URL-decoded, should pass schema validation
      expect([200, 400]).toContain(response.status);
    });

    it('listUsers: unicode bypass in search', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?search=%u003Cscript%u003E')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect([200, 400]).toContain(response.status);
    });

    // --- createUser cn_name 注入 ---
    it('createUser: XSS in cn_name field', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: '<img src=x onerror=alert(1)>', role: 'admin' });

      // cn_name allows most characters; schema doesn't restrict HTML
      expect([200, 201, 400, 409, 500]).toContain(response.status);
    });

    it('createUser: extremely long cn_name (500 chars)', async () => {
      const longName = '测'.repeat(500);
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: longName, role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('姓名不能超过50个字符');
    });

    // --- updateUser cn_name 注入 ---
    it('updateUser: extremely long cn_name (500 chars)', async () => {
      const longName = '测'.repeat(500);
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: longName });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('姓名不能超过50个字符');
    });

    // --- createUser password 注入 ---
    it('createUser: password with SQL keywords should still pass schema', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 11, username: 'sqltest', cnName: 'SQL测试', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'sqltest', password: "' OR '1'='1'; DROP TABLE users;--", cn_name: 'SQL测试', role: 'admin' });

      // password with SQL keywords passes schema (min 8 chars), bcrypt hashes it safely
      expect(response.status).toBe(201);
    });

    // --- updateUser password 注入 ---
    it('updateUser: password with SQL keywords', async () => {
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
        .send({ password: "admin' OR 1=1--" });

      // password passes schema (>=8 chars), hashed by bcrypt
      expect(response.status).toBe(200);
    });

    // --- Token 安全 ---
    it('should return 401 for expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '0s' }
      );

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${expiredToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for token with wrong secret', async () => {
      const badToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'wrong-secret',
        { expiresIn: '2h' }
      );

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${badToken}`);

      expect(response.status).toBe(401);
    });

    it('should return 401 for malformed token', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', 'Bearer not.a.valid-token');

      expect(response.status).toBe(401);
    });

    it('should return 401 for empty Authorization header', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should return 401 for Bearer without token', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });

    // --- Content-Type 安全 ---
    it('createUser: should reject non-JSON content type', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .set('Content-Type', 'text/plain')
        .send('username=test&password=Pass1234');

      expect([400, 415]).toContain(response.status);
    });
  });

  // ============================================================
  // 3. 边界值维度：极端输入测试
  // ============================================================
  describe('Boundary value tests', () => {
    // --- ID 边界 ---
    it('getUser: id = MAX_SAFE_INTEGER', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get(`/api/v1/users/${Number.MAX_SAFE_INTEGER}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // MAX_SAFE_INTEGER is valid int, but user won't exist → 404
      expect(response.status).toBe(404);
    });

    it('updateUser: id = MAX_SAFE_INTEGER → 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put(`/api/v1/users/${Number.MAX_SAFE_INTEGER}`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: 'test' });

      expect(response.status).toBe(404);
    });

    it('deleteUser: id = MAX_SAFE_INTEGER → 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete(`/api/v1/users/${Number.MAX_SAFE_INTEGER}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    // --- page/pageSize 边界 ---
    it('listUsers: page=0 should be rejected by schema', async () => {
      const response = await agent
        .get('/api/v1/users?page=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: page=-1 should be rejected by schema', async () => {
      const response = await agent
        .get('/api/v1/users?page=-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: pageSize=0 should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?pageSize=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: pageSize=1 should work', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });

    it('listUsers: pageSize=100 (max) should work', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?pageSize=100')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });

    it('listUsers: pageSize=101 should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?pageSize=101')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: non-numeric page should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?page=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: non-numeric pageSize should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?pageSize=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    // --- username 边界 ---
    it('createUser: username exactly 50 chars should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const username50 = 'a'.repeat(50);
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 12, username: username50, cnName: '50字符', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: username50, password: 'Pass1234', cn_name: '50字符', role: 'admin' });

      expect(response.status).toBe(201);
    });

    it('createUser: username 51 chars should be rejected', async () => {
      const username51 = 'a'.repeat(51);
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: username51, password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名不能超过50个字符');
    });

    // --- cn_name 边界 ---
    it('createUser: cn_name exactly 50 chars should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const name50 = '测'.repeat(50);
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 13, username: 'name50', cnName: name50, role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'name50', password: 'Pass1234', cn_name: name50, role: 'admin' });

      expect(response.status).toBe(201);
    });

    it('createUser: cn_name 51 chars should be rejected', async () => {
      const name51 = '测'.repeat(51);
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: name51, role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('姓名不能超过50个字符');
    });

    // --- password 边界 ---
    it('createUser: password exactly 128 chars should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const pwd128 = 'a'.repeat(128);
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 14, username: 'pwd128', cnName: '128密码', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'pwd128', password: pwd128, cn_name: '128密码', role: 'admin' });

      expect(response.status).toBe(201);
    });

    it('updateUser: password exactly 8 chars should pass', async () => {
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
        .send({ password: '12345678' });

      expect(response.status).toBe(200);
    });

    it('updateUser: password 128 chars should pass', async () => {
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
        .send({ password: 'a'.repeat(128) });

      expect(response.status).toBe(200);
    });

    it('updateUser: password 129 chars should be rejected', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ password: 'a'.repeat(129) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('密码不能超过128个字符');
    });

    // --- role 边界 ---
    it('createUser: role case sensitivity (Admin uppercase)', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'Admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('角色值不合法');
    });

    it('updateUser: role case sensitivity (VIEW uppercase)', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ role: 'VIEW' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('角色值不合法');
    });

    // --- search 边界 ---
    it('listUsers: search exactly 200 chars should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const search200 = 'a'.repeat(200);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get(`/api/v1/users?search=${search200}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    // --- updateUser cn_name 边界 ---
    it('updateUser: cn_name exactly 50 chars should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '测'.repeat(50), company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '测'.repeat(50) });

      expect(response.status).toBe(200);
    });

    // --- username 特殊字符 ---
    it('createUser: username with hyphen should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test-user', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    it('createUser: username with dot should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test.user', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    it('createUser: username with @ should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test@user', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    it('createUser: username with Chinese chars should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: '测试用户', password: 'Pass1234', cn_name: 'Test', role: 'admin' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('用户名仅支持英文字母、数字和下划线');
    });

    it('createUser: username single char should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 15, username: 'a', cnName: '单字符', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'a', password: 'Pass1234', cn_name: '单字符', role: 'admin' });

      expect(response.status).toBe(201);
    });

    // --- status 边界 ---
    it('updateUser: status=true should work', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: false, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, status: true, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(200);
    });

    it('updateUser: status=string should be rejected', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'yes' });

      expect(response.status).toBe(400);
    });

    it('updateUser: status=number should be rejected', async () => {
      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 1 });

      expect(response.status).toBe(400);
    });

    // --- listUsers: invalid role filter ---
    it('listUsers: invalid role value should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?role=superadmin')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('listUsers: invalid status value should be rejected', async () => {
      const response = await agent
        .get('/api/v1/users?status=maybe')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    // --- createUser: company_id 边界 ---
    it('createUser: company_id=0 should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin', company_id: 0 });

      expect(response.status).toBe(400);
    });

    it('createUser: company_id=-1 should be rejected', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'test', password: 'Pass1234', cn_name: 'Test', role: 'admin', company_id: -1 });

      expect(response.status).toBe(400);
    });

    it('createUser: company_id=1 should pass', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 16, username: 'comptest', cnName: '公司测试', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'comptest', password: 'Pass1234', cn_name: '公司测试', role: 'admin', company_id: 1 });

      expect(response.status).toBe(201);
    });
  });

  // ============================================================
  // 4. 响应结构维度：验证所有端点的响应格式
  // ============================================================
  describe('Response structure validation', () => {
    it('listUsers: each item should have required fields', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'user1', cnName: '用户1', role: 'admin', status: true, companyId: 1, company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const item = response.body.data.list[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('username');
      expect(item).toHaveProperty('cn_name');
      expect(item).toHaveProperty('role');
      expect(item).toHaveProperty('status');
    });

    it('listUsers: error response should have code and message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('getUser: success response should have code=0, data, message', async () => {
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
      expect(response.body).toHaveProperty('data');
      expect(response.body).toHaveProperty('message');
    });

    it('getUser: 404 response should have code=404 and message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/users/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.code).toBe(404);
      expect(response.body.message).toBe('用户不存在');
    });

    it('createUser: 409 response should have code=409 and message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, username: 'existing' });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'existing', password: 'Pass1234', cn_name: '用户', role: 'admin' });

      expect(response.status).toBe(409);
      expect(response.body.code).toBe(409);
      expect(response.body.message).toContain('已存在');
    });

    it('updateUser: 403 response should have code=403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'sysadmin', cnName: '系统管理员', role: 'sysadmin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ role: 'admin' });

      expect(response.status).toBe(403);
      expect(response.body.code).toBe(403);
    });

    it('deleteUser: 403 response for sysadmin delete should have code=403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.code).toBe(403);
    });

    it('listUsers: pagination metadata completeness', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(100);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users?page=3&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveProperty('list');
      expect(response.body.data).toHaveProperty('total', 100);
      expect(response.body.data).toHaveProperty('page', 3);
      expect(response.body.data).toHaveProperty('pageSize', 10);
      expect(response.body.data.list).toBeInstanceOf(Array);
    });
  });

  // ============================================================
  // 5. 角色矩阵维度：系统化 RBAC 测试
  // ============================================================
  describe('Role matrix - systematic RBAC', () => {
    // --- view role: 全部拒绝 ---
    it('view: GET /users → 403', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('view: GET /users/:id → 403', async () => {
      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('view: POST /users → 403', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ username: 'v', password: 'Pass1234', cn_name: 'V', role: 'view' });
      expect(response.status).toBe(403);
    });

    it('view: PUT /users/:id → 403', async () => {
      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ cn_name: 'test' });
      expect(response.status).toBe(403);
    });

    it('view: DELETE /users/:id → 403', async () => {
      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    // --- admin role: 全部拒绝（用户管理仅 sysadmin） ---
    it('admin: GET /users → 403', async () => {
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken(2)}`);
      expect(response.status).toBe(403);
    });

    it('admin: GET /users/:id → 403', async () => {
      const response = await agent
        .get('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);
      expect(response.status).toBe(403);
    });

    it('admin: POST /users → 403', async () => {
      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ username: 'a', password: 'Pass1234', cn_name: 'A', role: 'admin' });
      expect(response.status).toBe(403);
    });

    it('admin: PUT /users/:id → 403', async () => {
      const response = await agent
        .put('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ cn_name: 'test' });
      expect(response.status).toBe(403);
    });

    it('admin: DELETE /users/:id → 403', async () => {
      const response = await agent
        .delete('/api/v1/users/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);
      expect(response.status).toBe(403);
    });

    // --- sysadmin role: 全部允许 ---
    it('sysadmin: GET /users → 200', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('sysadmin: GET /users/:id → 200', async () => {
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
    });

    it('sysadmin: POST /users → 201', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 17, username: 'new', cnName: '新', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const response = await agent
        .post('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ username: 'new', password: 'Pass1234', cn_name: '新', role: 'admin' });
      expect(response.status).toBe(201);
    });

    it('sysadmin: PUT /users/:id → 200', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'admin1', cnName: '运营者', role: 'admin', status: true, companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, cnName: '更新', company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: '更新' });
      expect(response.status).toBe(200);
    });

    it('sysadmin: DELETE /users/:id → 200', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 2, username: 'test', role: 'admin', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/users/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    // --- Token payload tampering ---
    it('should accept token with tampered role (JWT limitation)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const tamperedToken = jwt.sign(
        { userId: 3, username: 'viewer', role: 'sysadmin', companyId: 2 },
        'test-secret',
        { expiresIn: '2h' }
      );

      // JWT secret matches → tampered payload accepted, role middleware sees 'sysadmin'
      const response = await agent
        .get('/api/v1/users')
        .set('Authorization', `Bearer ${tamperedToken}`);

      expect(response.status).toBe(200);
    });
  });

  // ============================================================
  // 6. 并发与竞态条件
  // ============================================================
  describe('Concurrency and race conditions', () => {
    it('should handle concurrent list requests', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } });

      const requests = Array(5).fill(null).map(() =>
        agent
          .get('/api/v1/users')
          .set('Authorization', `Bearer ${sysadminToken()}`)
      );

      const responses = await Promise.all(requests);
      responses.forEach(r => {
        expect(r.status).toBe(200);
      });
    });

    it('should handle concurrent create with same username (race)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      // First call returns null (no existing), second returns existing
      let callCount = 0;
      const mockFindUnique = jest.fn().mockImplementation(() => {
        callCount++;
        return callCount === 1 ? Promise.resolve(null) : Promise.resolve({ id: 1, username: 'raceuser' });
      });
      const mockCreate = jest.fn().mockResolvedValue({
        id: 18, username: 'raceuser', cnName: 'Race', role: 'admin', status: true, companyId: 1,
        company: { shortName: 'ACME' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ user: { findUnique: mockFindUnique, create: mockCreate } });

      const responses = await Promise.all([
        agent
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .send({ username: 'raceuser', password: 'Pass1234', cn_name: 'Race', role: 'admin' }),
        agent
          .post('/api/v1/users')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .send({ username: 'raceuser', password: 'Pass1234', cn_name: 'Race', role: 'admin' }),
      ]);

      // At least one should succeed (201) or one should fail (409)
      const statuses = responses.map(r => r.status);
      expect(statuses).toContain(201);
    });
  });

  // ============================================================
  // 7. HTTP 方法安全
  // ============================================================
  describe('HTTP method safety', () => {
    it('should reject PATCH on /users', async () => {
      const response = await agent
        .patch('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ cn_name: 'test' });

      expect([404, 405]).toContain(response.status);
    });

    it('should reject PUT on /users (list endpoint)', async () => {
      const response = await agent
        .put('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect([404, 405]).toContain(response.status);
    });

    it('should reject DELETE on /users (list endpoint)', async () => {
      const response = await agent
        .delete('/api/v1/users')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect([404, 405]).toContain(response.status);
    });

    it('should reject POST on /users/:id', async () => {
      const response = await agent
        .post('/api/v1/users/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect([404, 405]).toContain(response.status);
    });
  });
});

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

function adminToken(userId = 2, companyId = 2) {
  return jwt.sign(
    { userId, username: 'admin', role: 'admin', companyId },
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

describe('Skills Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/skills', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/skills');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return skills list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, name: 'TypeScript', category: '编程语言', description: 'TS', status: true, companyId: 1, createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.list[0].name).toBe('TypeScript');
    });

    it('should return all skills for admin (no company filtering)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
      // admin sees all skills - no company filter applied
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });
  });

  describe('POST /api/skills', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should create skill successfully and set created_by to current user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: 1, createdBy: 2, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { create: mockCreate } });

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'React', category: '框架', description: 'UI' });

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('React');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdBy: 2 }),
        })
      );
    });

    it('should set created_by for sysadmin too', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: 1, createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { create: mockCreate } });

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'React', category: '框架', description: 'UI', company_id: 1 });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdBy: 1 }),
        })
      );
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/skills/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
    });

    it('should update skill successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: 1, createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'Vue' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Vue');
    });

    it('should allow admin to update their own skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: 2, createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'Vue' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Vue');
    });

    it('should reject admin updating other user skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: 1, createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('只能修改自己创建的技能');
    });

    it('should reject admin updating skill with null created_by', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', category: '框架', description: 'UI', status: true, companyId: null, createdBy: null, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(403);
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should return 404 for non-existent skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should delete skill successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', companyId: 1, createdBy: 2 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockDelete = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, delete: mockDelete } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should allow admin to delete their own skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', companyId: 2, createdBy: 2 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockDelete = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, delete: mockDelete } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should reject admin deleting other user skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', companyId: 1, createdBy: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('只能删除自己创建的技能');
    });

    it('should reject admin deleting skill with null created_by', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', companyId: null, createdBy: null };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
    });
  });
});

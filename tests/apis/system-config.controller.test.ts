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

function adminToken() {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId: 2 },
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

describe('System Config Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/system-configs', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/system-configs');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/system-configs')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/system-configs')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return configs list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, configKey: 'yishangshu_username', configValue: 'test_user', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, configKey: 'yishangshu_password', configValue: 'test_pass', createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].config_key).toBe('yishangshu_username');
    });

    it('should return empty list when no configs', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/system-configs', () => {
    it('should return 400 when configs is empty array', async () => {
      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when configs is not an array', async () => {
      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: 'not-array' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when config_key is missing', async () => {
      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [{ config_value: 'test' }] });

      expect(response.status).toBe(400);
    });

    it('should return 400 when config_value is undefined', async () => {
      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [{ config_key: 'test_key' }] });

      expect(response.status).toBe(400);
    });

    it('should return 400 when configs field is missing', async () => {
      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should batch update configs successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const result1 = { id: 1, configKey: 'yishangshu_username', configValue: 'new_user', createdAt: new Date(), updatedAt: new Date() };
      const result2 = { id: 2, configKey: 'yishangshu_password', configValue: 'new_pass', createdAt: new Date(), updatedAt: new Date() };
      const mockTransaction = jest.fn().mockResolvedValue([result1, result2]);
      getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });

      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'new_user' },
            { config_key: 'yishangshu_password', config_value: 'new_pass' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toContain('成功');
      expect(response.body.data).toHaveLength(2);
    });

    it('should update single config successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const result = { id: 1, configKey: 'single_key', configValue: 'single_value', createdAt: new Date(), updatedAt: new Date() };
      const mockTransaction = jest.fn().mockResolvedValue([result]);
      getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });

      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'single_key', config_value: 'single_value' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].config_key).toBe('single_key');
    });

    it('should allow config_value to be empty string', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const result = { id: 1, configKey: 'test_key', configValue: '', createdAt: new Date(), updatedAt: new Date() };
      const mockTransaction = jest.fn().mockResolvedValue([result]);
      getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });

      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'test_key', config_value: '' },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockTransaction = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });

      const response = await agent
        .put('/api/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'test_key', config_value: 'test_value' },
          ],
        });

      expect(response.status).toBe(500);
    });
  });
});

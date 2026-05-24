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

function mockPrismaForGet(result: any) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const mockFindMany = jest.fn().mockResolvedValue(result);
  getPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } });
  return mockFindMany;
}

function mockPrismaForGetError(error: any) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const mockFindMany = jest.fn().mockRejectedValue(error);
  getPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } });
  return mockFindMany;
}

function mockPrismaForUpdate(result: any) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const mockTransaction = jest.fn().mockResolvedValue(result);
  getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });
  return mockTransaction;
}

function mockPrismaForUpdateError(error: any) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const mockTransaction = jest.fn().mockRejectedValue(error);
  getPrisma.mockReturnValue({ systemConfig: { upsert: jest.fn() }, $transaction: mockTransaction });
  return mockTransaction;
}

describe('System Config Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/system-configs', () => {
    it('应返回401当无token时', async () => {
      const response = await agent.get('/api/v1/system-configs');
      expect(response.status).toBe(401);
    });

    it('应返回403当角色为admin时', async () => {
      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('应返回403当角色为view时', async () => {
      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('应返回配置列表当角色为sysadmin时', async () => {
      mockPrismaForGet([
        { id: 1, configKey: 'yishangshu_username', configValue: 'test_user', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, configKey: 'yishangshu_password', configValue: 'test_pass', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].config_key).toBe('yishangshu_username');
    });

    it('应返回空列表当无配置时', async () => {
      mockPrismaForGet([]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('应返回500当数据库错误时', async () => {
      mockPrismaForGetError(new Error('DB error'));

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取系统配置失败');
    });

    it('应返回兜底错误消息当异常无message时', async () => {
      mockPrismaForGetError('string error');

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取系统配置失败');
    });

    it('应返回完整字段格式的配置数据', async () => {
      const now = new Date();
      mockPrismaForGet([
        { id: 1, configKey: 'key1', configValue: 'val1', createdAt: now, updatedAt: now },
      ]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const item = response.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('config_key');
      expect(item).toHaveProperty('config_value');
      expect(item).toHaveProperty('created_at');
      expect(item).toHaveProperty('updated_at');
    });

    it('应脱敏返回yishangshu_password的值', async () => {
      mockPrismaForGet([
        { id: 1, configKey: 'yishangshu_username', configValue: 'test_user', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, configKey: 'yishangshu_password', configValue: 'my_secret_password', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      // username 不脱敏
      expect(response.body.data[0].config_value).toBe('test_user');
      // password 脱敏：前2位 + ****
      expect(response.body.data[1].config_value).toBe('my****');
    });

    it('应脱敏处理短密码值', async () => {
      mockPrismaForGet([
        { id: 1, configKey: 'yishangshu_password', configValue: 'ab', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // 短于等于2位的密码不脱敏
      expect(response.body.data[0].config_value).toBe('ab');
    });

    it('应正确脱敏长度为3的密码值', async () => {
      mockPrismaForGet([
        { id: 1, configKey: 'yishangshu_password', configValue: 'abc', createdAt: new Date(), updatedAt: new Date() },
      ]);

      const response = await agent
        .get('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // 长度 > 2，脱敏为前2位 + ****
      expect(response.body.data[0].config_value).toBe('ab****');
    });
  });

  describe('PUT /api/system-configs', () => {
    it('应返回401当无token时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .send({ configs: [{ config_key: 'k', config_value: 'v' }] });

      expect(response.status).toBe(401);
    });

    it('应返回403当角色为admin时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ configs: [{ config_key: 'k', config_value: 'v' }] });

      expect(response.status).toBe(403);
    });

    it('应返回403当角色为view时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ configs: [{ config_key: 'k', config_value: 'v' }] });

      expect(response.status).toBe(403);
    });

    it('应返回400当configs为空数组时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('应返回400当configs不是数组时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: 'not-array' });

      expect(response.status).toBe(400);
    });

    it('应返回400当configs字段缺失时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('应返回400当config_key缺失时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [{ config_value: 'test' }] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_key');
    });

    it('应返回400当config_key不在白名单中时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [{ config_key: 'unknown_key', config_value: 'test' }] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不允许修改的配置项');  // DEV-P2: 不泄露具体 key 名称
    });

    it('应返回400当config_value为undefined时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ configs: [{ config_key: 'yishangshu_username' }] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_value');
    });

    it('应返回400当多条配置中第二条缺少config_key时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'valid_val' },
            { config_value: 'missing_key_val' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_key');
    });

    it('应返回400当多条配置中第二条缺少config_value时', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'valid_val' },
            { config_key: 'yishangshu_password' },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_value');
    });

    it('应成功批量更新配置', async () => {
      const result1 = { id: 1, configKey: 'yishangshu_username', configValue: 'new_user', createdAt: new Date(), updatedAt: new Date() };
      const result2 = { id: 2, configKey: 'yishangshu_password', configValue: 'new_pass', createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result1, result2]);

      const response = await agent
        .put('/api/v1/system-configs')
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

    it('应成功更新单条配置', async () => {
      const result = { id: 1, configKey: 'yishangshu_username', configValue: 'single_value', createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'single_value' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].config_key).toBe('yishangshu_username');
    });

    it('应允许config_value为空字符串', async () => {
      const result = { id: 1, configKey: 'yishangshu_username', configValue: '', createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: '' },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].config_value).toBe('');
    });

    it('应允许config_value为null', async () => {
      const result = { id: 1, configKey: 'yishangshu_username', configValue: null, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: null },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('应允许config_value为0', async () => {
      const result = { id: 1, configKey: 'yishangshu_username', configValue: 0, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 0 },
          ],
        });

      expect(response.status).toBe(200);
      expect(response.body.data[0].config_value).toBe(0);
    });

    it('应允许config_value为false', async () => {
      const result = { id: 1, configKey: 'yishangshu_username', configValue: false, createdAt: new Date(), updatedAt: new Date() };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: false },
          ],
        });

      expect(response.status).toBe(200);
    });

    it('应返回更新后配置的完整字段格式', async () => {
      const now = new Date();
      const result = { id: 1, configKey: 'yishangshu_username', configValue: 'val1', createdAt: now, updatedAt: now };
      mockPrismaForUpdate([result]);

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [{ config_key: 'yishangshu_username', config_value: 'val1' }],
        });

      expect(response.status).toBe(200);
      const item = response.body.data[0];
      expect(item).toHaveProperty('id');
      expect(item).toHaveProperty('config_key');
      expect(item).toHaveProperty('config_value');
      expect(item).toHaveProperty('created_at');
      expect(item).toHaveProperty('updated_at');
    });

    it('应返回500当数据库错误时', async () => {
      mockPrismaForUpdateError(new Error('DB error'));

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'test_value' },
          ],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新系统配置失败');
    });

    it('应返回兜底错误消息当更新异常无message时', async () => {
      mockPrismaForUpdateError('string error');

      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 'test_value' },
          ],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新系统配置失败');
    });
  });
});

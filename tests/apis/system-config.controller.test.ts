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
      expect(response.body.message).toContain('不允许修改');
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
      expect(response.body.message).toContain('不允许修改');
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
      // PUT 响应也需脱敏 password
      expect(response.body.data[0].config_value).toBe('new_user');
      expect(response.body.data[1].config_value).toBe('ne****');
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

    it('应拒绝config_value为null(非字符串)', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: null },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_value');
    });

    it('应拒绝config_value为0(非字符串)', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: 0 },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_value');
    });

    it('应拒绝config_value为false(非字符串)', async () => {
      const response = await agent
        .put('/api/v1/system-configs')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          configs: [
            { config_key: 'yishangshu_username', config_value: false },
          ],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('config_value');
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

  describe('Controller 直接调用 — 防御性校验覆盖', () => {
    // schema 中间件已拦截大部分校验，以下用例直接调用 controller 函数覆盖防御性分支

    let mockRes: any;
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;

    beforeEach(() => {
      mockJson = jest.fn().mockReturnThis();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { json: mockJson, status: mockStatus };
    });

    describe('updateSystemConfigs — configs 校验', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateSystemConfigs } = require('../../apis/controller/system-config.controller');

      it('应返回400当configs不是数组时（直接调用）', async () => {
        const req = { body: { configs: 'not-array' } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不能为空') })
        );
      });

      it('应返回400当configs为空数组时（直接调用）', async () => {
        const req = { body: { configs: [] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不能为空') })
        );
      });

      it('应返回400当config_key缺失时（直接调用）', async () => {
        const req = { body: { configs: [{ config_value: 'test' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不能为空') })
        );
      });

      it('应返回400当config_value为undefined时（直接调用）', async () => {
        const req = { body: { configs: [{ config_key: 'yishangshu_username' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不能为空') })
        );
      });

      it('应返回400当config_key不在白名单中时（直接调用）', async () => {
        const req = { body: { configs: [{ config_key: 'unknown_key', config_value: 'test' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不允许修改的配置项') })
        );
      });
    });

    describe('getSystemConfigs — 直接调用', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getSystemConfigs } = require('../../apis/controller/system-config.controller');

      it('应返回500当getAll抛出异常时（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        getPrisma.mockReturnValue({
          systemConfig: { findMany: jest.fn().mockRejectedValue(new Error('DB error')) },
        });

        const req = {} as any;
        await getSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: '获取系统配置失败' })
        );
      });

      it('应返回200并脱敏敏感配置（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        getPrisma.mockReturnValue({
          systemConfig: {
            findMany: jest.fn().mockResolvedValue([
              { id: 1, configKey: 'yishangshu_username', configValue: 'user1', createdAt: new Date(), updatedAt: new Date() },
              { id: 2, configKey: 'yishangshu_password', configValue: 'secret_pass', createdAt: new Date(), updatedAt: new Date() },
            ]),
          },
        });

        const req = {} as any;
        await getSystemConfigs(req, mockRes);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 0,
            data: expect.arrayContaining([
              expect.objectContaining({ config_key: 'yishangshu_username', config_value: 'user1' }),
              expect.objectContaining({ config_key: 'yishangshu_password', config_value: 'se****' }),
            ]),
          })
        );
      });

      it('应返回200和空数组（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        getPrisma.mockReturnValue({
          systemConfig: { findMany: jest.fn().mockResolvedValue([]) },
        });

        const req = {} as any;
        await getSystemConfigs(req, mockRes);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ code: 0, data: [] })
        );
      });
    });

    describe('updateSystemConfigs — 成功路径（直接调用）', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateSystemConfigs } = require('../../apis/controller/system-config.controller');

      it('应返回200当合法更新时（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        const mockResult = { id: 1, configKey: 'yishangshu_username', configValue: 'new_user', createdAt: new Date(), updatedAt: new Date() };
        const mockTransaction = jest.fn().mockResolvedValue([mockResult]);
        getPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        });

        const req = { body: { configs: [{ config_key: 'yishangshu_username', config_value: 'new_user' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 0,
            data: expect.arrayContaining([
              expect.objectContaining({ config_key: 'yishangshu_username' }),
            ]),
          })
        );
      });

      it('应允许 config_value 为空字符串（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        const mockResult = { id: 1, configKey: 'yishangshu_username', configValue: '', createdAt: new Date(), updatedAt: new Date() };
        const mockTransaction = jest.fn().mockResolvedValue([mockResult]);
        getPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        });

        const req = { body: { configs: [{ config_key: 'yishangshu_username', config_value: '' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ code: 0 })
        );
      });

      it('应成功更新 yishangshu_password（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        const mockResult = { id: 2, configKey: 'yishangshu_password', configValue: 'new_pass', createdAt: new Date(), updatedAt: new Date() };
        const mockTransaction = jest.fn().mockResolvedValue([mockResult]);
        getPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        });

        const req = { body: { configs: [{ config_key: 'yishangshu_password', config_value: 'new_pass' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({
            code: 0,
            data: expect.arrayContaining([
              expect.objectContaining({ config_key: 'yishangshu_password', config_value: 'ne****' }),
            ]),
          })
        );
      });
    });

    describe('updateSystemConfigs — 错误路径（直接调用）', () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateSystemConfigs } = require('../../apis/controller/system-config.controller');

      it('应返回500当数据库操作抛出异常时（直接调用）', async () => {
        const { getPrisma } = require('../../apis/utils/db.util');
        const mockTransaction = jest.fn().mockRejectedValue(new Error('TX error'));
        getPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        });

        const req = { body: { configs: [{ config_key: 'yishangshu_username', config_value: 'test' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(500);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: '更新系统配置失败' })
        );
      });

      it('应返回400当多条配置中第一条key不在白名单时（直接调用）', async () => {
        const req = { body: { configs: [{ config_key: 'invalid', config_value: 'test' }, { config_key: 'yishangshu_username', config_value: 'test' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不允许修改的配置项') })
        );
      });

      it('应返回400当多条配置中第二条key不在白名单时（直接调用）', async () => {
        const req = { body: { configs: [{ config_key: 'yishangshu_username', config_value: 'test' }, { config_key: 'invalid', config_value: 'test' }] } } as any;
        await updateSystemConfigs(req, mockRes);

        expect(mockStatus).toHaveBeenCalledWith(400);
        expect(mockJson).toHaveBeenCalledWith(
          expect.objectContaining({ message: expect.stringContaining('不允许修改的配置项') })
        );
      });
    });
  });

  // ─── 第3轮补全——maskSensitiveValue 边界 + token 安全 + 混合场景 ───
  describe('第3轮补全——边界与安全场景', () => {
    describe('maskSensitiveValue 边界场景', () => {
      it('应脱敏长度为1的敏感配置（不脱敏，因为 <=2）', async () => {
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_password', configValue: 'a', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe('a');
      });

      it('应脱敏长度为4的敏感配置', async () => {
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_password', configValue: 'abcd', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe('ab****');
      });

      it('应脱敏超长密码值', async () => {
        const longPass = 'x'.repeat(100);
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_password', configValue: longPass, createdAt: new Date(), updatedAt: new Date() },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe('xx****');
      });

      it('不应脱敏非敏感配置', async () => {
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_username', configValue: 'admin_user', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe('admin_user');
      });

      it('应脱敏混合敏感和非敏感配置', async () => {
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_username', configValue: 'user123', createdAt: new Date(), updatedAt: new Date() },
          { id: 2, configKey: 'yishangshu_password', configValue: 'super_secret', createdAt: new Date(), updatedAt: new Date() },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe('user123');
        expect(response.body.data[1].config_value).toBe('su****');
      });
    });

    describe('Token 安全场景', () => {
      it('GET 应返回401当token过期时', async () => {
        const expiredToken = jwt.sign(
          { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
          'test-secret',
          { expiresIn: '0s' }
        );

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${expiredToken}`);

        expect(response.status).toBe(401);
      });

      it('PUT 应返回401当token过期时', async () => {
        const expiredToken = jwt.sign(
          { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
          'test-secret',
          { expiresIn: '0s' }
        );

        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', `Bearer ${expiredToken}`)
          .send({ configs: [{ config_key: 'yishangshu_username', config_value: 'test' }] });

        expect(response.status).toBe(401);
      });

      it('GET 应返回401当token无效时', async () => {
        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', 'Bearer invalid-token-here');

        expect(response.status).toBe(401);
      });

      it('PUT 应返回401当token无效时', async () => {
        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', 'Bearer invalid-token-here')
          .send({ configs: [{ config_key: 'yishangshu_username', config_value: 'test' }] });

        expect(response.status).toBe(401);
      });
    });

    describe('PUT 接口额外边界', () => {
      it('应允许 config_value 包含特殊字符', async () => {
        const specialValue = '<script>alert("xss")</script>';
        const result = { id: 1, configKey: 'yishangshu_username', configValue: specialValue, createdAt: new Date(), updatedAt: new Date() };
        mockPrismaForUpdate([result]);

        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .send({
            configs: [{ config_key: 'yishangshu_username', config_value: specialValue }],
          });

        expect(response.status).toBe(200);
        expect(response.body.data[0].config_value).toBe(specialValue);
      });

      it('应允许同时更新两条白名单内的配置', async () => {
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
        expect(response.body.data).toHaveLength(2);
        expect(response.body.data[0].config_key).toBe('yishangshu_username');
        expect(response.body.data[1].config_key).toBe('yishangshu_password');
        // PUT 响应脱敏验证
        expect(response.body.data[0].config_value).toBe('new_user');
        expect(response.body.data[1].config_value).toBe('ne****');
      });

      it('应返回更新成功消息', async () => {
        const result = { id: 1, configKey: 'yishangshu_username', configValue: 'val', createdAt: new Date(), updatedAt: new Date() };
        mockPrismaForUpdate([result]);

        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .send({
            configs: [{ config_key: 'yishangshu_username', config_value: 'val' }],
          });

        expect(response.status).toBe(200);
        expect(response.body.message).toBe('更新系统配置成功');
      });

      it('应返回400当body为null时', async () => {
        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .send(null);

        expect(response.status).toBe(400);
      });

      it('应返回400当body为空字符串时', async () => {
        const response = await agent
          .put('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`)
          .set('Content-Type', 'application/json')
          .send('');

        expect(response.status).toBe(400);
      });
    });

    describe('GET 接口额外边界', () => {
      it('应正确返回多条配置的完整数据', async () => {
        const now = new Date();
        mockPrismaForGet([
          { id: 1, configKey: 'yishangshu_username', configValue: 'user1', createdAt: now, updatedAt: now },
          { id: 2, configKey: 'yishangshu_password', configValue: 'pass123', createdAt: now, updatedAt: now },
        ]);

        const response = await agent
          .get('/api/v1/system-configs')
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(response.body.code).toBe(0);
        expect(response.body.data).toHaveLength(2);
        const keys = response.body.data.map((d: any) => d.config_key);
        expect(keys).toContain('yishangshu_username');
        expect(keys).toContain('yishangshu_password');
      });
    });
  });
});

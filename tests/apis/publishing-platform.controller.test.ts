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

// Mock the service implementations before importing app
const mockSyncFromRm = jest.fn();
const mockListAll = jest.fn();
const mockList = jest.fn();
const mockGetAllConfigs = jest.fn();

jest.mock('../../apis/service/impl/publishing-platform.service.impl', () => ({
  PublishingPlatformServiceImpl: jest.fn().mockImplementation(() => ({
    syncFromRm: mockSyncFromRm,
    listAll: mockListAll,
    list: mockList,
  })),
}));

jest.mock('../../apis/service/impl/system-config.service.impl', () => ({
  SystemConfigServiceImpl: jest.fn().mockImplementation(() => ({
    getAll: mockGetAllConfigs,
  })),
}));

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

const mockConfigRows = (username = 'rmuser', password = 'rmpass') => [
  { config_key: 'ruanmeng_username', config_value: username },
  { config_key: 'ruanmeng_password', config_value: password },
];

const mockPlatformRow = {
  id: 1,
  rm_resource_id: 100,
  name: '新浪',
  taxonomy: '门户网站',
  price: 500,
  remark: '优质资源',
  include_rate: 95,
  publish_rate: 90,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
};

const mappedPlatform = {
  id: 1,
  rm_resource_id: 100,
  name: '新浪',
  taxonomy: '门户网站',
  price: 500,
  remark: '优质资源',
  include_rate: 95,
  publish_rate: 90,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
};

describe('PublishingPlatform Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== POST /api/publishing-platforms/sync (syncPublishingPlatforms) ==========
  describe('POST /api/publishing-platforms/sync', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/publishing-platforms/sync');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 when ruanmeng_username is not configured', async () => {
      mockGetAllConfigs.mockResolvedValue([
        { config_key: 'ruanmeng_password', config_value: 'pass' },
      ]);

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先配置软盟账号和密码');
    });

    it('should return 400 when ruanmeng_password is not configured', async () => {
      mockGetAllConfigs.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'user' },
      ]);

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先配置软盟账号和密码');
    });

    it('should return 400 when both username and password are empty strings', async () => {
      mockGetAllConfigs.mockResolvedValue(mockConfigRows('', ''));

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先配置软盟账号和密码');
    });

    it('should return 400 when config list is empty', async () => {
      mockGetAllConfigs.mockResolvedValue([]);

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先配置软盟账号和密码');
    });

    it('should sync successfully and return count', async () => {
      mockGetAllConfigs.mockResolvedValue(mockConfigRows('rmuser', 'rmpass'));
      mockSyncFromRm.mockResolvedValue(42);

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.count).toBe(42);
      expect(response.body.message).toContain('同步成功');
      expect(response.body.message).toContain('42');
      expect(mockSyncFromRm).toHaveBeenCalledWith('rmuser', 'rmpass');
    });

    it('should return 500 when sync service throws error with message', async () => {
      mockGetAllConfigs.mockResolvedValue(mockConfigRows());
      mockSyncFromRm.mockRejectedValue(new Error('网络超时'));

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('网络超时');
    });

    it('should return 500 with default message when sync error has no message', async () => {
      mockGetAllConfigs.mockResolvedValue(mockConfigRows());
      mockSyncFromRm.mockRejectedValue(new Error());

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should return 500 when config service throws error', async () => {
      mockGetAllConfigs.mockRejectedValue(new Error('配置读取失败'));

      const response = await agent
        .post('/api/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('配置读取失败');
    });
  });

  // ========== GET /api/publishing-platforms (listPublishingPlatforms) ==========
  describe('GET /api/publishing-platforms', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/publishing-platforms');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/publishing-platforms')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return all platforms without pagination params', async () => {
      mockListAll.mockResolvedValue([mappedPlatform]);

      const response = await agent
        .get('/api/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].name).toBe('新浪');
      expect(mockListAll).toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
    });

    it('should return all platforms for admin', async () => {
      mockListAll.mockResolvedValue([mappedPlatform]);

      const response = await agent
        .get('/api/publishing-platforms')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return paginated list when page is provided', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should pass search parameter to list service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10&search=新浪')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '新浪', undefined, undefined, undefined);
    });

    it('should pass taxonomy parameter to list service', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10&taxonomy=门户网站')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, '门户网站', undefined, undefined);
    });

    it('should pass sortBy and sortOrder parameters to list service', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10&sortBy=price&sortOrder=desc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'price', 'desc');
    });

    it('should pass all query parameters together', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/publishing-platforms?page=2&pageSize=5&search=新浪&taxonomy=门户网站&sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(2, 5, '新浪', '门户网站', 'name', 'asc');
    });

    it('should use default page=1 and pageSize=10 when only search is provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-platforms?search=test')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, 'test', undefined, undefined, undefined);
    });

    it('should trigger paginated list when only taxonomy is provided', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/publishing-platforms?taxonomy=门户网站')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalled();
      expect(mockListAll).not.toHaveBeenCalled();
    });

    it('should return 500 when listAll service throws error', async () => {
      mockListAll.mockRejectedValue(new Error('数据库连接失败'));

      const response = await agent
        .get('/api/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('数据库连接失败');
    });

    it('should return 500 with default message when listAll error has no message', async () => {
      mockListAll.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return 500 when paginated list service throws error', async () => {
      mockList.mockRejectedValue(new Error('查询超时'));

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('查询超时');
    });

    it('should return 500 with default message when paginated list error has no message', async () => {
      mockList.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });
  });
});

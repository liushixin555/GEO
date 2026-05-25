/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { BusinessError } from '../../apis/errors';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '500';

// Mock the service implementations before importing app
const mockSyncFromSystemConfig = jest.fn();
const mockSyncFromRm = jest.fn();
const mockListAll = jest.fn();
const mockList = jest.fn();

jest.mock('../../apis/service/impl/publishing-platform.service.impl', () => ({
  PublishingPlatformServiceImpl: jest.fn().mockImplementation(() => ({
    syncFromSystemConfig: mockSyncFromSystemConfig,
    syncFromRm: mockSyncFromRm,
    listAll: mockListAll,
    list: mockList,
  })),
}));

jest.mock('../../apis/service/impl/system-config.service.impl', () => ({
  SystemConfigServiceImpl: jest.fn().mockImplementation(() => ({})),
}));

const mockLoggerInfo = jest.fn();
const mockLoggerError = jest.fn();
const mockLoggerWarn = jest.fn();
jest.mock('../../apis/utils/logger.util', () => ({
  logger: { info: mockLoggerInfo, warn: mockLoggerWarn, error: mockLoggerError, debug: jest.fn() },
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

  // ========== 审计日志测试（CP-M3） ==========

  // ========== POST /api/publishing-platforms/sync (syncPublishingPlatforms) ==========
  describe('POST /api/publishing-platforms/sync', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/v1/publishing-platforms/sync');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 when credentials not configured', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new BusinessError('请先配置软盟账号和密码'));

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('请先配置软盟账号和密码');
    });

    it('should sync successfully and return count', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(42);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.count).toBe(42);
      expect(response.body.message).toContain('同步成功');
      expect(response.body.message).toContain('42');
      expect(mockSyncFromSystemConfig).toHaveBeenCalled();
    });

    it('should return 500 with sanitized message when sync throws error', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new Error('网络超时'));

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should return 500 with default message when sync error has no message', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new Error());

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should return 500 with default message when non-Error is thrown', async () => {
      mockSyncFromSystemConfig.mockRejectedValue('string error');

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should sync successfully with count 0', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(0);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(0);
      expect(response.body.message).toContain('同步成功');
      expect(response.body.message).toContain('0');
    });

    // ========== 审计日志测试（CP-M3） ==========

    it('should log sync start and success on successful sync', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(15);

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // start log
      expect(mockLoggerInfo).toHaveBeenCalledWith('publishing-platform.sync.start', expect.objectContaining({ username: 'sysadmin' }));
      // success log
      expect(mockLoggerInfo).toHaveBeenCalledWith('publishing-platform.sync.success', expect.objectContaining({ count: 15, username: 'sysadmin' }));
    });

    it('should log sync failed on error', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new Error('网络超时'));

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockLoggerError).toHaveBeenCalledWith('publishing-platform.sync.failed', expect.objectContaining({ err: '网络超时', username: 'sysadmin' }));
    });

    it('should log sync business-error on config error', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new BusinessError('请先配置软盟账号和密码'));

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockLoggerWarn).toHaveBeenCalledWith('publishing-platform.sync.business-error', expect.objectContaining({ err: '请先配置软盟账号和密码' }));
    });
  });

  // ========== GET /api/publishing-platforms (listPublishingPlatforms) ==========
  describe('GET /api/publishing-platforms', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/publishing-platforms');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return all platforms without pagination params (deprecated backward-compat)', async () => {
      mockListAll.mockResolvedValue([mappedPlatform]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
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
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });

    it('should return paginated list when page is provided', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
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
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=新浪')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '新浪', undefined, undefined, undefined);
    });

    it('should pass taxonomy parameter to list service', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&taxonomy=门户网站')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, '门户网站', undefined, undefined);
    });

    it('should pass sortBy and sortOrder parameters to list service', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=price&sortOrder=desc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'price', 'desc');
    });

    it('should pass all query parameters together', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=2&pageSize=5&search=新浪&taxonomy=门户网站&sortBy=name&sortOrder=asc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(2, 5, '新浪', '门户网站', 'name', 'asc');
    });

    it('should use default page=1 and pageSize=10 when only search is provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?search=test')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, 'test', undefined, undefined, undefined);
    });

    it('should trigger paginated list when only taxonomy is provided', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?taxonomy=门户网站')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalled();
      expect(mockListAll).not.toHaveBeenCalled();
    });

    it('should return 500 when listAll service throws error', async () => {
      mockListAll.mockRejectedValue(new Error('数据库连接失败'));

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return 500 with default message when listAll error has no message', async () => {
      mockListAll.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return 500 when paginated list service throws error', async () => {
      mockList.mockRejectedValue(new Error('查询超时'));

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return 500 with default message when paginated list error has no message', async () => {
      mockList.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should trigger paginated path when only pageSize is provided', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 5, undefined, undefined, undefined, undefined);
      expect(mockListAll).not.toHaveBeenCalled();
    });

    it('should trigger paginated path when only page is provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(2, 10, undefined, undefined, undefined, undefined);
      expect(mockListAll).not.toHaveBeenCalled();
    });

    it('should return empty array when listAll returns no items', async () => {
      mockListAll.mockResolvedValue([]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toEqual([]);
    });

    it('should return empty paginated result', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=3&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 when non-Error is thrown from listAll', async () => {
      mockListAll.mockRejectedValue('unexpected string');

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return multiple platforms from listAll', async () => {
      const secondPlatform = {
        ...mappedPlatform,
        id: 2,
        name: '网易',
        taxonomy: '门户网站',
        rm_resource_id: 101,
      };
      mockListAll.mockResolvedValue([mappedPlatform, secondPlatform]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].name).toBe('新浪');
      expect(response.body.data[1].name).toBe('网易');
    });

    it('should default to page=1 and pageSize=10 when non-numeric values provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=abc&pageSize=xyz')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    // ========== 新增：参数校验测试 ==========

    it('should cap pageSize at 100', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 100, undefined, undefined, undefined, undefined);
    });

    it('should return 400 when search exceeds max length', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=' + 'a'.repeat(101))
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('搜索关键词不能超过');
    });

    it('should allow search at max length boundary', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=' + 'a'.repeat(100))
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, 'a'.repeat(100), undefined, undefined, undefined);
    });

    it('should return 400 when sortBy is invalid', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=invalid_field')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序字段');
    });

    it('should return 400 when sortOrder is invalid', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortOrder=invalid')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序方向');
    });

    it('should accept all valid sort fields', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      for (const field of ['name', 'taxonomy', 'price', 'include_rate', 'publish_rate']) {
        jest.clearAllMocks();
        const response = await agent
          .get(`/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=${field}`)
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, field, undefined);
      }
    });

    it('should accept both asc and desc sort orders', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      for (const order of ['asc', 'desc']) {
        jest.clearAllMocks();
        const response = await agent
          .get(`/api/v1/publishing-platforms?page=1&pageSize=10&sortOrder=${order}`)
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, order);
      }
    });

    it('should handle negative page by defaulting to 1', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=-1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should handle zero pageSize by defaulting to 10', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should handle negative pageSize by defaulting to 10', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should handle page=0 by defaulting to 1', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=0&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should handle decimal page by truncating via parseInt', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=2.7&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(2, 10, undefined, undefined, undefined, undefined);
    });

    it('should handle decimal pageSize by truncating via parseInt', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=5.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 5, undefined, undefined, undefined, undefined);
    });

    it('should accept pageSize at max boundary 100', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=100')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 100, undefined, undefined, undefined, undefined);
    });

    it('should accept pageSize=1 as minimum valid value', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 1, undefined, undefined, undefined, undefined);
    });

    it('should treat empty string search as no search (trim + undefined)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, undefined);
    });

    it('should return 500 when non-Error is thrown from paginated list', async () => {
      mockList.mockRejectedValue('unexpected string');

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should return multiple items in paginated result', async () => {
      const secondPlatform = {
        ...mappedPlatform,
        id: 2,
        name: '网易',
        rm_resource_id: 101,
      };
      mockList.mockResolvedValue({ list: [mappedPlatform, secondPlatform], total: 2 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(2);
      expect(response.body.data.total).toBe(2);
      expect(response.body.data.list[0].name).toBe('新浪');
      expect(response.body.data.list[1].name).toBe('网易');
    });

    it('should handle search + taxonomy together without page/pageSize defaults', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?search=新浪&taxonomy=门户网站')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '新浪', '门户网站', undefined, undefined);
      expect(mockListAll).not.toHaveBeenCalled();
    });

    it('should return 400 when sortBy is provided without pagination params but with search', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?search=test&sortBy=invalid')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序字段');
    });

    it('should return 400 when sortOrder is provided without pagination params but with taxonomy', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?taxonomy=门户&sortOrder=invalid')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序方向');
    });
  });

  // ========== Round 2: Token 异常测试 ==========

  describe('Token 异常', () => {
    it('should reject expired JWT token on sync', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should reject expired JWT token on list', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${token}`);

      expect(response.status).toBe(401);
    });

    it('should reject malformed JWT token on sync', async () => {
      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
    });

    it('should reject malformed JWT token on list', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', 'Bearer invalid.jwt.token');

      expect(response.status).toBe(401);
    });

    it('should reject request with empty Authorization header', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', '');

      expect(response.status).toBe(401);
    });

    it('should reject request with Bearer but no token', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', 'Bearer ');

      expect(response.status).toBe(401);
    });
  });

  // ========== Round 2: sync 审计日志完整性测试 ==========

  describe('sync 审计日志完整性', () => {
    it('should log operator userId on sync start', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(10);

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      const startCall = mockLoggerInfo.mock.calls.find(
        (c: any[]) => c[0] === 'publishing-platform.sync.start'
      );
      expect(startCall).toBeDefined();
      expect(startCall[1]).toEqual(expect.objectContaining({ userId: 1 }));
    });

    it('should log operator ip on sync start', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(10);

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      const startCall = mockLoggerInfo.mock.calls.find(
        (c: any[]) => c[0] === 'publishing-platform.sync.start'
      );
      expect(startCall).toBeDefined();
      expect(startCall[1].ip).toBeDefined();
    });

    it('should log success with count and operator on sync success', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(77);

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      const successCall = mockLoggerInfo.mock.calls.find(
        (c: any[]) => c[0] === 'publishing-platform.sync.success'
      );
      expect(successCall).toBeDefined();
      expect(successCall[1]).toEqual(
        expect.objectContaining({ count: 77, userId: 1, username: 'sysadmin' })
      );
    });

    it('should log error with String(err) when non-Error object is thrown', async () => {
      mockSyncFromSystemConfig.mockRejectedValue({ code: 'TIMEOUT' });

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      const errorCall = mockLoggerError.mock.calls.find(
        (c: any[]) => c[0] === 'publishing-platform.sync.failed'
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[1].err).toBe('[object Object]');
    });

    it('should log error with err.message when Error is thrown', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new Error('网络超时'));

      await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      const errorCall = mockLoggerError.mock.calls.find(
        (c: any[]) => c[0] === 'publishing-platform.sync.failed'
      );
      expect(errorCall).toBeDefined();
      expect(errorCall[1].err).toBe('网络超时');
    });
  });

  // ========== Round 2: sync 异常类型多样性测试 ==========

  describe('sync 异常类型多样性', () => {
    it('should handle TypeError and return 500', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new TypeError('Cannot read property'));

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should handle RangeError and return 500', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new RangeError('Maximum call stack'));

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should handle null thrown and return 500', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(null);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should handle undefined thrown and return 500', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(undefined);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should handle number thrown and return 500', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(42);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('同步发布平台失败');
    });

    it('should return 400 when BusinessError is thrown with custom message', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new BusinessError('配置缺失，请检查系统设置'));

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('配置缺失，请检查系统设置');
    });
  });

  // ========== Round 2: sync 响应结构验证 ==========

  describe('sync 响应结构验证', () => {
    it('should return exact response structure on sync success', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(123);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        code: 0,
        message: '同步成功，共 123 个发布平台',
        data: { count: 123 },
      });
    });

    it('should handle very large count value', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(999999);

      const response = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.count).toBe(999999);
      expect(response.body.message).toContain('999999');
    });
  });

  // ========== Round 2: list 响应结构深度验证 ==========

  describe('list 响应结构深度验证', () => {
    it('should return correct listAll response with all entity fields', async () => {
      const fullItem = {
        id: 1,
        rm_resource_id: 100,
        name: '新浪',
        taxonomy: '门户网站',
        price: 500.5,
        remark: '优质资源，价格可议',
        include_rate: 95.5,
        publish_rate: 90.3,
        created_at: '2025-01-01T00:00:00.000Z',
        updated_at: '2025-01-02T00:00:00.000Z',
      };
      mockListAll.mockResolvedValue([fullItem]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('操作成功');
      const item = response.body.data[0];
      expect(item.id).toBe(1);
      expect(item.rm_resource_id).toBe(100);
      expect(item.name).toBe('新浪');
      expect(item.taxonomy).toBe('门户网站');
      expect(item.price).toBe(500.5);
      expect(item.remark).toBe('优质资源，价格可议');
      expect(item.include_rate).toBe(95.5);
      expect(item.publish_rate).toBe(90.3);
    });

    it('should return null remark when platform has no remark', async () => {
      const noRemark = { ...mappedPlatform, remark: null };
      mockListAll.mockResolvedValue([noRemark]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].remark).toBeNull();
    });

    it('should return platforms with decimal price values', async () => {
      const decimalPlatform = { ...mappedPlatform, price: 0.01 };
      mockListAll.mockResolvedValue([decimalPlatform]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].price).toBe(0.01);
    });

    it('should return platforms with zero rates', async () => {
      const zeroPlatform = { ...mappedPlatform, include_rate: 0, publish_rate: 0, price: 0 };
      mockListAll.mockResolvedValue([zeroPlatform]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].include_rate).toBe(0);
      expect(response.body.data[0].publish_rate).toBe(0);
      expect(response.body.data[0].price).toBe(0);
    });

    it('should return correct paginated response structure with all fields', async () => {
      const fullItem = { ...mappedPlatform };
      mockList.mockResolvedValue({ list: [fullItem], total: 50 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=3&pageSize=20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toEqual({
        list: [expect.objectContaining({ name: '新浪' })],
        total: 50,
        page: 3,
        pageSize: 20,
      });
    });
  });

  // ========== Round 2: list 特殊字符与搜索测试 ==========

  describe('list 特殊字符与搜索测试', () => {
    it('should handle unicode characters in search', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=搜索')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '搜索', undefined, undefined, undefined);
    });

    it('should handle SQL injection pattern in search safely', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get("/api/v1/publishing-platforms?page=1&pageSize=10&search=' OR 1=1--")
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, "' OR 1=1--", undefined, undefined, undefined);
    });

    it('should handle XSS pattern in search safely', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=<script>alert(1)</script>')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '<script>alert(1)</script>', undefined, undefined, undefined);
    });

    it('should handle special characters in taxonomy filter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&taxonomy=' + encodeURIComponent('门户/行业&新媒体'))
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, '门户/行业&新媒体', undefined, undefined);
    });

    it('should handle URL-encoded search parameter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=%E6%96%B0%E6%B5%AA')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '新浪', undefined, undefined, undefined);
    });

    it('should handle very long valid search (100 unicode chars)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });
      const search = '新'.repeat(100);

      const response = await agent
        .get(`/api/v1/publishing-platforms?page=1&pageSize=10&search=${search}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, search, undefined, undefined, undefined);
    });
  });

  // ========== Round 2: list 排序组合测试 ==========

  describe('list 排序组合测试', () => {
    it('should pass sortBy without sortOrder (sortOrder=undefined)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=name')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'name', undefined);
    });

    it('should pass sortOrder without sortBy (sortBy=undefined)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortOrder=asc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, undefined, 'asc');
    });

    it('should accept sortBy=include_rate with underscore', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=include_rate&sortOrder=desc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'include_rate', 'desc');
    });

    it('should accept sortBy=publish_rate with underscore', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=publish_rate&sortOrder=asc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'publish_rate', 'asc');
    });

    it('should reject sortBy with uppercase variation', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=Name')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序字段');
    });

    it('should reject sortOrder with uppercase variation', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortOrder=ASC')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的排序方向');
    });
  });

  // ========== Round 2: list 异常类型多样性 ==========

  describe('list 异常类型多样性', () => {
    it('should handle TypeError thrown from listAll', async () => {
      mockListAll.mockRejectedValue(new TypeError('Cannot read property'));

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should handle null thrown from listAll', async () => {
      mockListAll.mockRejectedValue(null);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should handle undefined thrown from paginated list', async () => {
      mockList.mockRejectedValue(undefined);

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });

    it('should handle number thrown from paginated list', async () => {
      mockList.mockRejectedValue(500);

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布平台失败');
    });
  });

  // ========== Round 2: list 混合参数组合测试 ==========

  describe('list 混合参数组合测试', () => {
    it('should use admin token for paginated list path', async () => {
      mockList.mockResolvedValue({ list: [mappedPlatform], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should return multiple platforms with different taxonomies', async () => {
      const portal = { ...mappedPlatform, id: 1, name: '新浪', taxonomy: '门户网站' };
      const weMedia = { ...mappedPlatform, id: 2, name: '微信公众号', taxonomy: '自媒体', rm_resource_id: 200 };
      mockListAll.mockResolvedValue([portal, weMedia]);

      const response = await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].taxonomy).toBe('门户网站');
      expect(response.body.data[1].taxonomy).toBe('自媒体');
    });
  });

  // ========== Round 2: list 验证顺序测试 ==========

  describe('list 验证顺序测试', () => {
    it('should validate search length before sortBy validation', async () => {
      const longSearch = 'a'.repeat(101);

      const response = await agent
        .get(`/api/v1/publishing-platforms?page=1&pageSize=10&search=${longSearch}&sortBy=invalid`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('搜索关键词不能超过');
    });

    it('should validate sortBy before calling service', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=nonexistent')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(mockList).not.toHaveBeenCalled();
    });

    it('should validate sortOrder before calling service', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortOrder=random')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(mockList).not.toHaveBeenCalled();
    });
  });

  // ========== Round 3: taxonomy 长度校验测试 ==========

  describe('taxonomy 长度校验', () => {
    it('should return 400 when taxonomy exceeds max length', async () => {
      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&taxonomy=' + 'a'.repeat(101))
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('分类筛选不能超过');
    });

    it('should allow taxonomy at max length boundary', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&taxonomy=' + 'a'.repeat(100))
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, 'a'.repeat(100), undefined, undefined);
    });
  });

  // ========== Round 3: search trim 测试 ==========

  describe('search trim 处理', () => {
    it('should treat whitespace-only search as no search', async () => {
      mockListAll.mockResolvedValue([]);

      const response = await agent
        .get('/api/v1/publishing-platforms?search=%20%20%20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockListAll).toHaveBeenCalled();
      expect(mockList).not.toHaveBeenCalled();
    });

    it('should trim leading/trailing whitespace from search', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=%20%E6%96%B0%E6%B5%AA%20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '新浪', undefined, undefined, undefined);
    });
  });

  // ========== Round 3: sync 并发锁测试 ==========

  describe('sync 并发控制', () => {
    it('should release sync lock after success allowing subsequent sync', async () => {
      mockSyncFromSystemConfig.mockResolvedValue(5);

      const res1 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res1.status).toBe(200);
      expect(res1.body.data.count).toBe(5);

      mockSyncFromSystemConfig.mockResolvedValue(3);
      const res2 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.count).toBe(3);
    });

    it('should release sync lock after error allowing subsequent sync', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new Error('网络超时'));

      const res1 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res1.status).toBe(500);

      mockSyncFromSystemConfig.mockResolvedValue(7);
      const res2 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.count).toBe(7);
    });

    it('should release sync lock after BusinessError allowing subsequent sync', async () => {
      mockSyncFromSystemConfig.mockRejectedValue(new BusinessError('请先配置软盟账号和密码'));

      const res1 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res1.status).toBe(400);

      mockSyncFromSystemConfig.mockResolvedValue(12);
      const res2 = await agent
        .post('/api/v1/publishing-platforms/sync')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res2.status).toBe(200);
      expect(res2.body.data.count).toBe(12);
    });
  });

  // ========== Round 3: list 错误日志测试 ==========

  describe('list 错误日志', () => {
    it('should log error when listAll fails', async () => {
      mockListAll.mockRejectedValue(new Error('数据库连接失败'));

      await agent
        .get('/api/v1/publishing-platforms')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockLoggerError).toHaveBeenCalledWith(
        'publishing-platform.list.failed',
        expect.objectContaining({ err: '数据库连接失败' })
      );
    });

    it('should log error when paginated list fails', async () => {
      mockList.mockRejectedValue(new Error('查询超时'));

      await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockLoggerError).toHaveBeenCalledWith(
        'publishing-platform.list.failed',
        expect.objectContaining({ err: '查询超时' })
      );
    });
  });

  // ========== Round 3: query 参数数组防护测试 ==========

  describe('query 参数数组防护', () => {
    it('should use first value when search is an array', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=foo&search=bar')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, 'foo', undefined, undefined, undefined);
    });

    it('should use first value when sortBy is an array', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&sortBy=name&sortBy=price')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, undefined, undefined, 'name', undefined);
    });
  });
});

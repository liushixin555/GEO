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
      mockSyncFromSystemConfig.mockRejectedValue(new Error('请先配置软盟账号和密码'));

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
      expect(response.body.message).toBe('数据库连接失败');
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
      expect(response.body.message).toBe('查询超时');
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

    it('should allow empty string search without triggering validation error', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-platforms?page=1&pageSize=10&search=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(1, 10, '', undefined, undefined, undefined);
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
});

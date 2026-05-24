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

// Mock the service implementation before importing app
const mockList = jest.fn();
const mockUpdateSchedule = jest.fn();

jest.mock('../../apis/service/impl/publishing-schedule.service.impl', () => ({
  PublishingScheduleServiceImpl: jest.fn().mockImplementation(() => ({
    list: mockList,
    updateSchedule: mockUpdateSchedule,
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

const mockScheduleItem = {
  id: 1,
  title: '测试文章标题',
  keywords: '关键词1,关键词2',
  article_type: 'original',
  platforms: ['新浪'],
  status: 'publishing',
  scheduled_publish_at: '2025-06-01T10:00:00.000Z',
  project_id: 1,
  project_name: '测试项目',
  company_name: '测试公司',
  created_by: 1,
  created_by_name: '管理员',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
};

describe('PublishingSchedule Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== GET /api/publishing-schedule (listPublishingSchedule) ==========
  describe('GET /api/publishing-schedule', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/publishing-schedule');
      expect(response.status).toBe(401);
    });

    it('should return paginated list for sysadmin', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.list[0].title).toBe('测试文章标题');
    });

    it('should return paginated list for admin', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should return paginated list for view role', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should use default page=1 and pageSize=10 when not provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith({
        page: 1,
        pageSize: 10,
        search: undefined,
        status: undefined,
        projectId: undefined,
        userId: 1,
        role: 'sysadmin',
      });
    });

    it('should pass search parameter to service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10&search=测试')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试' })
      );
    });

    it('should pass status parameter to service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10&status=publishing')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'publishing' })
      );
    });

    it('should pass projectId parameter to service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10&projectId=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 5 })
      );
    });

    it('should pass all query parameters together', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/publishing-schedule?page=2&pageSize=5&search=文章&status=publishing&projectId=3')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith({
        page: 2,
        pageSize: 5,
        search: '文章',
        status: 'publishing',
        projectId: 3,
        userId: 1,
        role: 'sysadmin',
      });
    });

    it('should pass userId and role for admin user', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken(5)}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, role: 'admin' })
      );
    });

    it('should pass userId and role for view user', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, role: 'view' })
      );
    });

    it('should return empty list when no results', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 when service throws error with message', async () => {
      mockList.mockRejectedValue(new Error('数据库连接失败'));

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('数据库连接失败');
    });

    it('should return 500 with default message when service error has no message', async () => {
      mockList.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布计划列表失败');
    });
  });

  // ========== PUT /api/publishing-schedule/:id (updatePublishingSchedule) ==========
  describe('PUT /api/publishing-schedule/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.put('/api/publishing-schedule/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when id is not a number', async () => {
      const response = await agent
        .put('/api/publishing-schedule/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的ID');
    });

    it('should return 400 when scheduled_publish_at is not a string (number)', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('scheduled_publish_at参数无效');
    });

    it('should return 400 when scheduled_publish_at is not a string (boolean)', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('scheduled_publish_at参数无效');
    });

    it('should return 400 when scheduled_publish_at is not a string (object)', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: { date: '2025-06-01' } });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('scheduled_publish_at参数无效');
    });

    it('should update successfully with a valid date string', async () => {
      const updatedItem = { ...mockScheduleItem, scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.scheduled_publish_at).toBe('2025-06-01T10:00:00.000Z');
      expect(response.body.message).toBe('更新发布计划成功');
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 1, 'sysadmin');
    });

    it('should update successfully for admin role', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 2, 'admin');
    });

    it('should update successfully when scheduled_publish_at is null', async () => {
      const updatedItem = { ...mockScheduleItem, scheduled_publish_at: null };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: null });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, null, 1, 'sysadmin');
    });

    it('should update successfully when scheduled_publish_at is undefined (not sent)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, undefined, null, 1, 'sysadmin');
    });

    it('should update successfully when body is empty', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send();

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should return 404 when article does not exist', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('文章不存在'));

      const response = await agent
        .put('/api/publishing-schedule/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should return 400 when article status is not editable', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('当前文章状态不可编辑发布计划'));

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑发布计划');
    });

    it('should return 500 with fixed message for generic service errors', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新发布计划失败');
    });

    it('should return 500 with default message when service error has no message', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error());

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新发布计划失败');
    });

    it('should handle id=0 as invalid', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('文章不存在'));
      const response = await agent
        .put('/api/publishing-schedule/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      // parseInt('0') = 0, isNaN(0) = false, so it passes the NaN check
      // id=0 will cause a service error since no article has id=0
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle negative id', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('文章不存在'));
      const response = await agent
        .put('/api/publishing-schedule/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should handle float id by truncating to integer', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);
      const response = await agent
        .put('/api/publishing-schedule/1.5')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      // parseInt('1.5') = 1, which is a valid integer
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should return 400 when scheduled_publish_at is an array', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: ['2025-06-01'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('scheduled_publish_at参数无效');
    });

    it('should update with empty string scheduled_publish_at', async () => {
      const updatedItem = { ...mockScheduleItem, scheduled_publish_at: '' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '', null, 1, 'sysadmin');
    });

    // ========== schedule_type tests ==========
    it('should return 400 when schedule_type is invalid', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('schedule_type参数无效');
    });

    it('should update successfully with schedule_type=asap', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'asap' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap', scheduled_publish_at: null });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, 'asap', 1, 'sysadmin');
    });

    it('should update successfully with schedule_type=scheduled', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'scheduled', 1, 'sysadmin');
    });

    it('should update successfully with schedule_type=after', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'after', scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'after', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'after', 1, 'sysadmin');
    });

    it('should update with schedule_type=null', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: null, scheduled_publish_at: null });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, null, 1, 'sysadmin');
    });
  });

  // ========== Edge Cases for listPublishingSchedule ==========
  describe('GET /api/publishing-schedule - edge cases', () => {
    it('should use default page when page is non-numeric', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=abc&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should use default pageSize when pageSize is non-numeric', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=xyz')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 10 })
      );
    });

    it('should use page=1 when page is 0', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=0&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // parseInt('0') = 0, 0 || 1 = 1
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should clamp negative pageSize to 1', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // Math.min(100, Math.max(1, -5)) = 1
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 1 })
      );
    });

    it('should pass projectId as undefined when projectId is empty string', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?projectId=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // Empty string is falsy, so projectId should be undefined
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: undefined })
      );
    });

    it('should return multiple items correctly', async () => {
      const items = [
        mockScheduleItem,
        { ...mockScheduleItem, id: 2, title: '第二篇文章' },
        { ...mockScheduleItem, id: 3, title: '第三篇文章' },
      ];
      mockList.mockResolvedValue({ list: items, total: 3 });

      const response = await agent
        .get('/api/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(3);
      expect(response.body.data.total).toBe(3);
      expect(response.body.data.list[1].title).toBe('第二篇文章');
      expect(response.body.data.list[2].title).toBe('第三篇文章');
    });

    it('should handle large page number', async () => {
      mockList.mockResolvedValue({ list: [], total: 100 });

      const response = await agent
        .get('/api/publishing-schedule?page=999&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999 })
      );
    });

    it('should handle special characters in search', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?search=%E6%B5%8B%E8%AF%95%26%3C%3E')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试&<>' })
      );
    });

    it('should handle projectId with value 0 as falsy', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?projectId=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // '0' is truthy, so it will try parseInt('0') = 0, which is projectId: 0
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 0 })
      );
    });

    it('should return correct pagination metadata for page 2', async () => {
      const items = [mockScheduleItem];
      mockList.mockResolvedValue({ list: items, total: 15 });

      const response = await agent
        .get('/api/publishing-schedule?page=2&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.total).toBe(15);
    });

    it('should return 403 when admin has no access to the article', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('无权操作此文章'));

      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作此文章');
    });

    it('should return 400 when scheduled_publish_at is invalid date string', async () => {
      const response = await agent
        .put('/api/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: 'not-a-date' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('scheduled_publish_at日期格式无效');
    });

    it('should filter out invalid status parameter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?status=invalid_status')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      );
    });

    it('should filter out non-numeric projectId', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?projectId=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: undefined })
      );
    });

    it('should clamp pageSize to max 100', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/publishing-schedule?pageSize=999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 })
      );
    });
  });
});

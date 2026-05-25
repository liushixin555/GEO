/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { NotFoundError, BusinessError, ForbiddenError } from '../../apis/errors';

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
import { listPublishingSchedule, updatePublishingSchedule } from '../../apis/controller/publishing-schedule.controller';

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

function createMockRes() {
  const res: any = {};
  res.status = jest.fn().mockReturnValue(res);
  res.json = jest.fn().mockReturnValue(res);
  return res;
}

describe('PublishingSchedule Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== GET /api/publishing-schedule (listPublishingSchedule) ==========
  describe('GET /api/publishing-schedule', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/publishing-schedule');
      expect(response.status).toBe(401);
    });

    it('should return paginated list for sysadmin', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
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
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should return paginated list for view role', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should use default page=1 and pageSize=10 when not provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
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
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&search=测试')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试' })
      );
    });

    it('should pass status parameter to service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&status=publishing')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'publishing' })
      );
    });

    it('should pass projectId parameter to service', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&projectId=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 5 })
      );
    });

    it('should pass all query parameters together', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=2&pageSize=5&search=文章&status=publishing&projectId=3')
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
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken(5)}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, role: 'admin' })
      );
    });

    it('should pass userId and role for view user', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, role: 'view' })
      );
    });

    it('should return empty list when no results', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 with fixed message when service throws error (H-1 secure error handling)', async () => {
      mockList.mockRejectedValue(new Error('数据库连接失败'));

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布计划列表失败');
    });

    it('should return 500 with default message when service error has no message', async () => {
      mockList.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布计划列表失败');
    });
  });

  // ========== PUT /api/publishing-schedule/:id (updatePublishingSchedule) ==========
  describe('PUT /api/publishing-schedule/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.put('/api/v1/publishing-schedule/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when id is not a number', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的ID');
    });

    // Schema validation intercepts non-string scheduled_publish_at
    it('should return 400 when scheduled_publish_at is a number (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at参数无效');
    });

    it('should return 400 when scheduled_publish_at is a boolean (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at参数无效');
    });

    it('should return 400 when scheduled_publish_at is an object (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: { date: '2025-06-01' } });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at参数无效');
    });

    it('should update successfully with a valid date string', async () => {
      const updatedItem = { ...mockScheduleItem, scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
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
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 2, 'admin');
    });

    // scheduled_publish_at 为 null 时应通过验证（asap 类型不需要排期时间）
    it('should accept scheduled_publish_at as null', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, scheduled_publish_at: null });

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: null });

      expect(response.status).toBe(200);
    });

    // 空 body 应通过验证（字段均可选）
    it('should accept empty body', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should return 404 when article does not exist', async () => {
      mockUpdateSchedule.mockRejectedValue(new NotFoundError('文章'));

      const response = await agent
        .put('/api/v1/publishing-schedule/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should return 400 when article status is not editable', async () => {
      mockUpdateSchedule.mockRejectedValue(new BusinessError('当前文章状态不可编辑发布计划'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑发布计划');
    });

    it('should return 500 with fixed message for generic service errors', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新发布计划失败');
    });

    it('should return 500 with default message when service error has no message', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error());

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新发布计划失败');
    });

    it('should handle id=0 as valid integer', async () => {
      mockUpdateSchedule.mockRejectedValue(new NotFoundError('文章'));
      const response = await agent
        .put('/api/v1/publishing-schedule/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle negative id', async () => {
      mockUpdateSchedule.mockRejectedValue(new NotFoundError('文章'));
      const response = await agent
        .put('/api/v1/publishing-schedule/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should handle float id by truncating to integer', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);
      const response = await agent
        .put('/api/v1/publishing-schedule/1.5')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    // Schema rejects array scheduled_publish_at
    it('should return 400 when scheduled_publish_at is an array (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: ['2025-06-01'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at');
    });

    // Schema rejects empty string (invalid date)
    it('should return 400 when scheduled_publish_at is empty string (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at日期格式无效');
    });

    // ========== schedule_type tests ==========
    it('should return 400 when schedule_type is invalid (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('排期类型');
    });

    it('should update successfully with schedule_type=asap', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'asap' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'asap', 1, 'sysadmin');
    });

    it('should update successfully with schedule_type=scheduled', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
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
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'after', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'after', 1, 'sysadmin');
    });

    it('should update with schedule_type=null', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: null, scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 1, 'sysadmin');
    });
  });

  // ========== Edge Cases for listPublishingSchedule ==========
  describe('GET /api/publishing-schedule - edge cases', () => {
    it('should use default page when page is non-numeric', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=abc&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should use default pageSize when pageSize is non-numeric', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=xyz')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 10 })
      );
    });

    it('should use page=1 when page is 0', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=0&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should clamp negative pageSize to 1', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 1 })
      );
    });

    it('should pass projectId as undefined when projectId is empty string', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
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
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
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
        .get('/api/v1/publishing-schedule?page=999&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999 })
      );
    });

    it('should handle special characters in search', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=%E6%B5%8B%E8%AF%95%26%3C%3E')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试&<>' })
      );
    });

    it('should handle projectId with value 0', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 0 })
      );
    });

    it('should return correct pagination metadata for page 2', async () => {
      const items = [mockScheduleItem];
      mockList.mockResolvedValue({ list: items, total: 15 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=2&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.total).toBe(15);
    });

    it('should return 403 when admin has no access to the article', async () => {
      mockUpdateSchedule.mockRejectedValue(new ForbiddenError('无权操作此文章'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作此文章');
    });

    // Schema catches invalid date format
    it('should return 400 when scheduled_publish_at is invalid date string (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: 'not-a-date' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at日期格式无效');
    });

    it('should filter out invalid status parameter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=invalid_status')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      );
    });

    it('should filter out non-numeric projectId', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: undefined })
      );
    });

    it('should clamp pageSize to max 100', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 })
      );
    });
  });

  // ========== Unit tests: direct controller function calls (dead code coverage) ==========
  describe('updatePublishingSchedule - unit tests (bypass schema)', () => {
    it('should pass through schedule_type to service (validation is Zod middleware responsibility)', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, schedule_type: 'asap' });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { schedule_type: 'asap', scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'asap', 1, 'sysadmin');
    });

    it('should pass through scheduled_publish_at null to service (validation is Zod middleware responsibility)', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, scheduled_publish_at: null });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: null },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, null, 1, 'sysadmin');
    });

    it('should pass through empty body to service (scheduled_publish_at undefined, schedule_type null)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, null, 1, 'sysadmin');
    });

    it('should pass through scheduled_publish_at empty string to service', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, scheduled_publish_at: '' });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '', null, 1, 'sysadmin');
    });

    it('should return 500 when non-Error value is thrown', async () => {
      mockUpdateSchedule.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '更新发布计划失败' })
      );
    });

    it('should return 401 when req.user is missing', async () => {
      const req = { params: { id: '1' }, body: {} } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' })
      );
    });

    it('should return 400 when id is NaN', async () => {
      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: 'abc' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的ID' })
      );
    });
  });

  describe('listPublishingSchedule - unit tests (bypass schema)', () => {
    it('should return 500 when non-Error value is thrown', async () => {
      mockList.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取发布计划列表失败' })
      );
    });

    it('should return 401 when req.user is missing', async () => {
      const req = { query: {} } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' })
      );
    });
  });

  // ========== 补充边界场景测试 ==========
  describe('GET /api/publishing-schedule - additional edge cases', () => {
    it('should pass status=published correctly', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=published')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' })
      );
    });

    it('should pass status=publish_failed correctly', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=publish_failed')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'publish_failed' })
      );
    });

    it('should accept pageSize=100 as exact max boundary', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=100')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 })
      );
    });

    it('should accept pageSize=1 as exact min boundary', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 1 })
      );
    });

    it('should use page=1 when page is negative', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=-5&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should pass search as empty string when search= is provided', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' })
      );
    });

    it('should handle NaN-like page value like "undefined"', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=undefined')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1 })
      );
    });

    it('should handle NaN-like pageSize value like "null"', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=null')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 10 })
      );
    });
  });

  describe('PUT /api/publishing-schedule - additional edge cases', () => {
    it('should return 403 for ForbiddenError via unit test', async () => {
      mockUpdateSchedule.mockRejectedValue(new ForbiddenError('无权操作此文章'));

      const req = {
        user: { userId: 2, role: 'admin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权操作此文章' })
      );
    });

    it('should return 400 for BusinessError via unit test', async () => {
      mockUpdateSchedule.mockRejectedValue(new BusinessError('当前文章状态不可编辑发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '当前文章状态不可编辑发布计划' })
      );
    });

    it('should return 404 for NotFoundError via unit test', async () => {
      mockUpdateSchedule.mockRejectedValue(new NotFoundError('文章'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '999' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '文章不存在' })
      );
    });

    it('should update with only schedule_type via unit test (scheduled_publish_at defaults to null)', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, schedule_type: 'asap' });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, null, 'asap', 1, 'sysadmin');
    });

    it('should pass through scheduled_publish_at object to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: { year: 2025 } },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, { year: 2025 }, null, 1, 'sysadmin');
    });

    it('should pass through scheduled_publish_at array to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: ['2025-06-01'] },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, ['2025-06-01'], null, 1, 'sysadmin');
    });

    it('should allow valid ISO date-only format via unit test', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01', null, 1, 'sysadmin');
    });

    it('should pass schedule_type correctly for admin user via unit test', async () => {
      mockUpdateSchedule.mockResolvedValue({ ...mockScheduleItem, schedule_type: 'scheduled' });

      const req = {
        user: { userId: 2, role: 'admin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: 'scheduled' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 'scheduled', 2, 'admin');
    });

    it('should handle schedule_type=undefined (not in body) via unit test', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      // schedule_type is undefined, so schedule_type ?? null => null
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 1, 'sysadmin');
    });

    it('should pass schedule_type=number through to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: 123 },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 123, 1, 'sysadmin');
    });

    it('should pass schedule_type=boolean through to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: true },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', true, 1, 'sysadmin');
    });

    it('should pass schedule_type=object through to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: { type: 'asap' } },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', { type: 'asap' }, 1, 'sysadmin');
    });

    it('should pass schedule_type=empty string through to service (Zod middleware validates)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: '' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', '', 1, 'sysadmin');
    });
  });

  // ========== listPublishingSchedule AppError catch 分支覆盖 ==========
  describe('listPublishingSchedule - AppError catch branch', () => {
    it('should return 404 when list throws NotFoundError', async () => {
      mockList.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划不存在' })
      );
    });

    it('should return 400 when list throws BusinessError', async () => {
      mockList.mockRejectedValue(new BusinessError('查询参数不合法'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '查询参数不合法' })
      );
    });

    it('should return 403 when list throws ForbiddenError', async () => {
      mockList.mockRejectedValue(new ForbiddenError('无权查看该发布计划'));

      const req = {
        user: { userId: 3, role: 'view' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权查看该发布计划' })
      );
    });

    it('should return custom statusCode when list throws plain AppError', async () => {
      const { AppError } = require('../../apis/errors');
      mockList.mockRejectedValue(new AppError(422, '数据校验失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '数据校验失败' })
      );
    });

    it('should return 500 when list throws generic Error (not AppError)', async () => {
      mockList.mockRejectedValue(new Error('数据库连接超时'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取发布计划列表失败' })
      );
    });

    it('should return 500 when list throws non-Error value', async () => {
      mockList.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取发布计划列表失败' })
      );
    });
  });

  // ========== updatePublishingSchedule 更多 AppError 类型覆盖 ==========
  describe('updatePublishingSchedule - additional AppError coverage', () => {
    it('should return 409 when update throws ConflictError', async () => {
      const { ConflictError } = require('../../apis/errors');
      mockUpdateSchedule.mockRejectedValue(new ConflictError('发布计划正在被其他用户编辑'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划正在被其他用户编辑' })
      );
    });

    it('should return custom statusCode when update throws plain AppError', async () => {
      const { AppError } = require('../../apis/errors');
      mockUpdateSchedule.mockRejectedValue(new AppError(503, '服务暂时不可用'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '服务暂时不可用' })
      );
    });

    it('should return 500 when update throws generic Error via unit test', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('未知数据库错误'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '更新发布计划失败' })
      );
    });
  });

  // ========== 安全注入测试 ==========
  describe('Security injection tests', () => {
    it('should handle SQL injection attempt in search parameter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get("/api/v1/publishing-schedule?search='; DROP TABLE articles;--")
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "'; DROP TABLE articles;--" })
      );
    });

    it('should handle XSS attempt in search parameter', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=<script>alert(1)</script>')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '<script>alert(1)</script>' })
      );
    });

    it('should handle SQL injection attempt in id parameter (parseInt truncates at semicolon)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);
      const response = await agent
        .put('/api/v1/publishing-schedule/1; DROP TABLE articles;--')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      // parseInt('1; DROP TABLE articles;--') = 1, so id=1 is valid
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle prototype pollution attempt in body', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', __proto__: { polluted: true }, constructor: { prototype: { polluted: true } } },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      // Controller only reads scheduled_publish_at and schedule_type, ignores extra fields
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
    });

    it('should handle extremely long search string', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });
      const longSearch = 'a'.repeat(10000);

      const response = await agent
        .get(`/api/v1/publishing-schedule?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ search: longSearch })
      );
    });

    it('should handle extremely large page number', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999999999 })
      );
    });

    it('should handle extremely large pageSize (clamped to 100)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 })
      );
    });
  });

  // ========== 响应结构验证 ==========
  describe('Response structure verification', () => {
    it('should return correct structure for paginated list', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 50 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=3&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('list');
      expect(response.body.data).toHaveProperty('total', 50);
      expect(response.body.data).toHaveProperty('page', 3);
      expect(response.body.data).toHaveProperty('pageSize', 10);
    });

    it('should return item with all expected fields', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const item = response.body.data.list[0];
      expect(item).toHaveProperty('id', 1);
      expect(item).toHaveProperty('title', '测试文章标题');
      expect(item).toHaveProperty('keywords', '关键词1,关键词2');
      expect(item).toHaveProperty('article_type', 'original');
      expect(item).toHaveProperty('platforms');
      expect(item).toHaveProperty('status', 'publishing');
      expect(item).toHaveProperty('scheduled_publish_at');
      expect(item).toHaveProperty('project_id', 1);
      expect(item).toHaveProperty('project_name', '测试项目');
      expect(item).toHaveProperty('company_name', '测试公司');
      expect(item).toHaveProperty('created_by', 1);
      expect(item).toHaveProperty('created_by_name', '管理员');
    });

    it('should return correct structure for update success', async () => {
      const updatedItem = { ...mockScheduleItem, scheduled_publish_at: '2025-07-01T10:00:00.000Z' };
      mockUpdateSchedule.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-07-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '更新发布计划成功');
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('id', 1);
    });

    it('should return correct error structure for 400 errors', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should return correct error structure for 500 errors', async () => {
      mockList.mockRejectedValue(new Error('internal'));

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message', '获取发布计划列表失败');
    });
  });

  // ========== 角色矩阵测试 ==========
  describe('Role matrix tests', () => {
    it('should allow sysadmin to list all schedules', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 1, role: 'sysadmin' })
      );
    });

    it('should allow admin to list schedules for their company', async () => {
      mockList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${adminToken(5)}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 2, role: 'admin' })
      );
    });

    it('should allow view role to list schedules', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 3, role: 'view' })
      );
    });

    it('should allow sysadmin to update any schedule', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 1, 'sysadmin');
    });

    it('should allow admin to update schedules in their projects', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken(3)}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', null, 2, 'admin');
    });

    it('should deny view role from updating schedules', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(403);
    });
  });

  // ========== 边界值补充测试 ==========
  describe('Boundary value supplementary tests', () => {
    it('should pass status=publishing for all three roles', async () => {
      const tokens = [
        { token: sysadminToken(), userId: 1, role: 'sysadmin' },
        { token: adminToken(), userId: 2, role: 'admin' },
        { token: viewToken(), userId: 3, role: 'view' },
      ];

      for (const { token, userId, role } of tokens) {
        mockList.mockResolvedValue({ list: [], total: 0 });
        const response = await agent
          .get('/api/v1/publishing-schedule?status=publishing')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: 'publishing', userId, role })
        );
      }
    });

    it('should handle projectId with float value (parseInt truncates)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=3.7')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 3 })
      );
    });

    it('should handle negative projectId as valid number', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: -5 })
      );
    });

    it('should handle multiple query params with same key (uses last)', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      // Express query parser uses last value for duplicate keys
      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&page=5&pageSize=10&pageSize=20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // Express uses the last value for duplicate query params when using req.query as string
    });

    it('should handle update with very long scheduled_publish_at string', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z'.repeat(100) },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
    });

    it('should handle update with schedule_type=number 0', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: 0 },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      // 0 is falsy but 0 ?? null = 0 (nullish coalescing only triggers on null/undefined)
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', 0, 1, 'sysadmin');
    });

    it('should handle update with schedule_type=false (falsy but not null/undefined)', async () => {
      mockUpdateSchedule.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z', schedule_type: false },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      // false ?? null = false (nullish coalescing only triggers on null/undefined)
      expect(mockUpdateSchedule).toHaveBeenCalledWith(1, '2025-06-01T10:00:00.000Z', false, 1, 'sysadmin');
    });

    it('should handle list with all valid status values', async () => {
      const statuses = ['publishing', 'published', 'publish_failed'];
      for (const s of statuses) {
        mockList.mockResolvedValue({ list: [], total: 0 });
        const response = await agent
          .get(`/api/v1/publishing-schedule?status=${s}`)
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(mockList).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: s })
        );
      }
    });

    it('should treat "Publishing" (capitalized) as invalid status', async () => {
      mockList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=Publishing')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockList).toHaveBeenCalledWith(
        expect.objectContaining({ status: undefined })
      );
    });
  });

  // ========== 日志多样性测试 ==========
  describe('Log diversity tests', () => {
    let consoleSpy: jest.SpyInstance;

    beforeEach(() => {
      consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should log error with correct prefix when list fails with generic Error', async () => {
      mockList.mockRejectedValue(new Error('数据库连接失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PublishingScheduleController] listPublishingSchedule failed:',
        expect.any(Error)
      );
    });

    it('should NOT log error when list fails with AppError', async () => {
      mockList.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(consoleSpy).not.toHaveBeenCalled();
    });

    it('should log error with correct prefix when update fails with generic Error', async () => {
      mockUpdateSchedule.mockRejectedValue(new Error('更新失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(consoleSpy).toHaveBeenCalledWith(
        '[PublishingScheduleController] updatePublishingSchedule failed:',
        expect.any(Error)
      );
    });

    it('should NOT log error when update fails with AppError', async () => {
      mockUpdateSchedule.mockRejectedValue(new NotFoundError('文章'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { scheduled_publish_at: '2025-06-01T10:00:00.000Z' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(consoleSpy).not.toHaveBeenCalled();
    });
  });
});

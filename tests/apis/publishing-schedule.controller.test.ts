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
process.env.RATE_LIMIT_MAX = '1000';

// Mock the schedule service factory
const mockScheduleList = jest.fn();
const mockScheduleCreate = jest.fn();
const mockScheduleUpdate = jest.fn();
const mockScheduleReject = jest.fn();
const mockScheduleDelete = jest.fn();

// Mock the article service factory (for listPublishableArticles)
const mockArticleList = jest.fn();

jest.mock('../../apis/service/impl/publishing-schedule.service.impl', () => ({
  PublishingScheduleServiceImpl: jest.fn().mockImplementation(() => ({
    list: mockScheduleList,
    create: mockScheduleCreate,
    update: mockScheduleUpdate,
    reject: mockScheduleReject,
    delete: mockScheduleDelete,
  })),
}));

jest.mock('../../apis/service/impl/article.service.impl', () => ({
  ArticleServiceImpl: jest.fn().mockImplementation(() => ({
    list: mockArticleList,
  })),
}));

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';
import {
  listPublishingSchedule,
  createPublishingSchedule,
  updatePublishingSchedule,
  rejectPublishingSchedule,
  deletePublishingSchedule,
  listPublishableArticles,
} from '../../apis/controller/publishing-schedule.controller';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' },
  );
}

function adminToken(companyId = 2) {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' },
  );
}

function viewToken() {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' },
  );
}

const mockScheduleItem = {
  id: 1,
  article_id: 10,
  title: '测试文章标题',
  keywords: '关键词1,关键词2',
  article_type: 'original',
  platforms: ['新浪'],
  status: 'pending',
  schedule_type: 'asap',
  scheduled_publish_at: '2025-06-01T10:00:00.000Z',
  project_id: 1,
  project_name: '测试项目',
  company_name: '测试公司',
  created_by: 1,
  created_by_name: '管理员',
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-02'),
};

const mockCreatedSchedule = {
  id: 1,
  article_id: 10,
  platforms: ['新浪'],
  schedule_type: 'asap',
  scheduled_publish_at: null,
  status: 'pending',
  reject_reason: null,
  created_by: 1,
  created_at: new Date('2025-01-01'),
  updated_at: new Date('2025-01-01'),
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
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

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
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should return paginated list for view role', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should use default page=1 and pageSize=10 when not provided', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        { page: 1, pageSize: 10, search: undefined, status: undefined, projectId: undefined },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should pass search parameter to service', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&search=测试')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试' }),
        expect.anything(),
      );
    });

    it('should pass status parameter to service', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&status=publishing')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'publishing' }),
        expect.anything(),
      );
    });

    it('should pass projectId parameter to service', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10&projectId=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ projectId: 5 }),
        expect.anything(),
      );
    });

    it('should pass all query parameters together', async () => {
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=2&pageSize=5&search=文章&status=publishing&projectId=3')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith({
        page: 2,
        pageSize: 5,
        search: '文章',
        status: 'publishing',
        projectId: 3,
      }, { userId: 1, role: 'sysadmin' });
    });

    it('should pass userId and role for admin user', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${adminToken(5)}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 2, role: 'admin' }),
      );
    });

    it('should pass userId and role for view user', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 3, role: 'view' }),
      );
    });

    it('should return empty list when no results', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(0);
      expect(response.body.data.total).toBe(0);
    });

    it('should return 500 with fixed message when service throws error', async () => {
      mockScheduleList.mockRejectedValue(new Error('数据库连接失败'));

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布计划列表失败');
    });

    it('should return 500 with default message when service error has no message', async () => {
      mockScheduleList.mockRejectedValue(new Error());

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取发布计划列表失败');
    });
  });

  // ========== POST /api/publishing-schedule (createPublishingSchedule) ==========
  describe('POST /api/publishing-schedule', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/v1/publishing-schedule');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(403);
    });

    it('should create successfully for sysadmin', async () => {
      mockScheduleCreate.mockResolvedValue(mockCreatedSchedule);

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建发布计划成功');
      expect(mockScheduleCreate).toHaveBeenCalledWith(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap', scheduled_publish_at: undefined },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should create successfully for admin', async () => {
      mockScheduleCreate.mockResolvedValue(mockCreatedSchedule);

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(mockScheduleCreate).toHaveBeenCalledWith(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap', scheduled_publish_at: undefined },
        { userId: 2, role: 'admin' },
      );
    });

    it('should create with scheduled_publish_at', async () => {
      mockScheduleCreate.mockResolvedValue({
        ...mockCreatedSchedule,
        schedule_type: 'scheduled',
        scheduled_publish_at: '2025-07-01T10:00:00.000Z',
      });

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          article_id: 10,
          platforms: ['新浪'],
          schedule_type: 'scheduled',
          scheduled_publish_at: '2025-07-01T10:00:00.000Z',
        });

      expect(response.status).toBe(201);
      expect(mockScheduleCreate).toHaveBeenCalledWith(
        {
          article_id: 10,
          platforms: ['新浪'],
          schedule_type: 'scheduled',
          scheduled_publish_at: '2025-07-01T10:00:00.000Z',
        },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should return 404 when article does not exist', async () => {
      mockScheduleCreate.mockRejectedValue(new NotFoundError('文章'));

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 999, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should return 400 when article is not approved', async () => {
      mockScheduleCreate.mockRejectedValue(new BusinessError('只能为已审核通过的文章创建发布计划'));

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只能为已审核通过的文章创建发布计划');
    });

    it('should return 403 when non-owner creates schedule', async () => {
      mockScheduleCreate.mockRejectedValue(new ForbiddenError('只能为自己的文章创建发布计划'));

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能为自己的文章创建发布计划');
    });

    it('should return 500 for generic service errors', async () => {
      mockScheduleCreate.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建发布计划失败');
    });

    it('should return 400 when article_id is missing (schema validation)', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when platforms is empty (schema validation)', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: [], schedule_type: 'asap' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when schedule_type is invalid (schema validation)', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'invalid' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when scheduled type without scheduled_publish_at (schema validation)', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'scheduled' });

      expect(response.status).toBe(400);
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

    it('should update successfully with valid data', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' };
      mockScheduleUpdate.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新发布计划成功');
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z', status: undefined },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should update successfully for admin role', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ schedule_type: 'asap', scheduled_publish_at: null });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: 'asap', scheduled_publish_at: null, status: undefined },
        { userId: 2, role: 'admin' },
      );
    });

    it('should update with status field', async () => {
      const updatedItem = { ...mockScheduleItem, status: 'publishing' };
      mockScheduleUpdate.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'publishing' });

      expect(response.status).toBe(200);
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: undefined, scheduled_publish_at: undefined, status: 'publishing' },
        { userId: 1, role: 'sysadmin' },
      );
    });

    // empty body should pass validation (all fields optional)
    it('should accept empty body', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
    });

    it('should return 404 when schedule does not exist', async () => {
      mockScheduleUpdate.mockRejectedValue(new NotFoundError('发布计划'));

      const response = await agent
        .put('/api/v1/publishing-schedule/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('发布计划不存在');
    });

    it('should return 403 when user has no access', async () => {
      mockScheduleUpdate.mockRejectedValue(new ForbiddenError('无权操作此发布计划'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作此发布计划');
    });

    it('should return 500 with fixed message for generic service errors', async () => {
      mockScheduleUpdate.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新发布计划失败');
    });

    it('should return 400 for invalid schedule_type (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'invalid' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('排期类型');
    });

    it('should return 400 for invalid scheduled_publish_at (schema validation)', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: 'not-a-date' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('scheduled_publish_at日期格式无效');
    });

    it('should handle id=0 as valid integer', async () => {
      mockScheduleUpdate.mockRejectedValue(new NotFoundError('发布计划'));
      const response = await agent
        .put('/api/v1/publishing-schedule/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle negative id', async () => {
      mockScheduleUpdate.mockRejectedValue(new NotFoundError('发布计划'));
      const response = await agent
        .put('/api/v1/publishing-schedule/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('发布计划不存在');
    });
  });

  // ========== PUT /api/publishing-schedule/:id/reject (rejectPublishingSchedule) ==========
  describe('PUT /api/publishing-schedule/:id/reject', () => {
    const mockRejectedSchedule = {
      id: 1,
      article_id: 10,
      platforms: ['新浪'],
      schedule_type: 'asap',
      scheduled_publish_at: null,
      status: 'publish_failed',
      reject_reason: null,
      created_by: 2,
      created_at: new Date('2025-01-01'),
      updated_at: new Date('2025-01-02'),
    };

    it('should return 401 without token', async () => {
      const response = await agent.put('/api/v1/publishing-schedule/1/reject');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should reject successfully for sysadmin (non-creator)', async () => {
      mockScheduleReject.mockResolvedValue(mockRejectedSchedule);

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('驳回成功');
      expect(mockScheduleReject).toHaveBeenCalledWith(1, { userId: 1, role: 'sysadmin' }, undefined);
    });

    it('should reject successfully for admin (non-creator)', async () => {
      mockScheduleReject.mockResolvedValue({ ...mockRejectedSchedule, status: 'publish_failed' });

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockScheduleReject).toHaveBeenCalledWith(1, { userId: 2, role: 'admin' }, undefined);
    });

    it('should reject with reason and pass to service', async () => {
      mockScheduleReject.mockResolvedValue({ ...mockRejectedSchedule, reject_reason: '内容不符合要求' });

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ reason: '内容不符合要求' });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockScheduleReject).toHaveBeenCalledWith(1, { userId: 1, role: 'sysadmin' }, '内容不符合要求');
    });

    it('should reject without reason body (optional)', async () => {
      mockScheduleReject.mockResolvedValue(mockRejectedSchedule);

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
      expect(mockScheduleReject).toHaveBeenCalledWith(1, { userId: 1, role: 'sysadmin' }, undefined);
    });

    it('should return 400 when id is not a number', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/abc/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的ID');
    });

    it('should return 404 when schedule does not exist', async () => {
      mockScheduleReject.mockRejectedValue(new NotFoundError('发布计划'));

      const response = await agent
        .put('/api/v1/publishing-schedule/999/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('发布计划不存在');
    });

    it('should return 400 when schedule status does not support reject', async () => {
      mockScheduleReject.mockRejectedValue(new BusinessError('当前发布计划状态不支持驳回操作'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前发布计划状态不支持驳回操作');
    });

    it('should return 403 when creator tries to reject own schedule', async () => {
      mockScheduleReject.mockRejectedValue(new ForbiddenError('不能驳回自己创建的发布计划'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('不能驳回自己创建的发布计划');
    });

    it('should return 500 with fixed message for generic service errors', async () => {
      mockScheduleReject.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('驳回操作失败');
    });
  });

  // ========== DELETE /api/publishing-schedule/:id (deletePublishingSchedule) ==========
  describe('DELETE /api/publishing-schedule/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.delete('/api/v1/publishing-schedule/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should delete successfully for sysadmin', async () => {
      mockScheduleDelete.mockResolvedValue(undefined);

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('删除发布计划成功');
      expect(mockScheduleDelete).toHaveBeenCalledWith(1, { userId: 1, role: 'sysadmin' });
    });

    it('should delete successfully for admin (own schedule)', async () => {
      mockScheduleDelete.mockResolvedValue(undefined);

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(mockScheduleDelete).toHaveBeenCalledWith(1, { userId: 2, role: 'admin' });
    });

    it('should return 400 when id is not a number', async () => {
      const response = await agent
        .delete('/api/v1/publishing-schedule/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的ID');
    });

    it('should return 404 when schedule does not exist', async () => {
      mockScheduleDelete.mockRejectedValue(new NotFoundError('发布计划'));

      const response = await agent
        .delete('/api/v1/publishing-schedule/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('发布计划不存在');
    });

    it('should return 400 when schedule is publishing/published', async () => {
      mockScheduleDelete.mockRejectedValue(new BusinessError('发布中或已发布的计划不能删除'));

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('发布中或已发布的计划不能删除');
    });

    it('should return 403 when non-owner non-sysadmin tries to delete', async () => {
      mockScheduleDelete.mockRejectedValue(new ForbiddenError('只能删除自己创建的发布计划'));

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能删除自己创建的发布计划');
    });

    it('should return 500 with fixed message for generic service errors', async () => {
      mockScheduleDelete.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除发布计划失败');
    });
  });

  // ========== GET /api/publishing-schedule/articles (listPublishableArticles) ==========
  describe('GET /api/publishing-schedule/articles', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/publishing-schedule/articles');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule/articles')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should return approved articles for sysadmin', async () => {
      mockArticleList.mockResolvedValue({ list: [{ id: 10, title: '文章A' }], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule/articles?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
    });

    it('should return approved articles for admin', async () => {
      mockArticleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule/articles')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should use default page=1 and pageSize=10', async () => {
      mockArticleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule/articles')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockArticleList).toHaveBeenCalledWith(
        0, 1, 10, { userId: 1, role: 'sysadmin' }, undefined, 'approved',
      );
    });

    it('should pass search parameter to article service', async () => {
      mockArticleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule/articles?search=测试')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockArticleList).toHaveBeenCalledWith(
        0, 1, 10, { userId: 1, role: 'sysadmin' }, '测试', 'approved',
      );
    });

    it('should pass projectId parameter to article service', async () => {
      mockArticleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule/articles?projectId=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockArticleList).toHaveBeenCalledWith(
        5, 1, 10, { userId: 1, role: 'sysadmin' }, undefined, 'approved',
      );
    });

    it('should return 500 for generic service errors', async () => {
      mockArticleList.mockRejectedValue(new Error('内部服务错误'));

      const response = await agent
        .get('/api/v1/publishing-schedule/articles')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取可发布文章列表失败');
    });
  });

  // ========== Edge Cases for listPublishingSchedule ==========
  describe('GET /api/publishing-schedule - edge cases', () => {
    it('should return 400 when page is non-numeric (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=abc&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when pageSize is non-numeric (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=xyz')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when page is 0 (Zod min(1) rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=0&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when pageSize is negative (Zod min(1) rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is empty string (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return multiple items correctly', async () => {
      const items = [
        mockScheduleItem,
        { ...mockScheduleItem, id: 2, title: '第二篇文章' },
        { ...mockScheduleItem, id: 3, title: '第三篇文章' },
      ];
      mockScheduleList.mockResolvedValue({ list: items, total: 3 });

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
      mockScheduleList.mockResolvedValue({ list: [], total: 100 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=999&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999 }),
        expect.anything(),
      );
    });

    it('should handle special characters in search', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=%E6%B5%8B%E8%AF%95%26%3C%3E')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '测试&<>' }),
        expect.anything(),
      );
    });

    it('should return 400 when projectId is 0 (Zod positive() rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return correct pagination metadata for page 2', async () => {
      const items = [mockScheduleItem];
      mockScheduleList.mockResolvedValue({ list: items, total: 15 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=2&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(10);
      expect(response.body.data.total).toBe(15);
    });

    it('should return 400 when status is invalid (Zod enum rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?status=invalid_status')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when projectId is non-numeric (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when pageSize exceeds max 100 (Zod max(100) rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should pass status=published correctly', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=published')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'published' }),
        expect.anything(),
      );
    });

    it('should pass status=publish_failed correctly', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?status=publish_failed')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ status: 'publish_failed' }),
        expect.anything(),
      );
    });

    it('should accept pageSize=100 as exact max boundary', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=100')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 100 }),
        expect.anything(),
      );
    });

    it('should accept pageSize=1 as exact min boundary', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ pageSize: 1 }),
        expect.anything(),
      );
    });

    it('should return 400 when page is negative (Zod min(1) rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=-5&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should handle search as trimmed empty string when search= is provided', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Zod trim() + optional(): empty string after trim is '', which is a valid string
      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '' }),
        expect.anything(),
      );
    });

    it('should return 400 when page value is "undefined" (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?page=undefined')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 when pageSize value is "null" (Zod rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=null')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });
  });

  // ========== Unit tests: direct controller function calls ==========
  describe('Unit tests - direct controller calls', () => {
    // updatePublishingSchedule unit tests
    it('should pass through all body fields to service (update)', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z', status: 'publishing' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 }),
      );
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: 'scheduled', scheduled_publish_at: '2025-06-01T10:00:00.000Z', status: 'publishing' },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should return 401 when req.user is missing (update)', async () => {
      const req = { params: { id: '1' }, body: {} } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    it('should return 400 when id is NaN (update)', async () => {
      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: 'abc' },
        body: { schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的ID' }),
      );
    });

    it('should return 500 when non-Error value is thrown (update)', async () => {
      mockScheduleUpdate.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '更新发布计划失败' }),
      );
    });

    // listPublishingSchedule unit tests
    it('should return 500 when non-Error value is thrown (list)', async () => {
      mockScheduleList.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取发布计划列表失败' }),
      );
    });

    it('should return 401 when req.user is missing (list)', async () => {
      const req = { query: {} } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    // createPublishingSchedule unit tests
    it('should return 401 when req.user is missing (create)', async () => {
      const req = { body: {} } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    it('should return 500 when non-Error value is thrown (create)', async () => {
      mockScheduleCreate.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        body: { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '创建发布计划失败' }),
      );
    });

    // rejectPublishingSchedule unit tests
    it('should return 401 when req.user is missing (reject)', async () => {
      const req = { params: { id: '1' } } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    it('should return 400 when id is NaN (reject)', async () => {
      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: 'abc' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的ID' }),
      );
    });

    it('should return 500 when non-Error value is thrown (reject)', async () => {
      mockScheduleReject.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '驳回操作失败' }),
      );
    });

    // deletePublishingSchedule unit tests
    it('should return 401 when req.user is missing (delete)', async () => {
      const req = { params: { id: '1' } } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    it('should return 400 when id is NaN (delete)', async () => {
      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: 'abc' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无效的ID' }),
      );
    });

    it('should return 500 when non-Error value is thrown (delete)', async () => {
      mockScheduleDelete.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '删除发布计划失败' }),
      );
    });

    // listPublishableArticles unit tests
    it('should return 401 when req.user is missing (articles)', async () => {
      const req = { query: {} } as any;
      const res = createMockRes();

      await listPublishableArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未授权访问' }),
      );
    });

    it('should return 500 when non-Error value is thrown (articles)', async () => {
      mockArticleList.mockImplementation(() => { throw 'string error'; });

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '20' },
      } as any;
      const res = createMockRes();

      await listPublishableArticles(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取可发布文章列表失败' }),
      );
    });
  });

  // ========== listPublishingSchedule AppError catch branch ==========
  describe('listPublishingSchedule - AppError catch branch', () => {
    it('should return 404 when list throws NotFoundError', async () => {
      mockScheduleList.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划不存在' }),
      );
    });

    it('should return 400 when list throws BusinessError', async () => {
      mockScheduleList.mockRejectedValue(new BusinessError('查询参数不合法'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '查询参数不合法' }),
      );
    });

    it('should return 403 when list throws ForbiddenError', async () => {
      mockScheduleList.mockRejectedValue(new ForbiddenError('无权查看该发布计划'));

      const req = {
        user: { userId: 3, role: 'view' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权查看该发布计划' }),
      );
    });

    it('should return custom statusCode when list throws plain AppError', async () => {
      const { AppError } = require('../../apis/errors');
      mockScheduleList.mockRejectedValue(new AppError(422, '数据校验失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(422);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '数据校验失败' }),
      );
    });

    it('should return 500 when list throws generic Error', async () => {
      mockScheduleList.mockRejectedValue(new Error('数据库连接超时'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        query: { page: '1', pageSize: '10' },
      } as any;
      const res = createMockRes();

      await listPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取发布计划列表失败' }),
      );
    });
  });

  // ========== updatePublishingSchedule AppError catch branch ==========
  describe('updatePublishingSchedule - AppError catch branch', () => {
    it('should return 409 when update throws ConflictError', async () => {
      const { ConflictError } = require('../../apis/errors');
      mockScheduleUpdate.mockRejectedValue(new ConflictError('发布计划正在被其他用户编辑'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(409);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划正在被其他用户编辑' }),
      );
    });

    it('should return custom statusCode when update throws plain AppError', async () => {
      const { AppError } = require('../../apis/errors');
      mockScheduleUpdate.mockRejectedValue(new AppError(503, '服务暂时不可用'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(503);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '服务暂时不可用' }),
      );
    });

    it('should return 500 when update throws generic Error', async () => {
      mockScheduleUpdate.mockRejectedValue(new Error('未知数据库错误'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '更新发布计划失败' }),
      );
    });

    it('should return 404 for NotFoundError via unit test', async () => {
      mockScheduleUpdate.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '999' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划不存在' }),
      );
    });

    it('should return 400 for BusinessError via unit test', async () => {
      mockScheduleUpdate.mockRejectedValue(new BusinessError('参数不合法'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '参数不合法' }),
      );
    });

    it('should return 403 for ForbiddenError via unit test', async () => {
      mockScheduleUpdate.mockRejectedValue(new ForbiddenError('无权操作此发布计划'));

      const req = {
        user: { userId: 2, role: 'admin' },
        params: { id: '1' },
        body: {},
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权操作此发布计划' }),
      );
    });
  });

  // ========== createPublishingSchedule AppError catch branch ==========
  describe('createPublishingSchedule - AppError catch branch', () => {
    it('should return 404 for NotFoundError', async () => {
      mockScheduleCreate.mockRejectedValue(new NotFoundError('文章'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        body: { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '文章不存在' }),
      );
    });

    it('should return 400 for BusinessError', async () => {
      mockScheduleCreate.mockRejectedValue(new BusinessError('只能为已审核通过的文章创建发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        body: { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 for ForbiddenError', async () => {
      mockScheduleCreate.mockRejectedValue(new ForbiddenError('只能为自己的文章创建发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        body: { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for generic Error', async () => {
      mockScheduleCreate.mockRejectedValue(new Error('数据库连接失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        body: { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
      } as any;
      const res = createMockRes();

      await createPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '创建发布计划失败' }),
      );
    });
  });

  // ========== deletePublishingSchedule AppError catch branch ==========
  describe('deletePublishingSchedule - AppError catch branch', () => {
    it('should return 404 for NotFoundError', async () => {
      mockScheduleDelete.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '999' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划不存在' }),
      );
    });

    it('should return 400 for BusinessError', async () => {
      mockScheduleDelete.mockRejectedValue(new BusinessError('发布中或已发布的计划不能删除'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 403 for ForbiddenError', async () => {
      mockScheduleDelete.mockRejectedValue(new ForbiddenError('只能删除自己创建的发布计划'));

      const req = {
        user: { userId: 2, role: 'admin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 500 for generic Error', async () => {
      mockScheduleDelete.mockRejectedValue(new Error('数据库连接失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await deletePublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '删除发布计划失败' }),
      );
    });
  });

  // ========== rejectPublishingSchedule AppError catch branch ==========
  describe('rejectPublishingSchedule - AppError catch branch', () => {
    it('should return 404 for NotFoundError', async () => {
      mockScheduleReject.mockRejectedValue(new NotFoundError('发布计划'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '999' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '发布计划不存在' }),
      );
    });

    it('should return 403 for ForbiddenError', async () => {
      mockScheduleReject.mockRejectedValue(new ForbiddenError('不能驳回自己创建的发布计划'));

      const req = {
        user: { userId: 2, role: 'admin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(403);
    });

    it('should return 400 for BusinessError', async () => {
      mockScheduleReject.mockRejectedValue(new BusinessError('当前发布计划状态不支持驳回操作'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should return 500 for generic Error', async () => {
      mockScheduleReject.mockRejectedValue(new Error('数据库连接失败'));

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
      } as any;
      const res = createMockRes();

      await rejectPublishingSchedule(req, res);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '驳回操作失败' }),
      );
    });
  });

  // ========== 安全注入测试 ==========
  describe('Security injection tests', () => {
    it('should handle SQL injection attempt in search parameter', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get("/api/v1/publishing-schedule?search='; DROP TABLE publishing_schedules;--")
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ search: "'; DROP TABLE publishing_schedules;--" }),
        expect.anything(),
      );
    });

    it('should handle XSS attempt in search parameter', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?search=<script>alert(1)</script>')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ search: '<script>alert(1)</script>' }),
        expect.anything(),
      );
    });

    it('should handle SQL injection attempt in id parameter', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);
      const response = await agent
        .put('/api/v1/publishing-schedule/1; DROP TABLE publishing_schedules;--')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      // parseInt('1; DROP TABLE publishing_schedules;--') = 1
      expect([200, 400, 404, 500]).toContain(response.status);
    });

    it('should handle prototype pollution attempt in body', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const req = {
        user: { userId: 1, role: 'sysadmin' },
        params: { id: '1' },
        body: { schedule_type: 'asap', __proto__: { polluted: true }, constructor: { prototype: { polluted: true } } },
      } as any;
      const res = createMockRes();

      await updatePublishingSchedule(req, res);

      // Controller only reads schedule_type, scheduled_publish_at, status
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 }),
      );
    });

    it('should return 400 for extremely long search string (Zod max(200) rejects)', async () => {
      const longSearch = 'a'.repeat(10000);

      const response = await agent
        .get(`/api/v1/publishing-schedule?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should handle extremely large page number', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.objectContaining({ page: 999999999 }),
        expect.anything(),
      );
    });

    it('should return 400 for extremely large pageSize (Zod max(100) rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?pageSize=999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });
  });

  // ========== 响应结构验证 ==========
  describe('Response structure verification', () => {
    it('should return correct structure for paginated list', async () => {
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 50 });

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
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule?page=1&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const item = response.body.data.list[0];
      expect(item).toHaveProperty('id', 1);
      expect(item).toHaveProperty('article_id', 10);
      expect(item).toHaveProperty('title', '测试文章标题');
      expect(item).toHaveProperty('keywords', '关键词1,关键词2');
      expect(item).toHaveProperty('article_type', 'original');
      expect(item).toHaveProperty('platforms');
      expect(item).toHaveProperty('status', 'pending');
      expect(item).toHaveProperty('schedule_type', 'asap');
      expect(item).toHaveProperty('scheduled_publish_at');
      expect(item).toHaveProperty('project_id', 1);
      expect(item).toHaveProperty('project_name', '测试项目');
      expect(item).toHaveProperty('company_name', '测试公司');
      expect(item).toHaveProperty('created_by', 1);
      expect(item).toHaveProperty('created_by_name', '管理员');
    });

    it('should return correct structure for create success', async () => {
      mockScheduleCreate.mockResolvedValue(mockCreatedSchedule);

      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '创建发布计划成功');
      expect(response.body).toHaveProperty('data');
    });

    it('should return correct structure for update success', async () => {
      const updatedItem = { ...mockScheduleItem, schedule_type: 'scheduled' };
      mockScheduleUpdate.mockResolvedValue(updatedItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'scheduled', scheduled_publish_at: '2025-07-01T10:00:00.000Z' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '更新发布计划成功');
      expect(response.body).toHaveProperty('data');
    });

    it('should return correct structure for delete success', async () => {
      mockScheduleDelete.mockResolvedValue(undefined);

      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '删除发布计划成功');
    });

    it('should return correct error structure for 400 errors', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });

    it('should return correct error structure for 500 errors', async () => {
      mockScheduleList.mockRejectedValue(new Error('internal'));

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
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 1, role: 'sysadmin' }),
      );
    });

    it('should allow admin to list schedules for their company', async () => {
      mockScheduleList.mockResolvedValue({ list: [mockScheduleItem], total: 1 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${adminToken(5)}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 2, role: 'admin' }),
      );
    });

    it('should allow view role to list schedules', async () => {
      mockScheduleList.mockResolvedValue({ list: [], total: 0 });

      const response = await agent
        .get('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(200);
      expect(mockScheduleList).toHaveBeenCalledWith(
        expect.anything(),
        expect.objectContaining({ userId: 3, role: 'view' }),
      );
    });

    it('should allow sysadmin to update any schedule', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(200);
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: 'asap', scheduled_publish_at: undefined, status: undefined },
        { userId: 1, role: 'sysadmin' },
      );
    });

    it('should allow admin to update schedules in their projects', async () => {
      mockScheduleUpdate.mockResolvedValue(mockScheduleItem);

      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${adminToken(3)}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(200);
      expect(mockScheduleUpdate).toHaveBeenCalledWith(
        1,
        { schedule_type: 'asap', scheduled_publish_at: undefined, status: undefined },
        { userId: 2, role: 'admin' },
      );
    });

    it('should deny view role from updating schedules', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ schedule_type: 'asap' });

      expect(response.status).toBe(403);
    });

    it('should deny view role from creating schedules', async () => {
      const response = await agent
        .post('/api/v1/publishing-schedule')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ article_id: 10, platforms: ['新浪'], schedule_type: 'asap' });

      expect(response.status).toBe(403);
    });

    it('should deny view role from deleting schedules', async () => {
      const response = await agent
        .delete('/api/v1/publishing-schedule/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should deny view role from rejecting schedules', async () => {
      const response = await agent
        .put('/api/v1/publishing-schedule/1/reject')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });

    it('should deny view role from listing publishable articles', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule/articles')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });
  });

  // ========== 边界值补充测试 ==========
  describe('Boundary value supplementary tests', () => {
    it('should pass status=pending for all three roles', async () => {
      const tokens = [
        { token: sysadminToken(), userId: 1, role: 'sysadmin' },
        { token: adminToken(), userId: 2, role: 'admin' },
        { token: viewToken(), userId: 3, role: 'view' },
      ];

      for (const { token, userId, role } of tokens) {
        mockScheduleList.mockResolvedValue({ list: [], total: 0 });
        const response = await agent
          .get('/api/v1/publishing-schedule?status=pending')
          .set('Authorization', `Bearer ${token}`);

        expect(response.status).toBe(200);
        expect(mockScheduleList).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: 'pending' }),
          expect.objectContaining({ userId, role }),
        );
      }
    });

    it('should return 400 for projectId with float value (Zod int() rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=3.7')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 400 for negative projectId (Zod positive() rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?projectId=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should handle list with all valid status values', async () => {
      const statuses = ['pending', 'publishing', 'published', 'publish_failed'];
      for (const s of statuses) {
        mockScheduleList.mockResolvedValue({ list: [], total: 0 });
        const response = await agent
          .get(`/api/v1/publishing-schedule?status=${s}`)
          .set('Authorization', `Bearer ${sysadminToken()}`);

        expect(response.status).toBe(200);
        expect(mockScheduleList).toHaveBeenLastCalledWith(
          expect.objectContaining({ status: s }),
          expect.anything(),
        );
      }
    });

    it('should return 400 for "Pending" (capitalized) as invalid status (Zod enum rejects)', async () => {
      const response = await agent
        .get('/api/v1/publishing-schedule?status=Pending')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });
  });
});

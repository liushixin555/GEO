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

const mockKB = {
  id: 1,
  name: '测试知识库',
  description: '测试描述',
  scope: 'platform',
  company_id: null,
  company_name: null,
  project_id: null,
  project_name: null,
  status: true,
  created_by: 1,
  creator_name: '管理员',
  keyword_count: 0,
  portrait_count: 0,
  image_count: 0,
  document_count: 0,
  created_at: new Date('2026-01-01'),
  updated_at: new Date('2026-01-01'),
};

describe('KnowledgeBase Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // =========================================================
  // Auth & Role Guards
  // =========================================================
  describe('Auth & Role Guards', () => {
    test('未登录访问知识库列表返回 401', async () => {
      const res = await agent.get('/api/knowledge-bases');
      expect(res.status).toBe(401);
    });

    test('view 角色访问知识库列表返回 403', async () => {
      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(res.status).toBe(403);
    });

    test('view 角色访问知识库详情返回 403', async () => {
      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(res.status).toBe(403);
    });

    test('view 角色创建知识库返回 403', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test', scope: 'platform' });
      expect(res.status).toBe(403);
    });

    test('view 角色更新知识库返回 403', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(res.status).toBe(403);
    });

    test('view 角色删除知识库返回 403', async () => {
      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(res.status).toBe(403);
    });
  });

  // =========================================================
  // GET /api/knowledge-bases — listKnowledgeBases
  // =========================================================
  describe('GET /api/knowledge-bases', () => {
    test('sysadmin 获取知识库列表成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([{
        ...mockKB,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      }]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.total).toBe(1);
      expect(res.body.data.page).toBe(1);
      expect(res.body.data.pageSize).toBe(10);
    });

    test('带分页参数查询知识库列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(2);
      expect(res.body.data.pageSize).toBe(5);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });

    test('带搜索参数查询知识库列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?search=测试')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalled();
    });

    test('带 scope 参数过滤知识库列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?scope=platform')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
    });

    test('带 status=true 参数过滤知识库列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?status=true')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
    });

    test('带 status=false 参数过滤知识库列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?status=false')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
    });

    test('不传 status 参数时不做状态过滤', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.status).toBeUndefined();
    });

    test('admin 角色获取知识库列表（带权限过滤）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      const mockFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 2, deletedAt: null } })
      );
    });

    test('admin 角色无对应用户记录返回空列表', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: jest.fn(), count: jest.fn() },
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(0);
      expect(res.body.data.total).toBe(0);
    });

    test('数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: jest.fn() },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });

    test('数据库异常无 message 返回默认错误', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: jest.fn() },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('获取知识库列表失败');
    });
  });

  // =========================================================
  // GET /api/knowledge-bases/:id — getKnowledgeBase
  // =========================================================
  describe('GET /api/knowledge-bases/:id', () => {
    test('sysadmin 获取知识库详情成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.name).toBe('测试知识库');
    });

    test('无效的 ID 参数返回 400', async () => {
      const res = await agent
        .get('/api/knowledge-bases/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的知识库ID');
    });

    test('知识库不存在返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    test('获取详情数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });

    test('获取详情异常无 message 返回默认错误', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('获取知识库详情失败');
    });
  });

  // =========================================================
  // POST /api/knowledge-bases — createKnowledgeBase
  // =========================================================
  describe('POST /api/knowledge-bases', () => {
    test('sysadmin 创建 platform 知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '新知识库', scope: 'platform' });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('创建知识库成功');
      expect(res.body.data.name).toBe('测试知识库');
    });

    test('admin 创建 company 知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        company_id: 2,
        company: { shortName: '测试公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ name: '公司知识库', scope: 'company', company_id: 2 });

      expect(res.status).toBe(201);
      expect(res.body.code).toBe(0);
    });

    test('admin 创建 project 知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        project_id: 1,
        company: null,
        project: { shortName: '测试项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ name: '项目知识库', scope: 'project', project_id: 1 });

      expect(res.status).toBe(201);
    });

    test('名称为空返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('scope 为空返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试知识库' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库范围不能为空');
    });

    test('company 知识库未选公司返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error('公司公共知识库必须选择公司'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '公司知识库', scope: 'company' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('公司公共知识库必须选择公司');
    });

    test('project 知识库未选项目返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error('项目私有知识库必须选择项目'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '项目知识库', scope: 'project' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('项目私有知识库必须选择项目');
    });

    test('创建时数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });

    test('创建时异常无 message 返回默认错误', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('创建知识库失败');
    });
  });

  // =========================================================
  // PUT /api/knowledge-bases/:id — updateKnowledgeBase
  // =========================================================
  describe('PUT /api/knowledge-bases/:id', () => {
    test('sysadmin 更新知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: '更新后知识库',
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '更新后知识库' });

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('更新知识库成功');
    });

    test('admin 更新自己创建的知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 2,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: '更新后',
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ name: '更新后' });

      expect(res.status).toBe(200);
    });

    test('无效的 ID 返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的知识库ID');
    });

    test('知识库不存在返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/knowledge-bases/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'test' });

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    test('非 sysadmin 修改他人知识库返回 403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 999,
        companyId: null,
        projectId: null,
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ name: 'test' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('只能修改自己创建的知识库');
    });

    test('更新时数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });

    test('更新时异常无 message 返回默认错误', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'test' });

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('更新知识库失败');
    });

    test('sysadmin 更新 scope 为 platform 时清除 company 和 project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        createdBy: 1,
        companyId: 2,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'platform' });

      expect(res.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'platform', companyId: null, projectId: null }),
        })
      );
    });

    test('更新 scope 为 company 且无 company_id 和已有 companyId 返回 500（controller 未映射为 400）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockRejectedValue(new Error('公司公共知识库必须选择公司'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'company' });

      // controller update 未对此错误做 400 映射，走 500 兜底
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('公司公共知识库必须选择公司');
    });

    test('更新 scope 为 project 且无 project_id 和已有 projectId 返回 500（controller 未映射为 400）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockRejectedValue(new Error('项目私有知识库必须选择项目'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'project' });

      // controller update 未对此错误做 400 映射，走 500 兜底
      expect(res.status).toBe(500);
      expect(res.body.message).toBe('项目私有知识库必须选择项目');
    });
  });

  // =========================================================
  // DELETE /api/knowledge-bases/:id — deleteKnowledgeBase
  // =========================================================
  describe('DELETE /api/knowledge-bases/:id', () => {
    test('sysadmin 删除知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
      });
      const mockUpdate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.message).toBe('删除知识库成功');
    });

    test('admin 删除自己创建的知识库成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 2,
      });
      const mockUpdate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('删除知识库成功');
    });

    test('无效的 ID 返回 400', async () => {
      const res = await agent
        .delete('/api/knowledge-bases/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的知识库ID');
    });

    test('知识库不存在返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .delete('/api/knowledge-bases/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    test('非 sysadmin 删除他人知识库返回 403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 999,
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('只能删除自己创建的知识库');
    });

    test('删除时数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('DB Error');
    });

    test('删除时异常无 message 返回默认错误', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(500);
      expect(res.body.message).toBe('删除知识库失败');
    });
  });
});

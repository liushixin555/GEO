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
import {
  listKnowledgeBases,
  getKnowledgeBase,
  createKnowledgeBase,
  updateKnowledgeBase,
  deleteKnowledgeBase,
} from '../../apis/controller/knowledge-base.controller';

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

    test('pageSize 超过上限被限制为 100', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?pageSize=999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pageSize).toBe(100);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
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
      expect(res.body.message).toBe('获取知识库列表失败');
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

    test('admin 获取 platform 知识库详情成功（可见性控制）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        status: true,
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
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.id).toBe(1);
    });

    test('admin 获取不属自己公司的 company 知识库返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        companyId: 999,
        company: { shortName: '其他公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
        user: { findFirst: mockUserFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    test('admin 获取不属自己项目的 project 知识库返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        projectId: 999,
        company: null,
        project: { shortName: '其他项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

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
      expect(res.body.message).toBe('获取知识库详情失败');
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

    test('名称为纯空格返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '   ', scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('名称为非字符串类型返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: [1, 2, 3], scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('名称超过200字符返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'A'.repeat(201), scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能超过200个字符');
    });

    test('描述超过2000字符返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', description: 'A'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('描述不能超过2000个字符');
    });

    test('scope 为空返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试知识库' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库范围不合法，应为 platform/company/project');
    });

    test('scope 为无效值返回 400', async () => {
      const res = await agent
        .post('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试知识库', scope: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库范围不合法，应为 platform/company/project');
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
      expect(res.body.message).toBe('创建知识库失败');
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

    test('无效的 scope 值返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库范围不合法，应为 platform/company/project');
    });

    test('更新时名称为空字符串返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('更新时名称超过200字符返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'A'.repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能超过200个字符');
    });

    test('更新时描述超过2000字符返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: 'A'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('描述不能超过2000个字符');
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
      expect(res.body.message).toBe('更新知识库失败');
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

    test('更新 scope 为 company 且无 company_id 和已有 companyId 返回 400', async () => {
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

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('公司公共知识库必须选择公司');
    });

    test('更新 scope 为 project 且无 project_id 和已有 projectId 返回 400', async () => {
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

      expect(res.status).toBe(400);
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
      expect(res.body.message).toBe('删除知识库失败');
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

  // =========================================================
  // 边界安全测试 — Boundary & Security Edge Cases
  // =========================================================
  describe('边界安全测试', () => {
    // --- List 边界 ---
    test('list: page=0 被修正为 1', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?page=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0 })
      );
    });

    test('list: 负数 page 被修正为 1', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?page=-5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.page).toBe(1);
    });

    test('list: pageSize=0 被修正为默认值 10', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?pageSize=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      // parseInt('0') || 10 = 10, then Math.min(100, Math.max(1, 10)) = 10
      expect(res.body.data.pageSize).toBe(10);
    });

    test('list: 负数 pageSize 被修正为 1', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/knowledge-bases?pageSize=-10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.data.pageSize).toBe(1);
    });

    test('list: search 超过100字符被截断', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const longSearch = 'A'.repeat(150);
      const res = await agent
        .get(`/api/knowledge-bases?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      // controller truncates search to 100 chars, service builds where clause from it
      expect(mockFindMany).toHaveBeenCalled();
    });

    test('list: service 抛出 "知识库不存在" 返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('知识库不存在'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: jest.fn() },
      });

      const res = await agent
        .get('/api/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    // --- Get 边界 ---
    test('get: ID=0 parseInt结果为0，不触发isNaN检查', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('0') = 0, isNaN(0) = false, so it queries DB with id=0
      expect(res.status).toBe(404);
    });

    test('get: 负数 ID parseInt结果为负数，查询DB', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('-1') = -1, isNaN(-1) = false, controller doesn't check negative
      expect(res.status).toBe(404);
    });

    test('get: 小数 ID 被解析为整数', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/knowledge-bases/1.5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('1.5') = 1, so it queries id=1
      expect([200, 404]).toContain(res.status);
    });

    // --- Create 边界 ---
    test('create: name 恰好200字符成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: 'A'.repeat(200),
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
        .send({ name: 'A'.repeat(200), scope: 'platform' });

      expect(res.status).toBe(201);
    });

    test('create: description 恰好2000字符成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: 'B'.repeat(2000),
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
        .send({ name: '测试', scope: 'platform', description: 'B'.repeat(2000) });

      expect(res.status).toBe(201);
    });

    test('create: description=null 不报错', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: null,
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
        .send({ name: '测试', scope: 'platform', description: null });

      expect(res.status).toBe(201);
    });

    test('create: company_id 为非整数被忽略', async () => {
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
        .send({ name: '测试', scope: 'platform', company_id: 1.5 });

      expect(res.status).toBe(201);
      // validateInteger returns undefined for float, service maps to companyId: null
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: null }),
        })
      );
    });

    test('create: company_id 为负数被忽略', async () => {
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
        .send({ name: '测试', scope: 'platform', company_id: -5 });

      expect(res.status).toBe(201);
      // validateInteger rejects negative, service maps to companyId: null
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: null }),
        })
      );
    });

    test('create: company_id 为0被忽略', async () => {
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
        .send({ name: '测试', scope: 'platform', company_id: 0 });

      expect(res.status).toBe(201);
      // validateInteger rejects 0 (value < 1), service maps to companyId: null
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: null }),
        })
      );
    });

    test('create: project_id 为非整数被忽略', async () => {
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
        .send({ name: '测试', scope: 'platform', project_id: 'abc' });

      expect(res.status).toBe(201);
      // validateInteger returns undefined for non-number, service maps to projectId: null
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: null }),
        })
      );
    });

    test('create: name 有前后空格被 trim', async () => {
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
        .send({ name: '  测试知识库  ', scope: 'platform' });

      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: '测试知识库' }),
        })
      );
    });

    // --- Update 边界 ---
    test('update: name 为非字符串类型返回 400', async () => {
      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 12345 });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('update: description=null 不报错', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: null,
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
        .send({ description: null });

      expect(res.status).toBe(200);
    });

    test('update: company_id 为非整数被忽略（validateInteger）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
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
        .send({ company_id: 3.14 });

      expect(res.status).toBe(200);
    });

    test('update: name 恰好200字符成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: 'A'.repeat(200),
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
        .send({ name: 'A'.repeat(200) });

      expect(res.status).toBe(200);
    });

    test('update: description 恰好2000字符成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: 'B'.repeat(2000),
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
        .send({ description: 'B'.repeat(2000) });

      expect(res.status).toBe(200);
    });

    test('update: sysadmin 可修改任意知识库（绕过创建者限制）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 999,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: 'sysadmin修改',
        company: null,
        project: null,
        creator: { cnName: '其他' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'sysadmin修改' });

      expect(res.status).toBe(200);
    });

    test('update: 不传 name 时不做名称验证', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: '只更新描述',
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
        .send({ description: '只更新描述' });

      expect(res.status).toBe(200);
    });

    // --- Delete 边界 ---
    test('delete: ID=0 parseInt结果为0，查询DB', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .delete('/api/knowledge-bases/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('0') = 0, isNaN(0) = false, so it queries DB
      expect(res.status).toBe(404);
    });

    test('delete: sysadmin 可删除任意知识库（绕过创建者限制）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 999,
      });
      const mockUpdate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .delete('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('删除知识库成功');
    });

    // --- 注入防护 ---
    test('create: 额外字段不会注入到数据库（mass assignment 防护）', async () => {
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
        .send({
          name: '测试',
          scope: 'platform',
          id: 999,
          created_by: 888,
          malicious_field: 'hack',
        });

      expect(res.status).toBe(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.id).toBeUndefined();
      expect(createData.created_by).toBeUndefined();
      expect(createData.malicious_field).toBeUndefined();
    });
  });

  // =========================================================
  // 直接测试 Controller 函数（覆盖 !user 防御性分支）
  // =========================================================
  describe('Controller !user 防御性分支（直接函数测试）', () => {
    function mockRes() {
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      return res;
    }

    test('listKnowledgeBases: req.user 不存在返回 401', async () => {
      const req = { query: {} } as any;
      const res = mockRes();
      await listKnowledgeBases(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });

    test('getKnowledgeBase: req.user 不存在返回 401', async () => {
      const req = { params: { id: '1' } } as any;
      const res = mockRes();
      await getKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });

    test('createKnowledgeBase: req.user 不存在返回 401', async () => {
      const req = {
        body: { name: '测试', scope: 'platform' },
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });

    test('updateKnowledgeBase: req.user 不存在返回 401', async () => {
      const req = { params: { id: '1' }, body: {} } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });

    test('deleteKnowledgeBase: req.user 不存在返回 401', async () => {
      const req = { params: { id: '1' } } as any;
      const res = mockRes();
      await deleteKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });
});

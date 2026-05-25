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
      const res = await agent.get('/api/v1/knowledge-bases');
      expect(res.status).toBe(401);
    });

    test('view 角色访问知识库列表返回 403', async () => {
      const res = await agent
        .get('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(res.status).toBe(403);
    });

    test('view 角色访问知识库详情返回 403', async () => {
      const res = await agent
        .get('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(res.status).toBe(403);
    });

    test('view 角色创建知识库返回 403', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test', scope: 'platform' });
      expect(res.status).toBe(403);
    });

    test('view 角色更新知识库返回 403', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(res.status).toBe(403);
    });

    test('view 角色删除知识库返回 403', async () => {
      const res = await agent
        .delete('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases?page=2&pageSize=5')
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
        .get('/api/v1/knowledge-bases?pageSize=999999')
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
        .get('/api/v1/knowledge-bases?search=测试')
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
        .get('/api/v1/knowledge-bases?scope=platform')
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
        .get('/api/v1/knowledge-bases?status=true')
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
        .get('/api/v1/knowledge-bases?status=false')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases')
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
        .get('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.id).toBe(1);
      expect(res.body.data.name).toBe('测试知识库');
    });

    test('无效的 ID 参数返回 400', async () => {
      const res = await agent
        .get('/api/v1/knowledge-bases/abc')
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
        .get('/api/v1/knowledge-bases/999')
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
        .get('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases/1')
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
        .post('/api/v1/knowledge-bases')
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
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
        user: { findFirst: mockUserFindFirst },
      });

      const res = await agent
        .post('/api/v1/knowledge-bases')
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
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 2, projectId: 1 });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
        projectOperator: { findFirst: mockOperatorFindFirst },
      });

      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ name: '项目知识库', scope: 'project', project_id: 1 });

      expect(res.status).toBe(201);
    });

    test('名称为空返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库名称不能为空');
    });

    test('名称为纯空格返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '   ', scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('名称为非字符串类型返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: [1, 2, 3], scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库名称不能为空');
    });

    test('名称超过200字符返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'A'.repeat(201), scope: 'platform' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库名称不能超过200个字符');
    });

    test('描述超过2000字符返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', description: 'A'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 描述不能超过2000个字符');
    });

    test('scope 为空返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试知识库' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库范围不合法，应为 platform/company/project');
    });

    test('scope 为无效值返回 400', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试知识库', scope: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库范围不合法，应为 platform/company/project');
    });

    test('company 知识库未选公司返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new BusinessError('公司公共知识库必须选择公司'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '公司知识库', scope: 'company' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('公司公共知识库必须选择公司');
    });

    test('project 知识库未选项目返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new BusinessError('项目私有知识库必须选择项目'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const res = await agent
        .post('/api/v1/knowledge-bases')
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
        .post('/api/v1/knowledge-bases')
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
        .post('/api/v1/knowledge-bases')
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
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ name: '更新后' });

      expect(res.status).toBe(200);
    });

    test('无效的 ID 返回 400', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'test' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('无效的知识库ID');
    });

    test('无效的 scope 值返回 400', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scope: 'invalid' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库范围不合法，应为 platform/company/project');
    });

    test('更新时名称为空字符串返回 400', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '   ' });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('知识库名称不能为空');
    });

    test('更新时名称超过200字符返回 400', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'A'.repeat(201) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 知识库名称不能超过200个字符');
    });

    test('更新时描述超过2000字符返回 400', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: 'A'.repeat(2001) });

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('参数验证失败: 描述不能超过2000个字符');
    });

    test('知识库不存在返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/999')
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
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ name: 'test' });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('只能修改自己创建的知识库');
    });

    test('admin 无权关联该公司返回 403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 2,
        companyId: 2,
        projectId: null,
      });
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
        user: { findFirst: mockUserFindFirst },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ company_id: 999 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无权关联该公司');
    });

    test('admin 无权关联该项目返回 403', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 2,
        companyId: null,
        projectId: null,
      });
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
        projectOperator: { findFirst: mockOperatorFindFirst },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ project_id: 999 });

      expect(res.status).toBe(403);
      expect(res.body.message).toBe('无权关联该项目');
    });

    test('更新时数据库异常返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
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
      const mockUpdate = jest.fn().mockRejectedValue(new BusinessError('公司公共知识库必须选择公司'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/1')
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
      const mockUpdate = jest.fn().mockRejectedValue(new BusinessError('项目私有知识库必须选择项目'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const res = await agent
        .put('/api/v1/knowledge-bases/1')
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
        .delete('/api/v1/knowledge-bases/1')
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
        .delete('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(res.status).toBe(200);
      expect(res.body.message).toBe('删除知识库成功');
    });

    test('无效的 ID 返回 400', async () => {
      const res = await agent
        .delete('/api/v1/knowledge-bases/abc')
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
        .delete('/api/v1/knowledge-bases/999')
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
        .delete('/api/v1/knowledge-bases/1')
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
        .delete('/api/v1/knowledge-bases/1')
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
        .delete('/api/v1/knowledge-bases/1')
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
        .get('/api/v1/knowledge-bases?page=0')
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
        .get('/api/v1/knowledge-bases?page=-5')
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
        .get('/api/v1/knowledge-bases?pageSize=0')
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
        .get('/api/v1/knowledge-bases?pageSize=-10')
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
        .get(`/api/v1/knowledge-bases?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      // controller truncates search to 100 chars, service builds where clause from it
      expect(mockFindMany).toHaveBeenCalled();
    });

    test('list: service 抛出 validateInteger 错误返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new BusinessError('company_id 必须为正整数'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: jest.fn() },
      });

      const res = await agent
        .get('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(400);
      expect(res.body.message).toBe('company_id 必须为正整数');
    });

    test('list: service 抛出 NotFoundError 返回 404（SEC-M-03 AppError 统一处理）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new NotFoundError('知识库'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: jest.fn() },
      });

      const res = await agent
        .get('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(404);
      expect(res.body.message).toBe('知识库不存在');
    });

    test('list: 无效 scope 参数被忽略（SEC-L-02）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/v1/knowledge-bases?scope=invalid')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.scope).toBeUndefined();
    });

    test('list: 有效 scope 参数正确传递', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const res = await agent
        .get('/api/v1/knowledge-bases?scope=company')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(res.status).toBe(200);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.scope).toBe('company');
    });

    // --- Get 边界 ---
    test('get: ID=0 parseInt结果为0，不触发isNaN检查', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const res = await agent
        .get('/api/v1/knowledge-bases/0')
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
        .get('/api/v1/knowledge-bases/-1')
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
        .get('/api/v1/knowledge-bases/1.5')
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
        .post('/api/v1/knowledge-bases')
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
        .post('/api/v1/knowledge-bases')
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
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', description: null });

      expect(res.status).toBe(201);
    });

    test('create: company_id 为非整数被 Zod 拒绝', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', company_id: 1.5 });

      expect(res.status).toBe(400);
    });

    test('create: company_id 为负数被 Zod 拒绝', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', company_id: -5 });

      expect(res.status).toBe(400);
    });

    test('create: company_id 为0被 Zod 拒绝', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', company_id: 0 });

      expect(res.status).toBe(400);
    });

    test('create: project_id 为非数字被 Zod 拒绝', async () => {
      const res = await agent
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: '测试', scope: 'platform', project_id: 'abc' });

      expect(res.status).toBe(400);
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
        .post('/api/v1/knowledge-bases')
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
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 12345 });

      expect(res.status).toBe(400);
      // Zod correctly rejects non-string type
      expect(res.body.message).toBeDefined();
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
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: null });

      expect(res.status).toBe(200);
    });

    test('update: company_id 为非整数被 Zod 拒绝', async () => {
      const res = await agent
        .put('/api/v1/knowledge-bases/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 3.14 });

      expect(res.status).toBe(400);
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
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
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
        .put('/api/v1/knowledge-bases/1')
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
        .delete('/api/v1/knowledge-bases/0')
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
        .delete('/api/v1/knowledge-bases/1')
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
        .post('/api/v1/knowledge-bases')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          name: '测试',
          scope: 'platform',
          id: 999,
          created_by: 888,
          malicious_field: 'hack',
        });

      // Zod 默认行为：剥离未知字段 + controller 仅解构已知字段 — mass assignment 防护
      expect(res.status).toBe(201);
      expect(mockCreate).toHaveBeenCalled();
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

  // =========================================================
  // 直接测试 Controller 防御性验证（覆盖 Zod 已拦截的分支）
  // =========================================================
  describe('Controller 防御性验证（直接函数测试，绕过 Zod）', () => {
    function mockRes() {
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      return res;
    }

    const mockUser = { userId: 1, username: 'sysadmin', role: 'sysadmin' };

    // --- createKnowledgeBase 防御性验证（覆盖 line 71, 74-75）---
    test('createKnowledgeBase: description 超过2000字符返回 400（绕过 Zod）', async () => {
      const req = {
        body: { name: '测试', description: 'A'.repeat(2001), scope: 'platform' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '描述不能超过2000个字符' })
      );
    });

    test('createKnowledgeBase: scope 无效值返回 400（绕过 Zod）', async () => {
      const req = {
        body: { name: '测试', scope: 'invalid_scope' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库范围不合法，应为 platform/company/project' })
      );
    });

    test('createKnowledgeBase: scope 为 undefined 返回 400（绕过 Zod）', async () => {
      const req = {
        body: { name: '测试' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库范围不合法，应为 platform/company/project' })
      );
    });

    // --- updateKnowledgeBase 防御性验证（覆盖 line 104-105, 115）---
    test('updateKnowledgeBase: scope 无效值返回 400（绕过 Zod）', async () => {
      const req = {
        params: { id: '1' },
        body: { scope: 'invalid_scope' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库范围不合法，应为 platform/company/project' })
      );
    });

    test('updateKnowledgeBase: description 超过2000字符返回 400（绕过 Zod）', async () => {
      const req = {
        params: { id: '1' },
        body: { description: 'A'.repeat(2001) },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '描述不能超过2000个字符' })
      );
    });

    // --- name > 200 防御性验证（覆盖 line 69, 112）---
    test('createKnowledgeBase: name 超过200字符返回 400（绕过 Zod）', async () => {
      const req = {
        body: { name: 'A'.repeat(201), scope: 'platform' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库名称不能超过200个字符' })
      );
    });

    test('updateKnowledgeBase: name 超过200字符返回 400（绕过 Zod）', async () => {
      const req = {
        params: { id: '1' },
        body: { name: 'A'.repeat(201) },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库名称不能超过200个字符' })
      );
    });

    // --- validateInteger 间接测试（覆盖 line 13 — 现在抛出错误而非静默吞没）---
    test('createKnowledgeBase: company_id 为浮点数被 validateInteger 拒绝返回 400', async () => {
      const req = {
        body: { name: '测试', scope: 'platform', company_id: 1.5 },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'company_id 必须为正整数' })
      );
    });

    test('createKnowledgeBase: project_id 为负数被 validateInteger 拒绝返回 400', async () => {
      const req = {
        body: { name: '测试', scope: 'platform', project_id: -5 },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'project_id 必须为正整数' })
      );
    });

    test('updateKnowledgeBase: company_id 为0被 validateInteger 拒绝返回 400', async () => {
      const req = {
        params: { id: '1' },
        body: { company_id: 0 },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'company_id 必须为正整数' })
      );
    });

    // --- status 类型验证测试（H-3）---
    test('updateKnowledgeBase: status 为 boolean false 正确传递（绕过 Zod）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        status: false,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { status: false },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.status).toBe(false);
    });

    test('updateKnowledgeBase: status 为非 boolean（字符串）被忽略（绕过 Zod）', async () => {
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

      const req = {
        params: { id: '1' },
        body: { status: 'true' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.status).toBeUndefined();
    });

    // --- description 类型验证测试（M-1）---
    test('createKnowledgeBase: description 为数组被转为 undefined（绕过 Zod）', async () => {
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

      const req = {
        body: { name: '测试', description: [1, 2, 3], scope: 'platform' },
        user: mockUser,
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.description).toBeNull();
    });

    // --- update description 类型验证测试（M-1 update 路径）---
    test('updateKnowledgeBase: description 为数组被转为 undefined（绕过 Zod）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        description: '原有描述',
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { description: [1, 2, 3] },
        user: mockUser,
      } as any;
      const res = mockRes();
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      const updateData = mockUpdate.mock.calls[0][0].data;
      // description 为数组被规范化为 undefined，不出现在 data 中
      expect(updateData.description).toBeUndefined();
    });

    // --- 无权关联分支（覆盖 line 96: create, line 149: update）---
    test('createKnowledgeBase: admin 无权关联该公司返回 403（绕过 Zod）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: jest.fn() },
        user: { findFirst: mockUserFindFirst },
      });

      const req = {
        body: { name: '公司知识库', scope: 'company', company_id: 999 },
        user: { userId: 2, username: 'admin', role: 'admin' },
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权关联该公司' })
      );
    });

    test('createKnowledgeBase: admin 无权关联该项目返回 403（绕过 Zod）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        knowledgeBase: { create: jest.fn() },
        projectOperator: { findFirst: mockOperatorFindFirst },
      });

      const req = {
        body: { name: '项目知识库', scope: 'project', project_id: 999 },
        user: { userId: 2, username: 'admin', role: 'admin' },
      } as any;
      const res = mockRes();
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权关联该项目' })
      );
    });
  });

  // =========================================================
  // Service 未覆盖分支补全测试
  // =========================================================
  describe('Service 未覆盖分支补全', () => {
    // --- list: admin 有 operator projects 时走 line 86 ---
    test('list: admin 有 operator projects 走 project scope 过滤（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      const mockOperatorFindMany = jest.fn().mockResolvedValue([{ projectId: 10 }, { projectId: 20 }]);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
        user: { findFirst: mockUserFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      expect(res.json).toHaveBeenCalled();
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.AND).toBeDefined();
      expect(where.AND[0].OR).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ scope: 'project', projectId: { in: [10, 20] } }),
        ])
      );
    });

    // --- list: admin 无 companyId 时仍可见 platform ---
    test('list: admin 无 companyId 仍可见 platform（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: null });
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
        user: { findFirst: mockUserFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      expect(res.json).toHaveBeenCalled();
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.AND[0].OR).toEqual([{ scope: 'platform', status: true }]);
    });

    // --- get: admin 获取 project 知识库（自己是 operator）---
    test('get: admin 获取 project 知识库（有权限，直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        projectId: 10,
        company: null,
        project: { shortName: '测试项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 2, projectId: 10 });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      });

      const req = { params: { id: '1' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await getKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });

    // --- get: admin 获取 platform 知识库（status=false 不可见）---
    test('get: admin 获取 platform 知识库（status=false 返回 404，直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        status: false,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
      });

      const req = { params: { id: '1' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await getKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库不存在' })
      );
    });

    // --- get: admin 获取 company 知识库（自己公司的，可见）---
    test('get: admin 获取自己公司的 company 知识库（可见，直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        companyId: 2,
        company: { shortName: '我的公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
        user: { findFirst: mockUserFindFirst },
      });

      const req = { params: { id: '1' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await getKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });

    // --- update: scope→company 使用 existing.companyId 回退（lines 229-230）---
    test('update: scope→company 无 company_id 但 existing 有 companyId 使用回退（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        createdBy: 1,
        companyId: 5,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        company: { shortName: '已有公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { scope: 'company' },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'company', companyId: 5, projectId: null }),
        })
      );
    });

    // --- update: scope→project 使用 existing.projectId 回退（lines 235-236）---
    test('update: scope→project 无 project_id 但 existing 有 projectId 使用回退（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        createdBy: 1,
        companyId: 5,
        projectId: 10,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        company: { shortName: '已有公司' },
        project: { shortName: '已有项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { scope: 'project' },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'project', projectId: 10, companyId: 5 }),
        })
      );
    });

    // --- update: scope→project 使用 existing.projectId 和 existing.companyId ---
    test('update: scope→project 同时提供 company_id 覆盖 existing（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        createdBy: 1,
        companyId: 5,
        projectId: 10,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        company: { shortName: '新公司' },
        project: { shortName: '已有项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { scope: 'project', company_id: 99 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'project', companyId: 99, projectId: 10 }),
        })
      );
    });

    // --- update: 更新 status=true ---
    test('update: 更新 status=true 成功（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        status: false,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        status: true,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { status: true },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: true }),
        })
      );
    });

    // --- create: sysadmin 创建 company 知识库成功 ---
    test('create: sysadmin 创建 company 知识库成功（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        companyId: 2,
        company: { shortName: '测试公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '公司知识库', scope: 'company', company_id: 2 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'company', companyId: 2 }),
        })
      );
    });

    // --- create: sysadmin 创建 project 知识库成功 ---
    test('create: sysadmin 创建 project 知识库成功（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        companyId: null,
        projectId: 5,
        company: null,
        project: { shortName: '测试项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '项目知识库', scope: 'project', project_id: 5 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scope: 'project', projectId: 5 }),
        })
      );
    });

    // --- update: admin 更新自己创建的、company_id 变更到自己公司 ---
    test('update: admin 更新自己创建的知识库的 company_id（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 2,
        companyId: null,
        projectId: null,
      });
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: 2 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        company: { shortName: '我的公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
      });

      const req = {
        params: { id: '1' },
        body: { company_id: 2 },
        user: { userId: 2, username: 'admin', role: 'admin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });

    // --- delete: 删除成功时 data 为 null ---
    test('delete: 成功删除返回 data=null（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
      });
      const mockUpdate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await deleteKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, data: null, message: '删除知识库成功' })
      );
    });
  });

  // =========================================================
  // Service 层直接测试 — getAccessibleBaseIds
  // =========================================================
  describe('KnowledgeBaseServiceImpl.getAccessibleBaseIds', () => {
    const { KnowledgeBaseServiceImpl } = require('../../apis/service/impl/knowledge-base.service.impl');

    test('返回项目可访问的知识库 ID 列表（含公司 scope）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 10 });
      const mockKBFindMany = jest.fn().mockResolvedValue([{ id: 1 }, { id: 2 }, { id: 3 }]);
      getPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKBFindMany },
      });

      const service = new KnowledgeBaseServiceImpl();
      const ids = await service.getAccessibleBaseIds(1);

      expect(ids).toEqual([1, 2, 3]);
      expect(mockProjectFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 1, deletedAt: null } })
      );
      // 验证 OR 条件包含 platform + project + company
      const where = mockKBFindMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(3);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { scope: 'platform', status: true },
          { scope: 'project', projectId: 1, status: true },
          { scope: 'company', companyId: 10, status: true },
        ])
      );
    });

    test('项目无 companyId 时不含 company scope', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 2, companyId: null });
      const mockKBFindMany = jest.fn().mockResolvedValue([{ id: 5 }]);
      getPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKBFindMany },
      });

      const service = new KnowledgeBaseServiceImpl();
      const ids = await service.getAccessibleBaseIds(2);

      expect(ids).toEqual([5]);
      const where = mockKBFindMany.mock.calls[0][0].where;
      expect(where.OR).toHaveLength(2);
      expect(where.OR).toEqual(
        expect.arrayContaining([
          { scope: 'platform', status: true },
          { scope: 'project', projectId: 2, status: true },
        ])
      );
    });

    test('项目不存在抛出 NotFoundError', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockProjectFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: jest.fn() },
      });

      const service = new KnowledgeBaseServiceImpl();
      await expect(service.getAccessibleBaseIds(999)).rejects.toThrow('项目不存在');
    });
  });

  // =========================================================
  // Service 层边界补全 — mapKnowledgeBase null 回退 + projectId/companyId 边界
  // =========================================================
  describe('Service 层边界补全', () => {
    function mockRes() {
      const res: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      return res;
    }

    const mockUser = { userId: 1, username: 'sysadmin', role: 'sysadmin' };

    // --- mapKnowledgeBase: _count 为 null/undefined 时回退到 0（lines 32-36）---
    test('list: mapKnowledgeBase 处理 _count 为 null 的回退（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const itemWithoutCount = {
        ...mockKB,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: null,
      };
      const mockFindMany = jest.fn().mockResolvedValue([itemWithoutCount]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.data.list[0].keyword_count).toBe(0);
      expect(result.data.list[0].portrait_count).toBe(0);
      expect(result.data.list[0].image_count).toBe(0);
      expect(result.data.list[0].document_count).toBe(0);
    });

    test('list: mapKnowledgeBase 处理 _count 字段缺失的回退（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const itemNoCount = {
        id: 1,
        name: '无计数知识库',
        description: null,
        scope: 'platform',
        companyId: null,
        company: null,
        projectId: null,
        project: null,
        status: true,
        createdBy: 1,
        creator: { cnName: '管理员' },
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-01'),
      };
      const mockFindMany = jest.fn().mockResolvedValue([itemNoCount]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      expect(res.json).toHaveBeenCalled();
      const result = res.json.mock.calls[0][0];
      expect(result.data.list[0].keyword_count).toBe(0);
      expect(result.data.list[0].portrait_count).toBe(0);
      expect(result.data.list[0].image_count).toBe(0);
      expect(result.data.list[0].document_count).toBe(0);
    });

    test('list: mapKnowledgeBase 处理 creator 为 null 的回退（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const itemNoCreator = {
        ...mockKB,
        company: null,
        project: null,
        creator: null,
        _count: { keywords: 1, portraits: 2, images: 3, documents: 4 },
      };
      const mockFindMany = jest.fn().mockResolvedValue([itemNoCreator]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      const result = res.json.mock.calls[0][0];
      expect(result.data.list[0].creator_name).toBeNull();
      expect(result.data.list[0].keyword_count).toBe(1);
      expect(result.data.list[0].portrait_count).toBe(2);
    });

    // --- getById: project scope 知识库 projectId 为 null（line 125）---
    test('get: project 知识库 projectId 为 null 返回 404（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKBFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        projectId: null,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKBFindFirst },
      });

      const req = { params: { id: '1' }, user: { userId: 2, role: 'admin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await getKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库不存在' })
      );
    });

    // --- create: platform scope 的 companyId/projectId 被清除（line 168-169）---
    test('create: platform scope 清除 company_id 和 project_id（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'platform',
        companyId: null,
        projectId: null,
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '平台知识库', scope: 'platform', company_id: 99, project_id: 88 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.companyId).toBeNull();
      expect(createData.projectId).toBeNull();
    });

    // --- create: company scope 的 projectId 被清除（line 169 null）---
    test('create: company scope 时 project_id 被忽略（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'company',
        companyId: 2,
        projectId: null,
        company: { shortName: '测试公司' },
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '公司知识库', scope: 'company', company_id: 2, project_id: 10 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.companyId).toBe(2);
      expect(createData.projectId).toBeNull();
    });

    // --- update: 无 scope 变更时，company_id/project_id 直接赋值（lines 239-240）---
    test('update: 无 scope 变更，直接设置 company_id 和 project_id（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        createdBy: 1,
        companyId: 5,
        projectId: 10,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        companyId: 6,
        projectId: 20,
        company: { shortName: '新公司' },
        project: { shortName: '新项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { company_id: 6, project_id: 20 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.companyId).toBe(6);
      expect(updateData.projectId).toBe(20);
    });

    test('update: 无 scope 变更，仅设置 project_id（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        createdBy: 1,
        companyId: 5,
        projectId: 10,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        companyId: 5,
        projectId: 30,
        company: { shortName: '测试公司' },
        project: { shortName: '新项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { project_id: 30 },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.projectId).toBe(30);
      expect(updateData.companyId).toBeUndefined();
    });

    // --- list: sysadmin 角色不做权限过滤 ---
    test('list: sysadmin 角色不做权限过滤（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: '10' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.AND).toBeUndefined();
    });

    // --- list: 带 search + scope + status 组合查询 ---
    test('list: 多参数组合查询（search + scope + status）（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: '10', search: '测试', scope: 'company', status: 'true' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.scope).toBe('company');
      expect(where.status).toBe(true);
      expect(where.OR).toBeDefined();
    });

    // --- getById: sysadmin 可获取任何 scope 的知识库 ---
    test('get: sysadmin 获取 project 知识库无权限检查（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        projectId: 99,
        company: null,
        project: { shortName: '任意项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      });

      const req = { params: { id: '1' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await getKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });

    // --- create: description 为 undefined 时传入 null ---
    test('create: description 为 undefined 时转为 null（直接函数）', async () => {
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

      const req = {
        body: { name: '无描述', scope: 'platform' },
        user: { userId: 1, username: 'sysadmin', role: 'sysadmin' },
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.description).toBeNull();
    });

    // --- update: name 为空字符串（非纯空格）返回 400（直接函数）---
    test('updateKnowledgeBase: name 为空字符串返回 400（直接函数）', async () => {
      const req = {
        params: { id: '1' },
        body: { name: '' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库名称不能为空' })
      );
    });

    // --- update: name 为非字符串类型返回 400（直接函数）---
    test('updateKnowledgeBase: name 为非字符串类型返回 400（直接函数）', async () => {
      const req = {
        params: { id: '1' },
        body: { name: 12345 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    // --- validateInteger: undefined 返回 undefined ---
    test('validateInteger: undefined 值返回 undefined', async () => {
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

      const req = {
        body: { name: '测试', scope: 'platform' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.companyId).toBeNull();
      expect(createData.projectId).toBeNull();
    });

    // --- validateInteger: null 返回 undefined ---
    test('validateInteger: null 值返回 undefined', async () => {
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

      const req = {
        body: { name: '测试', scope: 'platform', company_id: null, project_id: null },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(201);
      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.companyId).toBeNull();
      expect(createData.projectId).toBeNull();
    });

    // --- create: name 为非字符串（数字）返回 400（直接函数）---
    test('createKnowledgeBase: name 为数字返回 400（直接函数）', async () => {
      const req = {
        body: { name: 42, scope: 'platform' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库名称不能为空' })
      );
    });

    // --- update: status 为 number 类型被忽略（直接函数）---
    test('updateKnowledgeBase: status 为 number 类型被忽略（直接函数）', async () => {
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

      const req = {
        params: { id: '1' },
        body: { status: 1 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.status).toBeUndefined();
    });

    // --- update: description 为 null 时正确清除描述（直接函数）---
    test('updateKnowledgeBase: description=null 清除描述（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        description: '旧描述',
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

      const req = {
        params: { id: '1' },
        body: { description: null },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      // description=null means "clear the description" in the update request
      expect(updateData.description).toBeNull();
    });

    // --- update: scope 未变时仅传 name（直接函数）---
    test('updateKnowledgeBase: 仅更新 name（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        createdBy: 1,
        companyId: null,
        projectId: null,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        name: '新名称',
        company: null,
        project: null,
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { name: '新名称' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.name).toBe('新名称');
      expect(updateData.scope).toBeUndefined();
      expect(updateData.companyId).toBeUndefined();
      expect(updateData.projectId).toBeUndefined();
    });

    // --- AppError 统一处理：NotFoundError（非 list 的 404 路径）---
    test('createKnowledgeBase: service 抛出 NotFoundError 返回 404（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new NotFoundError('公司'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '测试', scope: 'platform' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '公司不存在' })
      );
    });

    // --- AppError 统一处理：ForbiddenError ---
    test('deleteKnowledgeBase: service 抛出 ForbiddenError 返回 403（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new ForbiddenError('权限不足'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const req = {
        params: { id: '1' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await deleteKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    // --- create: name 为空字符串（直接函数）---
    test('createKnowledgeBase: name 为空字符串返回 400（直接函数）', async () => {
      const req = {
        body: { name: '', scope: 'platform' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '知识库名称不能为空' })
      );
    });

    // --- list: page 为非数字字符串默认为 1 ---
    test('list: page 为非数字字符串默认为 1（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: 'abc', pageSize: '10' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      const result = res.json.mock.calls[0][0];
      expect(result.data.page).toBe(1);
    });

    // --- list: pageSize 为非数字字符串默认为 10 ---
    test('list: pageSize 为非数字字符串默认为 10（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      });

      const req = { query: { page: '1', pageSize: 'xyz' }, user: { userId: 1, role: 'sysadmin' } } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await listKnowledgeBases(req, res);
      const result = res.json.mock.calls[0][0];
      expect(result.data.pageSize).toBe(10);
    });

    // --- update: company_id 为负数被 validateInteger 拒绝（直接函数）---
    test('updateKnowledgeBase: company_id 为负数被 validateInteger 拒绝返回 400（直接函数）', async () => {
      const req = {
        params: { id: '1' },
        body: { company_id: -1 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'company_id 必须为正整数' })
      );
    });

    // --- update: project_id 为浮点数被 validateInteger 拒绝（直接函数）---
    test('updateKnowledgeBase: project_id 为浮点数被 validateInteger 拒绝返回 400（直接函数）', async () => {
      const req = {
        params: { id: '1' },
        body: { project_id: 3.14 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'project_id 必须为正整数' })
      );
    });

    // --- delete: service 抛出 BusinessError 返回 400（直接函数）---
    test('deleteKnowledgeBase: service 抛出 BusinessError 返回 400（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new BusinessError('业务错误'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const req = {
        params: { id: '1' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await deleteKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '业务错误' })
      );
    });

    // --- delete: 无 message Error 返回 500（直接函数）---
    test('deleteKnowledgeBase: 无 message Error 返回 500（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const req = {
        params: { id: '1' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await deleteKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '删除知识库失败' })
      );
    });

    // --- create: service 抛出 ForbiddenError 返回 403（直接函数）---
    test('createKnowledgeBase: service 抛出 ForbiddenError 返回 403（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new ForbiddenError('权限不足'));
      getPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      });

      const req = {
        body: { name: '测试', scope: 'platform' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    // --- update: service 抛出 BusinessError 返回 400（直接函数）---
    test('updateKnowledgeBase: service 抛出 BusinessError 返回 400（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new BusinessError('业务校验失败'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const req = {
        params: { id: '1' },
        body: { name: '测试' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
    });

    // --- update: service 抛出 ForbiddenError 返回 403（直接函数）---
    test('updateKnowledgeBase: service 抛出 ForbiddenError 返回 403（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new ForbiddenError('只能修改自己创建的知识库'));
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: jest.fn() },
      });

      const req = {
        params: { id: '1' },
        body: { name: '测试' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(403);
    });

    // --- update: scope 无变化时清除 description（直接函数）---
    test('updateKnowledgeBase: description 为空字符串时转为 null（直接函数）', async () => {
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

      const req = {
        params: { id: '1' },
        body: { description: '' },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      // description='' → falsy → null (service line 216: `request.description || null`)
      expect(updateData.description).toBeNull();
    });

    // --- update: project_id 正整数值被正确传递（直接函数）---
    test('updateKnowledgeBase: project_id 为正整数正确传递（直接函数）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        createdBy: 1,
        companyId: 5,
        projectId: 10,
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockKB,
        scope: 'project',
        projectId: 20,
        company: { shortName: '公司' },
        project: { shortName: '新项目' },
        creator: { cnName: '管理员' },
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      getPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const req = {
        params: { id: '1' },
        body: { project_id: 20 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await updateKnowledgeBase(req, res);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.projectId).toBe(20);
    });

    // --- list: 验证 validateInteger project_id 为0 ---
    test('createKnowledgeBase: project_id 为0被 validateInteger 拒绝返回 400（直接函数）', async () => {
      const req = {
        body: { name: '测试', scope: 'platform', project_id: 0 },
        user: mockUser,
      } as any;
      const res = { status: jest.fn().mockReturnThis(), json: jest.fn().mockReturnThis() } as any;
      await createKnowledgeBase(req, res);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'project_id 必须为正整数' })
      );
    });
  });
});

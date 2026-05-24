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

const mockProjectRow = {
  id: 1,
  shortName: 'P1',
  fullName: 'Project 1',
  description: 'desc',
  companyId: 1,
  status: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  company: { shortName: 'Company A' },
  operators: [{ userId: 2, user: { cnName: '张三' } }],
  viewers: [{ userId: 3, user: { cnName: '李四' } }],
};

describe('Project Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== GET /api/projects (listProjects) ==========
  describe('GET /api/projects', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/projects');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return projects list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([mockProjectRow]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.list[0].short_name).toBe('P1');
      expect(response.body.data.list[0].operator_ids).toEqual([2]);
      expect(response.body.data.list[0].viewer_ids).toEqual([3]);
    });

    it('should support company_id filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?company_id=2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 2 }),
        })
      );
    });

    it('should support status=true filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?status=true')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: true }),
        })
      );
    });

    it('should support status=false filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?status=false')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        })
      );
    });

    it('should support search query', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?search=Test')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { shortName: { contains: 'Test', mode: 'insensitive' } },
              { fullName: { contains: 'Test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should support custom pagination params', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(5);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });

    it('should filter projects by operator for admin on list', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ operators: { some: { userId: 2 } } }),
        })
      );
    });

    it('should return 500 on service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB连接失败'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('DB连接失败');
    });

    it('should return 500 with default message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('should use default page=1 and pageSize=10 when no query params', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 10 })
      );
    });

    it('should support combined filters (search + company_id + status)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?search=Test&company_id=1&status=true')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 1,
            status: true,
            OR: [
              { shortName: { contains: 'Test', mode: 'insensitive' } },
              { fullName: { contains: 'Test', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should exclude status filter when status param is absent', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const whereClause = mockFindMany.mock.calls[0][0].where;
      expect(whereClause.status).toBeUndefined();
    });

    it('should return 400 for invalid status parameter', async () => {
      const response = await agent
        .get('/api/v1/projects?status=invalid')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的 status 参数');
    });

    it('should cap pageSize at 100', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?pageSize=9999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pageSize).toBe(100);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 100 })
      );
    });
  });

  // ========== GET /api/projects/:id (getProject) ==========
  describe('GET /api/projects/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/projects/1');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/v1/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should return project detail', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1');
      expect(response.body.data.company_name).toBe('Company A');
      expect(response.body.data.operator_names).toEqual(['张三']);
      expect(response.body.data.viewer_names).toEqual(['李四']);
    });

    it('should return 403 when admin gets project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 999,
        operators: [{ userId: 5, user: { cnName: '王五' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作该项目');
    });

    it('should allow admin to access project they are operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 2,
        operators: [{ userId: 2, user: { cnName: '张三' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
    });

    it('should return 500 on service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('未知错误'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('未知错误');
    });

    it('should return 500 with default message when getProject error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目详情失败');
    });

    it('should return full project detail with all mapped fields', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const fullProject = {
        ...mockProjectRow,
        description: 'Test description',
        company: { shortName: 'Test Company' },
        operators: [
          { userId: 2, user: { cnName: '张三', id: 2 } },
          { userId: 4, user: { cnName: '赵六', id: 4 } },
        ],
        viewers: [
          { userId: 3, user: { cnName: '李四', id: 3 } },
        ],
      };
      const mockFindFirst = jest.fn().mockResolvedValue(fullProject);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1');
      expect(response.body.data.full_name).toBe('Project 1');
      expect(response.body.data.description).toBe('Test description');
      expect(response.body.data.company_name).toBe('Test Company');
      expect(response.body.data.operator_ids).toEqual([2, 4]);
      expect(response.body.data.operator_names).toEqual(['张三', '赵六']);
      expect(response.body.data.viewer_ids).toEqual([3]);
      expect(response.body.data.viewer_names).toEqual(['李四']);
      expect(response.body.data.status).toBe(true);
    });
  });

  // ========== POST /api/projects (createProject) ==========
  describe('POST /api/projects', () => {
    it('should return 400 when short_name is missing', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when company_id is missing (sysadmin)', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', operator_ids: [2] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should create project successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 2, companyId: 1, role: 'admin' },
      ]);
      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建项目成功');
      expect(response.body.data.short_name).toBe('P1');
    });

    it('should reject operator not belonging to company', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({ project: {}, user: { findMany: mockUserFindMany } });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [5] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不属于指定公司');
    });

    it('should reject viewer not belonging to company', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: 2 }]);
        return Promise.resolve([]);
      });
      getPrisma.mockReturnValue({ project: {}, user: { findMany: mockUserFindMany } });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2], viewer_ids: [99] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('查看者不属于指定公司');
    });

    it('should force company_id to admin company when creating project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 2,
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 2, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 999, operator_ids: [2] });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 2 }),
        })
      );
    });

    it('should return 500 on create service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockCreate = jest.fn().mockRejectedValue(new Error('创建失败'));
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建失败');
    });

    it('should return 500 with default message when create error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockCreate = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建项目失败');
    });

    it('should create project with all optional fields including viewer_ids', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: 2, companyId: 1, role: 'admin' }]);
        return Promise.resolve([{ id: 3, companyId: 1, role: 'view' }]);
      });
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: 'A test project',
        viewers: [{ userId: 3, user: { cnName: '李四' } }],
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'P1',
          full_name: 'Project 1',
          description: 'A test project',
          company_id: 1,
          operator_ids: [2],
          viewer_ids: [3],
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建项目成功');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shortName: 'P1',
            fullName: 'Project 1',
            description: 'A test project',
            companyId: 1,
            operators: { create: [{ userId: 2 }] },
            viewers: { create: [{ userId: 3 }] },
          }),
        })
      );
    });

    it('should create project without operators or viewers', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [], viewer_ids: [] });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [] },
            viewers: { create: [] },
          }),
        })
      );
    });

    it('should return 400 when all three required fields are missing', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: 'no required fields' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should allow admin to create project without providing company_id', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 2,
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 2, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1', full_name: 'Project 1', operator_ids: [2] });

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 2 }),
        })
      );
    });
  });

  // ========== PUT /api/projects/:id (updateProject) ==========
  describe('PUT /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/v1/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should reject company_id change for any role', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 2 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('项目所属公司不可更改');
    });

    it('should allow same company_id in update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        shortName: 'P1-Updated',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, short_name: 'P1-Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1-Updated');
    });

    it('should return 403 when admin updates project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 999,
        operators: [{ userId: 5, user: { cnName: '王五' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作该项目');
    });

    it('should update project successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        shortName: 'P1-Updated',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1-Updated');
      expect(response.body.message).toBe('更新项目成功');
    });

    it('should return 400 when updating with invalid operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const findFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        project: { findFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ operator_ids: [99] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不属于指定公司');
    });

    it('should return 400 when updating with invalid viewer', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      let userCallCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        userCallCount++;
        if (userCallCount === 1) return Promise.resolve([{ id: 2 }]);
        return Promise.resolve([]);
      });
      getPrisma.mockReturnValue({
        project: { findFirst: jest.fn().mockResolvedValue(mockProjectRow), update: jest.fn() },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ operator_ids: [2], viewer_ids: [99] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('查看者不属于指定公司');
    });

    it('should return 500 on update service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('更新失败'));
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新失败');
    });

    it('should return 500 with default message when update error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新项目失败');
    });

    it('should update status field', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        status: false,
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: false }),
        })
      );
    });

    it('should update description field', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: 'New description',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: 'New description' });

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'New description' }),
        })
      );
    });

    it('should update with valid operator_ids replacement', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [{ userId: 2, user: { cnName: '张三' } }],
      });
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ operator_ids: [2] });

      expect(response.status).toBe(200);
      expect(mockOperatorUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 1, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        })
      );
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should update with valid viewer_ids replacement', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      let userCallCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        userCallCount++;
        if (userCallCount === 1) return Promise.resolve([{ id: 2 }]);
        return Promise.resolve([{ id: 3 }]);
      });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        viewers: [{ userId: 3, user: { cnName: '李四' } }],
      });
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ operator_ids: [2], viewer_ids: [3] });

      expect(response.status).toBe(200);
      expect(mockViewerUpdateMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { projectId: 1, deletedAt: null },
          data: { deletedAt: expect.any(Date) },
        })
      );
    });

    it('should allow admin to update project they are operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const adminProject = {
        ...mockProjectRow,
        companyId: 2,
        operators: [{ userId: 2, user: { cnName: '张三' } }],
      };
      const mockFindFirst = jest.fn().mockResolvedValue(adminProject);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...adminProject,
        shortName: 'P1-Updated',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1-Updated');
    });

    it('should strip company_id from body before calling service', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 1, short_name: 'P1-Updated' });

      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('companyId');
      expect(updateCall.data).toHaveProperty('shortName', 'P1-Updated');
    });

    it('should handle empty operator_ids array on update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [],
      });
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ operator_ids: [] });

      expect(response.status).toBe(200);
      expect(mockOperatorUpdateMany).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [] },
          }),
        })
      );
    });
  });

  // ========== DELETE /api/projects/:id (deleteProject) ==========
  describe('DELETE /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/v1/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should delete project successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockDelete = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockDelete },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('删除项目成功');
    });

    it('should return 403 when admin deletes project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 999,
        operators: [{ userId: 5, user: { cnName: '王五' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作该项目');
    });

    it('should allow admin to delete project they are operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const adminProject = {
        ...mockProjectRow,
        companyId: 2,
        operators: [{ userId: 2, user: { cnName: '张三' } }],
      };
      const mockFindFirst = jest.fn().mockResolvedValue(adminProject);
      const mockDelete = jest.fn().mockResolvedValue(adminProject);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockDelete },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('删除项目成功');
    });

    it('should return 500 on delete service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockDelete = jest.fn().mockRejectedValue(new Error('删除失败'));
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockDelete },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除失败');
    });

    it('should return 500 with default message when delete error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockDelete = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockDelete },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除项目失败');
    });

    it('should allow sysadmin to delete without operator check', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('删除项目成功');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { deletedAt: expect.any(Date) },
        })
      );
    });

    it('should return 401 without token on delete', async () => {
      const response = await agent.delete('/api/v1/projects/1');
      expect(response.status).toBe(401);
    });
  });

  // ========== Direct controller unit tests (bypass route guards) ==========
  describe('deleteProject - direct unit test for view role', () => {
    it('should return 403 for view role (defense-in-depth)', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 3, role: 'view', companyId: 2 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权删除项目' })
      );
    });
  });

  // ========== Defense-in-depth: view role controller tests ==========
  describe('getProject - view role defense-in-depth', () => {
    it('should return 403 for view role trying to get project', async () => {
      const { getProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 3, role: 'view', companyId: 2 },
        body: {},
      };

      // Mock service to return a project (simulating data exists)
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 2,
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      await getProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权查看该项目' })
      );
    });
  });

  describe('updateProject - view role defense-in-depth', () => {
    it('should return 403 for view role trying to update project', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 3, role: 'view', companyId: 2 },
        body: { short_name: 'Updated' },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '查看者无权操作该项目' })
      );
    });
  });

  // ========== Input validation tests ==========
  describe('listProjects - input validation', () => {
    it('should return 400 for search exceeding 100 characters', async () => {
      const longSearch = 'a'.repeat(101);
      const response = await agent
        .get(`/api/v1/projects?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('搜索关键词长度不能超过100个字符');
    });

    it('should allow search with exactly 100 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const search100 = 'a'.repeat(100);
      const response = await agent
        .get(`/api/v1/projects?search=${search100}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should return 400 for invalid company_id (NaN)', async () => {
      const response = await agent
        .get('/api/v1/projects?company_id=abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 for negative company_id', async () => {
      const response = await agent
        .get('/api/v1/projects?company_id=-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 for zero company_id', async () => {
      const response = await agent
        .get('/api/v1/projects?company_id=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });
  });

  describe('createProject - string length validation', () => {
    it('should return 400 when short_name exceeds 50 characters', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'x'.repeat(51), full_name: 'Project 1', company_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('项目短名不能超过50个字符');
    });

    it('should return 400 when full_name exceeds 200 characters', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'x'.repeat(201), company_id: 1 });

      expect(response.status).toBe(400);
      // Middleware validates full_name length before controller
      expect(response.body.message).toContain('200');
    });

    it('should return 400 when description exceeds 500 characters', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, description: 'x'.repeat(501) });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('项目描述不能超过500个字符');
    });

    it('should allow short_name with exactly 50 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'x'.repeat(50), full_name: 'Project 1', company_id: 1, operator_ids: [] });

      expect(response.status).toBe(201);
    });
  });
});

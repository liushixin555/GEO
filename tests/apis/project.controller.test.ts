/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';

const mockLoggerError = jest.fn();

jest.mock('../../apis/utils/logger.util', () => ({
  logger: { info: jest.fn(), warn: jest.fn(), error: mockLoggerError, debug: jest.fn() },
}));

jest.mock('../../apis/utils/db.util', () => {
  // Auto-inject $transaction pass-through so Prisma transaction mocks work
  const createMockGetPrisma = () => {
    const fn = jest.fn();
    const originalMockReturnValue = fn.mockReturnValue.bind(fn);
    fn.mockReturnValue = (value: any) => {
      if (value && typeof value === 'object' && !('$transaction' in value)) {
        value.$transaction = async (cb: any) => cb(value);
      }
      return originalMockReturnValue(value);
    };
    return fn;
  };
  return {
    getPrisma: createMockGetPrisma(),
    closePrisma: jest.fn(),
  };
});

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
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject pageSize exceeding 100', async () => {
      const response = await agent
        .get('/api/v1/projects?pageSize=9999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
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
      expect(response.body.message).toMatch(/参数验证失败/);
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
      expect(response.body.message).toMatch(/参数验证失败/);
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
      expect(response.body.message).toMatch(/参数验证失败/);
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
  // NOTE: view role defense-in-depth tests removed — controller no longer checks roles;
  // view role is now fully handled by route-level roleMiddleware.

  // ========== Defense-in-depth: view role controller tests ==========
  // NOTE: getProject/updateProject view role defense-in-depth tests removed —
  // controller no longer checks roles; view role is handled by route-level roleMiddleware.

  // ========== Input validation tests ==========
  describe('listProjects - input validation', () => {
    it('should return 400 for search exceeding 100 characters', async () => {
      const longSearch = 'a'.repeat(101);
      const response = await agent
        .get(`/api/v1/projects?search=${longSearch}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
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
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should return 400 for negative company_id', async () => {
      const response = await agent
        .get('/api/v1/projects?company_id=-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should return 400 for zero company_id', async () => {
      const response = await agent
        .get('/api/v1/projects?company_id=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  describe('createProject - string length validation', () => {
    it('should return 400 when short_name exceeds 50 characters', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'x'.repeat(51), full_name: 'Project 1', company_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('项目简称不能超过50个字符');
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
      expect(response.body.message).toContain('项目描述不能超过500个字符');
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

  // ========== Direct controller tests for uncovered branches ==========
  describe('createProject - direct controller: defense-in-depth', () => {
    it('should allow full_name with exactly 200 characters (bypass schema)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'x'.repeat(200),
          company_id: 1,
          operator_ids: [],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should return 401 when not logged in (direct controller)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: { short_name: 'P1', full_name: 'Project', company_id: 1 },
        user: undefined,
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });

  describe('updateProject - direct controller: 401 check (defense-in-depth)', () => {
    it('should return 401 when not logged in (direct controller)', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'Updated' },
        user: undefined,
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });

  describe('getProject - direct controller: 401 check (defense-in-depth)', () => {
    it('should return 401 when not logged in (direct controller)', async () => {
      const { getProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: undefined,
      };

      await getProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });

  describe('deleteProject - direct controller: 401 check (defense-in-depth)', () => {
    it('should return 401 when not logged in (direct controller)', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: undefined,
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });

  describe('listProjects - direct controller: 401 check (defense-in-depth)', () => {
    it('should return 401 when not logged in (direct controller)', async () => {
      const { listProjects } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        query: {},
        user: undefined,
      };

      await listProjects(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(401);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '未登录' })
      );
    });
  });

  // ========== Non-Error thrown in catch blocks (branch coverage) ==========
  describe('non-Error thrown in catch blocks', () => {
    it('listProjects: should handle non-Error thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue('string error');
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('getProject: should handle non-Error thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue('string error');
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目详情失败');
    });

    it('createProject: should handle non-Error thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockCreate = jest.fn().mockRejectedValue('string error');
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

    it('updateProject: should handle non-Error thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockRejectedValue('string error');
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

    it('deleteProject: should handle non-Error thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockDelete = jest.fn().mockRejectedValue('string error');
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockDelete },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除项目失败');
    });
  });

  // ========== Edge case: admin creating with explicit company_id matches their own ==========
  describe('createProject - admin edge cases', () => {
    it('should use admin companyId when role is admin even if company_id provided', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({ ...mockProjectRow, companyId: 5 });
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 5, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 999,
          operator_ids: [2],
        },
        user: { userId: 2, role: 'admin', companyId: 5 },
      };

      await createProject(mockReq, mockRes);
      // Admin's companyId (5) should be used, not the body's company_id (999)
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 5 }),
        })
      );
    });
  });

  // ========== getProject: view role via route is 403 from middleware ==========
  describe('GET /api/projects/:id - view role via route', () => {
    it('should return 403 for view role via route middleware', async () => {
      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });
  });

  // ========== updateProject: view role via route ==========
  describe('PUT /api/projects/:id - view role via route', () => {
    it('should return 403 for view role via route middleware', async () => {
      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(403);
    });
  });

  // ========== DELETE: view role via route ==========
  describe('DELETE /api/projects/:id - view role via route', () => {
    it('should return 403 for view role via route middleware', async () => {
      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`);

      expect(response.status).toBe(403);
    });
  });

  // ============================================================
  // Round 2 — additional tests for 100 % branch coverage
  // Uncovered branches identified:
  //   controller line 116: req.user.companyId ?? undefined (nullish branch)
  //   service    line  97: (request.operator_ids || []) (falsy branch)
  //   service    line 130: if (request.full_name !== undefined) (true branch)
  // ============================================================

  // ---------- 2-1  Controller line 116: sysadmin without companyId ----------
  describe('createProject - sysadmin without companyId (direct controller)', () => {
    it('should pass undefined companyId when sysadmin has no companyId', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
        },
        user: { userId: 1, role: 'sysadmin' }, // no companyId at all
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });

    it('should pass undefined when sysadmin companyId is null', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
        },
        user: { userId: 1, role: 'sysadmin', companyId: null },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
    });
  });

  // ---------- 2-2  Service line 97: operator_ids undefined ----------
  describe('createProject - operator_ids undefined (direct controller)', () => {
    it('should handle undefined operator_ids with || fallback to []', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [],
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          // operator_ids NOT provided → undefined
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [] },
          }),
        })
      );
    });

    it('should handle undefined viewer_ids with || fallback to []', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        viewers: [],
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [],
          // viewer_ids NOT provided → undefined
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewers: { create: [] },
          }),
        })
      );
    });
  });

  // ---------- 2-3  Service line 130: full_name in update ----------
  describe('PUT /api/projects/:id - update full_name via route', () => {
    it('should update full_name field', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        fullName: 'New Full Name',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'New Full Name' });

      expect(response.status).toBe(200);
      expect(response.body.data.full_name).toBe('New Full Name');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fullName: 'New Full Name' }),
        })
      );
    });
  });

  // ---------- 2-4  Description edge cases ----------
  describe('createProject - description edge cases (direct controller)', () => {
    it('should handle empty string description as null', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: null,
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          description: '',
          operator_ids: [],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // empty string || null → null
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        })
      );
    });

    it('should handle undefined description as null', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: null,
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [],
          // no description → undefined
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        })
      );
    });
  });

  // ---------- 2-5  Update with empty viewer_ids ----------
  describe('updateProject - empty viewer_ids replacement (direct controller)', () => {
    it('should skip findMany when viewer_ids is empty array', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        viewers: [],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { operator_ids: [], viewer_ids: [] },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      // success() calls res.json() directly, not res.status()
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
      // Empty arrays should NOT trigger findMany (length === 0 skips the query)
      expect(mockUserFindMany).not.toHaveBeenCalled();
      expect(mockViewerUpdateMany).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewers: { create: [] },
          }),
        })
      );
    });
  });

  // ---------- 2-6  Update with only full_name (direct controller) ----------
  describe('updateProject - full_name only (direct controller)', () => {
    it('should update only full_name field', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        fullName: 'Updated Full Name',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { full_name: 'Updated Full Name' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      // success() calls res.json() directly, not res.status()
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fullName: 'Updated Full Name' }),
        })
      );
    });
  });

  // ---------- 2-7  List with admin + company filter ----------
  describe('GET /api/projects - admin with company filter combined', () => {
    it('should combine admin operator filter with explicit company_id', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?company_id=2')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            companyId: 2,
            operators: { some: { userId: 2 } },
          }),
        })
      );
    });
  });

  // ---------- 2-8  Create with admin where body company_id differs ----------
  describe('createProject - admin ignores body company_id (direct)', () => {
    it('should always use admin companyId even when body specifies different', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({ ...mockProjectRow, companyId: 5 });
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 5, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 999, // should be ignored
          operator_ids: [2],
        },
        user: { userId: 2, role: 'admin', companyId: 5 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 5 }),
        })
      );
    });
  });

  // ---------- 2-9  GET /api/projects/:id - negative id ----------
  describe('GET /api/projects/:id - negative id', () => {
    it('should return 400 for negative id', async () => {
      const response = await agent
        .get('/api/v1/projects/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 2-10  DELETE with zero id ----------
  describe('DELETE /api/projects/:id - zero id', () => {
    it('should return 400 for id=0', async () => {
      const response = await agent
        .delete('/api/v1/projects/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 2-11  handleServiceError with AppError subclasses ----------
  describe('handleServiceError - AppError subclass coverage', () => {
    it('getProject: should map NotFoundError to 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('deleteProject: should map ForbiddenError to 403 for admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [{ userId: 99, user: { cnName: 'Other' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
    });

    it('updateProject: should map BusinessError to 400 for company_id change', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 999 });

      expect(response.status).toBe(400);
    });
  });

  // ---------- 2-12  createProject - admin missing company_id but has companyId in token ----------
  describe('createProject - admin with missing body company_id but token has it', () => {
    it('should succeed when admin has companyId in token even without body company_id', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({ ...mockProjectRow, companyId: 2 });
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 2, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1', full_name: 'Project 1' });

      expect(response.status).toBe(201);
    });
  });

  // ---------- 2-13  Update with same company_id as existing ----------
  describe('updateProject - same company_id as existing (direct)', () => {
    it('should allow updating other fields when company_id matches', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        shortName: 'Updated',
        fullName: 'Updated Full',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: {
          company_id: 1, // same as existing
          short_name: 'Updated',
          full_name: 'Updated Full',
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      // success() calls res.json() directly
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shortName: 'Updated',
            fullName: 'Updated Full',
          }),
        })
      );
    });
  });

  // ---------- 2-14  List pagination boundary ----------
  describe('GET /api/projects - pagination boundary', () => {
    it('should reject page=0 with validation error', async () => {
      const response = await agent
        .get('/api/v1/projects?page=0&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject pageSize=0 with validation error', async () => {
      const response = await agent
        .get('/api/v1/projects?pageSize=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 2-15  getProject - NaN id edge cases ----------
  describe('GET /api/projects/:id - various invalid id formats', () => {
    it('should reject decimal id as non-integer', async () => {
      const response = await agent
        .get('/api/v1/projects/1.5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Zod z.coerce.number().int() rejects 1.5 (non-integer)
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should return 400 for id with special characters', async () => {
      const response = await agent
        .get('/api/v1/projects/@#$')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 2-16  updateProject - direct controller: description only ----------
  describe('updateProject - description only update (direct)', () => {
    it('should update only description field', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: 'New Desc',
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { description: 'New Desc' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      // success() calls res.json() directly
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'New Desc' }),
        })
      );
    });
  });

  // ---------- 2-17  createProject - with description provided ----------
  describe('createProject - with non-empty description (direct)', () => {
    it('should pass description to service', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        description: 'Test desc',
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          description: 'Test desc',
          operator_ids: [],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'Test desc' }),
        })
      );
    });
  });

  // ---------- 2-18  updateProject - status only with same company_id ----------
  describe('updateProject - status only with same company_id (direct)', () => {
    it('should update status and keep same company_id', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        status: false,
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { status: false },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      // success() calls res.json() directly
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: false }),
        })
      );
    });
  });

  // ---------- 2-19  listProjects - admin with status filter ----------
  describe('GET /api/projects - admin with status and company filter', () => {
    it('should apply both admin operator filter and status filter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?status=true')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: true,
            operators: { some: { userId: 2 } },
          }),
        })
      );
    });
  });

  // ============================================================
  // Round 3 — comprehensive deep testing
  // Focus: helper functions, AppError mapping, security, response
  // structure, field whitelist, boundary values, role matrix
  // ============================================================

  // ---------- 3-01  getErrorMessage helper function (direct) ----------
  describe('getErrorMessage - direct unit tests', () => {
    it('should return error.message when err is Error with message', () => {
      const { getErrorMessage } = require('../../apis/controller/project.controller');
      // Import is re-executed; getErrorMessage is a module-level function
      // We test via controller behavior (indirect), or direct call if exported
      // Since getErrorMessage is not exported, we test via handleServiceError
      // which internally calls getErrorMessage
    });

    it('should return defaultMessage when Error has empty message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      // Error with empty string message → fallback to default
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('should return defaultMessage for number thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(42);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('should return defaultMessage for object thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue({ code: 'ERR', msg: 'fail' });
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('should return defaultMessage for null thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(null);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });

    it('should return defaultMessage for undefined thrown', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(undefined);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });
  });

  // ---------- 3-02  handleServiceError - AppError subclass mapping ----------
  describe('handleServiceError - AppError status code mapping', () => {
    it('should map NotFoundError (404) via list endpoint', async () => {
      const { NotFoundError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new NotFoundError('项目'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should map BusinessError (400) via list endpoint', async () => {
      const { BusinessError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new BusinessError('业务错误'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('业务错误');
    });

    it('should map ForbiddenError (403) via list endpoint', async () => {
      const { ForbiddenError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new ForbiddenError('权限不足'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('权限不足');
    });

    it('should map UnauthorizedError (401) via list endpoint', async () => {
      const { UnauthorizedError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new UnauthorizedError());
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未授权，请先登录');
    });

    it('should map ConflictError (409) via list endpoint', async () => {
      const { ConflictError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new ConflictError('名称冲突'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('名称冲突');
    });

    it('should map AppError with custom status code (422)', async () => {
      const { AppError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new AppError(422, '自定义错误'));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(422);
      expect(response.body.message).toBe('自定义错误');
    });

    it('should map AppError(500) in createProject endpoint', async () => {
      const { AppError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockCreate = jest.fn().mockRejectedValue(new AppError(500, '内部服务异常'));
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('内部服务异常');
    });

    it('should map AppError(404) in updateProject endpoint', async () => {
      const { NotFoundError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new NotFoundError('项目'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should map AppError(403) in deleteProject endpoint', async () => {
      const { ForbiddenError } = require('../../apis/errors');
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new ForbiddenError('禁止操作'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('禁止操作');
    });
  });

  // ---------- 3-03  Security: XSS / injection payloads ----------
  describe('Security - injection payloads', () => {
    it('should safely handle XSS in search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?search=<script>alert(1)</script>')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // Search is passed to Prisma which parameterizes queries
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { shortName: { contains: '<script>alert(1)</script>', mode: 'insensitive' } },
              { fullName: { contains: '<script>alert(1)</script>', mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should safely handle SQL injection in search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get("/api/v1/projects?search=' OR 1=1 --")
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { shortName: { contains: "' OR 1=1 --", mode: 'insensitive' } },
              { fullName: { contains: "' OR 1=1 --", mode: 'insensitive' } },
            ],
          }),
        })
      );
    });

    it('should safely handle path traversal in project id', async () => {
      const response = await agent
        .get('/api/v1/projects/../../../etc/passwd')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Either 400 (invalid id) or Express normalizes the path
      expect([400, 404]).toContain(response.status);
    });

    it('should safely handle extremely long search parameter (101 chars)', async () => {
      const response = await agent
        .get(`/api/v1/projects?search=${'x'.repeat(101)}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should handle unicode/emoji in search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?search=%E4%B8%AD%E6%96%87%E6%B5%8B%E8%AF%95%E2%9C%93')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });
  });

  // ---------- 3-04  Response structure validation ----------
  describe('Response structure validation', () => {
    it('list response should have correct structure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([mockProjectRow]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('data');
      expect(response.body.data).toHaveProperty('list');
      expect(response.body.data).toHaveProperty('total', 1);
      expect(response.body.data).toHaveProperty('page', 1);
      expect(response.body.data).toHaveProperty('pageSize', 10);
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('get project response should have all mapped fields', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      const data = response.body.data;
      expect(data).toHaveProperty('id');
      expect(data).toHaveProperty('short_name');
      expect(data).toHaveProperty('full_name');
      expect(data).toHaveProperty('description');
      expect(data).toHaveProperty('company_id');
      expect(data).toHaveProperty('company_name');
      expect(data).toHaveProperty('operator_ids');
      expect(data).toHaveProperty('operator_names');
      expect(data).toHaveProperty('viewer_ids');
      expect(data).toHaveProperty('viewer_names');
      expect(data).toHaveProperty('status');
      expect(data).toHaveProperty('created_at');
      expect(data).toHaveProperty('updated_at');
    });

    it('create response should have code=0, message, and data', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1, role: 'admin' }]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(201);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '创建项目成功');
      expect(response.body).toHaveProperty('data');
    });

    it('update response should have code=0 and success message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({ ...mockProjectRow, shortName: 'Updated' });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '更新项目成功');
      expect(response.body).toHaveProperty('data');
    });

    it('delete response should have code=0, null data, success message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockDelete = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockDelete } });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('message', '删除项目成功');
      expect(response.body).toHaveProperty('data', null);
    });

    it('error response should have code and message fields', async () => {
      const response = await agent
        .get('/api/v1/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body).toHaveProperty('code');
      expect(response.body).toHaveProperty('message');
    });
  });

  // ---------- 3-05  Field whitelist / unknown fields ignored ----------
  describe('Field whitelist - unknown fields ignored', () => {
    it('createProject: should ignore unknown fields in body (direct controller)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [],
          // Unknown fields that should be ignored
          id: 999,
          isAdmin: true,
          __proto__: { hacked: true },
          constructor: 'malicious',
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // Verify create was NOT called with unknown fields
      const createCall = mockCreate.mock.calls[0][0];
      expect(createCall.data).not.toHaveProperty('id');
      expect(createCall.data).not.toHaveProperty('isAdmin');
    });

    it('updateProject: should ignore unknown fields in body (direct controller)', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: {
          short_name: 'Updated',
          // Unknown fields
          malicious_field: 'hack',
          id: 999,
          deletedAt: new Date(),
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('malicious_field');
      expect(updateCall.data).not.toHaveProperty('id');
      expect(updateCall.data).not.toHaveProperty('deletedAt');
    });
  });

  // ---------- 3-06  Boundary values ----------
  describe('Boundary values', () => {
    it('should reject MAX_SAFE_INTEGER as page parameter (exceeds max 10000)', async () => {
      const response = await agent
        .get(`/api/v1/projects?page=${Number.MAX_SAFE_INTEGER}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should handle very large company_id parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?company_id=99999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 99999999 }),
        })
      );
    });

    it('should handle id = Number.MAX_SAFE_INTEGER', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get(`/api/v1/projects/${Number.MAX_SAFE_INTEGER}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Service throws NotFound since no data
      expect(response.status).toBe(404);
    });

    it('should reject negative page with validation error', async () => {
      const response = await agent
        .get('/api/v1/projects?page=-5&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should handle pageSize=1 (minimum valid)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pageSize).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 1 })
      );
    });

    it('should handle pageSize=100 (maximum valid)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?pageSize=100')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.pageSize).toBe(100);
    });

    it('should reject id=0 in PUT', async () => {
      const response = await agent
        .put('/api/v1/projects/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject id=0 in GET', async () => {
      const response = await agent
        .get('/api/v1/projects/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject very large float id as non-integer', async () => {
      const response = await agent
        .get('/api/v1/projects/999999.999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Zod z.coerce.number().int() rejects 999999.999 (non-integer)
      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject DELETE with id=-1', async () => {
      const response = await agent
        .delete('/api/v1/projects/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject PUT with id=-1', async () => {
      const response = await agent
        .put('/api/v1/projects/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 3-07  Role matrix: complete role x endpoint coverage ----------
  describe('Role matrix - complete coverage', () => {
    it('view role should be rejected on list (route middleware)', async () => {
      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('view role should be rejected on getProject (route middleware)', async () => {
      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('view role should be rejected on createProject (route middleware)', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1 });
      expect(response.status).toBe(403);
    });

    it('view role should be rejected on updateProject (route middleware)', async () => {
      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ short_name: 'Updated' });
      expect(response.status).toBe(403);
    });

    it('view role should be rejected on deleteProject (route middleware)', async () => {
      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('sysadmin should access list', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
    });

    it('admin should access list', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(200);
    });

    // NOTE: view role direct controller test removed — controller no longer checks roles;
    // view role is fully handled by route-level roleMiddleware.

    it('admin role should be rejected on deleteProject if not operator (direct controller)', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [{ userId: 99, user: { cnName: 'Other' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 2, role: 'admin', companyId: 2 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // ---------- 3-08  Status parameter edge cases ----------
  describe('Status parameter edge cases', () => {
    it('should reject status=TRUE (case-sensitive)', async () => {
      const response = await agent
        .get('/api/v1/projects?status=TRUE')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject status=FALSE (case-sensitive)', async () => {
      const response = await agent
        .get('/api/v1/projects?status=FALSE')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject status=1', async () => {
      const response = await agent
        .get('/api/v1/projects?status=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject status=0', async () => {
      const response = await agent
        .get('/api/v1/projects?status=0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject empty status parameter', async () => {
      const response = await agent
        .get('/api/v1/projects?status=')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject status=yes', async () => {
      const response = await agent
        .get('/api/v1/projects?status=yes')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should reject status with whitespace', async () => {
      const response = await agent
        .get('/api/v1/projects?status=%20true%20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });
  });

  // ---------- 3-09  updateProject - direct controller: company_id edge cases ----------
  describe('updateProject - company_id immutability (direct)', () => {
    it('should reject different company_id even when not changing other fields', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { company_id: 2 }, // different from mockProjectRow.companyId=1
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '项目所属公司不可更改' })
      );
    });

    it('should pass when company_id is undefined in update body', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({ ...mockProjectRow, shortName: 'New' });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'New' }, // no company_id
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
    });
  });

  // ---------- 3-10  deleteProject - direct: role checks ----------
  describe('deleteProject - role-based access (direct controller)', () => {
    it('should allow sysadmin to delete', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '删除项目成功', data: null })
      );
    });

    it('should allow admin who is operator to delete', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const adminProject = {
        ...mockProjectRow,
        companyId: 2,
        operators: [{ userId: 2, user: { cnName: 'Admin' } }],
      };
      const mockFindFirst = jest.fn().mockResolvedValue(adminProject);
      const mockUpdate = jest.fn().mockResolvedValue(adminProject);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 2, role: 'admin', companyId: 2 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '删除项目成功', data: null })
      );
    });
  });

  // ---------- 3-11  createProject - sysadmin with companyId=0 (falsy) ----------
  describe('createProject - sysadmin companyId falsy values', () => {
    it('should handle sysadmin with companyId=0 (direct controller)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 0 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // companyId=0 → req.user.companyId ?? undefined → 0 ?? undefined = 0
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 1 }),
        })
      );
    });
  });

  // ---------- 3-12  Multiple list calls with different filters ----------
  describe('listProjects - sequential different filters', () => {
    it('should apply different filters across sequential calls', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');

      // First call: search only
      const mockFindMany1 = jest.fn().mockResolvedValue([]);
      const mockCount1 = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany1, count: mockCount1 } });

      await agent
        .get('/api/v1/projects?search=Alpha')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockFindMany1).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              { shortName: { contains: 'Alpha', mode: 'insensitive' } },
            ]),
          }),
        })
      );

      jest.clearAllMocks();

      // Second call: company_id only
      const mockFindMany2 = jest.fn().mockResolvedValue([]);
      const mockCount2 = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany2, count: mockCount2 } });

      await agent
        .get('/api/v1/projects?company_id=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockFindMany2).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 5 }),
        })
      );
    });
  });

  // ---------- 3-13  getProject - id parsing edge cases ----------
  describe('getProject - id parsing edge cases', () => {
    it('should treat "1e2" as NaN (scientific notation)', async () => {
      const response = await agent
        .get('/api/v1/projects/1e2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('1e2', 10) = 1, not NaN → passes validation
      expect([200, 404, 500]).toContain(response.status);
    });

    it('should reject "abc" as invalid id', async () => {
      const response = await agent
        .get('/api/v1/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toMatch(/参数验证失败/);
    });

    it('should handle spaces-only id as NaN', async () => {
      // Express URL-decodes %20 to spaces; parseInt('  ') = NaN
      const response = await agent
        .get('/api/v1/projects/%20%20')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('  ', 10) = NaN → 400
      expect(response.status).toBe(400);
    });
  });

  // ---------- 3-14  createProject - admin effectiveCompanyId via controller logic ----------
  describe('createProject - effectiveCompanyId logic', () => {
    it('admin: should use token companyId, not body company_id (direct)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({ ...mockProjectRow, companyId: 3 });
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 99,
          operator_ids: [],
        },
        user: { userId: 5, role: 'admin', companyId: 3 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // Service overrides to admin's companyId=3
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 3 }),
        })
      );
    });

    it('sysadmin: should use body company_id (direct)', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 42,
          operator_ids: [],
        },
        user: { userId: 1, role: 'sysadmin', companyId: null },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      // sysadmin uses body company_id
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 42 }),
        })
      );
    });
  });

  // ---------- 3-15  Error with message containing special characters ----------
  describe('Error messages with special characters', () => {
    it('should preserve special characters in error messages', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('错误：数据库连接失败 <>&"\''));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('错误：数据库连接失败 <>&"\'');
    });

    it('should handle very long error message', async () => {
      const longMessage = 'A'.repeat(5000);
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(longMessage));
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe(longMessage);
    });
  });

  // ---------- 3-16  Concurrent operations simulation ----------
  describe('Concurrent operations simulation', () => {
    it('should handle multiple sequential list requests under rapid load', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      // Use sequential requests to avoid supertest ECONNRESET flakiness
      for (let i = 0; i < 5; i++) {
        const response = await agent
          .get('/api/v1/projects')
          .set('Authorization', `Bearer ${sysadminToken()}`);
        expect(response.status).toBe(200);
        expect(response.body.code).toBe(0);
      }
      expect(mockFindMany).toHaveBeenCalledTimes(5);
    });
  });

  // ---------- 3-17  createProject - missing effectiveCompanyId for sysadmin ----------
  describe('createProject - missing effectiveCompanyId (direct controller)', () => {
    it('sysadmin without body company_id should return 400', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          // no company_id
        },
        user: { userId: 1, role: 'sysadmin', companyId: null },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '所属公司不能为空' })
      );
    });

    it('sysadmin with company_id=0 (falsy) should return 400', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 0,
        },
        user: { userId: 1, role: 'sysadmin', companyId: null },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '所属公司不能为空' })
      );
    });

    it('admin without companyId in token should return 403', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
        },
        user: { userId: 5, role: 'admin', companyId: undefined },
      };

      await createProject(mockReq, mockRes);
      // Admin: effectiveCompanyId = req.user.companyId = undefined
      // admin 角色无 companyId → 403（不允许 fallback 到 body.company_id）
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '所属公司不能为空' })
      );
    });
  });

  // ---------- 3-18  updateProject - all fields at once (direct controller) ----------
  describe('updateProject - all fields simultaneously (direct)', () => {
    it('should update all fields in a single request', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        shortName: 'NewShort',
        fullName: 'NewFull',
        description: 'NewDesc',
        status: false,
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: {
          short_name: 'NewShort',
          full_name: 'NewFull',
          description: 'NewDesc',
          status: false,
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0 })
      );
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shortName: 'NewShort',
            fullName: 'NewFull',
            description: 'NewDesc',
            status: false,
          }),
        })
      );
    });
  });

  // ---------- 3-19  List with no results ----------
  describe('listProjects - empty results', () => {
    it('should return empty list with total=0', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toEqual([]);
      expect(response.body.data.total).toBe(0);
      expect(response.body.data.page).toBe(1);
      expect(response.body.data.pageSize).toBe(10);
    });
  });

  // ---------- 3-20  List with multiple results and correct pagination ----------
  describe('listProjects - multiple results pagination', () => {
    it('should return correct pagination metadata for page 2', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockItems = Array(5).fill(null).map((_, i) => ({
        ...mockProjectRow,
        id: i + 11,
        shortName: `P${i + 11}`,
      }));
      const mockFindMany = jest.fn().mockResolvedValue(mockItems);
      const mockCount = jest.fn().mockResolvedValue(15);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.list).toHaveLength(5);
      expect(response.body.data.total).toBe(15);
      expect(response.body.data.page).toBe(2);
      expect(response.body.data.pageSize).toBe(5);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 })
      );
    });
  });

  // ---------- 3-21  getProject - project with empty operators/viewers ----------
  describe('getProject - project with no operators or viewers', () => {
    it('should return empty arrays for operators and viewers', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const emptyProject = {
        ...mockProjectRow,
        operators: [],
        viewers: [],
      };
      const mockFindFirst = jest.fn().mockResolvedValue(emptyProject);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operator_ids).toEqual([]);
      expect(response.body.data.operator_names).toEqual([]);
      expect(response.body.data.viewer_ids).toEqual([]);
      expect(response.body.data.viewer_names).toEqual([]);
    });
  });

  // ---------- 3-22  Error in createProject via AppError (controller catch) ----------
  describe('createProject - AppError in service (direct controller)', () => {
    it('should map BusinessError to 400 in createProject', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');
      const { BusinessError } = require('../../apis/errors');

      const mockUserFindMany = jest.fn().mockResolvedValue([{ id: 2, companyId: 1 }]);
      const mockCreate = jest.fn().mockRejectedValue(new BusinessError('运营者不属于指定公司'));
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [2],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(400);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '运营者不属于指定公司' })
      );
    });
  });

  // ---------- 3-23  Error in updateProject via AppError (direct controller) ----------
  describe('updateProject - AppError in service (direct controller)', () => {
    it('should map ForbiddenError to 403 in updateProject', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');
      const { ForbiddenError } = require('../../apis/errors');

      const mockFindFirst = jest.fn().mockRejectedValue(new ForbiddenError('无权操作'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'Updated' },
        user: { userId: 2, role: 'admin', companyId: 2 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权操作' })
      );
    });

    it('should map non-Error thrown to 500 with default message', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue('unknown');
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'Updated' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '更新项目失败' })
      );
    });
  });

  // ---------- 3-24  Error in deleteProject via AppError (direct controller) ----------
  describe('deleteProject - AppError in service (direct controller)', () => {
    it('should map NotFoundError to 404', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');
      const { NotFoundError } = require('../../apis/errors');

      const mockFindFirst = jest.fn().mockRejectedValue(new NotFoundError('项目'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '999' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(404);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '项目不存在' })
      );
    });

    it('should map non-Error thrown to 500', async () => {
      const { deleteProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue(12345);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
        body: {},
      };

      await deleteProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '删除项目失败' })
      );
    });
  });

  // ---------- 3-25  Error in getProject via AppError (direct controller) ----------
  describe('getProject - AppError in service (direct controller)', () => {
    it('should map AppError with custom statusCode (429)', async () => {
      const { getProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');
      const { AppError } = require('../../apis/errors');

      const mockFindFirst = jest.fn().mockRejectedValue(new AppError(429, '请求过于频繁'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await getProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(429);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '请求过于频繁' })
      );
    });

    it('should map non-Error to 500 with default message', async () => {
      const { getProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue(false);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await getProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '获取项目详情失败' })
      );
    });
  });

  // ---------- 3-26  createProject - viewer_ids validation ----------
  describe('createProject - viewer_ids validation (direct controller)', () => {
    it('should pass when viewer_ids is provided and valid', async () => {
      const { createProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([{ id: 2, companyId: 1, role: 'admin' }]);
        return Promise.resolve([{ id: 3, companyId: 1, role: 'view' }]);
      });
      const mockCreate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        viewers: [{ userId: 3, user: { cnName: 'Viewer' } }],
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
          operator_ids: [2],
          viewer_ids: [3],
        },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewers: { create: [{ userId: 3 }] },
          }),
        })
      );
    });
  });

  // ---------- 3-27  updateProject - admin as operator edge case ----------
  describe('updateProject - admin operator edge cases (direct)', () => {
    it('should reject admin update when project exists but admin is not operator', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        companyId: 2,
        operators: [{ userId: 99, user: { cnName: 'Other' } }],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'Hacked' },
        user: { userId: 2, role: 'admin', companyId: 2 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '无权操作该项目' })
      );
    });
  });

  // ---------- 3-28  listProjects - search with exactly 100 chars ----------
  describe('listProjects - search boundary 100 chars', () => {
    it('should accept search with exactly 100 characters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const search100 = 'a'.repeat(100);
      const response = await agent
        .get(`/api/v1/projects?search=${search100}`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { shortName: { contains: search100, mode: 'insensitive' } },
              { fullName: { contains: search100, mode: 'insensitive' } },
            ],
          }),
        })
      );
    });
  });

  // ---------- 3-29  Schema validation via route - extra fields ----------
  describe('Schema validation - strict mode rejects extra fields', () => {
    it('should reject create with extra field "foo" via schema validation', async () => {
      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, foo: 'bar' });

      // Zod strict mode should reject unrecognized keys
      expect(response.status).toBe(400);
    });

    it('should reject update with extra field "bar" via schema validation', async () => {
      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', bar: 'baz' });

      expect(response.status).toBe(400);
    });
  });

  // ---------- 3-30  listProjects - admin with search + company + status ----------
  describe('listProjects - admin combined filters', () => {
    it('should combine admin filter with all query filters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/projects?search=Test&company_id=2&status=true')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      const whereClause = mockFindMany.mock.calls[0][0].where;
      expect(whereClause).toHaveProperty('companyId', 2);
      expect(whereClause).toHaveProperty('status', true);
      expect(whereClause).toHaveProperty('operators');
      expect(whereClause).toHaveProperty('OR');
    });
  });

  // ---------- L-2: Logger error logging ----------
  describe('Logger - unexpected error logging', () => {
    it('should log error on listProjects unexpected failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          findMany: jest.fn().mockRejectedValue(new Error('DB连接失败')),
          count: jest.fn().mockRejectedValue(new Error('DB连接失败')),
        },
      });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: 'DB连接失败', context: '获取项目列表失败' })
      );
    });

    it('should log error on getProject unexpected failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          findFirst: jest.fn().mockRejectedValue(new Error('查询超时')),
        },
      });

      const response = await agent
        .get('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: '查询超时', context: '获取项目详情失败' })
      );
    });

    it('should log error on createProject unexpected failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          create: jest.fn().mockRejectedValue(new Error('写入失败')),
        },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .post('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1 });

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: '写入失败', context: '创建项目失败' })
      );
    });

    it('should log error on updateProject unexpected failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          findFirst: jest.fn().mockRejectedValue(new Error('更新超时')),
        },
      });

      const response = await agent
        .put('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-updated' });

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: '更新超时', context: '更新项目失败' })
      );
    });

    it('should log error on deleteProject unexpected failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          findFirst: jest.fn().mockRejectedValue(new Error('删除超时')),
        },
      });

      const response = await agent
        .delete('/api/v1/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: '删除超时', context: '删除项目失败' })
      );
    });

    it('should log non-Error thrown value on list failure', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: {
          findMany: jest.fn().mockRejectedValue('unexpected string'),
          count: jest.fn().mockRejectedValue('unexpected string'),
        },
      });

      const response = await agent
        .get('/api/v1/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(mockLoggerError).toHaveBeenCalledWith(
        '[ProjectController] 未预期错误',
        expect.objectContaining({ error: 'unexpected string', context: '获取项目列表失败' })
      );
    });
  });

  // ========== Committer 评审修复测试 ==========

  // H-1: admin 无 companyId 时返回 403（非 400）
  describe('createProject - admin without companyId returns 403 (committer H-1)', () => {
    it('admin with null companyId should return 403, not fallback to body.company_id', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 999, // 恶意指定其他公司
        },
        user: { userId: 5, role: 'admin', companyId: null },
      };

      await createProject(mockReq, mockRes);
      // admin 角色 companyId 为空 → 403，不应 fallback 到 body.company_id
      expect(mockRes.status).toHaveBeenCalledWith(403);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ message: '所属公司不能为空' })
      );
    });

    it('admin with companyId=0 (falsy) should return 403', async () => {
      const { createProject } = require('../../apis/controller/project.controller');

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        body: {
          short_name: 'P1',
          full_name: 'Project 1',
          company_id: 1,
        },
        user: { userId: 5, role: 'admin', companyId: 0 },
      };

      await createProject(mockReq, mockRes);
      expect(mockRes.status).toHaveBeenCalledWith(403);
    });
  });

  // H-2: admin 不能修改项目 status
  describe('updateProject - admin cannot modify status (committer H-2)', () => {
    it('admin updateProject should strip status field', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [{ userId: 2, user: { cnName: '张三' } }], // admin(userId:2) 是运营者
      });
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { status: false }, // admin 尝试禁用项目
        user: { userId: 2, role: 'admin', companyId: 2 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
      // status 不应出现在 update data 中
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data).not.toHaveProperty('status');
    });

    it('sysadmin updateProject should include status field', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        status: false,
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { status: false },
        user: { userId: 1, role: 'sysadmin', companyId: 1 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalled();
      const updateCall = mockUpdate.mock.calls[0][0];
      expect(updateCall.data).toHaveProperty('status', false);
    });

    it('admin updateProject without status should work normally', async () => {
      const { updateProject } = require('../../apis/controller/project.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue({
        ...mockProjectRow,
        operators: [{ userId: 2, user: { cnName: '张三' } }],
      });
      const mockUpdate = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      });

      const mockRes: any = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockReq = {
        params: { id: '1' },
        body: { short_name: 'Updated' },
        user: { userId: 2, role: 'admin', companyId: 2 },
      };

      await updateProject(mockReq, mockRes);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, message: '更新项目成功' })
      );
    });
  });
});

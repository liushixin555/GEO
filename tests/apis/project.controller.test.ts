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
      const response = await agent.get('/api/projects');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/projects')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return projects list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([mockProjectRow]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/projects')
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
        .get('/api/projects?company_id=2')
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
        .get('/api/projects?status=true')
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
        .get('/api/projects?status=false')
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
        .get('/api/projects?search=Test')
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
        .get('/api/projects?page=2&pageSize=5')
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
        .get('/api/projects')
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
        .get('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('DB连接失败');
    });

    it('should return 500 with default message when error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: jest.fn() } });

      const response = await agent
        .get('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目列表失败');
    });
  });

  // ========== GET /api/projects/:id (getProject) ==========
  describe('GET /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('项目不存在');
    });

    it('should return project detail', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/1')
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
        .get('/api/projects/1')
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
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
    });

    it('should return 500 on service error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('未知错误'));
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('未知错误');
    });

    it('should return 500 with default message when getProject error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取项目详情失败');
    });
  });

  // ========== POST /api/projects (createProject) ==========
  describe('POST /api/projects', () => {
    it('should return 400 when short_name is missing', async () => {
      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'Project 1', company_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', company_id: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when company_id is missing', async () => {
      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1' });

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
        .post('/api/projects')
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
        .post('/api/projects')
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
        if (callCount === 1) return Promise.resolve([{ id: 2 }]); // operator check passes
        return Promise.resolve([]); // viewer check fails
      });
      getPrisma.mockReturnValue({ project: {}, user: { findMany: mockUserFindMany } });

      const response = await agent
        .post('/api/projects')
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
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 999 });

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
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建失败');
    });

    it('should return 500 with default message when create error has no message', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error());
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1 });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建项目失败');
    });
  });

  // ========== PUT /api/projects/:id (updateProject) ==========
  describe('PUT /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      // getById's findFirst returns null → throws '项目不存在'
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/projects/999')
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
        .put('/api/projects/1')
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
        .put('/api/projects/1')
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
        .put('/api/projects/1')
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
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1-Updated');
      expect(response.body.message).toBe('更新项目成功');
    });

    it('should return 400 when updating with invalid operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(mockProjectRow);
      const mockUserFindMany = jest.fn().mockResolvedValue([]); // operator not found in company
      const mockFindFirst2 = jest.fn().mockResolvedValue(mockProjectRow);
      let findFirstCallCount = 0;
      const findFirst = jest.fn().mockImplementation(() => {
        findFirstCallCount++;
        return Promise.resolve(mockProjectRow);
      });
      getPrisma.mockReturnValue({
        project: { findFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .put('/api/projects/1')
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
        if (userCallCount === 1) return Promise.resolve([{ id: 2 }]); // operator ok
        return Promise.resolve([]); // viewer not found
      });
      getPrisma.mockReturnValue({
        project: { findFirst: jest.fn().mockResolvedValue(mockProjectRow), update: jest.fn() },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: jest.fn().mockResolvedValue({ count: 0 }) },
      });

      const response = await agent
        .put('/api/projects/1')
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
        .put('/api/projects/1')
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
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新项目失败');
    });
  });

  // ========== DELETE /api/projects/:id (deleteProject) ==========
  describe('DELETE /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的项目ID');
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/projects/999')
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
        .delete('/api/projects/1')
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
        .delete('/api/projects/1')
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
        .delete('/api/projects/1')
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
        .delete('/api/projects/1')
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
        .delete('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除项目失败');
    });
  });
});

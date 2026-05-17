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

describe('Project Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      const mockFindMany = jest.fn().mockResolvedValue([
        {
          id: 1, shortName: 'P1', fullName: 'Project 1', description: null,
          companyId: 1, status: true,
          createdAt: new Date(), updatedAt: new Date(),
          company: { shortName: 'Company A' },
          operators: [{ userId: 2, user: { cnName: '张三' } }],
          viewers: [{ userId: 3, user: { cnName: '李四' } }],
        },
      ]);
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

    it('should support status filter', async () => {
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
  });

  describe('GET /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return project detail', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', description: 'desc',
        companyId: 1, status: true,
        createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Company A' },
        operators: [{ userId: 2, user: { cnName: '张三' } }],
        viewers: [{ userId: 3, user: { cnName: '李四' } }],
      });
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
  });

  describe('POST /api/projects', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should create project successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 2, companyId: 1, role: 'admin' },
      ]);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', description: null,
        companyId: 1, status: true,
        createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Company A' },
        operators: [{ userId: 2, user: { cnName: '张三' } }],
        viewers: [],
      });
      getPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      });

      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2] });

      expect(response.status).toBe(201);
      expect(response.body.data.short_name).toBe('P1');
    });

    it('should reject operator not belonging to company', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUserFindMany = jest.fn().mockResolvedValue([]); // no operators found matching criteria
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
      const mockOperatorFindMany = jest.fn().mockResolvedValue([{ id: 2 }]);
      const mockViewerFindMany = jest.fn().mockResolvedValue([]); // no viewers found
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation((args: any) => {
        callCount++;
        if (callCount === 1) return mockOperatorFindMany(); // operator check
        return mockViewerFindMany(); // viewer check
      });
      getPrisma.mockReturnValue({ project: {}, user: { findMany: mockUserFindMany } });

      const response = await agent
        .post('/api/projects')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1', full_name: 'Project 1', company_id: 1, operator_ids: [2], viewer_ids: [99] });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('查看者不属于指定公司');
    });
  });

  describe('PUT /api/projects/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/projects/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'Updated' });

      expect(response.status).toBe(400);
    });

    it('should update project successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, shortName: 'P1', fullName: 'Project 1', description: null,
        companyId: 1, status: true,
        createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, shortName: 'P1-Updated',
        company: { shortName: 'Company A' },
        operators: [],
        viewers: [],
      });
      getPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        projectOperator: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        projectViewer: { deleteMany: jest.fn().mockResolvedValue({ count: 0 }) },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.short_name).toBe('P1-Updated');
    });

    it('should reject company_id change for any role', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 1,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Company A' },
        operators: [], viewers: [],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ company_id: 2 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('项目所属公司不可更改');
    });
  });

  describe('Admin operator-level permission checks', () => {
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

    it('should return 403 when admin gets project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 999,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Other' },
        operators: [{ userId: 5 }], viewers: [],
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
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'MyCompany' },
        operators: [{ userId: 2 }], viewers: [],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
    });

    it('should force company_id to admin company when creating project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'MyCompany' },
        operators: [], viewers: [],
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
      // company_id should be overridden to 2, not 999
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 2 }),
        })
      );
    });

    it('should return 403 when admin updates project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 999,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Other' },
        operators: [{ userId: 5 }], viewers: [],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`)
        .send({ short_name: 'P1-Updated' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作该项目');
    });

    it('should return 403 when admin deletes project they are not operator of', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 999,
        status: true, createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Other' },
        operators: [{ userId: 5 }], viewers: [],
      });
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/projects/1')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权操作该项目');
    });
  });

  describe('DELETE /api/projects/:id', () => {
    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/projects/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should delete project successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, shortName: 'P1', companyId: 1 };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockDelete = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ project: { findFirst: mockFindFirst, delete: mockDelete } });

      const response = await agent
        .delete('/api/projects/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });
  });
});

/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import { NotFoundError, BusinessError } from '../../apis/errors';

// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '500';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken(userId = 1, companyId = 1) {
  return jwt.sign(
    { userId, username: 'sysadmin', role: 'sysadmin', companyId },
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

function mockPrisma(overrides: Record<string, any> = {}) {
  const { getPrisma } = require('../../apis/utils/db.util');
  const prisma = {
    company: {
      findMany: jest.fn().mockResolvedValue([]),
      findUnique: jest.fn().mockResolvedValue(null),
    },
    user: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      updateMany: jest.fn().mockResolvedValue({}),
    },
    ...overrides,
  };
  getPrisma.mockReturnValue(prisma);
  return prisma;
}

describe('Company Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ========== listCompanies ==========
  describe('GET /api/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/companies');
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权限访问');
    });

    it('should return company list for sysadmin', async () => {
      mockPrisma({
        company: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1, shortName: 'DEFAULT', fullName: 'Default Company',
              address: null, contactPerson: 'System', contactPhone: '0000000000',
              status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
            },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.message).toBe('获取公司列表成功');
    });

    it('should return 500 when service throws error', async () => {
      mockPrisma({
        company: {
          findMany: jest.fn().mockRejectedValue(new Error('数据库连接失败')),
        },
      });

      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司列表失败');
    });

    it('should return 500 with default message when error has no message', async () => {
      mockPrisma({
        company: {
          findMany: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司列表失败');
    });

    it('should return empty list when no companies', async () => {
      mockPrisma({
        company: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return multiple companies with correct entity fields', async () => {
      const now = new Date('2026-01-15T10:00:00Z');
      mockPrisma({
        company: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1, shortName: 'DEFAULT', fullName: 'Default Company',
              address: null, contactPerson: 'System', contactPhone: '0000000000',
              status: true, createdAt: now, updatedAt: now, deletedAt: null,
            },
            {
              id: 2, shortName: 'ACME', fullName: 'ACME Corp',
              address: 'Beijing', contactPerson: 'Zhang San', contactPhone: '13800138000',
              status: false, createdAt: now, updatedAt: now, deletedAt: null,
            },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      // Verify Company entity field mapping (snake_case)
      const first = response.body.data[0];
      expect(first).toHaveProperty('id', 1);
      expect(first).toHaveProperty('short_name', 'DEFAULT');
      expect(first).toHaveProperty('full_name', 'Default Company');
      expect(first).toHaveProperty('address');
      expect(first.address).toBeNull();
      expect(first).toHaveProperty('contact_person', 'System');
      expect(first).toHaveProperty('contact_phone', '0000000000');
      expect(first).toHaveProperty('status', true);
      expect(first).toHaveProperty('created_at');
      expect(first).toHaveProperty('updated_at');
      // Second company with non-null address and status false
      const second = response.body.data[1];
      expect(second.address).toBe('Beijing');
      expect(second.status).toBe(false);
    });

    it('should return 403 for view role', async () => {
      const viewT = jwt.sign(
        { userId: 3, username: 'viewer', role: 'view', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${viewT}`);
      expect(response.status).toBe(403);
    });
  });

  // ========== getCompany ==========
  describe('GET /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/companies/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .get('/api/v1/companies/1')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .get('/api/v1/companies/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return company detail for sysadmin', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 2, shortName: 'ACME', fullName: 'ACME Corp', address: 'Beijing',
            contactPerson: 'Zhang San', contactPhone: '13800138000',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', cnName: '张三', username: 'zhangsan' },
            { id: 20, role: 'view', cnName: '李四', username: 'lisi' },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('获取公司详情成功');
      expect(response.body.data.short_name).toBe('ACME');
      expect(response.body.data.operator_ids).toEqual([10]);
      expect(response.body.data.viewer_ids).toEqual([20]);
      expect(response.body.data.operators).toHaveLength(1);
      expect(response.body.data.viewers).toHaveLength(1);
    });

    it('should return company detail without operators and viewers', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 3, shortName: 'SOLO', fullName: 'Solo Corp', address: null,
            contactPerson: 'Wang', contactPhone: '13900139000',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      const response = await agent
        .get('/api/v1/companies/3')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operator_ids).toEqual([]);
      expect(response.body.data.viewer_ids).toEqual([]);
    });

    it('should return 404 for non-existent company', async () => {
      mockPrisma({
        company: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/v1/companies/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公司不存在');
    });

    it('should return 500 for generic service error', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockRejectedValue(new Error('未知错误')),
        },
      });

      const response = await agent
        .get('/api/v1/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司详情失败');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .get('/api/v1/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司详情失败');
    });

    it('should return 400 for negative ID', async () => {
      const response = await agent
        .get('/api/v1/companies/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 for ID = 0', async () => {
      const response = await agent
        .get('/api/v1/companies/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return CompanyDetail with operators only (no viewers)', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 5, shortName: 'OPS', fullName: 'Ops Only Corp', address: 'Shanghai',
            contactPerson: 'Admin', contactPhone: '13100131000',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', cnName: '管理员A', username: 'adminA' },
            { id: 11, role: 'admin', cnName: '管理员B', username: 'adminB' },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies/5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operator_ids).toEqual([10, 11]);
      expect(response.body.data.operators).toHaveLength(2);
      expect(response.body.data.operators[0]).toEqual({ id: 10, cn_name: '管理员A', username: 'adminA' });
      expect(response.body.data.viewer_ids).toEqual([]);
      expect(response.body.data.viewers).toEqual([]);
    });

    it('should return CompanyDetail with viewers only (no operators)', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 6, shortName: 'VIEW', fullName: 'Viewer Only Corp', address: null,
            contactPerson: 'Viewer', contactPhone: '13200132000',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 20, role: 'view', cnName: '观察者A', username: 'viewerA' },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies/6')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operator_ids).toEqual([]);
      expect(response.body.data.operators).toEqual([]);
      expect(response.body.data.viewer_ids).toEqual([20]);
      expect(response.body.data.viewers).toEqual([{ id: 20, cn_name: '观察者A', username: 'viewerA' }]);
    });

    it('should return CompanyDetail with multiple operators and viewers', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 7, shortName: 'MIX', fullName: 'Mixed Corp', address: 'Guangzhou',
            contactPerson: 'Mix', contactPhone: '13300133000',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', cnName: '管理员1', username: 'op1' },
            { id: 2, role: 'admin', cnName: '管理员2', username: 'op2' },
            { id: 3, role: 'view', cnName: '观察者1', username: 'vw1' },
            { id: 4, role: 'view', cnName: '观察者2', username: 'vw2' },
            { id: 5, role: 'view', cnName: '观察者3', username: 'vw3' },
          ]),
        },
      });

      const response = await agent
        .get('/api/v1/companies/7')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operator_ids).toEqual([1, 2]);
      expect(response.body.data.operators).toHaveLength(2);
      expect(response.body.data.viewer_ids).toEqual([3, 4, 5]);
      expect(response.body.data.viewers).toHaveLength(3);
      // Verify CompanyDetail structure completeness
      expect(response.body.data).toHaveProperty('id', 7);
      expect(response.body.data).toHaveProperty('short_name', 'MIX');
      expect(response.body.data).toHaveProperty('full_name', 'Mixed Corp');
      expect(response.body.data).toHaveProperty('address', 'Guangzhou');
      expect(response.body.data).toHaveProperty('contact_person', 'Mix');
      expect(response.body.data).toHaveProperty('contact_phone', '13300133000');
      expect(response.body.data).toHaveProperty('status', true);
      expect(response.body.data).toHaveProperty('created_at');
      expect(response.body.data).toHaveProperty('updated_at');
    });
  });

  // ========== createCompany ==========
  describe('POST /api/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when short_name is missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'Full', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when all required fields are missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when operator_ids is not an array', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: 'not-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should return 400 when operator_ids is empty array', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should return 400 when operator_ids is missing', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should create company successfully', async () => {
      const mockCompany = {
        id: 3, shortName: 'NEWCO', fullName: 'New Company',
        address: null, contactPerson: 'Test', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 10, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'NEWCO',
          full_name: 'New Company',
          contact_person: 'Test',
          contact_phone: '123',
          operator_ids: [10],
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建公司成功');
      expect(response.body.data.short_name).toBe('NEWCO');
    });

    it('should create company with viewer_ids successfully', async () => {
      const mockCompany = {
        id: 4, shortName: 'NEWCO2', fullName: 'New Company 2',
        address: 'Shanghai', contactPerson: 'Test2', contactPhone: '456',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 10, role: 'admin', status: true },
                { id: 20, role: 'view', status: true },
                { id: 21, role: 'view', status: true },
              ]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'NEWCO2',
          full_name: 'New Company 2',
          address: 'Shanghai',
          contact_person: 'Test2',
          contact_phone: '456',
          operator_ids: [10],
          viewer_ids: [20, 21],
        });

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.data.short_name).toBe('NEWCO2');
    });

    it('should return 500 when service throws error', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error('创建失败')),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建公司失败');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error()),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建公司失败');
    });

    it('should return 400 when short_name is empty string', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: '', full_name: 'FN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is empty string', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: '', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is empty string', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: '', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is empty string', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', contact_phone: '', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should create company without optional fields (no address, no viewer_ids)', async () => {
      const mockCompany = {
        id: 10, shortName: 'MIN', fullName: 'Minimal Corp',
        address: null, contactPerson: 'Min', contactPhone: '100',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 10, role: 'admin', status: true }]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'MIN',
          full_name: 'Minimal Corp',
          contact_person: 'Min',
          contact_phone: '100',
          operator_ids: [10],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.short_name).toBe('MIN');
      expect(response.body.data.address).toBeNull();
      // operator_ids[0] = 10, so user.updateMany should be called once for the operator
      expect(updateMany).toHaveBeenCalledTimes(1);
    });

    it('should create company with multiple viewer_ids', async () => {
      const mockCompany = {
        id: 11, shortName: 'MV', fullName: 'Multi Viewer Corp',
        address: 'Shenzhen', contactPerson: 'Multi', contactPhone: '200',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 1, role: 'admin', status: true },
                { id: 10, role: 'view', status: true },
                { id: 20, role: 'view', status: true },
                { id: 30, role: 'view', status: true },
              ]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'MV',
          full_name: 'Multi Viewer Corp',
          address: 'Shenzhen',
          contact_person: 'Multi',
          contact_phone: '200',
          operator_ids: [1],
          viewer_ids: [10, 20, 30],
        });

      expect(response.status).toBe(201);
      // 1 updateMany for operators + 1 updateMany for viewers = 2 updateMany calls
      expect(updateMany).toHaveBeenCalledTimes(2);
    });

    it('should create company with viewer_ids as empty array (no viewers linked)', async () => {
      const mockCompany = {
        id: 12, shortName: 'EV', fullName: 'Empty Viewer Corp',
        address: null, contactPerson: 'Ev', contactPhone: '300',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'EV',
          full_name: 'Empty Viewer Corp',
          contact_person: 'Ev',
          contact_phone: '300',
          operator_ids: [1],
          viewer_ids: [],
        });

      expect(response.status).toBe(201);
      // Only 1 updateMany for operators, no viewer updateMany since viewer_ids is empty
      expect(updateMany).toHaveBeenCalledTimes(1);
    });

    it('should return 403 for view role', async () => {
      const viewT = jwt.sign(
        { userId: 3, username: 'viewer', role: 'view', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${viewT}`)
        .send({ short_name: 'TEST' });
      expect(response.status).toBe(403);
    });
  });

  // ========== updateCompany ==========
  describe('PUT /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .put('/api/v1/companies/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when short_name is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'FN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when operator_ids is not an array', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: 'not-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should return 400 when operator_ids is empty array', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should return 400 when operator_ids is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 运营者不能为空');
    });

    it('should update company successfully', async () => {
      const updatedCompany = {
        id: 2, shortName: 'ACME-UPD', fullName: 'ACME Updated',
        address: 'Shanghai', contactPerson: 'Wang', contactPhone: '137',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              findUnique: jest.fn().mockResolvedValue({ id: 2, deletedAt: null }),
              update: jest.fn().mockResolvedValue(updatedCompany),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 10, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'ACME-UPD',
          full_name: 'ACME Updated',
          address: 'Shanghai',
          contact_person: 'Wang',
          contact_phone: '137',
          operator_ids: [10],
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新公司成功');
      expect(response.body.data.short_name).toBe('ACME-UPD');
    });

    it('should update company with viewer_ids successfully', async () => {
      const updatedCompany = {
        id: 2, shortName: 'ACME-V', fullName: 'ACME Viewers',
        address: null, contactPerson: 'Wang', contactPhone: '137',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              findUnique: jest.fn().mockResolvedValue({ id: 2, deletedAt: null }),
              update: jest.fn().mockResolvedValue(updatedCompany),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 10, role: 'admin', status: true },
                { id: 20, role: 'view', status: true },
              ]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'ACME-V',
          full_name: 'ACME Viewers',
          contact_person: 'Wang',
          contact_phone: '137',
          operator_ids: [10],
          viewer_ids: [20],
        });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should return 404 when company not found', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new NotFoundError('公司')),
      });

      const response = await agent
        .put('/api/v1/companies/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公司不存在');
    });

    it('should return 500 for generic service error', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error('数据库异常')),
      });

      const response = await agent
        .put('/api/v1/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新公司失败');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error()),
      });

      const response = await agent
        .put('/api/v1/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新公司失败');
    });

    it('should return 400 when short_name is empty string', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: '', full_name: 'FN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is empty string', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: '', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is empty string', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: '', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is empty string', async () => {
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', contact_phone: '', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should update company with viewer_ids as empty array', async () => {
      const updatedCompany = {
        id: 2, shortName: 'NO-V', fullName: 'No Viewers Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              findUnique: jest.fn().mockResolvedValue({ id: 2, deletedAt: null }),
              update: jest.fn().mockResolvedValue(updatedCompany),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'NO-V',
          full_name: 'No Viewers Corp',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
          viewer_ids: [],
        });

      expect(response.status).toBe(200);
      // Should call updateMany twice: 1 unlink + 1 operator bind
      expect(updateMany).toHaveBeenCalledTimes(2);
    });

    it('should update company with multiple viewer_ids', async () => {
      const updatedCompany = {
        id: 2, shortName: 'MV', fullName: 'Multi View Corp',
        address: 'Chengdu', contactPerson: 'B', contactPhone: '456',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              findUnique: jest.fn().mockResolvedValue({ id: 2, deletedAt: null }),
              update: jest.fn().mockResolvedValue(updatedCompany),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 1, role: 'admin', status: true },
                { id: 2, role: 'admin', status: true },
                { id: 10, role: 'view', status: true },
                { id: 20, role: 'view', status: true },
                { id: 30, role: 'view', status: true },
              ]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'MV',
          full_name: 'Multi View Corp',
          address: 'Chengdu',
          contact_person: 'B',
          contact_phone: '456',
          operator_ids: [1, 2],
          viewer_ids: [10, 20, 30],
        });

      expect(response.status).toBe(200);
      // 1 unlink + 1 operator bind + 1 viewer bind = 3 updateMany calls
      expect(updateMany).toHaveBeenCalledTimes(3);
    });

    it('should return 403 for view role', async () => {
      const viewT = jwt.sign(
        { userId: 3, username: 'viewer', role: 'view', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .put('/api/v1/companies/2')
        .set('Authorization', `Bearer ${viewT}`)
        .send({ short_name: 'TEST' });
      expect(response.status).toBe(403);
    });
  });

  // ========== toggleCompanyStatus ==========
  describe('PUT /api/companies/:id/status', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .send({ status: true });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .put('/api/v1/companies/abc/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when status is not boolean', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should return 400 when status is missing', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should return 400 when status is a number', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should enable company (status: true) successfully', async () => {
      const enabledCompany = {
        id: 1, shortName: 'TEST', fullName: 'Test Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...enabledCompany, status: false }),
          update: jest.fn().mockResolvedValue(enabledCompany),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('公司已启用');
    });

    it('should disable company (status: false) successfully', async () => {
      const disabledCompany = {
        id: 1, shortName: 'TEST', fullName: 'Test Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...disabledCompany, status: true }),
          update: jest.fn().mockResolvedValue(disabledCompany),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('公司已禁用');
    });

    it('should return 404 when company not found', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue(null),
        },
      });

      const response = await agent
        .put('/api/v1/companies/999/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公司不存在');
    });

    it('should return 500 for generic service error', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockRejectedValue(new Error('数据库错误')),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('操作失败');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 1, status: true, deletedAt: null }),
          update: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('操作失败');
    });

    it('should return 400 when status is null', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: null });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should return 400 when status is an object', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: { value: true } });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should return 400 when status is an array', async () => {
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: [true] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should return 403 for view role', async () => {
      const viewT = jwt.sign(
        { userId: 3, username: 'viewer', role: 'view', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${viewT}`)
        .send({ status: true });
      expect(response.status).toBe(403);
    });
  });

  // ========== 边界测试补充 ==========
  describe('Edge Cases & Security', () => {
    it('should return 401 for expired JWT token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${expiredToken}`);
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('登录已过期，请重新登录');
    });

    it('should return 401 for malformed JWT token', async () => {
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', 'Bearer not.a.valid.token');
      expect(response.status).toBe(401);
    });

    it('should return 401 for Bearer without token', async () => {
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', 'Bearer ');
      expect(response.status).toBe(401);
    });

    it('should handle decimal ID - parseInt truncates to integer', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1, shortName: 'TEST', fullName: 'Test Corp', address: null,
            contactPerson: 'A', contactPhone: '123',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .get('/api/v1/companies/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // parseInt('1.9') = 1, so it queries company with id=1
      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(1);
    });

    it('should handle ID with leading zeros', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 7, shortName: 'TEST', fullName: 'Test Corp', address: null,
            contactPerson: 'A', contactPhone: '123',
            status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
          }),
        },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .get('/api/v1/companies/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(7);
    });

    it('should handle special characters in company name fields', async () => {
      const mockCompany = {
        id: 1, shortName: '<script>alert("xss")</script>', fullName: '"; DROP TABLE companies; --',
        address: null, contactPerson: "O'Brien", contactPhone: '+86-138-0000-0000',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: '<script>alert("xss")</script>',
          full_name: '"; DROP TABLE companies; --',
          contact_person: "O'Brien",
          contact_phone: '+86-138-0000-0000',
          operator_ids: [1],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.short_name).toBe('<script>alert("xss")</script>');
    });

    it('should create company with Chinese characters in all fields', async () => {
      const mockCompany = {
        id: 20, shortName: '薄云科技', fullName: '薄云商机倍增服务有限公司',
        address: '北京市朝阳区建国路88号', contactPerson: '张三', contactPhone: '13800138000',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: '薄云科技',
          full_name: '薄云商机倍增服务有限公司',
          address: '北京市朝阳区建国路88号',
          contact_person: '张三',
          contact_phone: '13800138000',
          operator_ids: [1],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.short_name).toBe('薄云科技');
      expect(response.body.data.full_name).toBe('薄云商机倍增服务有限公司');
      expect(response.body.data.address).toBe('北京市朝阳区建国路88号');
      expect(response.body.data.contact_person).toBe('张三');
    });

    it('should validate body via middleware before controller ID check in updateCompany', async () => {
      // validate middleware runs before controller, so empty body triggers validation first
      const response = await agent
        .put('/api/v1/companies/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('参数验证失败');
    });

    it('should validate status via middleware before controller ID check', async () => {
      const response = await agent
        .put('/api/v1/companies/abc/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({}); // missing status — validate middleware rejects first

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('status参数无效');
    });

    it('should validate ID when status is valid in toggleCompanyStatus', async () => {
      const response = await agent
        .put('/api/v1/companies/abc/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true }); // valid status, invalid ID

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should handle toggle status with expired token', async () => {
      const expiredToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );
      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${expiredToken}`)
        .send({ status: true });
      expect(response.status).toBe(401);
    });

    it('should handle create with very long field values', async () => {
      const shortName = 'A'.repeat(50);  // max allowed
      const fullName = 'B'.repeat(200);  // max allowed
      const mockCompany = {
        id: 30, shortName, fullName,
        address: null, contactPerson: 'Test', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: shortName,
          full_name: fullName,
          contact_person: 'Test',
          contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.short_name).toBe(shortName);
    });

    it('should return 401 for wrong JWT secret', async () => {
      const wrongSecretToken = jwt.sign(
        { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
        'wrong-secret',
        { expiresIn: '2h' }
      );
      const response = await agent
        .get('/api/v1/companies')
        .set('Authorization', `Bearer ${wrongSecretToken}`);
      expect(response.status).toBe(401);
    });

    it('should return 400 for negative ID (parsed as negative int)', async () => {
      const response = await agent
        .get('/api/v1/companies/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should handle toggle status with boolean edge case - false', async () => {
      const disabledCompany = {
        id: 1, shortName: 'TEST', fullName: 'Test Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: false, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...disabledCompany, status: true }),
          update: jest.fn().mockResolvedValue(disabledCompany),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(false);
      expect(response.body.message).toBe('公司已禁用');
    });

    it('should create company with operator_ids containing multiple operators', async () => {
      const mockCompany = {
        id: 40, shortName: 'MULTI', fullName: 'Multi Op Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
      };
      const updateMany = jest.fn().mockResolvedValue({});
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: {
              findMany: jest.fn().mockResolvedValue([
                { id: 1, role: 'admin', status: true },
                { id: 2, role: 'admin', status: true },
                { id: 3, role: 'admin', status: true },
              ]),
              updateMany,
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'MULTI',
          full_name: 'Multi Op Corp',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1, 2, 3],
        });

      expect(response.status).toBe(201);
      // 3 operators → 1 updateMany call for all operators
      expect(updateMany).toHaveBeenCalledTimes(1);
    });
  });

  // ========== Controller 异常体系测试 ==========
  describe('Exception Hierarchy Tests', () => {
    it('should identify NotFoundError via instanceof', () => {
      const err = new NotFoundError('公司');
      expect(err instanceof NotFoundError).toBe(true);
      expect(err.message).toBe('公司不存在');
    });

    it('should identify BusinessError via instanceof', () => {
      const err = new BusinessError('用户不存在: 1');
      expect(err instanceof BusinessError).toBe(true);
      expect(err.message).toBe('用户不存在: 1');
    });

    it('should distinguish NotFoundError from plain Error', () => {
      const plainErr = new Error('公司不存在');
      const notFoundErr = new NotFoundError('公司');
      expect(plainErr instanceof NotFoundError).toBe(false);
      expect(notFoundErr instanceof NotFoundError).toBe(true);
    });

    it('should distinguish BusinessError from plain Error', () => {
      const plainErr = new Error('业务错误');
      const bizErr = new BusinessError('业务错误');
      expect(plainErr instanceof BusinessError).toBe(false);
      expect(bizErr instanceof BusinessError).toBe(true);
    });

    it('should handle non-Error values', () => {
      const str: unknown = '公司不存在';
      const nul: unknown = null;
      const undef: unknown = undefined;
      expect(str instanceof NotFoundError).toBe(false);
      expect(nul instanceof BusinessError).toBe(false);
      expect(undef instanceof NotFoundError).toBe(false);
    });
  });

  // ========== Schema 边界验证测试 ==========
  describe('Schema Boundary Validation', () => {
    it('should return 400 when short_name is 51 chars (over limit)', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'A'.repeat(51),
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('50');
    });

    it('should accept short_name at boundary 50 chars', async () => {
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              create: jest.fn().mockResolvedValue({
                id: 50, shortName: 'A'.repeat(50), fullName: 'FN',
                address: null, contactPerson: 'A', contactPhone: '123',
                status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
              }),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'A'.repeat(50),
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(201);
    });

    it('should return 400 when full_name is 201 chars (over limit)', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'B'.repeat(201),
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('200');
    });

    it('should return 400 when address is 501 chars (over limit)', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'FN',
          address: 'D'.repeat(501),
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('500');
    });

    it('should return 400 when contact_phone has letters', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: 'abc123',
          operator_ids: [1],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('电话格式无效');
    });

    it('should accept valid phone formats (+, -, (), #, spaces)', async () => {
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: {
              create: jest.fn().mockResolvedValue({
                id: 60, shortName: 'SN', fullName: 'FN',
                address: null, contactPerson: 'A', contactPhone: '+86-138-0000-#1',
                status: true, createdAt: new Date(), updatedAt: new Date(), deletedAt: null,
              }),
            },
            user: {
              findMany: jest.fn().mockResolvedValue([{ id: 1, role: 'admin', status: true }]),
              updateMany: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: '+86-138-0000-#1',
          operator_ids: [1],
        });

      expect(response.status).toBe(201);
      expect(response.body.data.contact_phone).toBe('+86-138-0000-#1');
    });

    it('should return 400 when operator_ids has 101 items (over limit)', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: Array.from({ length: 101 }, (_, i) => i + 1),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('运营者不能超过100个');
    });

    it('should return 400 when viewer_ids has 101 items (over limit)', async () => {
      const response = await agent
        .post('/api/v1/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN',
          full_name: 'FN',
          contact_person: 'A',
          contact_phone: '123',
          operator_ids: [1],
          viewer_ids: Array.from({ length: 101 }, (_, i) => i + 1),
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('查看者不能超过100个');
    });
  });

  // ========== ToggleStatus 深度测试 ==========
  describe('ToggleStatus Deep Tests', () => {
    it('should return 404 for soft-deleted company', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1, shortName: 'DEL', fullName: 'Deleted Corp',
            status: true, deletedAt: new Date(),
          }),
        },
      });

      const response = await agent
        .put('/api/v1/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公司不存在');
    });

    it('should toggle from disabled to enabled with full response data', async () => {
      const now = new Date();
      const company = {
        id: 5, shortName: 'TOGGLE', fullName: 'Toggle Corp',
        address: 'Shanghai', contactPerson: 'Admin', contactPhone: '13800138000',
        status: true, createdAt: now, updatedAt: now, deletedAt: null,
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...company, status: false }),
          update: jest.fn().mockResolvedValue(company),
        },
      });

      const response = await agent
        .put('/api/v1/companies/5/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(true);
      expect(response.body.data.id).toBe(5);
      expect(response.body.data.short_name).toBe('TOGGLE');
    });
  });

  // ========== getCompany 深度测试 ==========
  describe('GetCompany Deep Tests', () => {
    it('should return 404 for soft-deleted company in detail', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 1, shortName: 'DEL', fullName: 'Deleted',
            address: null, contactPerson: 'A', contactPhone: '123',
            status: true, createdAt: new Date(), updatedAt: new Date(),
            deletedAt: new Date(),
          }),
        },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .get('/api/v1/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('公司不存在');
    });

    it('should handle very large company ID', async () => {
      mockPrisma({
        company: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/v1/companies/999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });
  });
});

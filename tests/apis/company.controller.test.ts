/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set env vars BEFORE imports
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
      const response = await agent.get('/api/companies');
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .get('/api/companies')
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
              status: true, createdAt: new Date(), updatedAt: new Date(),
            },
          ]),
        },
      });

      const response = await agent
        .get('/api/companies')
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
        .get('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('数据库连接失败');
    });

    it('should return 500 with default message when error has no message', async () => {
      mockPrisma({
        company: {
          findMany: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .get('/api/companies')
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
        .get('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // ========== getCompany ==========
  describe('GET /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/companies/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .get('/api/companies/1')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .get('/api/companies/abc')
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
            status: true, createdAt: new Date(), updatedAt: new Date(),
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
        .get('/api/companies/2')
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
            status: true, createdAt: new Date(), updatedAt: new Date(),
          }),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      const response = await agent
        .get('/api/companies/3')
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
        .get('/api/companies/999')
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
        .get('/api/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('未知错误');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .get('/api/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取公司详情失败');
    });
  });

  // ========== createCompany ==========
  describe('POST /api/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/companies')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(403);
    });

    it('should return 400 when short_name is missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'Full', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when all required fields are missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when operator_ids is not an array', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: 'not-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should return 400 when operator_ids is empty array', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should return 400 when operator_ids is missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should create company successfully', async () => {
      const mockCompany = {
        id: 3, shortName: 'NEWCO', fullName: 'New Company',
        address: null, contactPerson: 'Test', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: { update: jest.fn().mockResolvedValue({}) },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/companies')
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
        status: true, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { create: jest.fn().mockResolvedValue(mockCompany) },
            user: { update: jest.fn().mockResolvedValue({}) },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .post('/api/companies')
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
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建失败');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error()),
      });

      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建公司失败');
    });
  });

  // ========== updateCompany ==========
  describe('PUT /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/companies/2')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .put('/api/companies/abc')
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
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ full_name: 'FN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when full_name is missing', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', contact_person: 'A', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_person is missing', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_phone: '123', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when contact_phone is missing', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'SN', full_name: 'FN', contact_person: 'A', operator_ids: [1] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when operator_ids is not an array', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: 'not-array',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should return 400 when operator_ids is empty array', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [],
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should return 400 when operator_ids is missing', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
        });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('运营者不能为空');
    });

    it('should update company successfully', async () => {
      const updatedCompany = {
        id: 2, shortName: 'ACME-UPD', fullName: 'ACME Updated',
        address: 'Shanghai', contactPerson: 'Wang', contactPhone: '137',
        status: true, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { update: jest.fn().mockResolvedValue(updatedCompany) },
            user: {
              updateMany: jest.fn().mockResolvedValue({}),
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/companies/2')
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
        status: true, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        $transaction: jest.fn().mockImplementation(async (cb: any) => {
          const mockTx = {
            company: { update: jest.fn().mockResolvedValue(updatedCompany) },
            user: {
              updateMany: jest.fn().mockResolvedValue({}),
              update: jest.fn().mockResolvedValue({}),
            },
          };
          return cb(mockTx);
        }),
      });

      const response = await agent
        .put('/api/companies/2')
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
        $transaction: jest.fn().mockRejectedValue(new Error('公司不存在')),
      });

      const response = await agent
        .put('/api/companies/999')
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
        .put('/api/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('数据库异常');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        $transaction: jest.fn().mockRejectedValue(new Error()),
      });

      const response = await agent
        .put('/api/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          short_name: 'SN', full_name: 'FN',
          contact_person: 'A', contact_phone: '123',
          operator_ids: [1],
        });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新公司失败');
    });
  });

  // ========== toggleCompanyStatus ==========
  describe('PUT /api/companies/:id/status', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/companies/1/status')
        .send({ status: true });

      expect(response.status).toBe(401);
    });

    it('should return 403 for non-sysadmin role', async () => {
      const response = await agent
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid ID (non-numeric)', async () => {
      const response = await agent
        .put('/api/companies/abc/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的公司ID');
    });

    it('should return 400 when status is not boolean', async () => {
      const response = await agent
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('status参数无效');
    });

    it('should return 400 when status is missing', async () => {
      const response = await agent
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('status参数无效');
    });

    it('should return 400 when status is a number', async () => {
      const response = await agent
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('status参数无效');
    });

    it('should enable company (status: true) successfully', async () => {
      const enabledCompany = {
        id: 1, shortName: 'TEST', fullName: 'Test Corp',
        address: null, contactPerson: 'A', contactPhone: '123',
        status: true, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...enabledCompany, status: false }),
          update: jest.fn().mockResolvedValue(enabledCompany),
        },
      });

      const response = await agent
        .put('/api/companies/1/status')
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
        status: false, createdAt: new Date(), updatedAt: new Date(),
      };
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ ...disabledCompany, status: true }),
          update: jest.fn().mockResolvedValue(disabledCompany),
        },
      });

      const response = await agent
        .put('/api/companies/1/status')
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
        .put('/api/companies/999/status')
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
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('数据库错误');
    });

    it('should return 500 with default message for error without message', async () => {
      mockPrisma({
        company: {
          findUnique: jest.fn().mockResolvedValue({ id: 1, status: true }),
          update: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .put('/api/companies/1/status')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('操作失败');
    });
  });
});

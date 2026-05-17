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

function adminToken() {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

describe('Company Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

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
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, shortName: 'DEFAULT', fullName: 'Default Company', address: null, contactPerson: 'System', contactPhone: '0000000000', createdAt: new Date(), updatedAt: new Date() },
          ]),
        },
      });

      const response = await agent
        .get('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
    });
  });

  describe('GET /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/companies/1');
      expect(response.status).toBe(401);
    });

    it('should return company detail for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: {
          findUnique: jest.fn().mockResolvedValue({
            id: 2, shortName: 'ACME', fullName: 'ACME Corp', address: 'Beijing',
            contactPerson: 'Zhang San', contactPhone: '13800138000',
            createdAt: new Date(), updatedAt: new Date(),
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
      expect(response.body.data.short_name).toBe('ACME');
      expect(response.body.data.operator_ids).toEqual([10]);
      expect(response.body.data.viewer_ids).toEqual([20]);
    });

    it('should return 404 for non-existent company', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        company: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/companies/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/companies')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/companies')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should create company successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCompany = {
        id: 3, shortName: 'NEWCO', fullName: 'New Company',
        address: null, contactPerson: 'Test', contactPhone: '123',
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
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
      expect(response.body.data.short_name).toBe('NEWCO');
    });
  });

  describe('PUT /api/companies/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/companies/2')
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(401);
    });

    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .put('/api/companies/2')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ short_name: 'TEST' });

      expect(response.status).toBe(400);
    });

    it('should update company successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const updatedCompany = {
        id: 2, shortName: 'ACME-UPD', fullName: 'ACME Updated',
        address: 'Shanghai', contactPerson: 'Wang', contactPhone: '137',
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
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
      expect(response.body.data.short_name).toBe('ACME-UPD');
    });
  });
});

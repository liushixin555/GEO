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

describe('Auth Controller', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 when username is missing', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({ password: 'password' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });

    it('should return 400 when password is missing', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });
  });

  describe('GET /api/auth/verify', () => {
    it('should return 401 when no token provided', async () => {
      const response = await agent.get('/api/auth/verify');

      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未登录，请先登录');
    });
  });

  describe('GET /api/health', () => {
    it('should return health status', async () => {
      const response = await agent.get('/api/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('GET /api/auth/companies/:id', () => {
    beforeEach(() => {
      jest.clearAllMocks();
    });

    it('should return 401 without token', async () => {
      const response = await agent.get('/api/auth/companies/1');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/auth/companies/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return company users for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 2, role: 'admin', cnName: '运营者', username: 'admin1' },
        { id: 3, role: 'view', cnName: '查看者', username: 'viewer1' },
      ]);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/auth/companies/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(1);
      expect(response.body.data.operators[0].cn_name).toBe('运营者');
      expect(response.body.data.viewers).toHaveLength(1);
      expect(response.body.data.viewers[0].cn_name).toBe('查看者');
    });

    it('should return company users for admin querying own company', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 2, role: 'admin', cnName: '运营者', username: 'admin1' },
      ]);
      getPrisma.mockReturnValue({ user: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/auth/companies/2')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(200);
      expect(response.body.data.operators).toHaveLength(1);
    });

    it('should reject admin querying other company', async () => {
      const response = await agent
        .get('/api/auth/companies/999')
        .set('Authorization', `Bearer ${adminToken(2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权查看其他公司的用户');
    });
  });
});

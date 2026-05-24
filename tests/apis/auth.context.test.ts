/**
 * @jest-environment node
 */
import jwt from 'jsonwebtoken';
import request from 'supertest';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.DB_URL = 'postgresql://test:test@localhost:5432/test';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';
import { getPrisma } from '../../apis/utils/db.util';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

function makeToken(userId: number, role: string, companyId?: number) {
  return jwt.sign(
    { userId, username: 'testuser', role, companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

describe('GET /api/auth/context', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should return 401 when no token', async () => {
    const res = await request(app)
      .get('/api/v1/auth/context')
      .set('User-Agent', 'test-agent/1.0');
    expect(res.status).toBe(401);
  });

  describe('sysadmin', () => {
    it('should return all companies', async () => {
      const token = makeToken(1, 'sysadmin');
      const mockCompanyFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: '公司A' },
        { id: 2, shortName: '公司B' },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findMany: mockCompanyFindMany },
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/context')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'test-agent/1.0');

      expect(res.status).toBe(200);
      expect(res.body.code).toBe(0);
      expect(res.body.data.companies).toHaveLength(2);
      expect(res.body.data.companies[0]).toEqual({ id: 1, short_name: '公司A' });
      expect(res.body.data.projects).toEqual([]);
    });

    it('should return all projects of the given company', async () => {
      const token = makeToken(1, 'sysadmin');
      const mockCompanyFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: '公司A' },
      ]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([
        { id: 10, shortName: '项目X' },
        { id: 11, shortName: '项目Y' },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/context?company_id=1')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'test-agent/1.0');

      expect(res.status).toBe(200);
      expect(res.body.data.projects).toHaveLength(2);
      expect(res.body.data.projects[0]).toEqual({ id: 10, short_name: '项目X' });
    });
  });

  describe('admin', () => {
    it('should return own company and all projects', async () => {
      const token = makeToken(2, 'admin', 1);
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({
        id: 1, shortName: '公司A', status: true,
      });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: '项目X' } },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/context?company_id=1')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'test-agent/1.0');

      expect(res.status).toBe(200);
      expect(res.body.data.companies).toEqual([{ id: 1, short_name: '公司A' }]);
      expect(res.body.data.projects).toEqual([{ id: 10, short_name: '项目X' }]);
    });
  });

  describe('view', () => {
    it('should return own company and viewed projects', async () => {
      const token = makeToken(3, 'view', 1);
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({
        id: 1, shortName: '公司A', status: true,
      });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: '项目X', companyId: 1 } },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      const res = await request(app)
        .get('/api/v1/auth/context?company_id=1')
        .set('Authorization', `Bearer ${token}`)
        .set('User-Agent', 'test-agent/1.0');

      expect(res.status).toBe(200);
      expect(res.body.data.companies).toEqual([{ id: 1, short_name: '公司A' }]);
      expect(res.body.data.projects).toEqual([{ id: 10, short_name: '项目X' }]);
    });
  });

  it('should return empty projects when company_id not provided', async () => {
    const token = makeToken(1, 'sysadmin');
    const mockCompanyFindMany = jest.fn().mockResolvedValue([]);
    mockedGetPrisma.mockReturnValue({
      company: { findMany: mockCompanyFindMany },
    } as any);

    const res = await request(app)
      .get('/api/v1/auth/context')
      .set('Authorization', `Bearer ${token}`)
      .set('User-Agent', 'test-agent/1.0');

    expect(res.status).toBe(200);
    expect(res.body.data.projects).toEqual([]);
  });
});

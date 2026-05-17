/**
 * @jest-environment node
 */
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { AuthServiceImpl } from '../../apis/service/impl/auth.service.impl';
import { LoginSelectionError } from '../../apis/entity';
import { getPrisma } from '../../apis/utils/db.util';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

describe('AuthService', () => {
  let authService: AuthServiceImpl;

  beforeEach(() => {
    authService = new AuthServiceImpl();
    jest.clearAllMocks();
  });

  describe('login', () => {
    const hashPassword = (password: string) => require('bcryptjs').hashSync(password, 10);

    it('should throw error when user not found', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      await expect(
        authService.login({ username: 'nonexistent', password: 'password' })
      ).rejects.toThrow('用户名或密码错误');
    });

    it('should throw error when password is incorrect', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'testuser', passwordHash: '$2a$10$invalidhash',
        cnName: 'Test User', role: 'admin', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      await expect(
        authService.login({ username: 'testuser', password: 'wrongpassword' })
      ).rejects.toThrow('用户名或密码错误');
    });

    it('should throw LoginSelectionError when user has no accessible company', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'testuser', passwordHash: hash,
        cnName: 'Test', role: 'view', companyId: 999,
        selectedCompany: null, selectedProject: null,
      });
      // view role with companyId=999, but company doesn't exist
      const mockCompanyFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: jest.fn() },
        company: { findUnique: mockCompanyFindUnique },
      } as any);

      await expect(
        authService.login({ username: 'testuser', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);

      await expect(
        authService.login({ username: 'testuser', password: 'password123' })
      ).rejects.toThrow('没有权限访问任何公司');
    });

    it('should throw LoginSelectionError when view user has no accessible project', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'viewer', passwordHash: hash,
        cnName: 'Viewer', role: 'view', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'TestCo' });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      await expect(
        authService.login({ username: 'viewer', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);

      await expect(
        authService.login({ username: 'viewer', password: 'password123' })
      ).rejects.toThrow('没有权限访问任何项目');
    });

    it('should return null selected_project for admin with no projects', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'TestCo' });
      const mockProjectFindMany = jest.fn().mockResolvedValue([]);
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        project: { findMany: mockProjectFindMany },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'admin', password: 'password123' });

      expect(result.token).toBeDefined();
      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'TestCo' });
      expect(result.user.selected_project).toBeNull();
    });

    it('should return selected_company and selected_project for sysadmin', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'TestCo' }]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([{ id: 10, shortName: 'Proj1' }]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      const result = await authService.login({ username: 'sysadmin', password: 'password123' });

      expect(result.token).toBeDefined();
      expect(result.user.username).toBe('sysadmin');
      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'TestCo' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });

    it('should use saved selection when still valid', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: { id: 2, shortName: 'Co2' },
        selectedProject: { id: 20, shortName: 'Proj2' },
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'Co1' },
        { id: 2, shortName: 'Co2' },
      ]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([
        { id: 20, shortName: 'Proj2' },
        { id: 21, shortName: 'Proj3' },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      const result = await authService.login({ username: 'sysadmin', password: 'password123' });

      expect(result.user.selected_company).toEqual({ id: 2, short_name: 'Co2' });
      expect(result.user.selected_project).toEqual({ id: 20, short_name: 'Proj2' });
    });

    it('should auto-select first company/project when saved selection is invalid', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: { id: 99, shortName: 'Deleted' },
        selectedProject: { id: 99, shortName: 'Deleted' },
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'Co1' },
      ]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([
        { id: 10, shortName: 'Proj1' },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      const result = await authService.login({ username: 'sysadmin', password: 'password123' });

      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'Co1' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });
  });

  describe('verifyToken', () => {
    it('should return valid for a valid token', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'admin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(true);
      expect(result.userId).toBe(1);
    });

    it('should return invalid for an expired token', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'admin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(false);
    });

    it('should return invalid for a malformed token', async () => {
      const result = await authService.verifyToken('invalid-token');
      expect(result.valid).toBe(false);
    });
  });

  describe('getAccessibleCompanies', () => {
    it('should return all companies for sysadmin', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'Co1' },
        { id: 2, shortName: 'Co2' },
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleCompanies(1, 'sysadmin', null);
      expect(result).toEqual([{ id: 1, short_name: 'Co1' }, { id: 2, short_name: 'Co2' }]);
    });

    it('should return own company for admin', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo' });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(2, 'admin', 1);
      expect(result).toEqual([{ id: 1, short_name: 'MyCo' }]);
    });

    it('should return empty for admin without company', async () => {
      const result = await authService.getAccessibleCompanies(2, 'admin', null);
      expect(result).toEqual([]);
    });
  });

  describe('getAccessibleProjects', () => {
    it('should return all projects for sysadmin', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'P1' },
        { id: 2, shortName: 'P2' },
      ]);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleProjects(1, 'sysadmin', 1);
      expect(result).toEqual([{ id: 1, short_name: 'P1' }, { id: 2, short_name: 'P2' }]);
    });

    it('should return empty when no companyId', async () => {
      const result = await authService.getAccessibleProjects(1, 'sysadmin', null);
      expect(result).toEqual([]);
    });

    it('should return viewer projects for view role', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'V1' } },
      ]);
      mockedGetPrisma.mockReturnValue({ projectViewer: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleProjects(3, 'view', 1);
      expect(result).toEqual([{ id: 10, short_name: 'V1' }]);
    });
  });

  describe('saveSelection', () => {
    it('should update user selection', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({ user: { update: mockUpdate } } as any);

      await authService.saveSelection(1, { company_id: 2, project_id: 3 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 2, selectedProjectId: 3 },
      });
    });
  });
});

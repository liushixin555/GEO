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

  // ══════════════════════════════════════
  //  login
  // ══════════════════════════════════════

  describe('login', () => {
    const hashPassword = (password: string) => require('bcryptjs').hashSync(password, 10);

    it('用户不存在时应抛出"用户名或密码错误"', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      await expect(
        authService.login({ username: 'nonexistent', password: 'password' })
      ).rejects.toThrow('用户名或密码错误');
    });

    it('密码错误时应抛出"用户名或密码错误"', async () => {
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

    it('没有任何可访问公司时应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'testuser', passwordHash: hash,
        cnName: 'Test', role: 'view', companyId: 999,
        selectedCompany: null, selectedProject: null,
      });
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

    it('view 角色没有任何可访问项目时应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'viewer', passwordHash: hash,
        cnName: 'Viewer', role: 'view', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'TestCo', status: true });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      await expect(
        authService.login({ username: 'viewer', password: 'password123' })
      ).rejects.toThrow('没有权限访问任何项目');
    });

    it('admin 无项目时 selected_project 为 null 且不报错', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'TestCo', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'admin', password: 'password123' });

      expect(result.token).toBeDefined();
      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'TestCo' });
      expect(result.user.selected_project).toBeNull();
    });

    it('sysadmin 成功登录并返回选择的公司和项目', async () => {
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
      expect(result.user.role).toBe('sysadmin');
      expect(result.user.company_id).toBeNull();
      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'TestCo' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });

    it('保存的选择仍然有效时应使用保存的公司和项目', async () => {
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

    it('保存的公司不在可访问列表时应自动选择第一个公司', async () => {
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

    it('保存的项目不在可访问列表时应自动选择第一个项目', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: { id: 99, shortName: 'Deleted' },
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'Co1' },
      ]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([
        { id: 10, shortName: 'Proj1' },
        { id: 11, shortName: 'Proj2' },
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

    it('应持久化解析后的选择到数据库', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'Co1' }]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([{ id: 10, shortName: 'Proj1' }]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      await authService.login({ username: 'sysadmin', password: 'password123' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 1, selectedProjectId: 10 },
      });
    });

    it('JWT token 应包含正确的用户信息', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 42, username: 'admin1', passwordHash: hash,
        cnName: '管理员', role: 'admin', companyId: 5,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 5, shortName: 'Co5', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 50, shortName: 'Proj50' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'admin1', password: 'password123' });

      // 验证 token 可被解析并包含正确信息
      const decoded = jwt.verify(result.token, 'test-secret') as any;
      expect(decoded.userId).toBe(42);
      expect(decoded.username).toBe('admin1');
      expect(decoded.role).toBe('admin');
      expect(decoded.companyId).toBe(5);
    });

    it('admin 成功登录应通过 projectOperator 获取项目', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'Proj1' } },
        { project: { id: 11, shortName: 'Proj2' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'admin', password: 'password123' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });

    it('view 成功登录应通过 projectViewer 获取项目', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'viewer', passwordHash: hash,
        cnName: 'Viewer', role: 'view', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: true });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'Proj1' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      const result = await authService.login({ username: 'viewer', password: 'password123' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });

    it('admin 公司被禁用时登录应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: false });
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: jest.fn() },
        company: { findUnique: mockCompanyFindUnique },
      } as any);

      await expect(
        authService.login({ username: 'admin', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);
    });

    it('登录返回的 user 对象应包含所有必要字段', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 42, username: 'testuser', passwordHash: hash,
        cnName: '测试用户', role: 'admin', companyId: 5,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 5, shortName: 'Co5', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 50, shortName: 'Proj50' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'testuser', password: 'password123' });

      expect(result.user.id).toBe(42);
      expect(result.user.username).toBe('testuser');
      expect(result.user.cn_name).toBe('测试用户');
      expect(result.user.role).toBe('admin');
      expect(result.user.company_id).toBe(5);
      expect(result.token).toBeDefined();
      expect(typeof result.token).toBe('string');
    });

    it('view 保存的项目仍有效时应使用保存的项目', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'viewer', passwordHash: hash,
        cnName: 'Viewer', role: 'view', companyId: 1,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: { id: 10, shortName: 'Proj1' },
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: true });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'Proj1' } },
        { project: { id: 11, shortName: 'Proj2' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      const result = await authService.login({ username: 'viewer', password: 'password123' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });
  });

  // ══════════════════════════════════════
  //  verifyToken
  // ══════════════════════════════════════

  describe('verifyToken', () => {
    it('有效 token 应返回 { valid: true, user }', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'admin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );

      const mockUserFindUnique = jest.fn().mockResolvedValue({
        id: 1,
        username: 'test',
        cnName: '测试',
        role: 'admin',
        companyId: 1,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: { id: 1, shortName: 'Pr1' },
      });
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockUserFindUnique },
      } as any);

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(true);
      expect(result.user).toBeDefined();
      expect(result.user!.id).toBe(1);
      expect(result.user!.role).toBe('admin');
    });

    it('过期 token 应返回 { valid: false }', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'admin', companyId: 1 },
        'test-secret',
        { expiresIn: '-1s' }
      );

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(false);
    });

    it('格式错误的 token 应返回 { valid: false }', async () => {
      const result = await authService.verifyToken('invalid-token');
      expect(result.valid).toBe(false);
    });

    it('使用错误密钥签发的 token 应返回 { valid: false }', async () => {
      const token = jwt.sign(
        { userId: 1 },
        'wrong-secret',
        { expiresIn: '2h' }
      );

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(false);
    });
  });

  // ══════════════════════════════════════
  //  saveSelection
  // ══════════════════════════════════════

  describe('saveSelection', () => {
    it('应更新用户的 selectedCompanyId 和 selectedProjectId', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 2, shortName: 'Co2' }]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([{ id: 3, shortName: 'Pr3' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      await authService.saveSelection(1, 'sysadmin', null, { company_id: 2, project_id: 3 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 2, selectedProjectId: 3 },
      });
    });

    it('project_id 为 undefined 时应设为 null', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 2, shortName: 'Co2' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
      } as any);

      await authService.saveSelection(1, 'sysadmin', null, { company_id: 2 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 2, selectedProjectId: null },
      });
    });

    it('project_id 显式为 null 时应设为 null', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 2, shortName: 'Co2' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
      } as any);

      await authService.saveSelection(1, 'sysadmin', null, { company_id: 2, project_id: null });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 2, selectedProjectId: null },
      });
    });

    it('无权选择该公司时应抛出错误', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'Co1' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
      } as any);

      await expect(
        authService.saveSelection(1, 'sysadmin', null, { company_id: 999 })
      ).rejects.toThrow('无权选择该公司');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('无权选择该项目时应抛出错误', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 2, shortName: 'Co2' }]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([{ id: 5, shortName: 'Pr5' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      await expect(
        authService.saveSelection(1, 'sysadmin', null, { company_id: 2, project_id: 999 })
      ).rejects.toThrow('无权选择该项目');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('admin 只能选择自己的公司', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: true });
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
      } as any);

      // admin 的 companyId=1, 尝试选择 company_id=2（不属于自己）
      await expect(
        authService.saveSelection(2, 'admin', 1, { company_id: 2 })
      ).rejects.toThrow('无权选择该公司');
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('view 成功选择自己的公司和项目', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: true });
      const mockProjectViewerFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'Proj1' } },
      ]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockProjectViewerFindMany },
      } as any);

      await authService.saveSelection(3, 'view', 1, { company_id: 1, project_id: 10 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { selectedCompanyId: 1, selectedProjectId: 10 },
      });
    });

    it('admin 公司被禁用时应无法选择公司', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: false });
      mockedGetPrisma.mockReturnValue({
        user: { update: jest.fn() },
        company: { findUnique: mockCompanyFindUnique },
      } as any);

      await expect(
        authService.saveSelection(2, 'admin', 1, { company_id: 1 })
      ).rejects.toThrow('无权选择该公司');
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleCompanies
  // ══════════════════════════════════════

  describe('getAccessibleCompanies', () => {
    it('sysadmin 应返回所有启用的公司', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'Co1' },
        { id: 2, shortName: 'Co2' },
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleCompanies(1, 'sysadmin', null);
      expect(result).toEqual([{ id: 1, short_name: 'Co1' }, { id: 2, short_name: 'Co2' }]);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: true }, orderBy: { id: 'asc' } })
      );
    });

    it('admin 有 companyId 时应返回自己的公司', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: true });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(2, 'admin', 1);
      expect(result).toEqual([{ id: 1, short_name: 'MyCo' }]);
    });

    it('admin 的公司被禁用时应返回空数组', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: false });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(2, 'admin', 1);
      expect(result).toEqual([]);
    });

    it('admin 的公司不存在时应返回空数组', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(2, 'admin', 999);
      expect(result).toEqual([]);
    });

    it('companyId 为 null 且非 sysadmin 时应返回空数组', async () => {
      const result = await authService.getAccessibleCompanies(2, 'admin', null);
      expect(result).toEqual([]);
    });

    it('view 有 companyId 时应返回自己的公司', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: true });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(3, 'view', 1);
      expect(result).toEqual([{ id: 1, short_name: 'MyCo' }]);
    });

    it('view 的公司被禁用时应返回空数组', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: false });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      const result = await authService.getAccessibleCompanies(3, 'view', 1);
      expect(result).toEqual([]);
    });

    it('view companyId 为 null 时应返回空数组', async () => {
      const result = await authService.getAccessibleCompanies(3, 'view', null);
      expect(result).toEqual([]);
    });

    it('companyId 为 undefined 时非 sysadmin 应返回空数组', async () => {
      const result = await authService.getAccessibleCompanies(3, 'admin', undefined);
      expect(result).toEqual([]);
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleProjects
  // ══════════════════════════════════════

  describe('getAccessibleProjects', () => {
    it('companyId 为 null 时应返回空数组', async () => {
      const result = await authService.getAccessibleProjects(1, 'sysadmin', null);
      expect(result).toEqual([]);
    });

    it('sysadmin 应返回该公司所有启用项目', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'P1' },
        { id: 2, shortName: 'P2' },
      ]);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleProjects(1, 'sysadmin', 1);
      expect(result).toEqual([{ id: 1, short_name: 'P1' }, { id: 2, short_name: 'P2' }]);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 1, company: { status: true }, status: true },
          orderBy: { id: 'asc' },
        })
      );
    });

    it('sysadmin 跳过公司状态检查', async () => {
      const mockProjectFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findMany: mockProjectFindMany },
        company: { findUnique: jest.fn() },
      } as any);

      await authService.getAccessibleProjects(1, 'sysadmin', 1);
      // sysadmin 不调用 company.findUnique
      const prisma = mockedGetPrisma();
      expect((prisma as any).company.findUnique).not.toHaveBeenCalled();
    });

    it('admin 的公司被禁用时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: false });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockCompanyFindUnique } } as any);

      const result = await authService.getAccessibleProjects(1, 'admin', 1);
      expect(result).toEqual([]);
    });

    it('admin 的公司不存在时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockCompanyFindUnique } } as any);

      const result = await authService.getAccessibleProjects(1, 'admin', 1);
      expect(result).toEqual([]);
    });

    it('admin 应返回其作为 operator 的项目', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: true });
      const mockOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'P1' } },
        { project: { id: 11, shortName: 'P2' } },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockOperatorFindMany },
      } as any);

      const result = await authService.getAccessibleProjects(1, 'admin', 1);
      expect(result).toEqual([{ id: 10, short_name: 'P1' }, { id: 11, short_name: 'P2' }]);
      expect(mockOperatorFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 1, project: { companyId: 1, company: { status: true }, status: true } },
          orderBy: { projectId: 'asc' },
        })
      );
    });

    it('view 的公司被禁用时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: false });
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockCompanyFindUnique } } as any);

      const result = await authService.getAccessibleProjects(1, 'view', 1);
      expect(result).toEqual([]);
    });

    it('view 的公司不存在时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockCompanyFindUnique } } as any);

      const result = await authService.getAccessibleProjects(1, 'view', 1);
      expect(result).toEqual([]);
    });

    it('view 应返回其作为 viewer 的项目', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: true });
      const mockViewerFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'V1' } },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockViewerFindMany },
      } as any);

      const result = await authService.getAccessibleProjects(3, 'view', 1);
      expect(result).toEqual([{ id: 10, short_name: 'V1' }]);
      expect(mockViewerFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { userId: 3, project: { companyId: 1, company: { status: true }, status: true } },
          orderBy: { projectId: 'asc' },
        })
      );
    });

    it('companyId 为 undefined 时应返回空数组', async () => {
      const result = await authService.getAccessibleProjects(1, 'sysadmin', undefined);
      expect(result).toEqual([]);
    });

    it('sysadmin 无匹配项目时应返回空数组', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleProjects(1, 'sysadmin', 999);
      expect(result).toEqual([]);
    });

    it('admin 无 operator 关联时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: true });
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockOperatorFindMany },
      } as any);

      const result = await authService.getAccessibleProjects(1, 'admin', 1);
      expect(result).toEqual([]);
    });

    it('view 无 viewer 关联时应返回空数组', async () => {
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ status: true });
      const mockViewerFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockCompanyFindUnique },
        projectViewer: { findMany: mockViewerFindMany },
      } as any);

      const result = await authService.getAccessibleProjects(1, 'view', 1);
      expect(result).toEqual([]);
    });
  });

  // ══════════════════════════════════════
  //  getCompanyUsers
  // ══════════════════════════════════════

  describe('getCompanyUsers', () => {
    it('应按角色分组返回操作员和查看者', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, role: 'admin', cnName: '管理员A', username: 'admin1' },
        { id: 2, role: 'view', cnName: '查看者B', username: 'viewer1' },
        { id: 3, role: 'admin', cnName: '管理员C', username: 'admin2' },
        { id: 4, role: 'view', cnName: '查看者D', username: 'viewer2' },
      ]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      const result = await authService.getCompanyUsers(10);

      expect(result.operators).toEqual([
        { id: 1, cn_name: '管理员A', username: 'admin1' },
        { id: 3, cn_name: '管理员C', username: 'admin2' },
      ]);
      expect(result.viewers).toEqual([
        { id: 2, cn_name: '查看者B', username: 'viewer1' },
        { id: 4, cn_name: '查看者D', username: 'viewer2' },
      ]);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 10, status: true, role: { in: ['admin', 'view'] } },
        })
      );
    });

    it('没有用户时应返回空数组', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      const result = await authService.getCompanyUsers(10);
      expect(result.operators).toEqual([]);
      expect(result.viewers).toEqual([]);
    });

    it('只有操作员没有查看者时', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, role: 'admin', cnName: '管理员A', username: 'admin1' },
      ]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      const result = await authService.getCompanyUsers(10);
      expect(result.operators).toHaveLength(1);
      expect(result.viewers).toHaveLength(0);
    });

    it('只有查看者没有操作员时', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 2, role: 'view', cnName: '查看者B', username: 'viewer1' },
      ]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      const result = await authService.getCompanyUsers(10);
      expect(result.operators).toHaveLength(0);
      expect(result.viewers).toHaveLength(1);
    });

    it('不应包含 sysadmin 角色的用户', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, role: 'admin', cnName: '管理员A', username: 'admin1' },
        { id: 2, role: 'view', cnName: '查看者B', username: 'viewer1' },
      ]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      await authService.getCompanyUsers(10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 10, status: true, role: { in: ['admin', 'view'] } },
        })
      );
    });

    it('不应包含被禁用的用户', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      await authService.getCompanyUsers(10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: true }),
        })
      );
    });
  });

  // ══════════════════════════════════════
  //  getLatestUserState
  // ══════════════════════════════════════

  describe('getLatestUserState', () => {
    it('应返回包含 selectedCompany 和 selectedProject 的完整用户状态', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin1',
        cnName: '管理员',
        role: 'admin',
        companyId: 5,
        selectedCompany: { id: 5, shortName: 'Co5' },
        selectedProject: { id: 10, shortName: 'Proj10' },
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.getLatestUserState(1);

      expect(result).toEqual({
        id: 1,
        username: 'admin1',
        cn_name: '管理员',
        role: 'admin',
        company_id: 5,
        selected_company: { id: 5, short_name: 'Co5' },
        selected_project: { id: 10, short_name: 'Proj10' },
      });
      expect(mockFindUnique).toHaveBeenCalledWith({
        where: { id: 1 },
        include: {
          selectedCompany: { select: { id: true, shortName: true } },
          selectedProject: { select: { id: true, shortName: true } },
        },
      });
    });

    it('selectedCompany 和 selectedProject 为 null 时应返回 null', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 2,
        username: 'newuser',
        cnName: '新用户',
        role: 'view',
        companyId: 1,
        selectedCompany: null,
        selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.getLatestUserState(2);

      expect(result.selected_company).toBeNull();
      expect(result.selected_project).toBeNull();
    });

    it('用户不存在时应抛出"用户不存在"', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      await expect(authService.getLatestUserState(999)).rejects.toThrow('用户不存在');
    });

    it('companyId 为 null 时 company_id 应为 null', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1,
        username: 'sysadmin',
        cnName: '系统管理员',
        role: 'sysadmin',
        companyId: null,
        selectedCompany: null,
        selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.getLatestUserState(1);
      expect(result.company_id).toBeNull();
    });
  });

  // ══════════════════════════════════════
  //  verifyToken — 补充边界场景
  // ══════════════════════════════════════

  describe('verifyToken 补充', () => {
    it('token 有效但用户已被删除时应返回 { valid: false }', async () => {
      const token = jwt.sign(
        { userId: 999, username: 'deleted', role: 'admin', companyId: 1 },
        'test-secret',
        { expiresIn: '2h' }
      );

      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(false);
      expect(result.user).toBeUndefined();
    });

    it('用户 selectedCompany/selectedProject 为 null 时应返回 null', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'test', role: 'sysadmin', companyId: null },
        'test-secret',
        { expiresIn: '2h' }
      );

      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1,
        username: 'test',
        cnName: '测试',
        role: 'sysadmin',
        companyId: null,
        selectedCompany: null,
        selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.verifyToken(token);
      expect(result.valid).toBe(true);
      expect(result.user!.selected_company).toBeNull();
      expect(result.user!.selected_project).toBeNull();
    });
  });

  // ══════════════════════════════════════
  //  login — 补充边界场景
  // ══════════════════════════════════════

  describe('login 补充', () => {
    const hashPassword = (password: string) => require('bcryptjs').hashSync(password, 10);

    it('admin companyId 为 undefined 时应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: undefined,
        selectedCompany: null, selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: jest.fn() },
      } as any);

      await expect(
        authService.login({ username: 'admin', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);
    });

    it('view companyId 为 null 时应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'viewer', passwordHash: hash,
        cnName: 'Viewer', role: 'view', companyId: null,
        selectedCompany: null, selectedProject: null,
      });
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: jest.fn() },
      } as any);

      await expect(
        authService.login({ username: 'viewer', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);
    });

    it('sysadmin 无任何公司时应抛出 LoginSelectionError', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: jest.fn() },
        company: { findMany: mockCompanyFindMany },
      } as any);

      await expect(
        authService.login({ username: 'sysadmin', password: 'password123' })
      ).rejects.toThrow(LoginSelectionError);
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleProjects — 补充边界
  // ══════════════════════════════════════

  describe('getAccessibleProjects 补充', () => {
    it('companyId 为 0（falsy）时应返回空数组', async () => {
      const result = await authService.getAccessibleProjects(1, 'sysadmin', 0);
      expect(result).toEqual([]);
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleCompanies — 补充边界
  // ══════════════════════════════════════

  describe('getAccessibleCompanies 补充', () => {
    it('sysadmin 无启用公司时应返回空数组', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleCompanies(1, 'sysadmin', null);
      expect(result).toEqual([]);
    });
  });

  // ══════════════════════════════════════
  //  IAuthService 接口合规性
  // ══════════════════════════════════════

  describe('接口合规性', () => {
    it('AuthServiceImpl 应实现 IAuthService 的所有方法', () => {
      const instance = new AuthServiceImpl();
      const methods: (keyof import('../../apis/service/auth.service').IAuthService)[] = [
        'login',
        'verifyToken',
        'getLatestUserState',
        'saveSelection',
        'getAccessibleCompanies',
        'getAccessibleProjects',
        'getCompanyUsers',
      ];

      for (const method of methods) {
        expect(typeof (instance as any)[method]).toBe('function');
      }
    });
  });

  // ══════════════════════════════════════
  //  login — 第3轮补充
  // ══════════════════════════════════════

  describe('login 第3轮补充', () => {
    const hashPassword = (password: string) => require('bcryptjs').hashSync(password, 10);

    it('selectedCompany 存在且在列表中但 selectedProject 为 null 时应自动选择第一个项目', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([
        { project: { id: 10, shortName: 'Proj1' } },
        { project: { id: 11, shortName: 'Proj2' } },
      ]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      const result = await authService.login({ username: 'admin', password: 'password123' });

      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'Co1' });
      expect(result.user.selected_project).toEqual({ id: 10, short_name: 'Proj1' });
    });

    it('sysadmin 无项目时 selectedProject 应为 null 且不报错', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1, username: 'sysadmin', passwordHash: hash,
        cnName: '系统管理员', role: 'sysadmin', companyId: null,
        selectedCompany: { id: 1, shortName: 'Co1' },
        selectedProject: null,
      });
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'Co1' }]);
      const mockProjectFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
        project: { findMany: mockProjectFindMany },
      } as any);

      const result = await authService.login({ username: 'sysadmin', password: 'password123' });

      expect(result.user.selected_company).toEqual({ id: 1, short_name: 'Co1' });
      expect(result.user.selected_project).toBeNull();
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 1, selectedProjectId: null },
      });
    });

    it('login 持久化时无项目应写入 selectedProjectId 为 null', async () => {
      const hash = hashPassword('password123');
      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 5, username: 'admin', passwordHash: hash,
        cnName: 'Admin', role: 'admin', companyId: 1,
        selectedCompany: null, selectedProject: null,
      });
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'Co1', status: true });
      const mockProjectOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        user: { findUnique: mockFindUnique, update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
        projectOperator: { findMany: mockProjectOperatorFindMany },
      } as any);

      await authService.login({ username: 'admin', password: 'password123' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 5 },
        data: { selectedCompanyId: 1, selectedProjectId: null },
      });
    });
  });

  // ══════════════════════════════════════
  //  saveSelection — 第3轮补充
  // ══════════════════════════════════════

  describe('saveSelection 第3轮补充', () => {
    it('project_id 为 0（falsy）时应跳过项目权限校验并直接更新', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindMany = jest.fn().mockResolvedValue([{ id: 2, shortName: 'Co2' }]);
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findMany: mockCompanyFindMany },
      } as any);

      await authService.saveSelection(1, 'sysadmin', null, { company_id: 2, project_id: 0 as any });

      // project_id 为 0 是 falsy，跳过权限校验，但 ?? null 不处理 0
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { selectedCompanyId: 2, selectedProjectId: 0 },
      });
    });

    it('admin 成功保存公司选择（无项目）', async () => {
      const mockUpdate = jest.fn().mockResolvedValue({});
      const mockCompanyFindUnique = jest.fn().mockResolvedValue({ id: 1, shortName: 'MyCo', status: true });
      mockedGetPrisma.mockReturnValue({
        user: { update: mockUpdate },
        company: { findUnique: mockCompanyFindUnique },
      } as any);

      await authService.saveSelection(2, 'admin', 1, { company_id: 1 });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { selectedCompanyId: 1, selectedProjectId: null },
      });
    });
  });

  // ══════════════════════════════════════
  //  verifyToken — 第3轮补充
  // ══════════════════════════════════════

  describe('verifyToken 第3轮补充', () => {
    it('有效 token 应返回完整的用户字段映射', async () => {
      const token = jwt.sign(
        { userId: 1, username: 'admin1', role: 'admin', companyId: 5 },
        'test-secret',
        { expiresIn: '2h' }
      );

      const mockFindUnique = jest.fn().mockResolvedValue({
        id: 1,
        username: 'admin1',
        cnName: '管理员',
        role: 'admin',
        companyId: 5,
        selectedCompany: { id: 5, shortName: 'Co5' },
        selectedProject: { id: 10, shortName: 'Proj10' },
      });
      mockedGetPrisma.mockReturnValue({ user: { findUnique: mockFindUnique } } as any);

      const result = await authService.verifyToken(token);

      expect(result.valid).toBe(true);
      expect(result.user).toEqual({
        id: 1,
        username: 'admin1',
        cn_name: '管理员',
        role: 'admin',
        company_id: 5,
        selected_company: { id: 5, short_name: 'Co5' },
        selected_project: { id: 10, short_name: 'Proj10' },
      });
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleCompanies — 第3轮补充
  // ══════════════════════════════════════

  describe('getAccessibleCompanies 第3轮补充', () => {
    it('companyId 为 0（falsy）时非 sysadmin 应返回空数组', async () => {
      const result = await authService.getAccessibleCompanies(2, 'admin', 0);
      expect(result).toEqual([]);
    });

    it('sysadmin 调用时 companyId 参数应被忽略', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'Co1' }]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await authService.getAccessibleCompanies(1, 'sysadmin', 999);

      expect(result).toEqual([{ id: 1, short_name: 'Co1' }]);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: true } })
      );
    });
  });

  // ══════════════════════════════════════
  //  getAccessibleProjects — 第3轮补充
  // ══════════════════════════════════════

  describe('getAccessibleProjects 第3轮补充', () => {
    it('sysadmin 项目查询应包含 company.status=true 条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([{ id: 1, shortName: 'P1' }]);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany } } as any);

      await authService.getAccessibleProjects(1, 'sysadmin', 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { companyId: 5, company: { status: true }, status: true },
        })
      );
    });
  });

  // ══════════════════════════════════════
  //  getCompanyUsers — 第3轮补充
  // ══════════════════════════════════════

  describe('getCompanyUsers 第3轮补充', () => {
    it('查询应指定 select 字段（id/role/cnName/username）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany } } as any);

      await authService.getCompanyUsers(10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, role: true, cnName: true, username: true },
        })
      );
    });
  });
});

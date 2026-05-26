/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('bcryptjs', () => ({
  hash: jest.fn().mockResolvedValue('$2b$10$hashedpassword'),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { UserServiceImpl } from '../../apis/service/impl/user.service.impl';
import bcrypt from 'bcryptjs';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;
const mockedBcryptHash = bcrypt.hash as jest.Mock;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    username: 'testuser',
    passwordHash: '$2b$10$hashedpassword',
    cnName: '测试用户',
    role: 'admin',
    status: true,
    companyId: 1,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    company: { shortName: '测试公司' },
    ...overrides,
  };
}

function makeMappedUser(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    username: 'testuser',
    cn_name: '测试用户',
    role: 'admin',
    status: true,
    company_id: 1,
    company_name: '测试公司',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('UserServiceImpl', () => {
  let service: UserServiceImpl;

  beforeEach(() => {
    service = new UserServiceImpl();
    jest.clearAllMocks();
    mockedBcryptHash.mockResolvedValue('$2b$10$hashedpassword');
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('应返回分页用户列表', async () => {
      const users = [makePrismaUser({ id: 1 }), makePrismaUser({ id: 2, username: 'user2' })];
      const mockFindMany = jest.fn().mockResolvedValue(users);
      const mockCount = jest.fn().mockResolvedValue(2);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result).toEqual({
        list: [makeMappedUser({ id: 1 }), makeMappedUser({ id: 2, username: 'user2' })],
        total: 2,
      });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { deletedAt: null },
        orderBy: { id: 'asc' },
        skip: 0,
        take: 10,
      });
      expect(mockCount).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });

    it('应正确计算分页偏移量（第2页）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(15);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(2, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 10 }),
      );
    });

    it('应支持 search 搜索（username 和 cnName）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { search: '测试' });

      const expectedWhere = {
        deletedAt: null,
        OR: [
          { username: { contains: '测试', mode: 'insensitive' } },
          { cnName: { contains: '测试', mode: 'insensitive' } },
        ],
      };
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
      expect(mockCount).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('应支持 role 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { role: 'admin' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, role: 'admin' } }),
      );
    });

    it('应支持 status 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { status: false });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, status: false } }),
      );
    });

    it('应支持 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { companyId: 5 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null, companyId: 5 } }),
      );
    });

    it('应支持多条件组合过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { companyId: 1, search: '张', role: 'admin', status: true });

      const expectedWhere = {
        deletedAt: null,
        OR: [
          { username: { contains: '张', mode: 'insensitive' } },
          { cnName: { contains: '张', mode: 'insensitive' } },
        ],
        role: 'admin',
        status: true,
        companyId: 1,
      };
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: expectedWhere }),
      );
    });

    it('不传 options 时不添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('companyId');
    });

    it('应返回空列表', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result).toEqual({ list: [], total: 0 });
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('应返回指定用户', async () => {
      const prismaUser = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result).toEqual(makeMappedUser({ id: 1 }));
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });

    it('用户不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('用户不存在');
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('应成功创建用户', async () => {
      const newUser = makePrismaUser({ id: 1 });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      const result = await service.create({
        username: 'testuser',
        password: 'password123',
        cn_name: '测试用户',
        role: 'admin',
        company_id: 1,
      });

      expect(result).toEqual(makeMappedUser({ id: 1 }));
      expect(mockedBcryptHash).toHaveBeenCalledWith('password123', 10);
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          username: 'testuser',
          passwordHash: '$2b$10$hashedpassword',
          cnName: '测试用户',
          role: 'admin',
          companyId: 1,
        },
      });
    });

    it('用户名已存在时应抛出错误', async () => {
      const existingUser = makePrismaUser();
      const mockFindUnique = jest.fn().mockResolvedValue(existingUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique },
      } as any);

      await expect(
        service.create({
          username: 'testuser',
          password: 'password123',
          cn_name: '新用户',
          role: 'admin',
        }),
      ).rejects.toThrow('用户名已存在');
    });

    it('不传 company_id 时不应包含 companyId 字段', async () => {
      const newUser = makePrismaUser({ id: 2, companyId: null });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      await service.create({
        username: 'newuser',
        password: 'pass123',
        cn_name: '新用户',
        role: 'view',
      });

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('companyId');
    });

    it('company_id 为 null 时不应包含 companyId 字段', async () => {
      const newUser = makePrismaUser({ id: 3, companyId: null });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      await service.create({
        username: 'newuser2',
        password: 'pass123',
        cn_name: '新用户2',
        role: 'view',
        company_id: null,
      });

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('companyId');
    });

    it('应正确哈希密码', async () => {
      const newUser = makePrismaUser();
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      mockedBcryptHash.mockResolvedValue('$2b$10$customhash');

      await service.create({
        username: 'testuser',
        password: 'mypassword',
        cn_name: '测试',
        role: 'admin',
        company_id: 1,
      });

      expect(mockedBcryptHash).toHaveBeenCalledWith('mypassword', 10);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ passwordHash: '$2b$10$customhash' }),
        }),
      );
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('应成功更新用户 cn_name', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1, cnName: '新名字' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { cn_name: '新名字' });

      expect(result).toEqual(makeMappedUser({ id: 1, cn_name: '新名字' }));
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { cnName: '新名字' },
      });
    });

    it('应成功更新用户 role', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1, role: 'view' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { role: 'view' });

      expect(result).toEqual(makeMappedUser({ id: 1, role: 'view' }));
    });

    it('应成功更新用户 status', async () => {
      const existing = makePrismaUser({ id: 1, status: true });
      const updated = makePrismaUser({ id: 1, status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { status: false });

      expect(result).toEqual(makeMappedUser({ id: 1, status: false }));
    });

    it('应成功更新用户密码', async () => {
      const existing = makePrismaUser({ id: 1 });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      mockedBcryptHash.mockResolvedValue('$2b$10$newhash');

      await service.update(1, { password: 'newpass123' });

      expect(mockedBcryptHash).toHaveBeenCalledWith('newpass123', 10);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { passwordHash: '$2b$10$newhash' },
      });
    });

    it('应同时更新多个字段', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1, cnName: '新名字', role: 'view', status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { cn_name: '新名字', role: 'view', status: false });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { cnName: '新名字', role: 'view', status: false },
      });
    });

    it('用户不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { cn_name: '测试' })).rejects.toThrow('用户不存在');
    });

    it('禁止修改系统管理员角色', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, { role: 'admin' })).rejects.toThrow('系统管理员角色不可修改');
    });

    it('sysadmin 修改其他字段不报错', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const updated = makePrismaUser({ id: 1, role: 'sysadmin', cnName: '新名字' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { cn_name: '新名字' });

      expect(result).toEqual(makeMappedUser({ id: 1, cn_name: '新名字', role: 'sysadmin' }));
    });

    it('role 为 undefined 时不更新 role 字段', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { cn_name: '新名字' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('role');
    });

    it('不传 password 时不更新密码', async () => {
      const existing = makePrismaUser({ id: 1 });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { cn_name: '新名字' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('passwordHash');
      expect(mockedBcryptHash).not.toHaveBeenCalled();
    });

    it('空字符串 password 不更新密码', async () => {
      const existing = makePrismaUser({ id: 1 });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { password: '' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('passwordHash');
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('应成功软删除用户', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('用户不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999)).rejects.toThrow('用户不存在');
    });

    it('禁止删除系统管理员', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1)).rejects.toThrow('系统管理员不可删除');
    });

    it('应成功删除 admin 角色用户', async () => {
      const admin = makePrismaUser({ id: 2, role: 'admin' });
      const mockFindFirst = jest.fn().mockResolvedValue(admin);
      const mockUpdate = jest.fn().mockResolvedValue({ ...admin, deletedAt: new Date() });

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(2);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('应成功删除 view 角色用户', async () => {
      const viewer = makePrismaUser({ id: 3, role: 'view' });
      const mockFindFirst = jest.fn().mockResolvedValue(viewer);
      const mockUpdate = jest.fn().mockResolvedValue({ ...viewer, deletedAt: new Date() });

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(3);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('软删除应使用 update 而非 delete 方法', async () => {
      const user = makePrismaUser({ id: 1, role: 'admin' });
      const mockFindFirst = jest.fn().mockResolvedValue(user);
      const mockUpdate = jest.fn().mockResolvedValue({ ...user, deletedAt: new Date() });
      const mockDelete = jest.fn();

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate, delete: mockDelete },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalled();
      expect(mockDelete).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────
  //  边界场景与 mapUser 映射
  // ──────────────────────────────────────
  describe('边界场景', () => {
    it('list - companyId 为 0 时不添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { companyId: 0 });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('companyId');
    });

    it('list - search 为空字符串时不添加 OR 条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, { search: '' });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('OR');
    });

    it('list - page=3, pageSize=5 时偏移量应为 10', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(30);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(3, 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('list - 用户无 company 关联时 company_name 应为空字符串', async () => {
      const userNoCompany = makePrismaUser({ company: null });
      const mockFindMany = jest.fn().mockResolvedValue([userNoCompany]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].company_name).toBe('');
    });

    it('create - company_id 为 0 时不包含 companyId', async () => {
      const newUser = makePrismaUser({ id: 4, companyId: null });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      await service.create({
        username: 'user0',
        password: 'pass',
        cn_name: '零公司',
        role: 'view',
        company_id: 0,
      });

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData).not.toHaveProperty('companyId');
    });

    it('create - 创建 sysadmin 角色用户', async () => {
      const sysadminUser = makePrismaUser({ id: 5, role: 'sysadmin' });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(sysadminUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindUnique, create: mockCreate },
      } as any);

      const result = await service.create({
        username: 'newsysadmin',
        password: 'adminpass',
        cn_name: '新管理员',
        role: 'sysadmin',
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ role: 'sysadmin' }),
        }),
      );
      expect(result.role).toBe('sysadmin');
    });

    it('update - sysadmin 角色设为 sysadmin 应允许（同角色）', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const updated = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { role: 'sysadmin' });

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.role).toBe('sysadmin');
    });

    it('update - 仅更新密码字段', async () => {
      const existing = makePrismaUser({ id: 1 });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      mockedBcryptHash.mockResolvedValue('$2b$10$onlypass');

      await service.update(1, { password: 'onlypass' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(Object.keys(updateData)).toEqual(['passwordHash']);
      expect(updateData.passwordHash).toBe('$2b$10$onlypass');
    });

    it('update - status 为 false 时应正确更新', async () => {
      const existing = makePrismaUser({ id: 1, status: true });
      const updated = makePrismaUser({ id: 1, status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { status: false });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: false },
      });
    });

    it('update - cn_name 为空字符串时应更新', async () => {
      const existing = makePrismaUser({ id: 1, cnName: '旧名' });
      const updated = makePrismaUser({ id: 1, cnName: '' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { cn_name: '' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { cnName: '' },
      });
    });

    it('getById - 应正确映射 company_id 为 null', async () => {
      const prismaUser = makePrismaUser({ companyId: null, company: null });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.company_id).toBeNull();
      expect(result.company_name).toBe('');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 错误类型验证
  // ══════════════════════════════════════════
  describe('错误类型验证', () => {
    const { NotFoundError, ForbiddenError, ConflictError } = require('../../apis/errors');

    it('getById - NotFoundError 应为 Error 实例', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.getById(999); fail('应抛出错误'); } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(NotFoundError);
        expect(e.statusCode).toBe(404);
      }
    });

    it('getById - NotFoundError 消息格式正确', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.getById(999); fail('应抛出错误'); } catch (e: any) {
        expect(e.message).toBe('用户不存在');
      }
    });

    it('update - NotFoundError 应为 Error 实例且 statusCode=404', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.update(999, { cn_name: '测试' }); fail('应抛出错误'); } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(NotFoundError);
        expect(e.statusCode).toBe(404);
      }
    });

    it('update - ForbiddenError 应为 Error 实例且 statusCode=403', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.update(1, { role: 'admin' }); fail('应抛出错误'); } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(ForbiddenError);
        expect(e.statusCode).toBe(403);
        expect(e.message).toBe('系统管理员角色不可修改');
      }
    });

    it('delete - NotFoundError 应为 Error 实例且 statusCode=404', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.delete(999); fail('应抛出错误'); } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(NotFoundError);
        expect(e.statusCode).toBe(404);
      }
    });

    it('delete - ForbiddenError 应为 Error 实例且 statusCode=403', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.delete(1); fail('应抛出错误'); } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(ForbiddenError);
        expect(e.statusCode).toBe(403);
        expect(e.message).toBe('系统管理员不可删除');
      }
    });

    it('create - ConflictError 应为 Error 实例且 statusCode=409', async () => {
      const existing = makePrismaUser();
      const mockFindUnique = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique } } as any);

      try {
        await service.create({ username: 'testuser', password: 'pass', cn_name: '测试', role: 'admin' });
        fail('应抛出错误');
      } catch (e: any) {
        expect(e).toBeInstanceOf(Error);
        expect(e).toBeInstanceOf(ConflictError);
        expect(e.statusCode).toBe(409);
        expect(e.message).toBe('用户名已存在');
      }
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 数据一致性
  // ══════════════════════════════════════════
  describe('数据一致性', () => {
    it('list - count 和 findMany 应使用相同的 where 条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { search: '张', role: 'admin', companyId: 1 });

      const findManyWhere = mockFindMany.mock.calls[0][0].where;
      const countWhere = mockCount.mock.calls[0][0].where;
      expect(countWhere).toEqual(findManyWhere);
    });

    it('list - findMany 应包含 orderBy: { id: asc }', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'asc' } }),
      );
    });

    it('list - findMany 和 count Promise.all 并行执行', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });

    it('list - 无 options 时 where 为空对象', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { deletedAt: null } }),
      );
      expect(mockCount).toHaveBeenCalledWith({ where: { deletedAt: null } });
    });

    it('getById - findFirst 应使用 where: { id, deletedAt: null } 查询', async () => {
      const prismaUser = makePrismaUser({ id: 42 });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      await service.getById(42);

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 42, deletedAt: null } });
    });

    it('create - findFirst 应使用 where: { username, deletedAt: null } 查重', async () => {
      const newUser = makePrismaUser();
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

      await service.create({ username: 'uniqueuser', password: 'pass', cn_name: '唯一', role: 'admin' });

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { username: 'uniqueuser', deletedAt: null } });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 字符串边界
  // ══════════════════════════════════════════
  describe('字符串边界', () => {
    it('list - search 纯空格应作为搜索条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { search: '   ' });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('OR');
    });

    it('list - search 特殊字符（XSS 向量）应原样传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      const xssPayload = '<script>alert("xss")</script>';
      await service.list(1, 10, { search: xssPayload });

      const orConditions = mockFindMany.mock.calls[0][0].where.OR;
      expect(orConditions[0].username.contains).toBe(xssPayload);
      expect(orConditions[1].cnName.contains).toBe(xssPayload);
    });

    it('list - search emoji 应原样传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { search: '😀🎉' });

      const orConditions = mockFindMany.mock.calls[0][0].where.OR;
      expect(orConditions[0].username.contains).toBe('😀🎉');
      expect(orConditions[1].cnName.contains).toBe('😀🎉');
    });

    it('list - search 超长字符串（10000字符）应原样传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      const longSearch = 'a'.repeat(10000);
      await service.list(1, 10, { search: longSearch });

      const orConditions = mockFindMany.mock.calls[0][0].where.OR;
      expect(orConditions[0].username.contains).toBe(longSearch);
      expect(orConditions[0].username.contains.length).toBe(10000);
    });

    it('list - search 含 SQL 注入字符串应原样传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      const sqlPayload = "'; DROP TABLE users; --";
      await service.list(1, 10, { search: sqlPayload });

      const orConditions = mockFindMany.mock.calls[0][0].where.OR;
      expect(orConditions[0].username.contains).toBe(sqlPayload);
    });

    it('create - username 含前后空格应原样保存', async () => {
      const newUser = makePrismaUser({ username: ' spaced ' });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

      await service.create({ username: ' spaced ', password: 'pass', cn_name: '空格用户', role: 'admin' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ username: ' spaced ' }) }),
      );
    });

    it('create - cn_name 含换行符和制表符应原样保存', async () => {
      const newUser = makePrismaUser({ cnName: '行1\n行2\t缩进' });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

      await service.create({ username: 'newlines', password: 'pass', cn_name: '行1\n行2\t缩进', role: 'admin' });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ data: expect.objectContaining({ cnName: '行1\n行2\t缩进' }) }),
      );
    });

    it('update - cn_name 含 emoji 应原样保存', async () => {
      const existing = makePrismaUser({ id: 1 });
      const updated = makePrismaUser({ id: 1, cnName: '🎉用户🎉' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      await service.update(1, { cn_name: '🎉用户🎉' });

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { cnName: '🎉用户🎉' },
      });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 数值边界
  // ══════════════════════════════════════════
  describe('数值边界', () => {
    it('list - page=0 时偏移量为负值（skip=-10）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(0, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: -10, take: 10 }),
      );
    });

    it('list - page 极大值时 skip 应正确计算', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(999999, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 9999980, take: 10 }),
      );
    });

    it('getById - id=0 应传递给 findFirst', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.getById(0); fail('应抛出错误'); } catch (e: any) {
        expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 0, deletedAt: null } });
      }
    });

    it('getById - id=INT32_MAX (2147483647) 应传递给 findFirst', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      try { await service.getById(2147483647); fail('应抛出错误'); } catch (e: any) {
        expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 2147483647, deletedAt: null } });
      }
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 综合映射验证
  // ══════════════════════════════════════════
  describe('综合映射验证', () => {
    it('mapUser - company 有 shortName 时 company_name 正确', async () => {
      const prismaUser = makePrismaUser({ company: { shortName: '薄云科技' } });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(result.company_name).toBe('薄云科技');
    });

    it('mapUser - company.shortName 为空字符串时 company_name 为空', async () => {
      const prismaUser = makePrismaUser({ company: { shortName: '' } });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(result.company_name).toBe('');
    });

    it('mapUser - created_at/updated_at 应保持 Date 类型', async () => {
      const created = new Date('2025-03-15T08:30:00.000Z');
      const updated = new Date('2025-06-20T14:00:00.000Z');
      const prismaUser = makePrismaUser({ createdAt: created, updatedAt: updated });
      const mockFindFirst = jest.fn().mockResolvedValue(prismaUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(result.created_at).toBe(created);
      expect(result.updated_at).toBe(updated);
    });

    it('list - 多用户映射应保持顺序一致', async () => {
      const users = [
        makePrismaUser({ id: 3, username: 'charlie' }),
        makePrismaUser({ id: 1, username: 'alice' }),
        makePrismaUser({ id: 2, username: 'bob' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(users);
      const mockCount = jest.fn().mockResolvedValue(3);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].id).toBe(3);
      expect(result.list[1].id).toBe(1);
      expect(result.list[2].id).toBe(2);
    });

    it('create - mapUser 返回所有 snake_case 字段', async () => {
      const newUser = makePrismaUser({ id: 99 });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

      const result = await service.create({ username: 'test99', password: 'pass', cn_name: '99号', role: 'admin', company_id: 1 });

      expect(result).toHaveProperty('id', 99);
      expect(result).toHaveProperty('username', 'testuser');
      expect(result).toHaveProperty('cn_name');
      expect(result).toHaveProperty('role');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('company_id');
      expect(result).toHaveProperty('company_name');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
    });

    it('delete - 软删除的 deletedAt 应为当前时间附近', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      const beforeDelete = Date.now();
      await service.delete(1);
      const afterDelete = Date.now();

      const deletedAt = mockUpdate.mock.calls[0][0].data.deletedAt as Date;
      expect(deletedAt.getTime()).toBeGreaterThanOrEqual(beforeDelete - 1000);
      expect(deletedAt.getTime()).toBeLessThanOrEqual(afterDelete + 1000);
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — 实例独立性与接口一致性
  // ══════════════════════════════════════════
  describe('实例独立性与接口一致性', () => {
    it('不同 UserServiceImpl 实例应共享 Prisma', async () => {
      const service1 = new UserServiceImpl();
      const service2 = new UserServiceImpl();

      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaUser({ id: 1 }));
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      await service1.getById(1);
      await service2.getById(1);

      expect(mockedGetPrisma).toHaveBeenCalledTimes(2);
    });

    it('IUserService 接口应包含 5 个方法', () => {
      const methodNames = Object.getOwnPropertyNames(Object.getPrototypeOf(service));
      const expectedMethods = ['list', 'getById', 'create', 'update', 'delete'];

      for (const method of expectedMethods) {
        expect(methodNames).toContain(method);
        expect(typeof (service as any)[method]).toBe('function');
      }
    });

    it('list 方法参数数量应为 3（page, pageSize, options）', () => {
      expect(service.list.length).toBe(3);
    });

    it('getById 方法参数数量应为 1（id）', () => {
      expect(service.getById.length).toBe(1);
    });

    it('create 方法参数数量应为 1（request）', () => {
      expect(service.create.length).toBe(1);
    });

    it('update 方法参数数量应为 2（id, request）', () => {
      expect(service.update.length).toBe(2);
    });

    it('delete 方法参数数量应为 1（id）', () => {
      expect(service.delete.length).toBe(1);
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — list where 逐字段验证
  // ══════════════════════════════════════════
  describe('list where 逐字段验证', () => {
    it('role 为空字符串时不添加 role 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { role: '' });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('role');
    });

    it('status 为 undefined 时不添加 status 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { status: undefined });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('status');
    });

    it('status 为 true 时应添加 status: true', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { status: true });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).toHaveProperty('status', true);
    });

    it('companyId 为 null 时不添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ user: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, { companyId: null });

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('companyId');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — create 默认值与完整数据验证
  // ══════════════════════════════════════════
  describe('create 默认值与完整数据验证', () => {
    it('create - 完整数据应传递所有字段给 prisma', async () => {
      const newUser = makePrismaUser({ id: 1 });
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue(newUser);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

      await service.create({ username: 'fulluser', password: 'fullpass', cn_name: '完整用户', role: 'admin', company_id: 5 });

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData).toEqual({
        username: 'fulluser',
        passwordHash: '$2b$10$hashedpassword',
        cnName: '完整用户',
        role: 'admin',
        companyId: 5,
      });
    });

    it('create - 不同角色（admin/view/sysadmin）均可创建', async () => {
      const roles: Array<'admin' | 'view' | 'sysadmin'> = ['admin', 'view', 'sysadmin'];
      for (const role of roles) {
        const mockFindUnique = jest.fn().mockResolvedValue(null);
        const mockCreate = jest.fn().mockResolvedValue(makePrismaUser({ role }));
        mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique, create: mockCreate } } as any);

        await service.create({ username: `user_${role}`, password: 'pass', cn_name: role, role });

        const createData = mockCreate.mock.calls[0][0].data;
        expect(createData.role).toBe(role);
      }
    });

    it('create - bcrypt hash 失败时应抛出错误', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindUnique } } as any);
      mockedBcryptHash.mockRejectedValue(new Error('bcrypt failed'));

      await expect(
        service.create({ username: 'crash', password: 'pass', cn_name: '崩溃', role: 'admin' }),
      ).rejects.toThrow('bcrypt failed');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — update 全字段覆盖
  // ══════════════════════════════════════════
  describe('update 全字段覆盖', () => {
    it('update - 同时更新 cn_name + role + status + password 四个字段', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1, cnName: '全新名', role: 'view', status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);
      mockedBcryptHash.mockResolvedValue('$2b$10$allfields');

      await service.update(1, { cn_name: '全新名', role: 'view', status: false, password: 'newpass' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.cnName).toBe('全新名');
      expect(updateData.role).toBe('view');
      expect(updateData.status).toBe(false);
      expect(updateData.passwordHash).toBe('$2b$10$allfields');
      expect(mockedBcryptHash).toHaveBeenCalledWith('newpass', 10);
    });

    it('update - sysadmin 角色不可降级到 admin', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      await expect(service.update(1, { role: 'admin' })).rejects.toThrow('系统管理员角色不可修改');
    });

    it('update - sysadmin 角色不可降级到 view', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst } } as any);

      await expect(service.update(1, { role: 'view' })).rejects.toThrow('系统管理员角色不可修改');
    });

    it('update - 非 sysadmin 角色可以修改 role', async () => {
      const admin = makePrismaUser({ id: 1, role: 'admin' });
      const updated = makePrismaUser({ id: 1, role: 'view' });
      const mockFindFirst = jest.fn().mockResolvedValue(admin);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      const result = await service.update(1, { role: 'view' });

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.role).toBe('view');
    });

    it('update - cn_name 为 undefined 时不更新 cn_name', async () => {
      const existing = makePrismaUser({ id: 1, cnName: '原名' });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      await service.update(1, { role: 'admin' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('cnName');
    });

    it('update - status 为 undefined 时不更新 status', async () => {
      const existing = makePrismaUser({ id: 1, status: true });
      const updated = makePrismaUser({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      await service.update(1, { cn_name: '新名' });

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData).not.toHaveProperty('status');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮 — delete 深度验证
  // ══════════════════════════════════════════
  describe('delete 深度验证', () => {
    it('delete - 不应返回值', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      const result = await service.delete(1);

      expect(result).toBeUndefined();
    });

    it('delete - 应先查询用户是否存在再删除', async () => {
      const existing = makePrismaUser({ id: 1, role: 'admin' });
      const callOrder: string[] = [];
      const mockFindFirst = jest.fn().mockImplementation(async () => { callOrder.push('findFirst'); return existing; });
      const mockUpdate = jest.fn().mockImplementation(async () => { callOrder.push('update'); return { ...existing, deletedAt: new Date() }; });
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      await service.delete(1);

      expect(callOrder).toEqual(['findFirst', 'update']);
    });

    it('delete - 用户不存在时不应调用 update', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      try { await service.delete(999); } catch { /* expected */ }

      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('delete - sysadmin 存在时不应调用 update', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({ user: { findFirst: mockFindFirst, update: mockUpdate } } as any);

      try { await service.delete(1); } catch { /* expected */ }

      expect(mockUpdate).not.toHaveBeenCalled();
    });
  });
});

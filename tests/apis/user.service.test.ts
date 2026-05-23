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

      const result = await service.list(null, 1, 10);

      expect(result).toEqual({
        list: [makeMappedUser({ id: 1 }), makeMappedUser({ id: 2, username: 'user2' })],
        total: 2,
      });
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        orderBy: { id: 'asc' },
        skip: 0,
        take: 10,
      });
      expect(mockCount).toHaveBeenCalledWith({ where: {} });
    });

    it('应正确计算分页偏移量（第2页）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(15);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(null, 2, 10);

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

      await service.list(null, 1, 10, '测试');

      const expectedWhere = {
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

      await service.list(null, 1, 10, undefined, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { role: 'admin' } }),
      );
    });

    it('应支持 status 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(null, 1, 10, undefined, undefined, false);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: false } }),
      );
    });

    it('应支持 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(5, 1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { companyId: 5 } }),
      );
    });

    it('应支持多条件组合过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 1, 10, '张', 'admin', true);

      const expectedWhere = {
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

    it('companyId 为 null 时不添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(null, 1, 10);

      const callArgs = mockFindMany.mock.calls[0][0];
      expect(callArgs.where).not.toHaveProperty('companyId');
    });

    it('应返回空列表', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        user: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(null, 1, 10);

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

      const result = await service.getById(1, null);

      expect(result).toEqual(makeMappedUser({ id: 1 }));
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('用户不存在时应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999, null)).rejects.toThrow('用户不存在');
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
        user: { findUnique: mockFindUnique, create: mockCreate },
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
        user: { findUnique: mockFindUnique },
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
        user: { findUnique: mockFindUnique, create: mockCreate },
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
        user: { findUnique: mockFindUnique, create: mockCreate },
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
        user: { findUnique: mockFindUnique, create: mockCreate },
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

      const result = await service.update(1, null, { cn_name: '新名字' });

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

      const result = await service.update(1, null, { role: 'view' });

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

      const result = await service.update(1, null, { status: false });

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

      await service.update(1, null, { password: 'newpass123' });

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

      await service.update(1, null, { cn_name: '新名字', role: 'view', status: false });

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

      await expect(service.update(999, null, { cn_name: '测试' })).rejects.toThrow('用户不存在');
    });

    it('禁止修改系统管理员角色', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, null, { role: 'admin' })).rejects.toThrow('系统管理员角色不可修改');
    });

    it('sysadmin 修改其他字段不报错', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const updated = makePrismaUser({ id: 1, role: 'sysadmin', cnName: '新名字' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, null, { cn_name: '新名字' });

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

      await service.update(1, null, { cn_name: '新名字' });

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

      await service.update(1, null, { cn_name: '新名字' });

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

      await service.update(1, null, { password: '' });

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

      await service.delete(1, null);

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

      await expect(service.delete(999, null)).rejects.toThrow('用户不存在');
    });

    it('禁止删除系统管理员', async () => {
      const sysadmin = makePrismaUser({ id: 1, role: 'sysadmin' });
      const mockFindFirst = jest.fn().mockResolvedValue(sysadmin);

      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1, null)).rejects.toThrow('系统管理员不可删除');
    });
  });
});

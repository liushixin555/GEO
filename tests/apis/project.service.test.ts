/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { ProjectServiceImpl } from '../../apis/service/impl/project.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

const OPERATOR_INCLUDE = {
  company: true,
  operators: { include: { user: true } },
  viewers: { include: { user: true } },
};

function makePrismaProject(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    shortName: 'P1',
    fullName: 'Project One',
    description: 'desc',
    companyId: 1,
    status: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    company: { shortName: 'Company A' },
    operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }],
    viewers: [{ userId: 3, user: { id: 3, cnName: '李四' } }],
    ...overrides,
  };
}

function makePrismaUser(id: number, companyId: number, role: 'admin' | 'view', cnName: string) {
  return { id, companyId, role, cnName, username: `user${id}`, deletedAt: null };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('ProjectServiceImpl', () => {
  let service: ProjectServiceImpl;

  beforeEach(() => {
    service = new ProjectServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated list ordered by id asc', async () => {
      const rows = [makePrismaProject({ id: 1 }), makePrismaProject({ id: 2 })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(result.list[0].short_name).toBe('P1');
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
          orderBy: { id: 'asc' },
          skip: 0,
          take: 10,
          include: OPERATOR_INCLUDE,
        }),
      );
    });

    it('should calculate skip correctly for page 2', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(2, 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should filter by search on shortName and fullName', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, 'Test');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [
              { shortName: { contains: 'Test', mode: 'insensitive' } },
              { fullName: { contains: 'Test', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by company_id', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ companyId: 5 }),
        }),
      );
    });

    it('should filter by status=true', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, true);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: true }),
        }),
      );
    });

    it('should filter by status=false', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, false);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: false }),
        }),
      );
    });

    it('should not add status filter when status is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10);

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('status');
    });

    it('should add admin operator filter when role=admin and userId provided', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, undefined, 2, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            operators: { some: { userId: 2 } },
            company: { status: true },
          }),
        }),
      );
    });

    it('should not add admin filter when role=admin but no userId', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, undefined, undefined, 'admin');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('operators');
      expect(where).not.toHaveProperty('company');
    });

    it('should combine all filters together', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, 'keyword', 5, true, 2, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            deletedAt: null,
            OR: [
              { shortName: { contains: 'keyword', mode: 'insensitive' } },
              { fullName: { contains: 'keyword', mode: 'insensitive' } },
            ],
            companyId: 5,
            status: true,
            operators: { some: { userId: 2 } },
            company: { status: true },
          }),
        }),
      );
    });

    it('should return mapped projects via mapProject', async () => {
      const rows = [makePrismaProject()];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list[0]).toEqual({
        id: 1,
        short_name: 'P1',
        full_name: 'Project One',
        description: 'desc',
        company_id: 1,
        company_name: 'Company A',
        operator_ids: [2],
        operator_names: ['张三'],
        viewer_ids: [3],
        viewer_names: ['李四'],
        status: true,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should return empty list when no projects found', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('should return mapped project when found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: OPERATOR_INCLUDE,
      });
      expect(result.id).toBe(1);
      expect(result.short_name).toBe('P1');
      expect(result.company_name).toBe('Company A');
    });

    it('should throw "项目不存在" when not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      await expect(service.getById(999)).rejects.toThrow('项目不存在');
    });

    it('should pass userId and role but not use them in query', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      await service.getById(1, 2, 'admin');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: OPERATOR_INCLUDE,
      });
    });

    it('should throw ForbiddenError when admin is not operator', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { ForbiddenError } = require('../../apis/errors');
      await expect(service.getById(1, 2, 'admin')).rejects.toThrow('无权操作该项目');
      await expect(service.getById(1, 2, 'admin')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('should allow admin who is operator to get project', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1, 2, 'admin');
      expect(result.id).toBe(1);
    });

    it('should allow sysadmin without operator check', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1, 1, 'sysadmin');
      expect(result.id).toBe(1);
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('should create project with minimal fields (no operators/viewers)', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      });

      expect(result.short_name).toBe('P1');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          shortName: 'P1',
          fullName: 'Project One',
          description: null,
          companyId: 1,
          operators: { create: [] },
          viewers: { create: [] },
        },
        include: OPERATOR_INCLUDE,
      });
    });

    it('should create project with description', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        description: 'My description',
        company_id: 1,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'My description' }),
        }),
      );
    });

    it('should create project with valid operators', async () => {
      const mockUserFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(2, 1, 'admin', '张三'),
        makePrismaUser(4, 1, 'admin', '王五'),
      ]);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [
          { userId: 2, user: { id: 2, cnName: '张三' } },
          { userId: 4, user: { id: 4, cnName: '王五' } },
        ],
      }));
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
        operator_ids: [2, 4],
      });

      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { id: { in: [2, 4] }, companyId: 1, role: 'admin', deletedAt: null },
      });
      expect(result.operator_ids).toEqual([2, 4]);
    });

    it('should throw "运营者不属于指定公司" when operators do not match', async () => {
      const mockUserFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(2, 1, 'admin', '张三'),
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { create: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      await expect(
        service.create({
          short_name: 'P1',
          full_name: 'Project One',
          company_id: 1,
          operator_ids: [2, 99],
        }),
      ).rejects.toThrow('运营者不属于指定公司');
    });

    it('should create project with valid viewers', async () => {
      const mockUserFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(3, 1, 'view', '李四'),
      ]);
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
        viewer_ids: [3],
      });

      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { id: { in: [3] }, companyId: 1, role: 'view', deletedAt: null },
      });
      expect(result.viewer_ids).toEqual([3]);
    });

    it('should throw "查看者不属于指定公司" when viewers do not match', async () => {
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([makePrismaUser(2, 1, 'admin', '张三')]);
        return Promise.resolve([]);
      });
      mockedGetPrisma.mockReturnValue({
        project: { create: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      await expect(
        service.create({
          short_name: 'P1',
          full_name: 'Project One',
          company_id: 1,
          operator_ids: [2],
          viewer_ids: [99],
        }),
      ).rejects.toThrow('查看者不属于指定公司');
    });

    it('should create with both operators and viewers', async () => {
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([makePrismaUser(2, 1, 'admin', '张三')]);
        return Promise.resolve([makePrismaUser(3, 1, 'view', '李四')]);
      });
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
        operator_ids: [2],
        viewer_ids: [3],
      });

      expect(result.operator_ids).toEqual([2]);
      expect(result.viewer_ids).toEqual([3]);
    });

    it('should override company_id for admin role', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        companyId: 2,
        operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }],
      }));
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(2, 2, 'admin', '张三')]);
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      } as any);

      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 999,
        operator_ids: [2],
      }, 'admin', 2);

      // Service should use companyId=2 from auth, not 999 from request
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 2 }),
        }),
      );
      // User validation should use effectiveCompanyId=2, not 999
      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { id: { in: [2] }, companyId: 2, role: 'admin', deletedAt: null },
      });
    });

    it('should use request company_id for sysadmin role', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject());
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: jest.fn().mockResolvedValue([]) },
      } as any);

      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 5,
        operator_ids: [],
        viewer_ids: [],
      }, 'sysadmin', 1);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 5 }),
        }),
      );
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('should throw "项目不存在" when project not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      await expect(
        service.update(999, { short_name: 'New' }),
      ).rejects.toThrow('项目不存在');
    });

    it('should update short_name only', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'NewShort' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { short_name: 'NewShort' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ shortName: 'NewShort' }),
        }),
      );
      expect(result.short_name).toBe('NewShort');
    });

    it('should update full_name', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, fullName: 'NewFull' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { full_name: 'NewFull' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ fullName: 'NewFull' }),
        }),
      );
      expect(result.full_name).toBe('NewFull');
    });

    it('should update description', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: 'new desc' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { description: 'new desc' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: 'new desc' }),
        }),
      );
    });

    it('should update status', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: false });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { status: false });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: false }),
        }),
      );
      expect(result.status).toBe(false);
    });

    it('should update operators with valid ids', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(5, 1, 'admin', '赵六'),
      ]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        operators: [{ userId: 5, user: { id: 5, cnName: '赵六' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      const result = await service.update(1, { operator_ids: [5] });

      expect(mockOperatorUpdateMany).toHaveBeenCalledWith({
        where: { projectId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [{ userId: 5 }] },
          }),
        }),
      );
      expect(result.operator_ids).toEqual([5]);
    });

    it('should throw when updating operators with invalid ids', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      await expect(
        service.update(1, { operator_ids: [99] }),
      ).rejects.toThrow('运营者不属于指定公司');
    });

    it('should allow empty operator_ids (clear all operators)', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, operators: [] });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      const result = await service.update(1, { operator_ids: [] });

      // Should not call user.findMany since array is empty
      expect(mockOperatorUpdateMany).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [] },
          }),
        }),
      );
      expect(result.operator_ids).toEqual([]);
    });

    it('should update viewers with valid ids', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(6, 1, 'view', '孙七'),
      ]);
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        viewers: [{ userId: 6, user: { id: 6, cnName: '孙七' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      } as any);

      const result = await service.update(1, { viewer_ids: [6] });

      expect(mockViewerUpdateMany).toHaveBeenCalledWith({
        where: { projectId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(result.viewer_ids).toEqual([6]);
    });

    it('should throw when updating viewers with invalid ids', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([makePrismaUser(2, 1, 'admin', '张三')]);
        return Promise.resolve([]);
      });
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      await expect(
        service.update(1, { operator_ids: [2], viewer_ids: [99] }),
      ).rejects.toThrow('查看者不属于指定公司');
    });

    it('should allow empty viewer_ids (clear all viewers)', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, viewers: [] });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        projectViewer: { updateMany: mockViewerUpdateMany },
      } as any);

      const result = await service.update(1, { viewer_ids: [] });

      expect(mockViewerUpdateMany).toHaveBeenCalled();
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewers: { create: [] },
          }),
        }),
      );
      expect(result.viewer_ids).toEqual([]);
    });

    it('should use existing companyId for operator/viewer validation', async () => {
      const existing = makePrismaProject({ companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(5, 10, 'admin', '赵六')]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      await service.update(1, { operator_ids: [5] });

      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { id: { in: [5] }, companyId: 10, role: 'admin' },
      });
    });

    it('should not update fields that are undefined', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {});

      const data = mockUpdate.mock.calls[0][0].data;
      expect(data).not.toHaveProperty('shortName');
      expect(data).not.toHaveProperty('fullName');
      expect(data).not.toHaveProperty('description');
      expect(data).not.toHaveProperty('status');
      expect(data).not.toHaveProperty('operators');
      expect(data).not.toHaveProperty('viewers');
    });

    it('should throw BusinessError when company_id is changed', async () => {
      const existing = makePrismaProject({ companyId: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      await expect(
        service.update(1, { company_id: 2 }),
      ).rejects.toThrow('项目所属公司不可更改');
      await expect(
        service.update(1, { company_id: 2 }),
      ).rejects.toBeInstanceOf(BusinessError);
    });

    it('should allow same company_id in update', async () => {
      const existing = makePrismaProject({ companyId: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'NewShort' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { company_id: 1, short_name: 'NewShort' });
      expect(result).toBeDefined();
    });

    it('should throw ForbiddenError when admin updates project they are not operator of', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
      } as any);

      const { ForbiddenError } = require('../../apis/errors');
      await expect(
        service.update(1, { short_name: 'New' }, 2, 'admin'),
      ).rejects.toThrow('无权操作该项目');
      await expect(
        service.update(1, { short_name: 'New' }, 2, 'admin'),
      ).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('should allow admin who is operator to update', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'NewShort' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { short_name: 'NewShort' }, 2, 'admin');
      expect(result.short_name).toBe('NewShort');
    });

    it('should update multiple fields at once', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        shortName: 'NewShort',
        fullName: 'NewFull',
        description: 'new desc',
        status: false,
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, {
        short_name: 'NewShort',
        full_name: 'NewFull',
        description: 'new desc',
        status: false,
      });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            shortName: 'NewShort',
            fullName: 'NewFull',
            description: 'new desc',
            status: false,
          }),
        }),
      );
      expect(result.short_name).toBe('NewShort');
      expect(result.full_name).toBe('NewFull');
      expect(result.status).toBe(false);
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('should throw "项目不存在" when project not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      await expect(service.delete(999)).rejects.toThrow('项目不存在');
    });

    it('should soft delete by setting deletedAt', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should accept userId and role parameters', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // userId and role are accepted but not used in the service impl
      await service.delete(1, 2, 'admin');

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should soft delete and return void', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.delete(1);

      expect(result).toBeUndefined();
    });
  });

  // ──────────────────────────────────────
  //  Edge Cases & Boundary Tests
  // ──────────────────────────────────────
  describe('Edge Cases', () => {
    it('create: empty string description should become null', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        description: null,
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        description: '',
        company_id: 1,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
      expect(result).toBeDefined();
    });

    it('create: explicit empty operator_ids and viewer_ids arrays', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
        operator_ids: [],
        viewer_ids: [],
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [] },
            viewers: { create: [] },
          }),
        }),
      );
      expect(result.operator_ids).toEqual([]);
      expect(result.viewer_ids).toEqual([]);
    });

    it('list: non-admin role should not add admin filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, undefined, 2, 'view');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('operators');
      expect(where).not.toHaveProperty('company');
    });

    it('list: sysadmin role should not add admin filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'sysadmin');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('operators');
      expect(where).not.toHaveProperty('company');
    });

    it('list: company_id=0 should not add companyId filter (falsy)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, undefined, 0);

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('companyId');
    });

    it('update: set description to empty string', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: '' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { description: '' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '' }),
        }),
      );
    });

    it('update: update both operators and viewers in a single call', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      let callCount = 0;
      const mockUserFindMany = jest.fn().mockImplementation(() => {
        callCount++;
        if (callCount === 1) return Promise.resolve([makePrismaUser(5, 1, 'admin', '赵六')]);
        return Promise.resolve([makePrismaUser(6, 1, 'view', '孙七')]);
      });
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        operators: [{ userId: 5, user: { id: 5, cnName: '赵六' } }],
        viewers: [{ userId: 6, user: { id: 6, cnName: '孙七' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      } as any);

      const result = await service.update(1, { operator_ids: [5], viewer_ids: [6] });

      expect(mockOperatorUpdateMany).toHaveBeenCalled();
      expect(mockViewerUpdateMany).toHaveBeenCalled();
      expect(result.operator_ids).toEqual([5]);
      expect(result.viewer_ids).toEqual([6]);
    });

    it('update: update status=false with operators and viewers', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(5, 1, 'admin', '赵六')]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        status: false,
        operators: [{ userId: 5, user: { id: 5, cnName: '赵六' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      const result = await service.update(1, { status: false, operator_ids: [5] });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: false,
            operators: { create: [{ userId: 5 }] },
          }),
        }),
      );
      expect(result.status).toBe(false);
    });

    it('getById: should return correct mapped fields including timestamps', async () => {
      const createdAt = new Date('2025-01-15T10:30:00Z');
      const updatedAt = new Date('2025-06-20T14:45:00Z');
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        createdAt,
        updatedAt,
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(result.created_at).toBe(createdAt);
      expect(result.updated_at).toBe(updatedAt);
    });

    it('create: should handle description as undefined (maps to null)', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        description: null,
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('list: page 3 with pageSize 5 should skip 10', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(50);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(3, 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 10, take: 5 }),
      );
    });

    it('list: empty string search should not add OR filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, '');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('getById: project with no operators or viewers should return empty arrays', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const result = await service.getById(1);

      expect(result.operator_ids).toEqual([]);
      expect(result.operator_names).toEqual([]);
      expect(result.viewer_ids).toEqual([]);
      expect(result.viewer_names).toEqual([]);
    });

    it('update: setting description to null explicitly', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: null });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { description: null as any });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
      expect(result.description).toBeNull();
    });

    it('update: update with status=true', async () => {
      const existing = makePrismaProject({ status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: true });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { status: true });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: true }),
        }),
      );
      expect(result.status).toBe(true);
    });

    it('create: operator with no user object should use userId as fallback via mapProject', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        ...makePrismaProject(),
        operators: [{ userId: 7, user: null }],
        viewers: [],
      });
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      });

      // mapProject uses op.user?.id ?? op.userId fallback
      expect(result.operator_ids).toEqual([7]);
      // op.user is null, so cnName fallback to ''
      expect(result.operator_names).toEqual(['']);
    });

    it('list: count and findMany use the same where clause', async () => {
      const rows = [makePrismaProject()];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      await service.list(1, 10, 'test', 1, true);

      const findWhere = mockFindMany.mock.calls[0][0].where;
      const countWhere = mockCount.mock.calls[0][0].where;
      expect(findWhere).toEqual(countWhere);
    });

    it('delete: should use findFirst with deletedAt: null filter and include operators', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1, deletedAt: null },
        }),
      );
    });

    it('delete: should throw ForbiddenError when admin is not operator', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { ForbiddenError } = require('../../apis/errors');
      await expect(service.delete(1, 2, 'admin')).rejects.toThrow('无权操作该项目');
      await expect(service.delete(1, 2, 'admin')).rejects.toBeInstanceOf(ForbiddenError);
    });

    it('delete: should allow admin who is operator to delete', async () => {
      const existing = makePrismaProject({ operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }] });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 2, 'admin');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('delete: should allow sysadmin without operator check', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 1, 'sysadmin');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('create: with long operator and viewer lists', async () => {
      const opIds = [10, 11, 12, 13, 14];
      const viewerIds = [20, 21, 22];
      const mockUserFindMany = jest.fn()
        .mockResolvedValueOnce(opIds.map(id => makePrismaUser(id, 1, 'admin', `op${id}`)))
        .mockResolvedValueOnce(viewerIds.map(id => makePrismaUser(id, 1, 'view', `v${id}`)));
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: opIds.map(id => ({ userId: id, user: { id, cnName: `op${id}` } })),
        viewers: viewerIds.map(id => ({ userId: id, user: { id, cnName: `v${id}` } })),
      }));
      mockedGetPrisma.mockReturnValue({
        project: { create: mockCreate },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
        operator_ids: opIds,
        viewer_ids: viewerIds,
      });

      expect(result.operator_ids).toEqual(opIds);
      expect(result.viewer_ids).toEqual(viewerIds);
      expect(result.operator_names).toEqual(['op10', 'op11', 'op12', 'op13', 'op14']);
      expect(result.viewer_names).toEqual(['v20', 'v21', 'v22']);
    });

    it('list: company_name should fallback to empty string when company is null', async () => {
      const rows = [makePrismaProject({ company: null })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].company_name).toBe('');
    });

  });

  // ══════════════════════════════════════════
  //  第2轮 TDD 补充：错误类型验证 / 边界值 / 安全性
  // ══════════════════════════════════════════
  describe('第2轮: 错误类型验证', () => {
    it('getById: NotFoundError 应为 AppError 子类且 statusCode=404', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { AppError, NotFoundError } = require('../../apis/errors');
      try {
        await service.getById(999);
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('项目不存在');
      }
    });

    it('update: NotFoundError 应为 AppError 子类且 statusCode=404', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { NotFoundError } = require('../../apis/errors');
      try {
        await service.update(999, { short_name: 'X' });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('项目不存在');
      }
    });

    it('delete: NotFoundError 应为 AppError 子类且 statusCode=404', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { NotFoundError } = require('../../apis/errors');
      try {
        await service.delete(999);
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(NotFoundError);
        expect(err.statusCode).toBe(404);
        expect(err.message).toBe('项目不存在');
      }
    });

    it('create: BusinessError(运营者不属于指定公司) 应有 statusCode=400', async () => {
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { create: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      try {
        await service.create({
          short_name: 'P1',
          full_name: 'Project One',
          company_id: 1,
          operator_ids: [99],
        });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BusinessError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('运营者不属于指定公司');
      }
    });

    it('create: BusinessError(查看者不属于指定公司) 应有 statusCode=400', async () => {
      const mockUserFindMany = jest.fn()
        .mockResolvedValueOnce([makePrismaUser(2, 1, 'admin', '张三')])
        .mockResolvedValueOnce([]);
      mockedGetPrisma.mockReturnValue({
        project: { create: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      try {
        await service.create({
          short_name: 'P1',
          full_name: 'Project One',
          company_id: 1,
          operator_ids: [2],
          viewer_ids: [99],
        });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BusinessError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('查看者不属于指定公司');
      }
    });

    it('update: BusinessError(项目所属公司不可更改) 应有 statusCode=400', async () => {
      const existing = makePrismaProject({ companyId: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      try {
        await service.update(1, { company_id: 999 });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BusinessError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('项目所属公司不可更改');
      }
    });

    it('update: BusinessError(运营者不属于指定公司) 应有 statusCode=400', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      try {
        await service.update(1, { operator_ids: [99] });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BusinessError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('运营者不属于指定公司');
      }
    });

    it('update: BusinessError(查看者不属于指定公司) 应有 statusCode=400', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn()
        .mockResolvedValueOnce([makePrismaUser(2, 1, 'admin', '张三')])
        .mockResolvedValueOnce([]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      const { BusinessError } = require('../../apis/errors');
      try {
        await service.update(1, { operator_ids: [2], viewer_ids: [99] });
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(BusinessError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toBe('查看者不属于指定公司');
      }
    });

    it('getById: ForbiddenError(无权操作该项目) 应有 statusCode=403', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { ForbiddenError } = require('../../apis/errors');
      try {
        await service.getById(1, 2, 'admin');
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('无权操作该项目');
      }
    });

    it('update: ForbiddenError(无权操作该项目) 应有 statusCode=403', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: jest.fn() },
      } as any);

      const { ForbiddenError } = require('../../apis/errors');
      try {
        await service.update(1, { short_name: 'X' }, 2, 'admin');
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('无权操作该项目');
      }
    });

    it('delete: ForbiddenError(无权操作该项目) 应有 statusCode=403', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      const { ForbiddenError } = require('../../apis/errors');
      try {
        await service.delete(1, 2, 'admin');
        fail('should have thrown');
      } catch (err: any) {
        expect(err).toBeInstanceOf(ForbiddenError);
        expect(err.statusCode).toBe(403);
        expect(err.message).toBe('无权操作该项目');
      }
    });
  });

  describe('第2轮: Admin 边界值', () => {
    it('getById: admin with userId=0 应跳过权限检查（falsy userId）', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      // userId=0 is falsy, so role==='admin' && userId evaluates to false
      const result = await service.getById(1, 0, 'admin');
      expect(result.id).toBe(1);
    });

    it('update: admin with userId=0 应跳过权限检查（falsy userId）', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'New' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { short_name: 'New' }, 0, 'admin');
      expect(result.short_name).toBe('New');
    });

    it('delete: admin with userId=0 应跳过权限检查（falsy userId）', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 0, 'admin');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('create: admin with undefined companyId 应使用 undefined 作为 effectiveCompanyId', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      // When role='admin' and companyId=undefined, effectiveCompanyId = undefined!
      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      }, 'admin', undefined);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: undefined }),
        }),
      );
    });

    it('update: admin with undefined userId 应跳过权限检查', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'New' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // role='admin' but userId=undefined → skip operator check
      const result = await service.update(1, { short_name: 'New' }, undefined, 'admin');
      expect(result.short_name).toBe('New');
    });

    it('delete: admin with undefined userId 应跳过权限检查', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // role='admin' but userId=undefined → skip operator check
      await service.delete(1, undefined, 'admin');
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('getById: 非 admin/view/sysadmin 角色应跳过权限检查', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [{ userId: 5, user: { id: 5, cnName: '王五' } }],
      }));
      mockedGetPrisma.mockReturnValue({ project: { findFirst: mockFindFirst } } as any);

      // Some other role → no operator check
      const result = await service.getById(1, 2, 'guest');
      expect(result.id).toBe(1);
    });
  });

  describe('第2轮: 安全性与数据完整性', () => {
    it('update: viewer validation 应使用 existing.companyId 而非 request.company_id', async () => {
      const existing = makePrismaProject({ companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(6, 10, 'view', '孙七')]);
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 1 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        viewers: [{ userId: 6, user: { id: 6, cnName: '孙七' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      } as any);

      await service.update(1, { viewer_ids: [6] });

      // Viewer validation should use existing companyId=10
      expect(mockUserFindMany).toHaveBeenCalledWith({
        where: { id: { in: [6] }, companyId: 10, role: 'view' },
      });
    });

    it('update: company_id 在 request 中为 undefined 时不应抛错', async () => {
      const existing = makePrismaProject({ companyId: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'New' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // company_id is undefined in request → should not trigger the immutability check
      const result = await service.update(1, { short_name: 'New' });
      expect(result).toBeDefined();
    });

    it('update: operator 软删除后再创建新的（替换语义验证）', async () => {
      const existing = makePrismaProject({
        operators: [
          { userId: 2, user: { id: 2, cnName: '张三' } },
          { userId: 3, user: { id: 3, cnName: '李四' } },
        ],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(5, 1, 'admin', '赵六')]);
      const mockOperatorUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        operators: [{ userId: 5, user: { id: 5, cnName: '赵六' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectOperator: { updateMany: mockOperatorUpdateMany },
      } as any);

      const result = await service.update(1, { operator_ids: [5] });

      // First soft-deletes ALL existing operators
      expect(mockOperatorUpdateMany).toHaveBeenCalledWith({
        where: { projectId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      // Then creates new ones
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            operators: { create: [{ userId: 5 }] },
          }),
        }),
      );
      expect(result.operator_ids).toEqual([5]);
    });

    it('update: viewer 软删除后再创建新的（替换语义验证）', async () => {
      const existing = makePrismaProject({
        viewers: [
          { userId: 3, user: { id: 3, cnName: '李四' } },
          { userId: 4, user: { id: 4, cnName: '王五' } },
        ],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindMany = jest.fn().mockResolvedValue([makePrismaUser(6, 1, 'view', '孙七')]);
      const mockViewerUpdateMany = jest.fn().mockResolvedValue({ count: 2 });
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing,
        viewers: [{ userId: 6, user: { id: 6, cnName: '孙七' } }],
      });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findMany: mockUserFindMany },
        projectViewer: { updateMany: mockViewerUpdateMany },
      } as any);

      const result = await service.update(1, { viewer_ids: [6] });

      expect(mockViewerUpdateMany).toHaveBeenCalledWith({
        where: { projectId: 1, deletedAt: null },
        data: { deletedAt: expect.any(Date) },
      });
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            viewers: { create: [{ userId: 6 }] },
          }),
        }),
      );
      expect(result.viewer_ids).toEqual([6]);
    });

    it('create: viewer with no user object should use userId as fallback via mapProject', async () => {
      const mockCreate = jest.fn().mockResolvedValue({
        ...makePrismaProject(),
        operators: [],
        viewers: [{ userId: 8, user: null }],
      });
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      const result = await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      });

      expect(result.viewer_ids).toEqual([8]);
      expect(result.viewer_names).toEqual(['']);
    });

    it('list: Promise.all 并发执行 findMany 和 count', async () => {
      const rows = [makePrismaProject()];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      // Both should be called exactly once
      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
    });

    it('update: update 方法的 include 应包含 OPERATOR_INCLUDE', async () => {
      const existing = makePrismaProject();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, shortName: 'New' });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { short_name: 'New' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ include: OPERATOR_INCLUDE }),
      );
    });

    it('create: create 方法的 include 应包含 OPERATOR_INCLUDE', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaProject({
        operators: [],
        viewers: [],
      }));
      mockedGetPrisma.mockReturnValue({ project: { create: mockCreate } } as any);

      await service.create({
        short_name: 'P1',
        full_name: 'Project One',
        company_id: 1,
      });

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({ include: OPERATOR_INCLUDE }),
      );
    });

    it('delete: delete 应使用 findFirst + include OPERATOR_INCLUDE（用于权限检查）', async () => {
      const existing = makePrismaProject({
        operators: [{ userId: 2, user: { id: 2, cnName: '张三' } }],
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1);

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: OPERATOR_INCLUDE,
      });
    });
  });

  describe('第2轮: mapProject 边界值', () => {
    it('list: 多个 operator 和 viewer 的映射', async () => {
      const rows = [makePrismaProject({
        operators: [
          { userId: 2, user: { id: 2, cnName: '张三' } },
          { userId: 4, user: { id: 4, cnName: '王五' } },
          { userId: 5, user: { id: 5, cnName: '赵六' } },
        ],
        viewers: [
          { userId: 3, user: { id: 3, cnName: '李四' } },
          { userId: 6, user: { id: 6, cnName: '孙七' } },
        ],
      })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].operator_ids).toEqual([2, 4, 5]);
      expect(result.list[0].operator_names).toEqual(['张三', '王五', '赵六']);
      expect(result.list[0].viewer_ids).toEqual([3, 6]);
      expect(result.list[0].viewer_names).toEqual(['李四', '孙七']);
    });

    it('list: operator/user cnName 为空字符串时应正确映射', async () => {
      const rows = [makePrismaProject({
        operators: [{ userId: 2, user: { id: 2, cnName: '' } }],
        viewers: [],
      })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list[0].operator_names).toEqual(['']);
    });

    it('list: viewer/user 对象存在但 id 字段不存在时应使用 userId 回退', async () => {
      const rows = [makePrismaProject({
        operators: [],
        viewers: [{ userId: 9, user: { cnName: '测试用户' } }],
      })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      // user.id is undefined, fallback to userId
      expect(result.list[0].viewer_ids).toEqual([9]);
      expect(result.list[0].viewer_names).toEqual(['测试用户']);
    });

    it('list: 多条记录映射应保持顺序', async () => {
      const rows = [
        makePrismaProject({ id: 1, shortName: 'Alpha' }),
        makePrismaProject({ id: 2, shortName: 'Beta' }),
        makePrismaProject({ id: 3, shortName: 'Gamma' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(3);
      mockedGetPrisma.mockReturnValue({ project: { findMany: mockFindMany, count: mockCount } } as any);

      const result = await service.list(1, 10);

      expect(result.list.map(p => p.short_name)).toEqual(['Alpha', 'Beta', 'Gamma']);
      expect(result.total).toBe(3);
    });
  });
});

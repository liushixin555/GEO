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

      // userId and role are not used in getById query itself
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: OPERATOR_INCLUDE,
      });
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
  });
});

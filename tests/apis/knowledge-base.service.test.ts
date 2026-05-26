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
import { KnowledgeBaseServiceImpl } from '../../apis/service/impl/knowledge-base.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

const BASE_INCLUDE = {
  company: true,
  project: true,
  creator: true,
  _count: {
    select: {
      keywords: true,
      portraits: true,
      images: true,
      documents: true,
    },
  },
};

function makePrismaKnowledgeBase(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: '测试知识库',
    description: '测试描述',
    scope: 'platform',
    companyId: null,
    company: null,
    projectId: null,
    project: null,
    status: true,
    createdBy: 1,
    creator: { cnName: '管理员' },
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    deletedAt: null,
    _count: { keywords: 5, portraits: 3, images: 2, documents: 1 },
    ...overrides,
  };
}

function makeExpectedMapped(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    name: '测试知识库',
    description: '测试描述',
    scope: 'platform',
    company_id: null,
    company_name: null,
    project_id: null,
    project_name: null,
    status: true,
    created_by: 1,
    creator_name: '管理员',
    keyword_count: 5,
    portrait_count: 3,
    image_count: 2,
    document_count: 1,
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    deleted_at: null,
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('KnowledgeBaseServiceImpl', () => {
  let service: KnowledgeBaseServiceImpl;

  beforeEach(() => {
    service = new KnowledgeBaseServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated list ordered by id desc', async () => {
      const items = [
        makePrismaKnowledgeBase({ id: 2, name: 'B' }),
        makePrismaKnowledgeBase({ id: 1, name: 'A' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.total).toBe(2);
      expect(result.list).toHaveLength(2);
      expect(result.list[0].name).toBe('B');
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {},
        include: BASE_INCLUDE,
        orderBy: { id: 'desc' },
        skip: 0,
        take: 10,
      });
    });

    it('should calculate correct skip for page 2', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(3, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should filter by search term (name or description)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '关键词');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '关键词', mode: 'insensitive' } },
              { description: { contains: '关键词', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should filter by scope', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, 'company');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { scope: 'company' } }),
      );
    });

    it('should filter by status when status is true', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, true);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: true } }),
      );
    });

    it('should filter by status when status is false', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, false);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: { status: false } }),
      );
    });

    it('should not filter by status when status is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should combine search, scope, and status filters', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '测试', 'project', true);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '测试', mode: 'insensitive' } },
              { description: { contains: '测试', mode: 'insensitive' } },
            ],
            scope: 'project',
            status: true,
          },
        }),
      );
    });

    // ── Admin role filtering ──
    it('should return empty when admin user not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
      } as any);

      const result = await service.list(1, 10, undefined, undefined, undefined, 99, 'admin');

      expect(result).toEqual({ list: [], total: 0 });
    });

    it('should filter by admin role - platform only when user has no company and no projects', async () => {
      const mockUser = { id: 1, companyId: null, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { AND: [{ OR: [{ scope: 'platform', status: true }] }] },
        }),
      );
    });

    it('should filter by admin role - platform + company scope', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{
              OR: [
                { scope: 'platform', status: true },
                { scope: 'company', companyId: 10, status: true },
              ],
            }],
          },
        }),
      );
    });

    it('should filter by admin role - platform + project scope', async () => {
      const mockUser = { id: 1, companyId: null, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([
        { projectId: 100 },
        { projectId: 200 },
      ]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{
              OR: [
                { scope: 'platform', status: true },
                { scope: 'project', projectId: { in: [100, 200] }, status: true },
              ],
            }],
          },
        }),
      );
    });

    it('should filter by admin role - all three scopes combined', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([{ projectId: 50 }]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            AND: [{
              OR: [
                { scope: 'platform', status: true },
                { scope: 'company', companyId: 10, status: true },
                { scope: 'project', projectId: { in: [50] }, status: true },
              ],
            }],
          },
        }),
      );
    });

    it('should combine admin role filter with search filter', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '测试', undefined, undefined, 1, 'admin');

      // Should have both OR (search) and AND (role filter)
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined(); // search filter
      expect(where.AND).toBeDefined(); // role filter
    });

    it('should not apply admin filtering for view role', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'view');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should not apply admin filtering for sysadmin role', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'sysadmin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should correctly map list items', async () => {
      const item = makePrismaKnowledgeBase({
        id: 5,
        name: '映射测试',
        scope: 'company',
        companyId: 10,
        company: { shortName: 'ACME' },
        projectId: null,
        project: null,
        _count: { keywords: 10, portraits: 5, images: 3, documents: 2 },
      });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list[0]).toEqual(makeExpectedMapped({
        id: 5,
        name: '映射测试',
        scope: 'company',
        company_id: 10,
        company_name: 'ACME',
        keyword_count: 10,
        portrait_count: 5,
        image_count: 3,
        document_count: 2,
      }));
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('should return knowledge base by id', async () => {
      const item = makePrismaKnowledgeBase({ id: 3 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(3);

      expect(result.id).toBe(3);
      expect(result.name).toBe('测试知识库');
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 3, deletedAt: null },
        include: BASE_INCLUDE,
      });
    });

    it('should throw error when knowledge base not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('知识库不存在');
    });

    it('should correctly map all fields including relations', async () => {
      const item = makePrismaKnowledgeBase({
        id: 5,
        scope: 'project',
        companyId: 10,
        company: { shortName: 'TestCo' },
        projectId: 20,
        project: { shortName: 'TestProj' },
        createdBy: 2,
        creator: { cnName: '张三' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(5);

      expect(result).toEqual(makeExpectedMapped({
        id: 5,
        scope: 'project',
        company_id: 10,
        company_name: 'TestCo',
        project_id: 20,
        project_name: 'TestProj',
        created_by: 2,
        creator_name: '张三',
      }));
    });

    // ── Access control tests ──
    it('should throw error when non-sysadmin accesses inactive platform knowledge base', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'platform', status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(1, 10, 'admin')).rejects.toThrow('知识库不存在');
    });

    it('should return active platform knowledge base for non-sysadmin', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'platform', status: true });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'admin');

      expect(result.id).toBe(1);
    });

    it('should return company knowledge base when user belongs to same company', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: 10, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'admin');

      expect(result.id).toBe(1);
      expect(mockUserFindFirst).toHaveBeenCalledWith({ where: { id: 10, deletedAt: null } });
    });

    it('should throw error when user belongs to different company for company scope', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: 99, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      await expect(service.getById(1, 10, 'admin')).rejects.toThrow('知识库不存在');
    });

    it('should throw error when user not found for company scope access', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockUserFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      await expect(service.getById(1, 99, 'admin')).rejects.toThrow('知识库不存在');
    });

    it('should return project knowledge base when user is operator', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 10, projectId: 20 });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'admin');

      expect(result.id).toBe(1);
      expect(mockOperatorFindFirst).toHaveBeenCalledWith({
        where: { userId: 10, projectId: 20, deletedAt: null },
      });
    });

    it('should throw error when user is not operator for project scope', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      await expect(service.getById(1, 10, 'admin')).rejects.toThrow('知识库不存在');
    });

    it('should throw error when project knowledge base has no projectId', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: null });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
      } as any);

      await expect(service.getById(1, 10, 'admin')).rejects.toThrow('知识库不存在');
    });

    it('should bypass access control for sysadmin', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10, status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'sysadmin');

      expect(result.id).toBe(1);
    });

    it('should bypass access control when userId is undefined', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.id).toBe(1);
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('should create platform scope knowledge base (clears company_id and project_id)', async () => {
      const request = {
        name: '平台知识库',
        description: '平台级别',
        scope: 'platform' as const,
        company_id: 10,
        project_id: 20,
      };
      const created = makePrismaKnowledgeBase({ id: 1, name: '平台知识库' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1);

      expect(result.name).toBe('平台知识库');
      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: '平台知识库',
          description: '平台级别',
          scope: 'platform',
          companyId: null,
          projectId: null,
          createdBy: 1,
        },
        include: BASE_INCLUDE,
      });
    });

    it('should throw error when creating company scope without company_id', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
      };

      await expect(service.create(request, 1)).rejects.toThrow('公司公共知识库必须选择公司');
    });

    it('should throw error when creating project scope without project_id', async () => {
      const request = {
        name: '项目知识库',
        scope: 'project' as const,
      };

      await expect(service.create(request, 1)).rejects.toThrow('项目私有知识库必须选择项目');
    });

    it('should create company scope with company_id', async () => {
      const request = {
        name: '公司知识库',
        description: '公司级别',
        scope: 'company' as const,
        company_id: 10,
      };
      const created = makePrismaKnowledgeBase({
        id: 2, scope: 'company', companyId: 10,
        company: { shortName: 'ACME' },
      });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: '公司知识库',
          description: '公司级别',
          scope: 'company',
          companyId: 10,
          projectId: null,
          createdBy: 1,
        },
        include: BASE_INCLUDE,
      });
    });

    it('should create project scope with project_id and optional company_id', async () => {
      const request = {
        name: '项目知识库',
        description: '项目级别',
        scope: 'project' as const,
        project_id: 20,
        company_id: 10,
      };
      const created = makePrismaKnowledgeBase({
        id: 3, scope: 'project', projectId: 20, companyId: 10,
      });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: '项目知识库',
          description: '项目级别',
          scope: 'project',
          companyId: 10,
          projectId: 20,
          createdBy: 1,
        },
        include: BASE_INCLUDE,
      });
    });

    it('should create project scope without company_id (companyId defaults to null)', async () => {
      const request = {
        name: '项目知识库无公司',
        scope: 'project' as const,
        project_id: 30,
      };
      const created = makePrismaKnowledgeBase({
        id: 4, scope: 'project', projectId: 30, companyId: null,
      });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith({
        data: {
          name: '项目知识库无公司',
          description: null,
          scope: 'project',
          companyId: null,
          projectId: 30,
          createdBy: 1,
        },
        include: BASE_INCLUDE,
      });
    });

    it('should set description to null when not provided', async () => {
      const request = {
        name: '无描述知识库',
        scope: 'platform' as const,
      };
      const created = makePrismaKnowledgeBase({ id: 4, description: null });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: null }),
        }),
      );
    });

    it('should preserve empty string description (?? null only coalesces on null/undefined)', async () => {
      const request = {
        name: '空描述知识库',
        description: '',
        scope: 'platform' as const,
      };
      const created = makePrismaKnowledgeBase({ id: 5, description: '' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '' }),
        }),
      );
    });

    // ── Admin ownership validation (SEC-M-01) ──
    it('should throw ForbiddenError when admin creates company scope with mismatched company', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 10,
      };
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 99, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockUserFindFirst },
      } as any);

      await expect(service.create(request, 1, 'admin')).rejects.toThrow('无权关联该公司');
    });

    it('should throw ForbiddenError when admin creates company scope but user not found', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 10,
      };
      const mockUserFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockUserFindFirst },
      } as any);

      await expect(service.create(request, 1, 'admin')).rejects.toThrow('无权关联该公司');
    });

    it('should allow admin to create company scope when user belongs to same company', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 10,
      };
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 10, deletedAt: null });
      const created = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10, company: { shortName: 'ACME' } });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockUserFindFirst },
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1, 'admin');

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when admin creates project scope without operator', async () => {
      const request = {
        name: '项目知识库',
        scope: 'project' as const,
        project_id: 20,
      };
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      await expect(service.create(request, 1, 'admin')).rejects.toThrow('无权关联该项目');
    });

    it('should allow admin to create project scope when user is operator', async () => {
      const request = {
        name: '项目知识库',
        scope: 'project' as const,
        project_id: 20,
      };
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 1, projectId: 20 });
      const created = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20 });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        projectOperator: { findFirst: mockOperatorFindFirst },
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1, 'admin');

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should skip ownership validation for sysadmin creating company scope', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 10,
      };
      const created = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should skip ownership validation for non-admin creating company scope', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 10,
      };
      const created = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1);

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalled();
    });

    it('should only validate project ownership (not company) for admin creating project scope', async () => {
      const request = {
        name: '项目知识库',
        scope: 'project' as const,
        project_id: 20,
        company_id: 10,
      };
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 1, projectId: 20 });
      const created = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20, companyId: 10 });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        projectOperator: { findFirst: mockOperatorFindFirst },
        knowledgeBase: { create: mockCreate },
      } as any);

      const result = await service.create(request, 1, 'admin');

      expect(result.id).toBe(1);
      // project scope only validates project operator, not company ownership
      expect(mockOperatorFindFirst).toHaveBeenCalledWith({
        where: { userId: 1, projectId: 20, deletedAt: null },
      });
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('should throw error when knowledge base not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(999, { name: '新名称' }, 1, 'sysadmin')).rejects.toThrow('知识库不存在');
    });

    it('should throw error when non-sysadmin updates another user\'s knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, { name: '新名称' }, 1, 'admin')).rejects.toThrow('只能修改自己创建的知识库');
    });

    it('should allow sysadmin to update any knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 2 });
      const updated = makePrismaKnowledgeBase({ id: 1, name: '更新后' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { name: '更新后' }, 1, 'sysadmin');

      expect(result.name).toBe('更新后');
    });

    it('should allow owner to update their own knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, name: '更新后' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { name: '更新后' }, 1, 'admin');

      expect(result.name).toBe('更新后');
    });

    it('should update name only', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, name: '新名称' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '新名称' }, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '新名称' },
        include: BASE_INCLUDE,
      });
    });

    it('should update description (preserve empty string)', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, description: '' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: '' }, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '' },
        include: BASE_INCLUDE,
      });
    });

    it('should update status', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, status: true });
      const updated = makePrismaKnowledgeBase({ id: 1, status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { status: false }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: false },
        include: BASE_INCLUDE,
      });
    });

    // ── Scope change ──
    it('should change scope to platform and clear company_id and project_id', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'company',
        companyId: 10, company: { shortName: 'ACME' },
      });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'platform' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'platform' }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'platform', companyId: null, projectId: null },
        include: BASE_INCLUDE,
      });
    });

    it('should change scope to company with new company_id', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'platform' });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 20 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'company', company_id: 20 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'company', companyId: 20, projectId: null },
        include: BASE_INCLUDE,
      });
    });

    it('should change scope to company using existing company_id when not provided', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'platform', companyId: 10,
      });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'company' }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ companyId: 10 }),
        }),
      );
    });

    it('should throw error when changing to company scope without company_id and no existing', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'platform', companyId: null,
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, { scope: 'company' }, 1, 'sysadmin')).rejects.toThrow('公司公共知识库必须选择公司');
    });

    it('should change scope to project with new project_id and company_id', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'platform' });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 30 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'project', project_id: 30, company_id: 10 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'project', projectId: 30, companyId: 10 },
        include: BASE_INCLUDE,
      });
    });

    it('should change scope to project using existing project_id and company_id when not provided', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'company', projectId: 20, companyId: 10,
      });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20, companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'project' }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'project', projectId: 20, companyId: 10 },
        include: BASE_INCLUDE,
      });
    });

    it('should throw error when changing to project scope without project_id and no existing', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'platform', projectId: null,
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, { scope: 'project' }, 1, 'sysadmin')).rejects.toThrow('项目私有知识库必须选择项目');
    });

    // ── No scope change, update company_id / project_id ──
    it('should update company_id without scope change', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company', companyId: 10 });
      const updated = makePrismaKnowledgeBase({ id: 1, companyId: 20 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { company_id: 20 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { companyId: 20 },
        include: BASE_INCLUDE,
      });
    });

    it('should update project_id without scope change', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project', projectId: 10 });
      const updated = makePrismaKnowledgeBase({ id: 1, projectId: 20 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { project_id: 20 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { projectId: 20 },
        include: BASE_INCLUDE,
      });
    });

    it('should update multiple fields at once', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, name: '多字段', description: '新描述', status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '多字段', description: '新描述', status: false }, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { name: '多字段', description: '新描述', status: false },
        include: BASE_INCLUDE,
      });
    });

    it('should find existing with deletedAt filter', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, name: '更新' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { name: '更新' }, 1, 'admin');

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });

    // ── Admin ownership validation (SEC-M-01) ──
    it('should throw ForbiddenError when admin updates company_id to mismatched company', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company' });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 99, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      // SEC-H-04: admin cannot change company_id (only sysadmin can)
      await expect(service.update(1, { company_id: 10 }, 1, 'admin')).rejects.toThrow('知识库公司关联变更需要系统管理员权限');
    });

    it('should throw ForbiddenError when admin updates company_id but user not found', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company' });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      // SEC-H-04: admin cannot change company_id (only sysadmin can)
      await expect(service.update(1, { company_id: 10 }, 1, 'admin')).rejects.toThrow('知识库公司关联变更需要系统管理员权限');
    });

    it('should allow sysadmin to update company_id when user belongs to same company', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company', companyId: 10 });
      const updated = makePrismaKnowledgeBase({ id: 1, companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 10, deletedAt: null });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
      } as any);

      const result = await service.update(1, { company_id: 10 }, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw ForbiddenError when admin updates project_id without operator', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project' });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockOperatorFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      // SEC-H-04: admin cannot change project_id (only sysadmin can)
      await expect(service.update(1, { project_id: 20 }, 1, 'admin')).rejects.toThrow('知识库项目关联变更需要系统管理员权限');
    });

    it('should allow sysadmin to update project_id when user is operator', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project', projectId: 10 });
      const updated = makePrismaKnowledgeBase({ id: 1, projectId: 20 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 1, projectId: 20 });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      const result = await service.update(1, { project_id: 20 }, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
      // sysadmin bypasses ownership validation — operator check is not called
    });

    it('should skip ownership validation for sysadmin updating company_id', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company' });
      const updated = makePrismaKnowledgeBase({ id: 1, companyId: 99 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { company_id: 99 }, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should skip ownership validation for sysadmin updating project_id', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project' });
      const updated = makePrismaKnowledgeBase({ id: 1, projectId: 99 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { project_id: 99 }, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should allow sysadmin to update both company_id and project_id', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project', companyId: 10, projectId: 20 });
      const updated = makePrismaKnowledgeBase({ id: 1, companyId: 10, projectId: 30 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 10, deletedAt: null });
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 1, projectId: 30 });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      const result = await service.update(1, { company_id: 10, project_id: 30 }, 1, 'sysadmin');

      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
      // sysadmin bypasses ownership validation — user/operator checks are not called
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('should throw error when knowledge base not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(999, 1, 'sysadmin')).rejects.toThrow('知识库不存在');
    });

    it('should throw error when non-sysadmin deletes another user\'s knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1, 1, 'admin')).rejects.toThrow('只能删除自己创建的知识库');
    });

    it('should soft delete (set deletedAt) as sysadmin', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should allow owner to soft delete their own knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should find existing with deletedAt filter', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 1, 'admin');

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });
  });

  // ──────────────────────────────────────
  //  getAccessibleBaseIds()
  // ──────────────────────────────────────
  describe('getAccessibleBaseIds', () => {
    it('should throw error when project not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getAccessibleBaseIds(999)).rejects.toThrow('项目不存在');
    });

    it('should return platform + project scope bases for project without company', async () => {
      const mockProject = { id: 1, companyId: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockProject);
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1 }, { id: 2 }, { id: 3 },
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      const result = await service.getAccessibleBaseIds(1);

      expect(result).toEqual([1, 2, 3]);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { scope: 'platform', status: true },
            { scope: 'project', projectId: 1, status: true },
          ],
        },
        select: { id: true },
      });
    });

    it('should return platform + company + project scope bases for project with company', async () => {
      const mockProject = { id: 1, companyId: 10 };
      const mockFindFirst = jest.fn().mockResolvedValue(mockProject);
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1 }, { id: 2 }, { id: 3 }, { id: 4 },
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      const result = await service.getAccessibleBaseIds(1);

      expect(result).toEqual([1, 2, 3, 4]);
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { scope: 'platform', status: true },
            { scope: 'project', projectId: 1, status: true },
            { scope: 'company', companyId: 10, status: true },
          ],
        },
        select: { id: true },
      });
    });

    it('should return empty array when no accessible bases exist', async () => {
      const mockProject = { id: 1, companyId: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockProject);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      const result = await service.getAccessibleBaseIds(1);

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  mapKnowledgeBase (field mapping)
  // ──────────────────────────────────────
  describe('field mapping', () => {
    it('should handle null relations and missing _count gracefully', async () => {
      const item = {
        id: 1,
        name: '空关联',
        description: null,
        scope: 'platform',
        companyId: null,
        company: null,
        projectId: null,
        project: null,
        status: true,
        createdBy: null,
        creator: null,
        createdAt: new Date('2025-01-01'),
        updatedAt: new Date('2025-06-01'),
        _count: undefined,
      };
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result).toEqual({
        id: 1,
        name: '空关联',
        description: null,
        scope: 'platform',
        company_id: null,
        company_name: null,
        project_id: null,
        project_name: null,
        status: true,
        created_by: null,
        creator_name: null,
        keyword_count: 0,
        portrait_count: 0,
        image_count: 0,
        document_count: 0,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
        deleted_at: null,
      });
    });

    it('should use shortName from company and project relations', async () => {
      const item = makePrismaKnowledgeBase({
        companyId: 10,
        company: { shortName: 'MyCompany' },
        projectId: 20,
        project: { shortName: 'MyProject' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.company_name).toBe('MyCompany');
      expect(result.project_name).toBe('MyProject');
    });

    it('should use cnName from creator relation', async () => {
      const item = makePrismaKnowledgeBase({
        createdBy: 5,
        creator: { cnName: '李四' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.created_by).toBe(5);
      expect(result.creator_name).toBe('李四');
    });

    it('should return null company_name when company exists with empty shortName', async () => {
      const item = makePrismaKnowledgeBase({
        companyId: 10,
        company: { shortName: '' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.company_name).toBeNull();
    });

    it('should return null creator_name when creator has empty cnName', async () => {
      const item = makePrismaKnowledgeBase({
        createdBy: 1,
        creator: { cnName: '' },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.creator_name).toBeNull();
    });

    it('should map all _count fields to zero when _count has zeros', async () => {
      const item = makePrismaKnowledgeBase({
        _count: { keywords: 0, portraits: 0, images: 0, documents: 0 },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1);

      expect(result.keyword_count).toBe(0);
      expect(result.portrait_count).toBe(0);
      expect(result.image_count).toBe(0);
      expect(result.document_count).toBe(0);
    });
  });

  // ──────────────────────────────────────
  //  Interface contract verification
  // ──────────────────────────────────────
  describe('IKnowledgeBaseService interface contract', () => {
    it('should implement all 6 interface methods', () => {
      expect(typeof service.list).toBe('function');
      expect(typeof service.getById).toBe('function');
      expect(typeof service.create).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.delete).toBe('function');
      expect(typeof service.getAccessibleBaseIds).toBe('function');
    });

    it('should have correct method parameter counts', () => {
      expect(service.list.length).toBe(7);
      expect(service.getById.length).toBe(3);
      expect(service.create.length).toBe(3);
      expect(service.update.length).toBe(4);
      expect(service.delete.length).toBe(3);
      expect(service.getAccessibleBaseIds.length).toBe(1);
    });

    it('should return Promise from list', async () => {
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: jest.fn().mockResolvedValue([]), count: jest.fn().mockResolvedValue(0) },
      } as any);

      const result = service.list(1, 10);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should return Promise from getById', async () => {
      const item = makePrismaKnowledgeBase();
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(item) },
      } as any);

      const result = service.getById(1);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should return Promise from create', async () => {
      const created = makePrismaKnowledgeBase();
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: jest.fn().mockResolvedValue(created) },
      } as any);

      const result = service.create({ name: 'test', scope: 'platform' }, 1);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should return Promise from update', async () => {
      const existing = makePrismaKnowledgeBase({ createdBy: 1 });
      const updated = makePrismaKnowledgeBase();
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updated) },
      } as any);

      const result = service.update(1, { name: 'test' }, 1, 'sysadmin');
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should return Promise from delete', async () => {
      const existing = makePrismaKnowledgeBase({ createdBy: 1 });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue({}) },
      } as any);

      const result = service.delete(1, 1, 'sysadmin');
      expect(result).toBeInstanceOf(Promise);
      await result;
    });

    it('should return Promise from getAccessibleBaseIds', async () => {
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: jest.fn().mockResolvedValue({ id: 1, companyId: null }) },
        knowledgeBase: { findMany: jest.fn().mockResolvedValue([]) },
      } as any);

      const result = service.getAccessibleBaseIds(1);
      expect(result).toBeInstanceOf(Promise);
      await result;
    });
  });

  // ──────────────────────────────────────
  //  Error type verification
  // ──────────────────────────────────────
  describe('error types', () => {
    it('getById should throw NotFoundError with statusCode 404', async () => {
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(null) },
      } as any);

      try {
        await service.getById(999);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('知识库不存在');
      }
    });

    it('create should throw BusinessError with statusCode 400 for missing company_id', async () => {
      try {
        await service.create({ name: 'test', scope: 'company' }, 1);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(400);
        expect(error.message).toBe('公司公共知识库必须选择公司');
      }
    });

    it('create should throw ForbiddenError with statusCode 403 for ownership violation', async () => {
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 99, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockUserFindFirst },
      } as any);

      try {
        await service.create({ name: 'test', scope: 'company', company_id: 10 }, 1, 'admin');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('无权关联该公司');
      }
    });

    it('update should throw NotFoundError with statusCode 404', async () => {
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(null) },
      } as any);

      try {
        await service.update(999, { name: 'test' }, 1, 'sysadmin');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('知识库不存在');
      }
    });

    it('update should throw ForbiddenError with statusCode 403 for ownership violation', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 99 });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(existing) },
      } as any);

      try {
        await service.update(1, { name: 'test' }, 1, 'admin');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('只能修改自己创建的知识库');
      }
    });

    it('delete should throw NotFoundError with statusCode 404', async () => {
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(null) },
      } as any);

      try {
        await service.delete(999, 1, 'sysadmin');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('知识库不存在');
      }
    });

    it('delete should throw ForbiddenError with statusCode 403 for ownership violation', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 99 });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: jest.fn().mockResolvedValue(existing) },
      } as any);

      try {
        await service.delete(1, 1, 'admin');
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(403);
        expect(error.message).toBe('只能删除自己创建的知识库');
      }
    });

    it('getAccessibleBaseIds should throw NotFoundError with statusCode 404', async () => {
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: jest.fn().mockResolvedValue(null) },
      } as any);

      try {
        await service.getAccessibleBaseIds(999);
        fail('Expected error to be thrown');
      } catch (error: any) {
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('项目不存在');
      }
    });
  });

  // ──────────────────────────────────────
  //  list() additional edge cases
  // ──────────────────────────────────────
  describe('list additional edge cases', () => {
    it('should not add OR search filter for empty string search', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should not apply admin filtering when role is admin but userId is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, undefined, 'admin');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} }),
      );
    });

    it('should verify deletedAt: null in user findFirst for admin role', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });

    it('should verify deletedAt: null in projectOperator findMany for admin role', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 1, 'admin');

      expect(mockOperatorFindMany).toHaveBeenCalledWith({
        where: { userId: 1, deletedAt: null },
        select: { projectId: true },
      });
    });

    it('should correctly paginate page 1 with pageSize 1', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([makePrismaKnowledgeBase()]);
      const mockCount = jest.fn().mockResolvedValue(50);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 1);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
    });

    it('should combine all filters with admin role', async () => {
      const mockUser = { id: 1, companyId: 10, deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(mockUser);
      const mockOperatorFindMany = jest.fn().mockResolvedValue([{ projectId: 50 }]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        user: { findFirst: mockFindFirst },
        projectOperator: { findMany: mockOperatorFindMany },
        knowledgeBase: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '搜索', 'company', true, 1, 'admin');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined(); // search filter
      expect(where.scope).toBe('company'); // scope filter
      expect(where.status).toBe(true); // status filter
      expect(where.AND).toBeDefined(); // role filter
    });
  });

  // ──────────────────────────────────────
  //  getById() additional edge cases
  // ──────────────────────────────────────
  describe('getById additional edge cases', () => {
    it('should apply access control when role is undefined but userId provided', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(item);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: 10, deletedAt: null });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      const result = await service.getById(1, 10);

      expect(result.id).toBe(1);
      expect(mockUserFindFirst).toHaveBeenCalledWith({ where: { id: 10, deletedAt: null } });
    });

    it('should allow sysadmin to access inactive company scope knowledge base', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10, status: false });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'sysadmin');

      expect(result.id).toBe(1);
      expect(result.status).toBe(false);
    });

    it('should allow sysadmin to access project scope without operator check', async () => {
      const item = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 10, 'sysadmin');

      expect(result.id).toBe(1);
    });
  });

  // ──────────────────────────────────────
  //  create() additional edge cases
  // ──────────────────────────────────────
  describe('create additional edge cases', () => {
    it('should pass description with actual content', async () => {
      const request = {
        name: '有描述',
        description: '这是详细描述',
        scope: 'platform' as const,
      };
      const created = makePrismaKnowledgeBase({ id: 1, description: '这是详细描述' });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      await service.create(request, 1);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '这是详细描述' }),
        }),
      );
    });

    it('should throw BusinessError when company scope with company_id = 0', async () => {
      const request = {
        name: '公司知识库',
        scope: 'company' as const,
        company_id: 0,
      };

      await expect(service.create(request, 1)).rejects.toThrow('公司公共知识库必须选择公司');
    });

    it('should throw BusinessError when project scope with project_id = 0', async () => {
      const request = {
        name: '项目知识库',
        scope: 'project' as const,
        project_id: 0,
      };

      await expect(service.create(request, 1)).rejects.toThrow('项目私有知识库必须选择项目');
    });

    it('should handle create with description containing whitespace only', async () => {
      const request = {
        name: '空白描述',
        description: '   ',
        scope: 'platform' as const,
      };
      const created = makePrismaKnowledgeBase({ id: 1 });
      const mockCreate = jest.fn().mockResolvedValue(created);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { create: mockCreate },
      } as any);

      await service.create(request, 1);

      // '   ' is truthy so it should be passed as-is
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ description: '   ' }),
        }),
      );
    });
  });

  // ──────────────────────────────────────
  //  update() additional edge cases
  // ──────────────────────────────────────
  describe('update additional edge cases', () => {
    it('should handle update with description set to non-empty value', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, description: '新描述' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { description: '新描述' }, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '新描述' },
        include: BASE_INCLUDE,
      });
    });

    it('should preserve empty string description on update (?? null only coalesces on null/undefined)', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const updated = makePrismaKnowledgeBase({ id: 1, description: '' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // description: '' → description ?? null → '' (?? preserves empty string)
      await service.update(1, { description: '' }, 1, 'admin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { description: '' },
        include: BASE_INCLUDE,
      });
    });

    it('should verify sysadmin can update project_id bypassing ownership check', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'project' });
      const updated = makePrismaKnowledgeBase({ id: 1, projectId: 20 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockOperatorFindFirst = jest.fn().mockResolvedValue({ userId: 1, projectId: 20 });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
        projectOperator: { findFirst: mockOperatorFindFirst },
      } as any);

      await service.update(1, { project_id: 20 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalled();
      // sysadmin bypasses admin ownership validation — operator check is NOT called
      expect(mockOperatorFindFirst).not.toHaveBeenCalled();
    });

    it('should verify sysadmin can update company_id bypassing ownership check', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1, scope: 'company' });
      const updated = makePrismaKnowledgeBase({ id: 1, companyId: 10 });
      const mockKbFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 10, deletedAt: null });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockKbFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
      } as any);

      await service.update(1, { company_id: 10 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalled();
      // sysadmin bypasses admin ownership validation — user check is NOT called
      expect(mockUserFindFirst).not.toHaveBeenCalled();
    });

    it('should handle update with scope change to project without company_id', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'platform', companyId: null, projectId: null,
      });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'project', projectId: 20, companyId: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'project', project_id: 20 }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'project', projectId: 20, companyId: null },
        include: BASE_INCLUDE,
      });
    });

    it('should handle update with scope change to company using existing company_id', async () => {
      const existing = makePrismaKnowledgeBase({
        id: 1, createdBy: 1, scope: 'project', companyId: 10, projectId: 20,
      });
      const updated = makePrismaKnowledgeBase({ id: 1, scope: 'company', companyId: 10 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { scope: 'company' }, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scope: 'company', companyId: 10, projectId: null },
        include: BASE_INCLUDE,
      });
    });
  });

  // ──────────────────────────────────────
  //  delete() additional edge cases
  // ──────────────────────────────────────
  describe('delete additional edge cases', () => {
    it('should allow sysadmin to delete their own knowledge base', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.delete(1, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('should throw ForbiddenError for non-owner non-sysadmin delete', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1, 1, 'admin')).rejects.toThrow('只能删除自己创建的知识库');
    });

    it('should throw ForbiddenError for view role attempting delete', async () => {
      const existing = makePrismaKnowledgeBase({ id: 1, createdBy: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        knowledgeBase: { findFirst: mockFindFirst },
      } as any);

      await expect(service.delete(1, 1, 'view')).rejects.toThrow('只能删除自己创建的知识库');
    });
  });

  // ──────────────────────────────────────
  //  getAccessibleBaseIds() additional edge cases
  // ──────────────────────────────────────
  describe('getAccessibleBaseIds additional edge cases', () => {
    it('should verify deletedAt null filter on project findFirst', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: null });
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      await service.getAccessibleBaseIds(1);

      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1, deletedAt: null } });
    });

    it('should return single base id', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: null });
      const mockFindMany = jest.fn().mockResolvedValue([{ id: 42 }]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      const result = await service.getAccessibleBaseIds(1);

      expect(result).toEqual([42]);
      expect(result).toHaveLength(1);
    });

    it('should handle project with companyId = 0 (falsy)', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue({ id: 1, companyId: 0 });
      const mockFindMany = jest.fn().mockResolvedValue([{ id: 1 }]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockFindFirst },
        knowledgeBase: { findMany: mockFindMany },
      } as any);

      await service.getAccessibleBaseIds(1);

      // companyId = 0 is falsy, so company scope should NOT be added
      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { scope: 'platform', status: true },
            { scope: 'project', projectId: 1, status: true },
          ],
        },
        select: { id: true },
      });
    });
  });
});

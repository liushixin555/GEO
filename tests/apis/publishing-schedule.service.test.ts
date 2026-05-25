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
import { ArticleServiceImpl } from '../../apis/service/impl/article.service.impl';
import { NotFoundError, BusinessError, ForbiddenError } from '../../apis/errors';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makeArticle(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    title: '测试文章',
    keywords: 'SEO,优化',
    articleType: 'original',
    platforms: ['新浪'],
    status: 'publishing',
    scheduledPublishAt: new Date('2025-07-01T10:00:00Z'),
    projectId: 10,
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-15'),
    project: {
      id: 10,
      shortName: '项目A',
      company: { shortName: '公司A' },
      operators: [{ userId: 1 }, { userId: 2 }],
    },
    creator: { id: 1, cnName: '张三' },
    ...overrides,
  };
}

function makeUpdatedArticle(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    title: '测试文章',
    keywords: 'SEO,优化',
    articleType: 'original',
    platforms: ['新浪'],
    status: 'publishing',
    scheduledPublishAt: new Date('2025-08-01T10:00:00Z'),
    projectId: 10,
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-20'),
    project: {
      id: 10,
      shortName: '项目A',
      company: { shortName: '公司A' },
    },
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('ArticleServiceImpl', () => {
  let service: ArticleServiceImpl;

  beforeEach(() => {
    service = new ArticleServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated list with default status filter', async () => {
      const articles = [makeArticle({ id: 1 }), makeArticle({ id: 2 })];
      const mockFindMany = jest.fn().mockResolvedValue(articles);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['publishing', 'published', 'publish_failed'] }, deletedAt: null },
          orderBy: { id: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should calculate skip correctly for page 2 with pageSize 5', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 2, pageSize: 5 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should calculate skip correctly for page 3 with pageSize 20', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 3, pageSize: 20 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should filter by search on title and keywords', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, search: '测试' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: [
              { title: { contains: '测试', mode: 'insensitive' } },
              { keywords: { contains: '测试', mode: 'insensitive' } },
            ],
          }),
        }),
      );
    });

    it('should filter by status (override default status filter)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, status: 'published' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' }),
        }),
      );
    });

    it('should filter by projectId', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, projectId: 5 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 5 }),
        }),
      );
    });

    it('should apply admin role permission filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, userId: 42, role: 'admin' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: {
              operators: { some: { userId: 42 } },
              company: { status: true },
              status: true,
            },
          }),
        }),
      );
    });

    it('should apply view role permission filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, userId: 99, role: 'view' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: {
              viewers: { some: { userId: 99 } },
              company: { status: true },
              status: true,
            },
          }),
        }),
      );
    });

    it('should not apply permission filter when role is not admin or view', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, userId: 1, role: 'sysadmin' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('project');
    });

    it('should not apply permission filter when userId is missing', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, role: 'admin' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('project');
    });

    it('should combine search, status, and projectId filters', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({
        page: 1,
        pageSize: 10,
        search: 'SEO',
        status: 'publishing',
        projectId: 5,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.status).toBe('publishing');
      expect(where.projectId).toBe(5);
    });

    it('should not add search filter when search is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should not add projectId filter when projectId is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('projectId');
    });

    it('should map result items correctly', async () => {
      const article = makeArticle({
        id: 5,
        title: '标题',
        keywords: '关键词',
        articleType: 'reprint',
        platforms: ['新浪', '网易'],
        status: 'publishing',
        scheduledPublishAt: new Date('2025-07-01T10:00:00Z'),
        projectId: 10,
        createdBy: 1,
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-15'),
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
        },
        creator: { id: 1, cnName: '张三' },
      });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0]).toEqual({
        id: 5,
        title: '标题',
        keywords: '关键词',
        article_type: 'reprint',
        platforms: ['新浪', '网易'],
        status: 'publishing',
        schedule_type: null,
        scheduled_publish_at: new Date('2025-07-01T10:00:00Z'),
        project_id: 10,
        project_name: '项目A',
        company_name: '公司A',
        created_by: 1,
        created_by_name: '张三',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should handle null scheduledPublishAt in mapping', async () => {
      const article = makeArticle({ scheduledPublishAt: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].scheduled_publish_at).toBeNull();
    });

    it('should handle null createdBy in mapping', async () => {
      const article = makeArticle({ createdBy: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].created_by).toBeNull();
    });

    it('should handle missing project/company/creator gracefully', async () => {
      const article = makeArticle({
        project: null,
        creator: null,
      });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].project_name).toBe('');
      expect(result.list[0].company_name).toBe('');
      expect(result.list[0].created_by_name).toBe('');
    });

    it('should handle project without company', async () => {
      const article = makeArticle({
        project: { id: 10, shortName: '项目A', company: null },
      });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].project_name).toBe('项目A');
      expect(result.list[0].company_name).toBe('');
    });

    it('should return empty list when no articles found', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should run findMany and count in parallel', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });

    it('should pass same where clause to findMany and count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, search: '测试' });

      const findWhere = mockFindMany.mock.calls[0][0].where;
      const countArg = mockCount.mock.calls[0][0];
      // count receives { where: ... }
      expect(countArg.where).toEqual(findWhere);
    });

    it('should include project with company in findMany', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            project: {
              include: {
                company: { select: { shortName: true } },
              },
            },
            creator: { select: { id: true, cnName: true } },
          },
        }),
      );
    });

    it('should apply admin permission with other filters combined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({
        page: 1,
        pageSize: 10,
        search: 'SEO',
        status: 'published',
        projectId: 5,
        userId: 42,
        role: 'admin',
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.status).toBe('published');
      expect(where.projectId).toBe(5);
      expect(where.project).toEqual({
        operators: { some: { userId: 42 } },
        company: { status: true },
        status: true,
      });
    });

    it('should not add search filter when search is empty string', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, search: '' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should keep default status filter when status is empty string', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, status: '' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['publishing', 'published', 'publish_failed'] });
    });

    it('should not add projectId filter when projectId is 0', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({ page: 1, pageSize: 10, projectId: 0 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('projectId');
    });

    it('should apply view role with combined search and projectId', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.listPublishingSchedule({
        page: 1,
        pageSize: 10,
        search: '测试',
        projectId: 5,
        userId: 99,
        role: 'view',
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.OR).toBeDefined();
      expect(where.projectId).toBe(5);
      expect(where.project).toEqual({
        viewers: { some: { userId: 99 } },
        company: { status: true },
        status: true,
      });
    });

    it('should map multiple articles with different statuses correctly', async () => {
      const articles = [
        makeArticle({ id: 1, status: 'publishing', title: '文章1' }),
        makeArticle({ id: 2, status: 'published', title: '文章2' }),
        makeArticle({ id: 3, status: 'publish_failed', title: '文章3' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(articles);
      const mockCount = jest.fn().mockResolvedValue(3);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(3);
      expect(result.list[0].status).toBe('publishing');
      expect(result.list[1].status).toBe('published');
      expect(result.list[2].status).toBe('publish_failed');
    });

    it('should map schedule_type when scheduleType has a value', async () => {
      const article = makeArticle({ scheduleType: 'manual' });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].schedule_type).toBe('manual');
    });

    it('should map null keywords correctly', async () => {
      const article = makeArticle({ keywords: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].keywords).toBeNull();
    });

    it('should map null articleType (article_type) correctly', async () => {
      const article = makeArticle({ articleType: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].article_type).toBeNull();
    });

    it('should map null platforms correctly', async () => {
      const article = makeArticle({ platforms: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].platforms).toBeNull();
    });

    it('should handle creator with empty cnName', async () => {
      const article = makeArticle({ creator: { id: 1, cnName: '' } });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].created_by_name).toBe('');
    });

    it('should handle creator with null cnName', async () => {
      const article = makeArticle({ creator: { id: 1, cnName: null } });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].created_by_name).toBe('');
    });

    it('should map item with all nullable fields set to values', async () => {
      const article = makeArticle({
        keywords: 'SEO,SEM',
        articleType: 'original',
        platforms: ['新浪', '网易', '腾讯'],
        scheduleType: 'auto',
        scheduledPublishAt: new Date('2025-07-15T08:00:00Z'),
        createdBy: 5,
        creator: { id: 5, cnName: '李四' },
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
        },
      });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      const item = result.list[0];
      expect(item.keywords).toBe('SEO,SEM');
      expect(item.article_type).toBe('original');
      expect(item.platforms).toEqual(['新浪', '网易', '腾讯']);
      expect(item.schedule_type).toBe('auto');
      expect(item.scheduled_publish_at).toEqual(new Date('2025-07-15T08:00:00Z'));
      expect(item.created_by).toBe(5);
      expect(item.created_by_name).toBe('李四');
      expect(item.project_name).toBe('项目A');
      expect(item.company_name).toBe('公司A');
    });

    it('should handle project with empty shortName', async () => {
      const article = makeArticle({
        project: { id: 10, shortName: '', company: { shortName: '公司A' } },
      });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });

      expect(result.list[0].project_name).toBe('');
      expect(result.list[0].company_name).toBe('公司A');
    });
  });

  // ──────────────────────────────────────
  //  updateSchedule()
  // ──────────────────────────────────────
  describe('updateSchedule', () => {
    it('should update scheduledPublishAt successfully', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({
        scheduledPublishAt: new Date('2025-08-01T10:00:00Z'),
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
        include: {
          project: {
            include: {
              operators: true,
            },
          },
        },
      });
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { scheduledPublishAt: new Date('2025-08-01T10:00:00Z'), scheduleType: null },
        include: {
          project: {
            include: {
              company: { select: { shortName: true } },
            },
          },
        },
      });
      expect(result.id).toBe(1);
      expect(result.scheduled_publish_at).toEqual(new Date('2025-08-01T10:00:00Z'));
    });

    it('should set scheduledPublishAt to null when null is passed', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduledPublishAt: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, null, null, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { scheduledPublishAt: null, scheduleType: null },
        }),
      );
      expect(result.scheduled_publish_at).toBeNull();
    });

    it('should throw error when article not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(999, '2025-08-01T10:00:00Z', null, 1, 'sysadmin'))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw error when article status is not publishing', async () => {
      const existing = makeArticle({ status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin'))
        .rejects.toThrow(BusinessError);
    });

    it('should throw error when article status is published', async () => {
      const existing = makeArticle({ status: 'published' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin'))
        .rejects.toThrow(BusinessError);
    });

    it('should throw error when article status is publish_failed', async () => {
      const existing = makeArticle({ status: 'publish_failed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin'))
        .rejects.toThrow(BusinessError);
    });

    it('should map updated article correctly', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({
        id: 5,
        title: '更新标题',
        keywords: '新关键词',
        articleType: 'reprint',
        platforms: ['网易'],
        status: 'publishing',
        scheduledPublishAt: new Date('2025-09-01T10:00:00Z'),
        projectId: 20,
        createdAt: new Date('2025-05-01'),
        updatedAt: new Date('2025-07-01'),
        project: {
          id: 20,
          shortName: '项目B',
          company: { shortName: '公司B' },
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(5, '2025-09-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result).toEqual({
        id: 5,
        title: '更新标题',
        keywords: '新关键词',
        article_type: 'reprint',
        platforms: ['网易'],
        status: 'publishing',
        scheduled_publish_at: new Date('2025-09-01T10:00:00Z'),
        schedule_type: null,
        project_id: 20,
        project_name: '项目B',
        company_name: '公司B',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should handle missing project in updated result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ project: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.project_name).toBe('');
      expect(result.company_name).toBe('');
    });

    it('should handle project without company in updated result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({
        project: { id: 10, shortName: '项目A', company: null },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.project_name).toBe('项目A');
      expect(result.company_name).toBe('');
    });

    it('should not call update when article not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(999, '2025-08-01', null, 1, 'sysadmin')).rejects.toThrow();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should not call update when status is not publishing', async () => {
      const existing = makeArticle({ status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01', null, 1, 'sysadmin')).rejects.toThrow();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should allow admin user with access to update', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // userId=2 is in operators list
      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 2, 'admin');
      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject admin user without access (horizontal privilege escalation)', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [{ userId: 1 }],
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // userId=99 is NOT in operators list
      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 99, 'admin'))
        .rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should allow sysadmin to update any article regardless of operators', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [],
        },
      });
      const updated = makeUpdatedArticle();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // sysadmin bypasses operator check
      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 999, 'sysadmin');
      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should treat empty string scheduledPublishAt as null', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduledPublishAt: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.updateSchedule(1, '' as any, null, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { scheduledPublishAt: null, scheduleType: null },
        }),
      );
    });

    it('should reject non-sysadmin when article has null project', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: null,
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 2, 'admin'))
        .rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should reject view role user who is not in operators', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [{ userId: 1 }],
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // view role user not in operators list
      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 99, 'view'))
        .rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should update scheduleType to a non-null value', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduleType: 'auto' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', 'auto', 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduleType: 'auto' }),
        }),
      );
      expect(result.schedule_type).toBe('auto');
    });

    it('should update both scheduledPublishAt and scheduleType simultaneously', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({
        scheduledPublishAt: new Date('2025-09-15T14:00:00Z'),
        scheduleType: 'manual',
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-09-15T14:00:00Z', 'manual', 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: {
            scheduledPublishAt: new Date('2025-09-15T14:00:00Z'),
            scheduleType: 'manual',
          },
        }),
      );
      expect(result.scheduled_publish_at).toEqual(new Date('2025-09-15T14:00:00Z'));
      expect(result.schedule_type).toBe('manual');
    });

    it('should verify NotFoundError has correct message', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      try {
        await service.updateSchedule(999, null, null, 1, 'sysadmin');
        fail('Should have thrown NotFoundError');
      } catch (error) {
        expect(error).toBeInstanceOf(NotFoundError);
        expect((error as any).message).toBe('文章不存在');
        expect((error as any).statusCode).toBe(404);
      }
    });

    it('should verify BusinessError has correct message', async () => {
      const existing = makeArticle({ status: 'published' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      try {
        await service.updateSchedule(1, null, null, 1, 'sysadmin');
        fail('Should have thrown BusinessError');
      } catch (error) {
        expect(error).toBeInstanceOf(BusinessError);
        expect((error as any).message).toBe('当前文章状态不可编辑发布计划');
        expect((error as any).statusCode).toBe(400);
      }
    });

    it('should verify ForbiddenError has correct message', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [{ userId: 1 }],
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      try {
        await service.updateSchedule(1, null, null, 99, 'admin');
        fail('Should have thrown ForbiddenError');
      } catch (error) {
        expect(error).toBeInstanceOf(ForbiddenError);
        expect((error as any).message).toBe('无权操作此文章');
        expect((error as any).statusCode).toBe(403);
      }
    });

    it('should map null keywords in update result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ keywords: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.keywords).toBeNull();
    });

    it('should map null articleType in update result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ articleType: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.article_type).toBeNull();
    });

    it('should map null platforms in update result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ platforms: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.platforms).toBeNull();
    });

    it('should map null scheduleType in update result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduleType: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      expect(result.schedule_type).toBeNull();
    });

    it('should pass empty string scheduleType through (?? does not convert)', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduleType: '' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.updateSchedule(1, '2025-08-01T10:00:00Z', '' as any, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduleType: '' }),
        }),
      );
    });

    it('should convert undefined scheduleType to null in data', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduleType: null });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.updateSchedule(1, '2025-08-01T10:00:00Z', undefined as any, 1, 'sysadmin');

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduleType: null }),
        }),
      );
    });

    it('should verify Date object construction from scheduledPublishAt', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduledPublishAt: new Date('2025-10-01T00:00:00Z') });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.updateSchedule(1, '2025-10-01T00:00:00Z', null, 1, 'sysadmin');

      const data = mockUpdate.mock.calls[0][0].data;
      expect(data.scheduledPublishAt).toBeInstanceOf(Date);
      expect(data.scheduledPublishAt.toISOString()).toBe('2025-10-01T00:00:00.000Z');
    });

    it('should allow admin who is one of multiple operators', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [{ userId: 1 }, { userId: 2 }, { userId: 3 }],
        },
      });
      const updated = makeUpdatedArticle();
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', 'manual', 3, 'admin');

      expect(mockUpdate).toHaveBeenCalled();
      expect(result.id).toBe(1);
    });

    it('should reject admin when operators array is empty', async () => {
      const existing = makeArticle({
        status: 'publishing',
        project: {
          id: 10,
          shortName: '项目A',
          company: { shortName: '公司A' },
          operators: [],
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'admin'))
        .rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should map update result with all nullable fields set to values', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({
        keywords: '新SEO,SEM',
        articleType: 'original',
        platforms: ['新浪', '网易'],
        scheduleType: 'auto',
        scheduledPublishAt: new Date('2025-12-01T10:00:00Z'),
        project: {
          id: 20,
          shortName: '项目B',
          company: { shortName: '公司B' },
        },
      });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-12-01T10:00:00Z', 'auto', 1, 'sysadmin');

      expect(result.keywords).toBe('新SEO,SEM');
      expect(result.article_type).toBe('original');
      expect(result.platforms).toEqual(['新浪', '网易']);
      expect(result.schedule_type).toBe('auto');
      expect(result.scheduled_publish_at).toEqual(new Date('2025-12-01T10:00:00Z'));
      expect(result.project_name).toBe('项目B');
      expect(result.company_name).toBe('公司B');
    });

    it('should throw BusinessError for draft status', async () => {
      const existing = makeArticle({ status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, null, null, 1, 'sysadmin'))
        .rejects.toThrow('当前文章状态不可编辑发布计划');
    });

    it('should handle article with undefined scheduleType in update result', async () => {
      const existing = makeArticle({ status: 'publishing' });
      const updated = makeUpdatedArticle({ scheduleType: undefined });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');

      // scheduleType ?? null → undefined ?? null = null
      expect(result.schedule_type).toBeNull();
    });
  });

  // ══════════════════════════════════════════
  //  第3轮：接口契约合规性验证
  // ══════════════════════════════════════════
  describe('第3轮：接口契约合规性验证', () => {
    // ── 接口方法签名验证 ──
    describe('接口方法签名', () => {
      it('should implement IPublishingScheduleService interface (listPublishingSchedule method)', () => {
        expect(typeof service.listPublishingSchedule).toBe('function');
        expect(service.listPublishingSchedule.length).toBe(1); // single params arg
      });

      it('should implement IPublishingScheduleService interface (updateSchedule method)', () => {
        expect(typeof service.updateSchedule).toBe('function');
        expect(service.updateSchedule.length).toBe(5); // id, scheduledPublishAt, scheduleType, userId, role
      });

      it('should have list return a Promise', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = service.listPublishingSchedule({ page: 1, pageSize: 10 });
        expect(result).toBeInstanceOf(Promise);
        await result;
      });

      it('should have updateSchedule return a Promise', async () => {
        const mockFindFirst = jest.fn().mockResolvedValue(makeArticle({ status: 'publishing' }));
        const mockUpdate = jest.fn().mockResolvedValue(makeUpdatedArticle());
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const result = service.updateSchedule(1, null, null, 1, 'sysadmin');
        expect(result).toBeInstanceOf(Promise);
        await result;
      });

      it('should accept minimal list params (only page + pageSize)', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        expect(result).toEqual({ list: [], total: 0 });
      });

      it('should accept full list params', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([makeArticle()]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({
          page: 1,
          pageSize: 10,
          search: 'test',
          status: 'publishing',
          projectId: 5,
          userId: 1,
          role: 'admin',
        });
        expect(result.list).toHaveLength(1);
        expect(result.total).toBe(1);
      });

      it('should accept updateSchedule with all-nullable fields as null', async () => {
        const existing = makeArticle({ status: 'publishing' });
        const updated = makeUpdatedArticle({ scheduledPublishAt: null, scheduleType: null });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue(updated);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const result = await service.updateSchedule(1, null, null, 1, 'sysadmin');
        expect(result.scheduled_publish_at).toBeNull();
        expect(result.schedule_type).toBeNull();
      });

      it('should list return object with list array and total number', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([makeArticle()]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        expect(Array.isArray(result.list)).toBe(true);
        expect(typeof result.total).toBe('number');
      });

      it('should updateSchedule return all PublishingScheduleUpdateResult fields', async () => {
        const existing = makeArticle({ status: 'publishing' });
        const updated = makeUpdatedArticle();
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue(updated);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', null, 1, 'sysadmin');
        const expectedKeys = [
          'id', 'title', 'keywords', 'article_type', 'platforms', 'status',
          'scheduled_publish_at', 'schedule_type', 'project_id', 'project_name',
          'company_name', 'created_at', 'updated_at',
        ];
        expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
      });
    });

    // ── Prisma异常传播 ──
    describe('Prisma异常传播', () => {
      it('should propagate Prisma error from findMany in list', async () => {
        const mockFindMany = jest.fn().mockRejectedValue(new Error('Connection refused'));
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await expect(service.listPublishingSchedule({ page: 1, pageSize: 10 }))
          .rejects.toThrow('Connection refused');
      });

      it('should propagate Prisma error from count in list', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockRejectedValue(new Error('Count timeout'));
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await expect(service.listPublishingSchedule({ page: 1, pageSize: 10 }))
          .rejects.toThrow('Count timeout');
      });

      it('should propagate Prisma error from findFirst in updateSchedule', async () => {
        const mockFindFirst = jest.fn().mockRejectedValue(new Error('PG connection lost'));
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        await expect(service.updateSchedule(1, null, null, 1, 'sysadmin'))
          .rejects.toThrow('PG connection lost');
      });

      it('should propagate Prisma error from update in updateSchedule', async () => {
        const existing = makeArticle({ status: 'publishing' });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockRejectedValue(new Error('Update deadlock'));
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        await expect(service.updateSchedule(1, '2025-08-01', null, 1, 'sysadmin'))
          .rejects.toThrow('Update deadlock');
      });

      it('should propagate P2025 Prisma error (record not found) from update', async () => {
        const existing = makeArticle({ status: 'publishing' });
        const prismaErr: any = new Error('Record not found');
        prismaErr.code = 'P2025';
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockRejectedValue(prismaErr);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        await expect(service.updateSchedule(1, '2025-08-01', null, 1, 'sysadmin'))
          .rejects.toThrow('Record not found');
      });

      it('should propagate generic Error (not AppError) from Prisma without wrapping', async () => {
        const mockFindMany = jest.fn().mockRejectedValue(new Error('Raw PG error'));
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        try {
          await service.listPublishingSchedule({ page: 1, pageSize: 10 });
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error).not.toBeInstanceOf(NotFoundError);
          expect(error).not.toBeInstanceOf(BusinessError);
          expect((error as Error).message).toBe('Raw PG error');
        }
      });
    });

    // ── 数据完整性边界 ──
    describe('数据完整性边界', () => {
      it('should handle very large page number with zero results', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(5);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 99999, pageSize: 10 });
        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 999980, take: 10 }),
        );
        expect(result.list).toHaveLength(0);
        expect(result.total).toBe(5);
      });

      it('should handle pageSize=1 (minimum meaningful pagination)', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([makeArticle()]);
        const mockCount = jest.fn().mockResolvedValue(100);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 1 });
        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ skip: 0, take: 1 }),
        );
        expect(result.list).toHaveLength(1);
      });

      it('should handle special characters in search', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10, search: "'; DROP TABLE articles;--" });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: "'; DROP TABLE articles;--", mode: 'insensitive' } },
                { keywords: { contains: "'; DROP TABLE articles;--", mode: 'insensitive' } },
              ],
            }),
          }),
        );
      });

      it('should handle unicode/CJK search query', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10, search: '薄云商机倍增服务🎉' });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: '薄云商机倍增服务🎉', mode: 'insensitive' } },
                { keywords: { contains: '薄云商机倍增服务🎉', mode: 'insensitive' } },
              ],
            }),
          }),
        );
      });

      it('should handle very long search string', async () => {
        const longSearch = 'a'.repeat(1000);
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10, search: longSearch });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({
            where: expect.objectContaining({
              OR: [
                { title: { contains: longSearch, mode: 'insensitive' } },
                { keywords: { contains: longSearch, mode: 'insensitive' } },
              ],
            }),
          }),
        );
      });

      it('should handle negative id in updateSchedule', async () => {
        const mockFindFirst = jest.fn().mockResolvedValue(null);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        await expect(service.updateSchedule(-1, null, null, 1, 'sysadmin'))
          .rejects.toThrow(NotFoundError);
        expect(mockFindFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: -1, deletedAt: null } }),
        );
      });

      it('should handle zero id in updateSchedule', async () => {
        const mockFindFirst = jest.fn().mockResolvedValue(null);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        await expect(service.updateSchedule(0, null, null, 1, 'sysadmin'))
          .rejects.toThrow(NotFoundError);
        expect(mockFindFirst).toHaveBeenCalledWith(
          expect.objectContaining({ where: { id: 0, deletedAt: null } }),
        );
      });

      it('should handle very large article dataset in list mapping', async () => {
        const articles = Array.from({ length: 100 }, (_, i) =>
          makeArticle({ id: i + 1, title: `文章${i + 1}` }),
        );
        const mockFindMany = jest.fn().mockResolvedValue(articles);
        const mockCount = jest.fn().mockResolvedValue(100);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 100 });
        expect(result.list).toHaveLength(100);
        expect(result.total).toBe(100);
        expect(result.list[0].id).toBe(1);
        expect(result.list[99].id).toBe(100);
      });
    });

    // ── 错误继承层次 ──
    describe('错误继承层次', () => {
      it('should verify NotFoundError extends AppError via Error', async () => {
        const mockFindFirst = jest.fn().mockResolvedValue(null);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(999, null, null, 1, 'sysadmin');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(NotFoundError);
          expect((error as any).name).toBe('NotFoundError');
        }
      });

      it('should verify BusinessError extends AppError via Error', async () => {
        const existing = makeArticle({ status: 'draft' });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(1, null, null, 1, 'sysadmin');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(BusinessError);
          expect((error as any).name).toBe('BusinessError');
        }
      });

      it('should verify ForbiddenError extends AppError via Error', async () => {
        const existing = makeArticle({
          status: 'publishing',
          project: {
            id: 10,
            shortName: '项目A',
            company: { shortName: '公司A' },
            operators: [{ userId: 1 }],
          },
        });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(1, null, null, 99, 'admin');
          fail('Should have thrown');
        } catch (error) {
          expect(error).toBeInstanceOf(Error);
          expect(error).toBeInstanceOf(ForbiddenError);
          expect((error as any).name).toBe('ForbiddenError');
        }
      });

      it('should verify NotFoundError has statusCode 404', async () => {
        const mockFindFirst = jest.fn().mockResolvedValue(null);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(999, null, null, 1, 'sysadmin');
          fail('Should have thrown');
        } catch (error) {
          expect((error as any).statusCode).toBe(404);
        }
      });

      it('should verify BusinessError has statusCode 400', async () => {
        const existing = makeArticle({ status: 'published' });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(1, null, null, 1, 'sysadmin');
          fail('Should have thrown');
        } catch (error) {
          expect((error as any).statusCode).toBe(400);
        }
      });

      it('should verify ForbiddenError has statusCode 403', async () => {
        const existing = makeArticle({
          status: 'publishing',
          project: {
            id: 10,
            shortName: '项目A',
            company: { shortName: '公司A' },
            operators: [],
          },
        });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst },
        } as any);

        try {
          await service.updateSchedule(1, null, null, 5, 'admin');
          fail('Should have thrown');
        } catch (error) {
          expect((error as any).statusCode).toBe(403);
        }
      });

      it('should verify error types are distinct (not interchangeable)', () => {
        const notFound = new NotFoundError('文章');
        const business = new BusinessError('业务错误');
        const forbidden = new ForbiddenError('权限不足');

        expect(notFound).not.toBeInstanceOf(BusinessError);
        expect(notFound).not.toBeInstanceOf(ForbiddenError);
        expect(business).not.toBeInstanceOf(NotFoundError);
        expect(business).not.toBeInstanceOf(ForbiddenError);
        expect(forbidden).not.toBeInstanceOf(NotFoundError);
        expect(forbidden).not.toBeInstanceOf(BusinessError);
      });

      it('should verify error messages are distinct for different error types', () => {
        const notFound = new NotFoundError('文章');
        const business = new BusinessError('自定义业务消息');
        const forbidden = new ForbiddenError('自定义权限消息');

        expect(notFound.message).toBe('文章不存在');
        expect(business.message).toBe('自定义业务消息');
        expect(forbidden.message).toBe('自定义权限消息');
      });
    });

    // ── 返回值结构一致性 ──
    describe('返回值结构一致性', () => {
      it('should return list items with all PublishingScheduleItem keys', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([makeArticle()]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        const item = result.list[0];
        const expectedKeys = [
          'id', 'title', 'keywords', 'article_type', 'platforms', 'status',
          'scheduled_publish_at', 'schedule_type', 'project_id', 'project_name',
          'company_name', 'created_by', 'created_by_name', 'created_at', 'updated_at',
        ];
        expect(Object.keys(item).sort()).toEqual(expectedKeys.sort());
      });

      it('should return correct types for all PublishingScheduleItem fields', async () => {
        const article = makeArticle({
          keywords: 'SEO',
          articleType: 'original',
          platforms: ['新浪'],
          scheduledPublishAt: new Date('2025-07-01'),
          scheduleType: 'auto',
          createdBy: 1,
        });
        const mockFindMany = jest.fn().mockResolvedValue([article]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        const item = result.list[0];

        expect(typeof item.id).toBe('number');
        expect(typeof item.title).toBe('string');
        expect(typeof item.keywords).toBe('string');
        expect(typeof item.article_type).toBe('string');
        expect(Array.isArray(item.platforms)).toBe(true);
        expect(typeof item.status).toBe('string');
        expect(item.scheduled_publish_at).toBeInstanceOf(Date);
        expect(typeof item.schedule_type).toBe('string');
        expect(typeof item.project_id).toBe('number');
        expect(typeof item.project_name).toBe('string');
        expect(typeof item.company_name).toBe('string');
        expect(typeof item.created_by).toBe('number');
        expect(typeof item.created_by_name).toBe('string');
        expect(item.created_at).toBeInstanceOf(Date);
        expect(item.updated_at).toBeInstanceOf(Date);
      });

      it('should return correct types for all nullable PublishingScheduleItem fields', async () => {
        const article = makeArticle({
          keywords: null,
          articleType: null,
          platforms: null,
          scheduledPublishAt: null,
          scheduleType: null,
          createdBy: null,
        });
        const mockFindMany = jest.fn().mockResolvedValue([article]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        const item = result.list[0];

        expect(item.keywords).toBeNull();
        expect(item.article_type).toBeNull();
        expect(item.platforms).toBeNull();
        expect(item.scheduled_publish_at).toBeNull();
        expect(item.schedule_type).toBeNull();
        expect(item.created_by).toBeNull();
        // Non-nullable fields still have values
        expect(typeof item.id).toBe('number');
        expect(typeof item.title).toBe('string');
        expect(typeof item.status).toBe('string');
        expect(typeof item.project_name).toBe('string');
        expect(typeof item.company_name).toBe('string');
        expect(typeof item.created_by_name).toBe('string');
      });

      it('should return update result with correct types', async () => {
        const existing = makeArticle({ status: 'publishing' });
        const updated = makeUpdatedArticle({
          keywords: 'SEO',
          articleType: 'original',
          platforms: ['新浪'],
          scheduledPublishAt: new Date('2025-09-01'),
          scheduleType: 'auto',
        });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue(updated);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const result = await service.updateSchedule(1, '2025-09-01', 'auto', 1, 'sysadmin');

        expect(typeof result.id).toBe('number');
        expect(typeof result.title).toBe('string');
        expect(typeof result.keywords).toBe('string');
        expect(typeof result.article_type).toBe('string');
        expect(Array.isArray(result.platforms)).toBe(true);
        expect(typeof result.status).toBe('string');
        expect(result.scheduled_publish_at).toBeInstanceOf(Date);
        expect(typeof result.schedule_type).toBe('string');
        expect(typeof result.project_id).toBe('number');
        expect(typeof result.project_name).toBe('string');
        expect(typeof result.company_name).toBe('string');
        expect(result.created_at).toBeInstanceOf(Date);
        expect(result.updated_at).toBeInstanceOf(Date);
      });
    });

    // ── 实例独立性 ──
    describe('实例独立性', () => {
      it('should produce independent service instances', () => {
        const service1 = new ArticleServiceImpl();
        const service2 = new ArticleServiceImpl();

        expect(service1).not.toBe(service2);
        expect(service1).toBeInstanceOf(ArticleServiceImpl);
        expect(service2).toBeInstanceOf(ArticleServiceImpl);
      });

      it('should not share state between instances', async () => {
        const service1 = new ArticleServiceImpl();
        const service2 = new ArticleServiceImpl();

        const mockFindMany1 = jest.fn().mockResolvedValue([makeArticle({ id: 1 })]);
        const mockCount1 = jest.fn().mockResolvedValue(1);
        const mockFindMany2 = jest.fn().mockResolvedValue([makeArticle({ id: 2 })]);
        const mockCount2 = jest.fn().mockResolvedValue(1);

        mockedGetPrisma.mockReturnValueOnce({
          article: { findMany: mockFindMany1, count: mockCount1 },
        } as any);
        mockedGetPrisma.mockReturnValueOnce({
          article: { findMany: mockFindMany2, count: mockCount2 },
        } as any);

        const result1 = await service1.list({ page: 1, pageSize: 10 });
        const result2 = await service2.list({ page: 1, pageSize: 10 });

        expect(result1.list[0].id).toBe(1);
        expect(result2.list[0].id).toBe(2);
        expect(mockFindMany1).toHaveBeenCalledTimes(1);
        expect(mockFindMany2).toHaveBeenCalledTimes(1);
      });
    });

    // ── Upsert字段映射一致性 ──
    describe('Upsert字段映射一致性', () => {
      it('should map same fields consistently between list and updateSchedule', async () => {
        const article = makeArticle({
          id: 42,
          title: '一致性验证',
          keywords: '映射,测试',
          articleType: 'original',
          platforms: ['新浪', '网易'],
          status: 'publishing',
          scheduledPublishAt: new Date('2025-07-01T10:00:00Z'),
          scheduleType: 'auto',
          projectId: 10,
          createdBy: 1,
          createdAt: new Date('2025-06-01'),
          updatedAt: new Date('2025-06-15'),
          project: {
            id: 10,
            shortName: '项目A',
            company: { shortName: '公司A' },
          },
          creator: { id: 1, cnName: '张三' },
        });

        // list 映射
        const mockFindMany = jest.fn().mockResolvedValue([article]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const listResult = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        const listItem = listResult.list[0];

        // updateSchedule 映射
        const existing = makeArticle({ status: 'publishing' });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue({
          ...article,
          operators: undefined,
          creator: undefined,
        });
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const updateResult = await service.updateSchedule(42, '2025-07-01T10:00:00Z', 'auto', 1, 'sysadmin');

        // 共享字段应完全一致
        expect(listItem.id).toBe(updateResult.id);
        expect(listItem.title).toBe(updateResult.title);
        expect(listItem.keywords).toBe(updateResult.keywords);
        expect(listItem.article_type).toBe(updateResult.article_type);
        expect(listItem.platforms).toEqual(updateResult.platforms);
        expect(listItem.status).toBe(updateResult.status);
        expect(listItem.project_id).toBe(updateResult.project_id);
        expect(listItem.project_name).toBe(updateResult.project_name);
        expect(listItem.company_name).toBe(updateResult.company_name);
      });

      it('should map null fields consistently between list and updateSchedule', async () => {
        const articleWithNulls = makeArticle({
          keywords: null,
          articleType: null,
          platforms: null,
          scheduledPublishAt: null,
          scheduleType: null,
          project: { id: 10, shortName: '项目A', company: null },
        });

        // list 映射
        const mockFindMany = jest.fn().mockResolvedValue([articleWithNulls]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        const listResult = await service.listPublishingSchedule({ page: 1, pageSize: 10 });
        const listItem = listResult.list[0];

        // updateSchedule 映射
        const existing = makeArticle({ status: 'publishing' });
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue({
          ...articleWithNulls,
          operators: undefined,
          creator: undefined,
        });
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const updateResult = await service.updateSchedule(1, null, null, 1, 'sysadmin');

        // null字段应一致映射
        expect(listItem.keywords).toBeNull();
        expect(updateResult.keywords).toBeNull();
        expect(listItem.article_type).toBeNull();
        expect(updateResult.article_type).toBeNull();
        expect(listItem.platforms).toBeNull();
        expect(updateResult.platforms).toBeNull();
        expect(listItem.scheduled_publish_at).toBeNull();
        expect(updateResult.scheduled_publish_at).toBeNull();
        expect(listItem.schedule_type).toBeNull();
        expect(updateResult.schedule_type).toBeNull();
      });
    });

    // ── 排序字段映射 ──
    describe('排序字段映射', () => {
      it('should always order list by id descending', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10 });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ orderBy: { id: 'desc' } }),
        );
      });

      it('should maintain consistent ordering with search filter', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10, search: 'test' });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ orderBy: { id: 'desc' } }),
        );
      });

      it('should maintain consistent ordering with permission filter', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 1, pageSize: 10, userId: 1, role: 'admin' });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ orderBy: { id: 'desc' } }),
        );
      });

      it('should maintain consistent ordering on all pages', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          article: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.listPublishingSchedule({ page: 5, pageSize: 20 });

        expect(mockFindMany).toHaveBeenCalledWith(
          expect.objectContaining({ orderBy: { id: 'desc' } }),
        );
      });
    });
  });
});

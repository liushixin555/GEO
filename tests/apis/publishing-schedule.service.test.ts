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
import { PublishingScheduleServiceImpl } from '../../apis/service/impl/publishing-schedule.service.impl';
import { NotFoundError, BusinessError, ForbiddenError } from '../../apis/errors';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makeSchedule(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    articleId: 10,
    platforms: ['新浪'],
    scheduleType: 'asap',
    scheduledPublishAt: null,
    status: 'pending',
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-15'),
    deletedAt: null,
    ...overrides,
  };
}

function makeScheduleWithArticle(overrides: Record<string, any> = {}) {
  return {
    ...makeSchedule(overrides),
    article: {
      id: 10,
      title: '测试文章',
      keywords: 'SEO,优化',
      articleType: 'original',
      projectId: 100,
      project: {
        id: 100,
        shortName: '项目A',
        company: { shortName: '公司A' },
        operators: [{ userId: 1 }, { userId: 2 }],
      },
    },
    creator: { id: 1, cnName: '张三' },
    ...overrides,
  };
}

function makeArticle(overrides: Record<string, any> = {}) {
  return {
    id: 10,
    title: '测试文章',
    keywords: 'SEO,优化',
    articleType: 'original',
    status: 'approved',
    projectId: 100,
    createdBy: 1,
    createdAt: new Date('2025-06-01'),
    updatedAt: new Date('2025-06-15'),
    deletedAt: null,
    ...overrides,
  };
}

function makeTransaction(mockFn: jest.Mock) {
  return async (callback: any) => callback({
    publishingSchedule: {
      findFirst: mockFn,
      update: mockFn,
    },
  });
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('PublishingScheduleServiceImpl', () => {
  let service: PublishingScheduleServiceImpl;

  beforeEach(() => {
    service = new PublishingScheduleServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated list with default filters', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({ id: 1 });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { deletedAt: null },
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
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 2, pageSize: 5 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should calculate skip correctly for page 3 with pageSize 20', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 3, pageSize: 20 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should filter by search on article title and keywords', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: '测试' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({
              OR: [
                { title: { contains: '测试', mode: 'insensitive' } },
                { keywords: { contains: '测试', mode: 'insensitive' } },
              ],
            }),
          }),
        }),
      );
    });

    it('should filter by status', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, status: 'published' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'published' }),
        }),
      );
    });

    it('should filter by projectId via article relation', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, projectId: 5 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({ projectId: 5 }),
          }),
        }),
      );
    });

    it('should apply admin role permission filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, userId: 42, role: 'admin' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({
              project: {
                operators: { some: { userId: 42 } },
                company: { status: true },
                status: true,
              },
            }),
          }),
        }),
      );
    });

    it('should apply view role permission filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, userId: 99, role: 'view' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({
              project: {
                viewers: { some: { userId: 99 } },
                company: { status: true },
                status: true,
              },
            }),
          }),
        }),
      );
    });

    it('should not apply permission filter when role is sysadmin', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, userId: 1, role: 'sysadmin' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('project');
    });

    it('should combine search, status, and projectId filters', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        search: 'SEO',
        status: 'pending',
        projectId: 5,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.article.OR).toBeDefined();
      expect(where.status).toBe('pending');
      expect(where.article.projectId).toBe(5);
    });

    it('should not add search filter when search is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
      expect(where.article).toBeUndefined();
    });

    it('should not add projectId filter when projectId is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('projectId');
    });

    it('should map result items correctly', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({
        id: 5,
        platforms: ['新浪', '网易'],
        scheduleType: 'scheduled',
        scheduledPublishAt: new Date('2025-07-01T10:00:00Z'),
        status: 'pending',
        createdBy: 1,
        createdAt: new Date('2025-06-01'),
        updatedAt: new Date('2025-06-15'),
      });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0]).toEqual({
        id: 5,
        article_id: 10,
        title: '测试文章',
        keywords: 'SEO,优化',
        article_type: 'original',
        platforms: ['新浪', '网易'],
        status: 'pending',
        schedule_type: 'scheduled',
        scheduled_publish_at: new Date('2025-07-01T10:00:00Z'),
        project_id: 100,
        project_name: '项目A',
        company_name: '公司A',
        created_by: 1,
        created_by_name: '张三',
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should handle null scheduledPublishAt in mapping', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({ scheduledPublishAt: null });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].scheduled_publish_at).toBeNull();
    });

    it('should handle null createdBy in mapping', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({ createdBy: null });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].created_by).toBeNull();
    });

    it('should handle missing article/project/creator gracefully', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({
        article: null,
        creator: null,
      });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].title).toBe('');
      expect(result.list[0].project_name).toBe('');
      expect(result.list[0].company_name).toBe('');
      expect(result.list[0].created_by_name).toBe('');
    });

    it('should handle project without company', async () => {
      const scheduleWithArticle = makeScheduleWithArticle({
        article: {
          id: 10, title: '测试文章', keywords: null, articleType: null, projectId: 100,
          project: { id: 100, shortName: '项目A', company: null },
        },
      });
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].project_name).toBe('项目A');
      expect(result.list[0].company_name).toBe('');
    });

    it('should return empty list when no schedules found', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should run findMany and count in parallel', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });

    it('should pass same where clause to findMany and count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: '测试' });

      const findWhere = mockFindMany.mock.calls[0][0].where;
      const countArg = mockCount.mock.calls[0][0];
      expect(countArg.where).toEqual(findWhere);
    });

    it('should include article with project+company and creator in findMany', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          include: {
            article: {
              include: {
                project: {
                  include: { company: { select: { shortName: true } } },
                },
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
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        search: 'SEO',
        status: 'published',
        projectId: 5,
        userId: 42,
        role: 'admin',
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.article.OR).toBeDefined();
      expect(where.status).toBe('published');
      expect(where.article.projectId).toBe(5);
      expect(where.article.project).toEqual({
        operators: { some: { userId: 42 } },
        company: { status: true },
        status: true,
      });
    });

    it('should not add search filter when search is empty string', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: '' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should apply view role with combined search and projectId', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        search: '测试',
        projectId: 5,
        userId: 99,
        role: 'view',
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.article.OR).toBeDefined();
      expect(where.article.projectId).toBe(5);
      expect(where.article.project).toEqual({
        viewers: { some: { userId: 99 } },
        company: { status: true },
        status: true,
      });
    });

    it('should handle very large page number with zero results', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(5);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 99999, pageSize: 10 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 999980, take: 10 }),
      );
      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(5);
    });

    it('should handle pageSize=1 (minimum meaningful pagination)', async () => {
      const scheduleWithArticle = makeScheduleWithArticle();
      const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
      const mockCount = jest.fn().mockResolvedValue(100);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 1 });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
      expect(result.list).toHaveLength(1);
    });

    it('should handle special characters in search', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: "'; DROP TABLE publishing_schedules;--" });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({
              OR: [
                { title: { contains: "'; DROP TABLE publishing_schedules;--", mode: 'insensitive' } },
                { keywords: { contains: "'; DROP TABLE publishing_schedules;--", mode: 'insensitive' } },
              ],
            }),
          }),
        }),
      );
    });

    it('should handle unicode/CJK search query', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: '薄云商机倍增服务' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            article: expect.objectContaining({
              OR: [
                { title: { contains: '薄云商机倍增服务', mode: 'insensitive' } },
                { keywords: { contains: '薄云商机倍增服务', mode: 'insensitive' } },
              ],
            }),
          }),
        }),
      );
    });

    it('should always order list by id descending', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('should propagate Prisma error from findMany', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('Connection refused'));
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list({ page: 1, pageSize: 10 }))
        .rejects.toThrow('Connection refused');
    });

    it('should propagate Prisma error from count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockRejectedValue(new Error('Count timeout'));
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list({ page: 1, pageSize: 10 }))
        .rejects.toThrow('Count timeout');
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('should create a publishing schedule for an approved article', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 1 });
      const createdSchedule = makeSchedule({ id: 1, status: 'pending' });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      const result = await service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(result.status).toBe('pending');
      expect(mockScheduleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            articleId: 10,
            scheduleType: 'asap',
            status: 'pending',
            createdBy: 1,
          }),
        }),
      );
    });

    it('should create with scheduled_publish_at', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 1 });
      const createdSchedule = makeSchedule({ scheduleType: 'scheduled', scheduledPublishAt: new Date('2025-07-01T10:00:00Z') });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      await service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'scheduled', scheduled_publish_at: '2025-07-01T10:00:00Z' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(mockScheduleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledPublishAt: new Date('2025-07-01T10:00:00Z'),
          }),
        }),
      );
    });

    it('should throw NotFoundError when article does not exist', async () => {
      const mockArticleFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
      } as any);

      await expect(service.create(
        { article_id: 999, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessError when article is not approved', async () => {
      const article = makeArticle({ status: 'draft' });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
      } as any);

      await expect(service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow(BusinessError);
    });

    it('should throw ForbiddenError when non-sysadmin tries to create for another user article', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 99 });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
      } as any);

      await expect(service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'admin' },
      )).rejects.toThrow(ForbiddenError);
    });

    it('should allow sysadmin to create schedule for any user article', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 99 });
      const createdSchedule = makeSchedule();
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      const result = await service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(result).toBeDefined();
      expect(mockScheduleCreate).toHaveBeenCalled();
    });

    it('should allow article creator to create schedule', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 2 });
      const createdSchedule = makeSchedule();
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      const result = await service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 2, role: 'admin' },
      );

      expect(result).toBeDefined();
      expect(mockScheduleCreate).toHaveBeenCalled();
    });

    it('should handle null scheduled_publish_at', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 1 });
      const createdSchedule = makeSchedule({ scheduledPublishAt: null });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      await service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(mockScheduleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            scheduledPublishAt: null,
          }),
        }),
      );
    });

    it('should propagate Prisma error from article findFirst', async () => {
      const mockArticleFindFirst = jest.fn().mockRejectedValue(new Error('Connection lost'));
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
      } as any);

      await expect(service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow('Connection lost');
    });

    it('should propagate Prisma error from schedule create', async () => {
      const article = makeArticle({ status: 'approved', createdBy: 1 });
      const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
      const mockScheduleCreate = jest.fn().mockRejectedValue(new Error('Create failed'));
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockArticleFindFirst },
        publishingSchedule: { create: mockScheduleCreate },
      } as any);

      await expect(service.create(
        { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow('Create failed');
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    const existingWithArticle = {
      ...makeSchedule({ status: 'pending' }),
      article: {
        id: 10,
        projectId: 100,
        project: {
          id: 100,
          operators: [{ userId: 1 }, { userId: 2 }],
        },
      },
    };

    const updatedWithArticle = {
      ...makeSchedule({ scheduleType: 'scheduled', scheduledPublishAt: new Date('2025-08-01T10:00:00Z') }),
      article: {
        id: 10,
        title: '测试文章',
        keywords: 'SEO,优化',
        articleType: 'original',
        projectId: 100,
        project: {
          id: 100,
          shortName: '项目A',
          company: { shortName: '公司A' },
        },
      },
    };

    it('should update schedule_type and scheduled_publish_at successfully', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(
        1,
        { schedule_type: 'scheduled', scheduled_publish_at: '2025-08-01T10:00:00Z' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(result.schedule_type).toBe('scheduled');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({
            scheduleType: 'scheduled',
            scheduledPublishAt: new Date('2025-08-01T10:00:00Z'),
          }),
        }),
      );
    });

    it('should update status field', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...updatedWithArticle,
        status: 'publishing',
      });
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(
        1,
        { status: 'publishing' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(result.status).toBe('publishing');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'publishing' }),
        }),
      );
    });

    it('should throw NotFoundError when schedule does not exist', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(
        999,
        { schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow(NotFoundError);
    });

    it('should throw ForbiddenError when admin without access tries to update', async () => {
      const existing = {
        ...makeSchedule(),
        article: {
          id: 10,
          projectId: 100,
          project: { id: 100, operators: [{ userId: 1 }] },
        },
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 99, role: 'admin' },
      )).rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should allow sysadmin to update any schedule', async () => {
      const existing = {
        ...makeSchedule(),
        article: {
          id: 10,
          projectId: 100,
          project: { id: 100, operators: [] },
        },
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(
        1,
        { schedule_type: 'scheduled', scheduled_publish_at: '2025-08-01T10:00:00Z' },
        { userId: 999, role: 'sysadmin' },
      );

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should set schedule_type to null when null is passed', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(
        1,
        { schedule_type: null },
        { userId: 1, role: 'sysadmin' },
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduleType: null }),
        }),
      );
    });

    it('should set scheduled_publish_at to null when null is passed', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(
        1,
        { scheduled_publish_at: null },
        { userId: 1, role: 'sysadmin' },
      );

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ scheduledPublishAt: null }),
        }),
      );
    });

    it('should not update fields that are undefined', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      );

      const data = mockUpdate.mock.calls[0][0].data;
      expect(data).toHaveProperty('scheduleType', 'asap');
      // scheduled_publish_at and status should not be in data since they are undefined
      expect(data).not.toHaveProperty('scheduledPublishAt');
      expect(data).not.toHaveProperty('status');
    });

    it('should handle missing project/company in updated result', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const updatedNoProject = {
        ...makeSchedule(),
        article: null,
      };
      const mockUpdate = jest.fn().mockResolvedValue(updatedNoProject);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      );

      expect(result.title).toBe('');
      expect(result.project_name).toBe('');
      expect(result.company_name).toBe('');
    });

    it('should allow admin who is in operators list', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockResolvedValue(updatedWithArticle);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      // userId=2 is in operators list
      const result = await service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 2, role: 'admin' },
      );

      expect(result).toBeDefined();
      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should reject admin when operators array is empty', async () => {
      const existing = {
        ...makeSchedule(),
        article: {
          id: 10,
          projectId: 100,
          project: { id: 100, operators: [] },
        },
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 1, role: 'admin' },
      )).rejects.toThrow(ForbiddenError);
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should propagate Prisma error from update', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(existingWithArticle);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('Update deadlock'));
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.update(
        1,
        { schedule_type: 'asap' },
        { userId: 1, role: 'sysadmin' },
      )).rejects.toThrow('Update deadlock');
    });
  });

  // ──────────────────────────────────────
  //  reject()
  // ──────────────────────────────────────
  describe('reject', () => {
    it('should reject a pending schedule', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 2 });
      const rejected = makeSchedule({ status: 'publish_failed' });

      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(rejected);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      const result = await service.reject(1, { userId: 1, role: 'sysadmin' });

      expect(result.status).toBe('publish_failed');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: 'publish_failed' },
        }),
      );
    });

    it('should reject a publishing schedule', async () => {
      const existing = makeSchedule({ status: 'publishing', createdBy: 2 });
      const rejected = makeSchedule({ status: 'publish_failed' });

      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(rejected);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      const result = await service.reject(1, { userId: 1, role: 'sysadmin' });

      expect(result.status).toBe('publish_failed');
    });

    it('should throw NotFoundError when schedule does not exist', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.reject(999, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessError when status is published', async () => {
      const existing = makeSchedule({ status: 'published', createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.reject(1, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(BusinessError);
    });

    it('should throw BusinessError when status is publish_failed', async () => {
      const existing = makeSchedule({ status: 'publish_failed', createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.reject(1, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(BusinessError);
    });

    it('should throw ForbiddenError when creator tries to reject own schedule', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.reject(1, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(ForbiddenError);
    });

    it('should use transaction for reject', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 2 });
      const rejected = makeSchedule({ status: 'publish_failed' });

      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(rejected);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.reject(1, { userId: 1, role: 'sysadmin' });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────
  describe('delete', () => {
    it('should soft-delete a pending schedule (set deletedAt)', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 1 });

      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.delete(1, { userId: 1, role: 'sysadmin' });

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        }),
      );
    });

    it('should soft-delete a publish_failed schedule', async () => {
      const existing = makeSchedule({ status: 'publish_failed', createdBy: 1 });

      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.delete(1, { userId: 1, role: 'sysadmin' });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should throw NotFoundError when schedule does not exist', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.delete(999, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(NotFoundError);
    });

    it('should throw BusinessError when status is publishing', async () => {
      const existing = makeSchedule({ status: 'publishing', createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.delete(1, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(BusinessError);
    });

    it('should throw BusinessError when status is published', async () => {
      const existing = makeSchedule({ status: 'published', createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.delete(1, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow(BusinessError);
    });

    it('should throw ForbiddenError when non-sysadmin tries to delete others schedule', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: jest.fn() },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await expect(service.delete(1, { userId: 1, role: 'admin' }))
        .rejects.toThrow(ForbiddenError);
    });

    it('should allow admin to delete their own schedule', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.delete(1, { userId: 2, role: 'admin' });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should allow sysadmin to delete any schedule', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.delete(1, { userId: 1, role: 'sysadmin' });

      expect(mockUpdate).toHaveBeenCalled();
    });

    it('should use transaction for delete', async () => {
      const existing = makeSchedule({ status: 'pending', createdBy: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      const mockTransaction = jest.fn().mockImplementation(async (cb: any) => {
        return cb({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        });
      });

      mockedGetPrisma.mockReturnValue({
        $transaction: mockTransaction,
      } as any);

      await service.delete(1, { userId: 1, role: 'sysadmin' });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });
  });

  // ══════════════════════════════════════════
  //  接口契约合规性验证
  // ══════════════════════════════════════════
  describe('接口契约合规性验证', () => {
    describe('接口方法签名', () => {
      it('should implement list method', () => {
        expect(typeof service.list).toBe('function');
        expect(service.list.length).toBe(1);
      });

      it('should implement create method', () => {
        expect(typeof service.create).toBe('function');
        expect(service.create.length).toBe(2);
      });

      it('should implement update method', () => {
        expect(typeof service.update).toBe('function');
        expect(service.update.length).toBe(3);
      });

      it('should implement reject method', () => {
        expect(typeof service.reject).toBe('function');
        expect(service.reject.length).toBe(2);
      });

      it('should implement delete method', () => {
        expect(typeof service.delete).toBe('function');
        expect(service.delete.length).toBe(2);
      });

      it('should have list return a Promise', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = service.list({ page: 1, pageSize: 10 });
        expect(result).toBeInstanceOf(Promise);
        await result;
      });

      it('should have create return a Promise', async () => {
        const article = makeArticle({ status: 'approved', createdBy: 1 });
        const createdSchedule = makeSchedule();
        const mockArticleFindFirst = jest.fn().mockResolvedValue(article);
        const mockScheduleCreate = jest.fn().mockResolvedValue(createdSchedule);
        mockedGetPrisma.mockReturnValue({
          article: { findFirst: mockArticleFindFirst },
          publishingSchedule: { create: mockScheduleCreate },
        } as any);

        const result = service.create(
          { article_id: 10, platforms: ['新浪'], schedule_type: 'asap' },
          { userId: 1, role: 'sysadmin' },
        );
        expect(result).toBeInstanceOf(Promise);
        await result;
      });

      it('should accept minimal list params (only page + pageSize)', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.list({ page: 1, pageSize: 10 });
        expect(result).toEqual({ list: [], total: 0 });
      });

      it('should accept full list params', async () => {
        const scheduleWithArticle = makeScheduleWithArticle();
        const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.list({
          page: 1,
          pageSize: 10,
          search: 'test',
          status: 'pending',
          projectId: 5,
          userId: 1,
          role: 'admin',
        });
        expect(result.list).toHaveLength(1);
        expect(result.total).toBe(1);
      });

      it('should list return object with list array and total number', async () => {
        const scheduleWithArticle = makeScheduleWithArticle();
        const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.list({ page: 1, pageSize: 10 });
        expect(Array.isArray(result.list)).toBe(true);
        expect(typeof result.total).toBe('number');
      });
    });

    describe('返回值结构一致性', () => {
      it('should return list items with all PublishingScheduleItem keys', async () => {
        const scheduleWithArticle = makeScheduleWithArticle();
        const mockFindMany = jest.fn().mockResolvedValue([scheduleWithArticle]);
        const mockCount = jest.fn().mockResolvedValue(1);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findMany: mockFindMany, count: mockCount },
        } as any);

        const result = await service.list({ page: 1, pageSize: 10 });
        const item = result.list[0];
        const expectedKeys = [
          'id', 'article_id', 'title', 'keywords', 'article_type', 'platforms', 'status',
          'schedule_type', 'scheduled_publish_at', 'project_id', 'project_name',
          'company_name', 'created_by', 'created_by_name', 'created_at', 'updated_at',
        ];
        expect(Object.keys(item).sort()).toEqual(expectedKeys.sort());
      });

      it('should return update result with all PublishingScheduleUpdateResult keys', async () => {
        const existing = {
          ...makeSchedule(),
          article: { id: 10, projectId: 100, project: { id: 100, operators: [{ userId: 1 }] } },
        };
        const updated = {
          ...makeSchedule(),
          article: {
            id: 10, title: '文章', keywords: null, articleType: null, projectId: 100,
            project: { id: 100, shortName: '项目A', company: { shortName: '公司A' } },
          },
        };
        const mockFindFirst = jest.fn().mockResolvedValue(existing);
        const mockUpdate = jest.fn().mockResolvedValue(updated);
        mockedGetPrisma.mockReturnValue({
          publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
        } as any);

        const result = await service.update(1, { schedule_type: 'asap' }, { userId: 1, role: 'sysadmin' });

        const expectedKeys = [
          'id', 'article_id', 'title', 'keywords', 'article_type', 'platforms', 'status',
          'schedule_type', 'scheduled_publish_at', 'project_id', 'project_name',
          'company_name', 'created_at', 'updated_at',
        ];
        expect(Object.keys(result).sort()).toEqual(expectedKeys.sort());
      });
    });

    describe('错误继承层次', () => {
      it('should verify NotFoundError extends AppError via Error', () => {
        const error = new NotFoundError('发布计划');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(NotFoundError);
        expect(error.name).toBe('NotFoundError');
        expect(error.statusCode).toBe(404);
      });

      it('should verify BusinessError extends AppError via Error', () => {
        const error = new BusinessError('业务错误');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(BusinessError);
        expect(error.name).toBe('BusinessError');
        expect(error.statusCode).toBe(400);
      });

      it('should verify ForbiddenError extends AppError via Error', () => {
        const error = new ForbiddenError('权限不足');
        expect(error).toBeInstanceOf(Error);
        expect(error).toBeInstanceOf(ForbiddenError);
        expect(error.name).toBe('ForbiddenError');
        expect(error.statusCode).toBe(403);
      });

      it('should verify error types are distinct', () => {
        const notFound = new NotFoundError('发布计划');
        const business = new BusinessError('业务错误');
        const forbidden = new ForbiddenError('权限不足');

        expect(notFound).not.toBeInstanceOf(BusinessError);
        expect(notFound).not.toBeInstanceOf(ForbiddenError);
        expect(business).not.toBeInstanceOf(NotFoundError);
        expect(business).not.toBeInstanceOf(ForbiddenError);
        expect(forbidden).not.toBeInstanceOf(NotFoundError);
        expect(forbidden).not.toBeInstanceOf(BusinessError);
      });
    });

    describe('实例独立性', () => {
      it('should produce independent service instances', () => {
        const service1 = new PublishingScheduleServiceImpl();
        const service2 = new PublishingScheduleServiceImpl();

        expect(service1).not.toBe(service2);
        expect(service1).toBeInstanceOf(PublishingScheduleServiceImpl);
        expect(service2).toBeInstanceOf(PublishingScheduleServiceImpl);
      });

      it('should not share state between instances', async () => {
        const service1 = new PublishingScheduleServiceImpl();
        const service2 = new PublishingScheduleServiceImpl();

        const schedule1 = makeScheduleWithArticle({ id: 1 });
        const schedule2 = makeScheduleWithArticle({ id: 2 });
        const mockFindMany1 = jest.fn().mockResolvedValue([schedule1]);
        const mockCount1 = jest.fn().mockResolvedValue(1);
        const mockFindMany2 = jest.fn().mockResolvedValue([schedule2]);
        const mockCount2 = jest.fn().mockResolvedValue(1);

        mockedGetPrisma.mockReturnValueOnce({
          publishingSchedule: { findMany: mockFindMany1, count: mockCount1 },
        } as any);
        mockedGetPrisma.mockReturnValueOnce({
          publishingSchedule: { findMany: mockFindMany2, count: mockCount2 },
        } as any);

        const result1 = await service1.list({ page: 1, pageSize: 10 });
        const result2 = await service2.list({ page: 1, pageSize: 10 });

        expect(result1.list[0].id).toBe(1);
        expect(result2.list[0].id).toBe(2);
        expect(mockFindMany1).toHaveBeenCalledTimes(1);
        expect(mockFindMany2).toHaveBeenCalledTimes(1);
      });
    });
  });

  // ══════════════════════════════════════════
  //  排序字段映射
  // ══════════════════════════════════════════
  describe('排序字段映射', () => {
    it('should always order list by id descending', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('should maintain consistent ordering with search filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: 'test' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('should maintain consistent ordering with permission filter', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, userId: 1, role: 'admin' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('should maintain consistent ordering on all pages', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 5, pageSize: 20 });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });
  });

  // ══════════════════════════════════════════
  //  Prisma异常传播
  // ══════════════════════════════════════════
  describe('Prisma异常传播', () => {
    it('should propagate Prisma error from findFirst in update', async () => {
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('PG connection lost'));
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst },
      } as any);

      await expect(service.update(1, { schedule_type: 'asap' }, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow('PG connection lost');
    });

    it('should propagate Prisma error from update in service.update', async () => {
      const existing = {
        ...makeSchedule(),
        article: { id: 10, projectId: 100, project: { id: 100, operators: [{ userId: 1 }] } },
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('Update deadlock'));
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.update(1, { schedule_type: 'asap' }, { userId: 1, role: 'sysadmin' }))
        .rejects.toThrow('Update deadlock');
    });

    it('should propagate generic Error (not AppError) from Prisma without wrapping', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('Raw PG error'));
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingSchedule: { findMany: mockFindMany, count: mockCount },
      } as any);

      try {
        await service.list({ page: 1, pageSize: 10 });
        fail('Should have thrown');
      } catch (error) {
        expect(error).toBeInstanceOf(Error);
        expect(error).not.toBeInstanceOf(NotFoundError);
        expect(error).not.toBeInstanceOf(BusinessError);
        expect((error as Error).message).toBe('Raw PG error');
      }
    });
  });
});

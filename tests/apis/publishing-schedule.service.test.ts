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
    it('should return paginated list with default status filter', async () => {
      const articles = [makeArticle({ id: 1 }), makeArticle({ id: 2 })];
      const mockFindMany = jest.fn().mockResolvedValue(articles);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: { in: ['publishing', 'published', 'publish_failed'] } },
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

      await service.list({ page: 2, pageSize: 5 });

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

      await service.list({ page: 3, pageSize: 20 });

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

      await service.list({ page: 1, pageSize: 10, search: '测试' });

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

      await service.list({ page: 1, pageSize: 10, status: 'published' });

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

      await service.list({ page: 1, pageSize: 10, projectId: 5 });

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

      await service.list({ page: 1, pageSize: 10, userId: 42, role: 'admin' });

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

      await service.list({ page: 1, pageSize: 10, userId: 99, role: 'view' });

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

      await service.list({ page: 1, pageSize: 10, userId: 1, role: 'sysadmin' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('project');
    });

    it('should not apply permission filter when userId is missing', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, role: 'admin' });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('project');
    });

    it('should combine search, status, and projectId filters', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
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

      await service.list({ page: 1, pageSize: 10 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should not add projectId filter when projectId is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

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

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0]).toEqual({
        id: 5,
        title: '标题',
        keywords: '关键词',
        article_type: 'reprint',
        platforms: ['新浪', '网易'],
        status: 'publishing',
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

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].scheduled_publish_at).toBeNull();
    });

    it('should handle null createdBy in mapping', async () => {
      const article = makeArticle({ createdBy: null });
      const mockFindMany = jest.fn().mockResolvedValue([article]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

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

      const result = await service.list({ page: 1, pageSize: 10 });

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

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list[0].project_name).toBe('项目A');
      expect(result.list[0].company_name).toBe('');
    });

    it('should return empty list when no articles found', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10 });

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should run findMany and count in parallel', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10 });

      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
    });

    it('should pass same where clause to findMany and count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, search: '测试' });

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

      await service.list({ page: 1, pageSize: 10 });

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
      expect(where.OR).toBeDefined();
      expect(where.status).toBe('published');
      expect(where.projectId).toBe(5);
      expect(where.project).toEqual({
        operators: { some: { userId: 42 } },
        company: { status: true },
        status: true,
      });
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

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z');

      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 1 },
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
        data: { scheduledPublishAt: new Date('2025-08-01T10:00:00Z') },
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

      const result = await service.updateSchedule(1, null);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: { scheduledPublishAt: null },
        }),
      );
      expect(result.scheduled_publish_at).toBeNull();
    });

    it('should throw error when article not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(999, '2025-08-01T10:00:00Z'))
        .rejects.toThrow('文章不存在');
    });

    it('should throw error when article status is not publishing', async () => {
      const existing = makeArticle({ status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z'))
        .rejects.toThrow('当前文章状态不可编辑发布计划');
    });

    it('should throw error when article status is published', async () => {
      const existing = makeArticle({ status: 'published' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z'))
        .rejects.toThrow('当前文章状态不可编辑发布计划');
    });

    it('should throw error when article status is publish_failed', async () => {
      const existing = makeArticle({ status: 'publish_failed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z'))
        .rejects.toThrow('当前文章状态不可编辑发布计划');
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

      const result = await service.updateSchedule(5, '2025-09-01T10:00:00Z');

      expect(result).toEqual({
        id: 5,
        title: '更新标题',
        keywords: '新关键词',
        article_type: 'reprint',
        platforms: ['网易'],
        status: 'publishing',
        scheduled_publish_at: new Date('2025-09-01T10:00:00Z'),
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

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z');

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

      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z');

      expect(result.project_name).toBe('项目A');
      expect(result.company_name).toBe('');
    });

    it('should not call update when article not found', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(999, '2025-08-01')).rejects.toThrow();
      expect(mockUpdate).not.toHaveBeenCalled();
    });

    it('should not call update when status is not publishing', async () => {
      const existing = makeArticle({ status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn();
      mockedGetPrisma.mockReturnValue({
        article: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await expect(service.updateSchedule(1, '2025-08-01')).rejects.toThrow();
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
      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', 2, 'admin');
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
      await expect(service.updateSchedule(1, '2025-08-01T10:00:00Z', 99, 'admin'))
        .rejects.toThrow('无权操作此文章');
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
      const result = await service.updateSchedule(1, '2025-08-01T10:00:00Z', 999, 'sysadmin');
      expect(result.id).toBe(1);
      expect(mockUpdate).toHaveBeenCalled();
    });
  });
});

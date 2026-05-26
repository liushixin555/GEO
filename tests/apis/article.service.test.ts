/**
 * @jest-environment node
 */
import { ArticleServiceImpl } from '../../apis/service/impl/article.service.impl';
import { ArticleStatus } from '../../apis/entity';
import { Prisma } from '@prisma/client';

// Mock getPrisma
const mockArticleFindMany = jest.fn();
const mockArticleCount = jest.fn();
const mockArticleFindFirst = jest.fn();
const mockArticleCreate = jest.fn();
const mockArticleUpdate = jest.fn();
const mockArticleVersionCreate = jest.fn();
const mockArticleVersionFindMany = jest.fn();

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(() => {
    const prismaMock = {
      article: {
        findMany: mockArticleFindMany,
        count: mockArticleCount,
        findFirst: mockArticleFindFirst,
        create: mockArticleCreate,
        update: mockArticleUpdate,
      },
      articleVersion: {
        create: mockArticleVersionCreate,
        findMany: mockArticleVersionFindMany,
      },
      $transaction: jest.fn(async (fn: any) => {
        const txMock = {
          article: {
            findMany: mockArticleFindMany,
            count: mockArticleCount,
            findFirst: mockArticleFindFirst,
            create: mockArticleCreate,
            update: mockArticleUpdate,
          },
          articleVersion: {
            create: mockArticleVersionCreate,
            findMany: mockArticleVersionFindMany,
          },
        };
        return await fn(txMock);
      }),
    };
    return prismaMock;
  }),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils/db.util';

const service = new ArticleServiceImpl();

const baseArticle = {
  id: 1,
  projectId: 10,
  title: '测试文章',
  articleType: 'seo',
  writeMode: 'ai',
  keywords: '关键词',
  portrait: '人物画像',
  images: null,
  skills: null,
  llmModelId: null,
  content: '文章内容',
  version: 1,
  status: 'draft',
  createdBy: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

// Auth context helpers — match current IArticleService signatures
import type { AuthContext } from '../../apis/types/auth';
const sysadminAuth: AuthContext = { userId: 1, role: 'sysadmin' };
const adminAuth: AuthContext = { userId: 2, role: 'admin' };
const viewAuth: AuthContext = { userId: 3, role: 'view' };
const creatorAuth: AuthContext = { userId: 1, role: 'sysadmin' }; // matches baseArticle.createdBy

describe('ArticleServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── list ───

  describe('list', () => {
    it('应返回文章列表和总数', async () => {
      mockArticleFindMany.mockResolvedValue([baseArticle]);
      mockArticleCount.mockResolvedValue(1);

      const result = await service.list(10, 1, 10, sysadminAuth);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe(1);
      expect(result.list[0].title).toBe('测试文章');
      expect(result.total).toBe(1);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 10, deletedAt: null }),
          orderBy: { id: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('应支持分页参数', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(25);

      const result = await service.list(10, 3, 10, sysadminAuth);

      expect(result.total).toBe(25);
      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 20,
          take: 10,
        }),
      );
    });

    it('应支持搜索过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, '测试关键词');

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            keywords: { contains: '测试关键词', mode: 'insensitive' },
          }),
        }),
      );
    });

    it('应支持状态过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, undefined, 'draft');

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('应支持搜索和状态同时过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, '关键词', 'pending_review');

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            keywords: { contains: '关键词', mode: 'insensitive' },
            status: 'pending_review',
          }),
        }),
      );
    });

    it('admin角色应添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, adminAuth, undefined, undefined);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: {
              operators: { some: { userId: 2 } },
              company: { status: true },
              status: true,
            },
          }),
        }),
      );
    });

    it('非admin角色不添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, undefined, undefined);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('admin角色但没有userId不添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, { userId: 0, role: 'admin' } as AuthContext, undefined, undefined);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('应返回空列表', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const result = await service.list(10, 1, 10, sysadminAuth);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('search为空字符串时不应添加搜索过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, '');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.keywords).toBeUndefined();
    });

    it('status为空字符串时不应添加状态过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth, undefined, '');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.status).toBeUndefined();
    });

    it('view角色不应添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, viewAuth, undefined, undefined);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('admin角色同时带搜索、状态和userId时应组合所有过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, adminAuth, '关键词', 'draft');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.keywords).toEqual({ contains: '关键词', mode: 'insensitive' });
      expect(callArgs.where.status).toBe('draft');
      expect(callArgs.where.project).toEqual({
        operators: { some: { userId: 2 } },
        company: { status: true },
        status: true,
      });
    });

    it('第一页skip应为0', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 20, sysadminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('page为2 pageSize为5时skip应为5', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 2, 5, sysadminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('page为0时skip应为负数', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 0, 10, sysadminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: -10, take: 10 }),
      );
    });

    it('count和findMany应使用相同的where条件', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, adminAuth, '搜索', 'draft');

      const findWhere = mockArticleFindMany.mock.calls[0][0].where;
      const countWhere = mockArticleCount.mock.calls[0][0].where;
      expect(countWhere).toEqual(findWhere);
    });

    it('projectId为0时应正确查询', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(0, 1, 10, sysadminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: 0 }),
        }),
      );
    });

    it('所有参数均为undefined时只带projectId和deletedAt', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, sysadminAuth);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      const where = callArgs.where;
      expect(Object.keys(where)).toEqual(['projectId', 'deletedAt']);
    });
  });

  // ─── getById ───

  describe('getById', () => {
    it('应返回指定ID的文章', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      const result = await service.getById(10, 1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('测试文章');
      expect(result.project_id).toBe(10);
      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 1, projectId: 10, deletedAt: null },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.getById(10, 999)).rejects.toThrow('文章不存在');
    });

    it('id为负数时查询不抛异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.getById(10, -1)).rejects.toThrow('文章不存在');
      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: -1, projectId: 10, deletedAt: null },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('id为0时查询不抛异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.getById(10, 0)).rejects.toThrow('文章不存在');
      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 0, projectId: 10, deletedAt: null },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });
  });

  // ─── create ───

  describe('create', () => {
    it('应创建文章并返回映射后的对象', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      const result = await service.create(10, { title: '测试文章' }, sysadminAuth);

      expect(result.id).toBe(1);
      expect(result.title).toBe('测试文章');
      expect(mockArticleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: 10,
          title: '测试文章',
          version: 1,
          createdBy: 1,
        }),
      });
    });

    it('未提供title时应默认为空字符串', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, title: '' });

      await service.create(10, {}, sysadminAuth);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: '' }),
        }),
      );
    });

    it('未提供status时应默认为draft', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, sysadminAuth);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('应支持所有可选字段', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, {
        title: '标题',
        article_type: 'seo',
        write_mode: 'manual',
        keywords: 'kw',
        portrait: '画像',
        images: ['img.jpg'],
        skills: [1],
        llm_model_id: 2,
        content: '内容',
        status: 'manual_writing',
      }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.articleType).toBe('seo');
      expect(callData.writeMode).toBe('manual');
      expect(callData.keywords).toBe('kw');
      expect(callData.portrait).toBe('画像');
      expect(callData.skills).toEqual([1]);
      expect(callData.llmModelId).toBe(2);
      expect(callData.content).toBe('内容');
      expect(callData.status).toBe('manual_writing');
    });

    it('空值字段应设为null', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, {
        article_type: '',
        write_mode: '',
        keywords: '',
        portrait: '',
      }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.articleType).toBeNull();
      expect(callData.writeMode).toBeNull();
      expect(callData.keywords).toBeNull();
      expect(callData.portrait).toBeNull();
    });

    it('有content时应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(10, { title: 'T', content: '初始内容' }, sysadminAuth);

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 1,
          version: 1,
          content: '初始内容',
          createdBy: 1,
        },
      });
    });

    it('无content时不应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, sysadminAuth);

      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('content为空字符串时不应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', content: '' }, sysadminAuth);

      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('images未提供时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toBe(Prisma.JsonNull);
    });

    it('skills未提供时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.skills).toBe(Prisma.JsonNull);
    });

    it('images为空数组时应保留空数组', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', images: [] }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toEqual([]);
    });

    it('skills为空数组时应保留空数组', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', skills: [] }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.skills).toEqual([]);
    });

    it('status为generating时应正确设置', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await service.create(10, { title: 'T', status: 'generating' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.status).toBe('generating');
    });

    it('status为manual_writing时应正确设置', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await service.create(10, { title: 'T', status: 'manual_writing' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.status).toBe('manual_writing');
    });

    it('llm_model_id为0时应设为null', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', llm_model_id: 0 }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.llmModelId).toBeNull();
    });

    it('images为null时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', images: null as any }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toBe(Prisma.JsonNull);
    });

    it('content有值时版本快照应记录正确的articleId', async () => {
      const created = { ...baseArticle, id: 42 };
      mockArticleCreate.mockResolvedValue(created);
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(10, { title: 'T', content: '内容' }, sysadminAuth);

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 42,
          version: 1,
          content: '内容',
          createdBy: 1,
        },
      });
    });

    it('status为空字符串时应默认为draft', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T', status: '' as any }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.status).toBe('draft');
    });

    it('content为空格字符串时应创建版本快照（空格是truthy）', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(10, { title: 'T', content: '   ' }, sysadminAuth);

      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('projectId为0时应正确创建', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, projectId: 0 });

      await service.create(0, { title: 'T' }, sysadminAuth);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ projectId: 0 }),
        }),
      );
    });

    it('userId为0时应正确设置createdBy', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, { userId: 0, role: 'admin' } as AuthContext);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBe(0);
    });

    it('所有可选字段为undefined时应正确设置默认值', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.articleType).toBeNull();
      expect(callData.writeMode).toBeNull();
      expect(callData.keywords).toBeNull();
      expect(callData.portrait).toBeNull();
      expect(callData.llmModelId).toBeNull();
      expect(callData.content).toBeNull();
    });

    it('content有值时创建的版本快照应记录userId', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, id: 99 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(10, { title: 'T', content: '内容' }, { userId: 5, role: 'admin' });

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 99,
          version: 1,
          content: '内容',
          createdBy: 5,
        },
      });
    });
  });

  // ─── update ───

  describe('update', () => {
    it('应更新文章并返回映射后的对象', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, title: '新标题' });

      const result = await service.update(10, 1, { title: '新标题' }, creatorAuth);

      expect(result.title).toBe('新标题');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.update(10, 999, { title: 'T' }, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('只更新提供的字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, { title: '新标题' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('新标题');
      expect(updateData.keywords).toBeUndefined();
      expect(updateData.content).toBeUndefined();
    });

    it('应支持更新所有可选字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, {
        title: '标题',
        article_type: 'blog',
        write_mode: 'manual',
        keywords: 'kw2',
        portrait: '画像2',
        images: ['new.jpg'],
        skills: 2,
        llm_model_id: 3,
        status: 'generating',
      }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('标题');
      expect(updateData.articleType).toBe('blog');
      expect(updateData.writeMode).toBe('manual');
      expect(updateData.keywords).toBe('kw2');
      expect(updateData.portrait).toBe('画像2');
      expect(updateData.status).toBe('generating');
    });

    it('空字符串字段应设为null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, {
        article_type: '',
        write_mode: '',
        keywords: '',
        portrait: '',
      }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.articleType).toBeNull();
      expect(updateData.writeMode).toBeNull();
      expect(updateData.keywords).toBeNull();
      expect(updateData.portrait).toBeNull();
    });

    it('images/skills为falsy值时应设为JsonNull或null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, {
        images: null as any,
        skills: 0,
        llm_model_id: 0,
      }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.images).toBe(Prisma.JsonNull);
      expect(updateData.skills).toBe(Prisma.JsonNull);
      expect(updateData.llmModelId).toBeNull();
    });

    it('内容变化时应递增版本号并创建版本快照', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: '新内容', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '新内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(updateData.content).toBe('新内容');
      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          articleId: 1,
          version: 2,
          content: '新内容',
          createdBy: 1,
        }),
      });
    });

    it('内容未变化时不应递增版本号', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, { content: '文章内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('AI生成文章内容更新且标题为空时应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, title: 'AI标题', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '# AI标题\n\n正文内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('AI标题');
    });

    it('AI生成文章内容无有效行时不应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '   \n  \n  ' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('手动编写文章内容更新时不应自动提取标题', async () => {
      const manualArticle = { ...baseArticle, writeMode: 'manual', title: '' };
      mockArticleFindFirst.mockResolvedValue(manualArticle);
      mockArticleUpdate.mockResolvedValue({ ...manualArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '# 标题\n\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('已有标题的AI文章内容更新时不应覆盖标题', async () => {
      const aiArticleWithTitle = { ...baseArticle, writeMode: 'ai', title: '原标题' };
      mockArticleFindFirst.mockResolvedValue(aiArticleWithTitle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticleWithTitle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '新内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('版本号为非整数时Math.floor应正确计算新版本号', async () => {
      const nonIntArticle = { ...baseArticle, version: 2.5 };
      mockArticleFindFirst.mockResolvedValue(nonIntArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 3 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '更新内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(3);
    });

    it('标题提取应正确处理##开头的二级标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '## 二级标题\n正文内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('二级标题');
    });

    it('标题提取应正确处理###开头的三级标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '### 三级标题\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('三级标题');
    });

    it('标题提取应正确处理无#标记的普通行', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '普通标题行\n正文内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('普通标题行');
    });

    it('标题提取应跳过空行和纯空格行', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '   \n\n  \n## 有效标题\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('有效标题');
    });

    it('内容为null时更新为新内容应触发版本递增', async () => {
      const nullContentArticle = { ...baseArticle, content: null };
      mockArticleFindFirst.mockResolvedValue(nullContentArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2, content: '新内容' });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '新内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(updateData.content).toBe('新内容');
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('只更新status不触发版本递增', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await service.update(10, 1, { status: 'generating' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(updateData.status).toBe('generating');
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('同时更新content和其他字段时应正确处理', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, title: '新标题', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { title: '新标题', content: '新内容', keywords: '新关键词' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('新标题');
      expect(updateData.content).toBe('新内容');
      expect(updateData.keywords).toBe('新关键词');
      expect(updateData.version).toBe(2);
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('images为空数组时应保留空数组', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, { images: [] }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.images).toEqual([]);
    });

    it('content显式设为null且existing有内容时应触发版本递增', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: null, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: null as any }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(updateData.content).toBeNull();
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('content设为null且existing也为null时不应触发版本递增', async () => {
      const nullContentArticle = { ...baseArticle, content: null };
      mockArticleFindFirst.mockResolvedValue(nullContentArticle);
      mockArticleUpdate.mockResolvedValue(nullContentArticle);

      await service.update(10, 1, { content: null as any }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('content设为空字符串且existing有内容时应触发版本递增', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: '', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('content设为空字符串且existing也是空字符串时不应触发版本递增', async () => {
      const emptyContentArticle = { ...baseArticle, content: '' };
      mockArticleFindFirst.mockResolvedValue(emptyContentArticle);
      mockArticleUpdate.mockResolvedValue(emptyContentArticle);

      await service.update(10, 1, { content: '' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('version为0时新版本应为1', async () => {
      const zeroVersionArticle = { ...baseArticle, version: 0 };
      mockArticleFindFirst.mockResolvedValue(zeroVersionArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 1 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '新内容' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(1);
    });

    it('writeMode为空字符串（非manual）且标题为空时应提取标题', async () => {
      const emptyModeArticle = { ...baseArticle, writeMode: '', title: '' };
      mockArticleFindFirst.mockResolvedValue(emptyModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...emptyModeArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '# 提取标题\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('提取标题');
    });

    it('writeMode为null（非manual）且标题为空时应提取标题', async () => {
      const nullModeArticle = { ...baseArticle, writeMode: null, title: '' };
      mockArticleFindFirst.mockResolvedValue(nullModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...nullModeArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '## Null模式标题\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('Null模式标题');
    });

    it('内容只有一行Markdown标题时应正确提取', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '# 唯一标题' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('唯一标题');
    });

    it('####四级标题也应正确提取', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(10, 1, { content: '#### 四级标题\n正文' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('四级标题');
    });

    it('所有字段均为undefined时不应更新任何字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, {}, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(Object.keys(updateData)).toHaveLength(0);
    });

    it('技能为空数组时应保留空数组', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, { skills: [] }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.skills).toEqual([]);
    });

    it('content相同但其他字段不同时不应触发版本递增', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, keywords: '新关键词' });

      await service.update(10, 1, { content: '文章内容', keywords: '新关键词' }, creatorAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(updateData.keywords).toBe('新关键词');
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('内容更新时应在事务中先保存版本快照再更新文章', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      const callOrder: string[] = [];
      mockArticleFindFirst.mockImplementation(() => { callOrder.push('findFirst'); return Promise.resolve(baseArticle); });
      mockArticleVersionCreate.mockImplementation(() => { callOrder.push('versionCreate'); return Promise.resolve({}); });
      mockArticleUpdate.mockImplementation(() => { callOrder.push('update'); return Promise.resolve({ ...baseArticle, version: 2 }); });

      await service.update(10, 1, { content: '新内容' }, creatorAuth);

      expect(callOrder).toEqual(['findFirst', 'versionCreate', 'update']);
    });

    it('非settings-editable状态时应拒绝更新', async () => {
      const approvedArticle = { ...baseArticle, status: 'approved' };
      mockArticleFindFirst.mockResolvedValue(approvedArticle);

      await expect(service.update(10, 1, { title: 'T' }, creatorAuth)).rejects.toThrow('当前文章状态不可编辑');
    });

    it('非创建者非sysadmin应拒绝更新', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.update(10, 1, { title: 'T' }, { userId: 999, role: 'admin' } as AuthContext)).rejects.toThrow('只能修改自己创建的文章');
    });

    it('非法状态转换应拒绝', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.update(10, 1, { status: 'approved' }, creatorAuth)).rejects.toThrow('非法的状态转换');
    });

    it('项目归属不匹配应抛出NotFoundError', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.update(999, 1, { title: 'T' }, creatorAuth)).rejects.toThrow('文章不存在');
    });
  });

  // ─── delete ───

  describe('delete', () => {
    it('应软删除文章（设置deletedAt）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(10, 1, creatorAuth);

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.delete(10, 999, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('已软删除的文章再次删除应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.delete(10, 1, sysadminAuth)).rejects.toThrow('文章不存在');
      expect(mockArticleUpdate).not.toHaveBeenCalled();
    });

    it('软删除应设置deletedAt为Date实例', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(10, 1, creatorAuth);

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('软删除应使用事务包裹操作', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(10, 1, creatorAuth);

      // Transaction wraps the operation — if findFirst and update succeed, transaction was used
      expect(mockArticleFindFirst).toHaveBeenCalled();
      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('approved状态的文章不能删除', async () => {
      const approvedArticle = { ...baseArticle, status: 'approved' };
      mockArticleFindFirst.mockResolvedValue(approvedArticle);

      await expect(service.delete(10, 1, creatorAuth)).rejects.toThrow('已审核通过的文章不能删除');
    });

    it('非创建者非sysadmin应拒绝删除', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.delete(10, 1, { userId: 999, role: 'admin' } as AuthContext)).rejects.toThrow('只能删除自己创建的文章');
    });

    it('项目归属不匹配应抛出NotFoundError', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.delete(999, 1, creatorAuth)).rejects.toThrow('文章不存在');
    });
  });

  // ─── review ───

  describe('review', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('审核通过应将状态设为approved', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'approved' });

      const result = await service.review(10, 1, true, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('approved');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'approved' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('AI文章审核不通过应将状态设为draft', async () => {
      const aiPending = { ...pendingArticle, writeMode: 'ai' };
      mockArticleFindFirst.mockResolvedValue(aiPending);
      mockArticleUpdate.mockResolvedValue({ ...aiPending, status: 'draft' });

      const result = await service.review(10, 1, false, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('draft');
    });

    it('手动文章审核不通过应将状态设为manual_writing', async () => {
      const manualPending = { ...pendingArticle, writeMode: 'manual' };
      mockArticleFindFirst.mockResolvedValue(manualPending);
      mockArticleUpdate.mockResolvedValue({ ...manualPending, status: 'manual_writing' });

      const result = await service.review(10, 1, false, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('manual_writing');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.review(10, 999, true, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('文章状态不是pending_review时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('writeMode为null时审核不通过应设为draft', async () => {
      const nullModeArticle = { ...pendingArticle, writeMode: null };
      mockArticleFindFirst.mockResolvedValue(nullModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...nullModeArticle, status: 'draft' });

      const result = await service.review(10, 1, false, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('draft');
    });

    it('writeMode为undefined时审核不通过应设为draft', async () => {
      const undefinedModeArticle = { ...pendingArticle, writeMode: undefined };
      mockArticleFindFirst.mockResolvedValue(undefinedModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...undefinedModeArticle, status: 'draft' });

      const result = await service.review(10, 1, false, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('draft');
    });

    it('generating状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('approved状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'approved' });

      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('manual_writing状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('writeMode为空字符串时审核不通过应设为draft', async () => {
      const emptyModeArticle = { ...pendingArticle, writeMode: '' };
      mockArticleFindFirst.mockResolvedValue(emptyModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...emptyModeArticle, status: 'draft' });

      const result = await service.review(10, 1, false, { userId: 2, role: 'sysadmin' });

      expect(result.status).toBe('draft');
    });

    it('审核应使用事务包裹操作', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'approved' });

      await service.review(10, 1, true, { userId: 2, role: 'sysadmin' });

      expect(mockArticleFindFirst).toHaveBeenCalled();
      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('审核不通过AI文章的完整流程验证', async () => {
      const aiArticle = { ...baseArticle, status: 'pending_review' as const, writeMode: 'ai' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, status: 'draft' });

      const result = await service.review(10, 1, false, { userId: 3, role: 'admin' });

      expect(result.status).toBe('draft');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'draft' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('draft状态不应被审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });
      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('generate_failed状态不应被审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'generate_failed' });
      await expect(service.review(10, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('创建者不能审核自己的文章', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.review(10, 1, true, creatorAuth)).rejects.toThrow('不能审核自己创建的文章');
    });

    it('项目归属不匹配应抛出NotFoundError', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.review(999, 1, true, { userId: 2, role: 'sysadmin' })).rejects.toThrow('文章不存在');
    });
  });

  // ─── regenerate ───

  describe('regenerate', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('pending_review状态应允许重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'generating' });

      const result = await service.regenerate(10, 1, creatorAuth);

      expect(result.status).toBe('generating');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generating' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.regenerate(10, 999, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('draft状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.regenerate(10, 1, creatorAuth)).rejects.toThrow('文章当前状态不支持重新生成');
    });

    it('generate_failed状态应允许重新生成', async () => {
      const failedArticle = { ...baseArticle, status: 'generate_failed' };
      mockArticleFindFirst.mockResolvedValue(failedArticle);
      mockArticleUpdate.mockResolvedValue({ ...failedArticle, status: 'generating' });

      const result = await service.regenerate(10, 1, creatorAuth);

      expect(result.status).toBe('generating');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generating' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('manual_writing状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await expect(service.regenerate(10, 1, creatorAuth)).rejects.toThrow('文章当前状态不支持重新生成');
    });

    it('generating状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await expect(service.regenerate(10, 1, creatorAuth)).rejects.toThrow('文章当前状态不支持重新生成');
    });

    it('approved状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'approved' });

      await expect(service.regenerate(10, 1, creatorAuth)).rejects.toThrow('文章当前状态不支持重新生成');
    });

    it('重新生成应使用事务包裹操作', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'generating' });

      await service.regenerate(10, 1, creatorAuth);

      expect(mockArticleFindFirst).toHaveBeenCalled();
      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('generate_failed状态的完整重新生成流程', async () => {
      const failedArticle = { ...baseArticle, status: 'generate_failed' as const };
      mockArticleFindFirst.mockResolvedValue(failedArticle);
      mockArticleUpdate.mockResolvedValue({ ...failedArticle, status: 'generating' });

      const result = await service.regenerate(10, 1, creatorAuth);

      expect(result.status).toBe('generating');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generating' },
        include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
      });
    });

    it('非创建者非sysadmin应拒绝重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.regenerate(10, 1, { userId: 999, role: 'admin' } as AuthContext)).rejects.toThrow('只能重新生成自己创建的文章');
    });

    it('项目归属不匹配应抛出NotFoundError', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.regenerate(999, 1, creatorAuth)).rejects.toThrow('文章不存在');
    });
  });

  // ─── listVersions ───

  describe('listVersions', () => {
    it('应返回文章的版本列表（按版本号降序）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      const versions = [
        { id: 2, articleId: 1, version: 2, content: 'v2', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 1, articleId: 1, version: 1, content: 'v1', createdBy: 1, createdAt: new Date(), deletedAt: null },
      ];
      mockArticleVersionFindMany.mockResolvedValue(versions);

      const result = await service.listVersions(10, 1);

      expect(result).toHaveLength(2);
      expect(result[0].version).toBe(2);
      expect(result[0].content).toBe('v2');
      expect(result[1].version).toBe(1);
      expect(mockArticleVersionFindMany).toHaveBeenCalledWith({
        where: { articleId: 1, deletedAt: null },
        orderBy: { version: 'desc' },
      });
    });

    it('应返回空版本列表', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleVersionFindMany.mockResolvedValue([]);

      const result = await service.listVersions(10, 1);

      expect(result).toHaveLength(0);
    });

    it('版本映射应正确处理null的createdBy', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      const version = {
        id: 1, articleId: 1, version: 1, content: 'c',
        createdBy: null, createdAt: new Date(), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(10, 1);

      expect(result[0].created_by).toBeNull();
    });

    it('应正确映射版本的所有字段', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, id: 5 });
      const version = {
        id: 10, articleId: 5, version: 3, content: '版本3内容',
        createdBy: 7, createdAt: new Date('2026-03-15'), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(10, 5);

      expect(result[0].id).toBe(10);
      expect(result[0].article_id).toBe(5);
      expect(result[0].version).toBe(3);
      expect(result[0].content).toBe('版本3内容');
      expect(result[0].created_by).toBe(7);
      expect(result[0].created_at).toEqual(new Date('2026-03-15'));
    });

    it('多个版本应按版本号降序排列', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      const versions = [
        { id: 3, articleId: 1, version: 3, content: 'v3', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 2, articleId: 1, version: 2, content: 'v2', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 1, articleId: 1, version: 1, content: 'v1', createdBy: 1, createdAt: new Date(), deletedAt: null },
      ];
      mockArticleVersionFindMany.mockResolvedValue(versions);

      const result = await service.listVersions(10, 1);

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
      expect(mockArticleVersionFindMany).toHaveBeenCalledWith({
        where: { articleId: 1, deletedAt: null },
        orderBy: { version: 'desc' },
      });
    });

    it('articleId为0时应正确查询', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, id: 0 });
      mockArticleVersionFindMany.mockResolvedValue([]);

      await service.listVersions(10, 0);

      expect(mockArticleVersionFindMany).toHaveBeenCalledWith({
        where: { articleId: 0, deletedAt: null },
        orderBy: { version: 'desc' },
      });
    });

    it('版本内容为null时应正确映射', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      const version = {
        id: 1, articleId: 1, version: 1, content: null,
        createdBy: 1, createdAt: new Date(), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(10, 1);

      expect(result[0].content).toBeNull();
    });

    it('单个版本应正确返回', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, id: 2 });
      const version = {
        id: 5, articleId: 2, version: 1, content: '唯一版本',
        createdBy: 3, createdAt: new Date('2026-05-01'), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(10, 2);

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(5);
      expect(result[0].article_id).toBe(2);
    });

    it('文章不属于该项目时应抛出NotFoundError', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.listVersions(999, 1)).rejects.toThrow('文章不存在');
    });
  });

  // ─── mapArticle 映射验证 ───

  describe('字段映射', () => {
    it('mapArticle应正确映射所有字段', async () => {
      const fullArticle = {
        id: 42,
        projectId: 10,
        title: '完整文章',
        articleType: 'seo',
        writeMode: 'ai',
        keywords: 'kw',
        portrait: '画像',
        images: ['img.jpg'],
        skills: [1],
        llmModelId: 2,
        content: '内容',
        version: 3,
        status: 'draft',
        createdBy: 5,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
        _count: { schedules: 2 },
      };

      mockArticleFindFirst.mockResolvedValue(fullArticle);

      const result = await service.getById(10, 42);

      expect(result.id).toBe(42);
      expect(result.project_id).toBe(10);
      expect(result.title).toBe('完整文章');
      expect(result.article_type).toBe('seo');
      expect(result.write_mode).toBe('ai');
      expect(result.keywords).toBe('kw');
      expect(result.portrait).toBe('画像');
      expect(result.images).toEqual(['img.jpg']);
      expect(result.skills).toEqual([1]);
      expect(result.llm_model_id).toBe(2);
      expect(result.content).toBe('内容');
      expect(result.version).toBe(3);
      expect(result.status).toBe('draft');
      expect(result.schedule_count).toBe(2);
      expect(result.created_by).toBe(5);
    });

    it('mapArticle应正确处理null字段', async () => {
      const nullArticle = {
        id: 1,
        projectId: 10,
        title: 'T',
        articleType: null,
        writeMode: null,
        keywords: null,
        portrait: null,
        images: null,
        skills: null,
        llmModelId: null,
        content: null,
        version: 0,
        status: 'draft',
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
        _count: { schedules: 0 },
      };

      mockArticleFindFirst.mockResolvedValue(nullArticle);

      const result = await service.getById(10, 1);

      expect(result.article_type).toBeNull();
      expect(result.write_mode).toBeNull();
      expect(result.keywords).toBeNull();
      expect(result.portrait).toBeNull();
      expect(result.images).toBeNull();
      expect(result.skills).toBeNull();
      expect(result.llm_model_id).toBeNull();
      expect(result.content).toBeNull();
      expect(result.schedule_count).toBe(0);
      expect(result.created_by).toBeNull();
    });
  });

  // ─── 接口合规性验证 ───

  describe('IArticleService 接口合规性', () => {
    it('应实现list方法', () => {
      expect(typeof service.list).toBe('function');
    });

    it('应实现getById方法', () => {
      expect(typeof service.getById).toBe('function');
    });

    it('应实现create方法', () => {
      expect(typeof service.create).toBe('function');
    });

    it('应实现update方法', () => {
      expect(typeof service.update).toBe('function');
    });

    it('应实现delete方法', () => {
      expect(typeof service.delete).toBe('function');
    });

    it('应实现review方法', () => {
      expect(typeof service.review).toBe('function');
    });

    it('应实现regenerate方法', () => {
      expect(typeof service.regenerate).toBe('function');
    });

    it('应实现listVersions方法', () => {
      expect(typeof service.listVersions).toBe('function');
    });

    it('应实现isSettingsEditable方法', () => {
      expect(typeof service.isSettingsEditable).toBe('function');
    });

    it('应实现isContentEditable方法', () => {
      expect(typeof service.isContentEditable).toBe('function');
    });

    it('应实现isValidStatusTransition方法', () => {
      expect(typeof service.isValidStatusTransition).toBe('function');
    });
  });

  // ─── 状态枚举边界测试 ───

  describe('ArticleStatus 状态枚举边界', () => {
    it('所有ArticleStatus值都应被支持', async () => {
      const statuses: ArticleStatus[] = [
        'draft', 'manual_writing', 'generating', 'generate_failed',
        'pending_review', 'approved',
      ];

      for (const status of statuses) {
        mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status });
        const result = await service.getById(10, 1);
        expect(result.status).toBe(status);
      }
    });
  });

  // ─── 状态机完整性测试 ───

  describe('状态机 C-1 修复验证', () => {
    it('draft → generating 应是合法转换', () => {
      expect(service.isValidStatusTransition('draft', 'generating')).toBe(true);
    });

    it('draft → manual_writing 应是合法转换', () => {
      expect(service.isValidStatusTransition('draft', 'manual_writing')).toBe(true);
    });

    it('manual_writing → pending_review 应是合法转换', () => {
      expect(service.isValidStatusTransition('manual_writing', 'pending_review')).toBe(true);
    });

    it('generating → pending_review 应是合法转换', () => {
      expect(service.isValidStatusTransition('generating', 'pending_review')).toBe(true);
    });

    it('generating → generate_failed 应是合法转换', () => {
      expect(service.isValidStatusTransition('generating', 'generate_failed')).toBe(true);
    });

    it('generate_failed → generating 应是合法转换', () => {
      expect(service.isValidStatusTransition('generate_failed', 'generating')).toBe(true);
    });

    it('pending_review → approved 应是合法转换', () => {
      expect(service.isValidStatusTransition('pending_review', 'approved')).toBe(true);
    });

    it('pending_review → manual_writing 应是合法转换', () => {
      expect(service.isValidStatusTransition('pending_review', 'manual_writing')).toBe(true);
    });

    it('pending_review → draft 应是合法转换', () => {
      expect(service.isValidStatusTransition('pending_review', 'draft')).toBe(true);
    });

    it('pending_review → generating 应是合法转换', () => {
      expect(service.isValidStatusTransition('pending_review', 'generating')).toBe(true);
    });

    it('draft → approved 应是非法转换', () => {
      expect(service.isValidStatusTransition('draft', 'approved')).toBe(false);
    });

    it('approved → draft 应是非法转换', () => {
      expect(service.isValidStatusTransition('approved', 'draft')).toBe(false);
    });

    it('不存在的源状态应返回 false', () => {
      expect(service.isValidStatusTransition('nonexistent' as ArticleStatus, 'draft')).toBe(false);
    });
  });

  // ─── 事务边界测试 ───

  describe('事务边界', () => {
    it('update应使用事务包裹操作', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(10, 1, { title: 'T' }, creatorAuth);

      expect(mockArticleFindFirst).toHaveBeenCalled();
      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('create不在事务中执行（直接使用getPrisma）', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      const prisma = getPrisma();
      await service.create(10, { title: 'T' }, sysadminAuth);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('list不在事务中执行', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const prisma = getPrisma();
      await service.list(10, 1, 10, sysadminAuth);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('getById不在事务中执行', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      const prisma = getPrisma();
      await service.getById(10, 1);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });

    it('listVersions不在事务中执行', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleVersionFindMany.mockResolvedValue([]);

      const prisma = getPrisma();
      await service.listVersions(10, 1);

      expect(prisma.$transaction).not.toHaveBeenCalled();
    });
  });

  // ─── 返回值类型验证 ───

  describe('返回值结构验证', () => {
    it('list返回值应包含list和total字段', async () => {
      mockArticleFindMany.mockResolvedValue([baseArticle]);
      mockArticleCount.mockResolvedValue(1);

      const result = await service.list(10, 1, 10, sysadminAuth);

      expect(result).toHaveProperty('list');
      expect(result).toHaveProperty('total');
      expect(Array.isArray(result.list)).toBe(true);
      expect(typeof result.total).toBe('number');
    });

    it('getById返回值应包含所有必要字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      const result = await service.getById(10, 1);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('project_id');
      expect(result).toHaveProperty('title');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('version');
    });

    it('create返回值应包含所有必要字段', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      const result = await service.create(10, { title: 'T' }, sysadminAuth);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('project_id');
      expect(result).toHaveProperty('created_by');
    });

    it('update返回值应包含所有必要字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      const result = await service.update(10, 1, { title: '新标题' }, creatorAuth);

      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('project_id');
    });

    it('listVersions返回值每个元素应包含必要字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      const version = {
        id: 1, articleId: 1, version: 1, content: 'c',
        createdBy: 1, createdAt: new Date(), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(10, 1);

      expect(result[0]).toHaveProperty('id');
      expect(result[0]).toHaveProperty('article_id');
      expect(result[0]).toHaveProperty('version');
      expect(result[0]).toHaveProperty('content');
      expect(result[0]).toHaveProperty('created_by');
      expect(result[0]).toHaveProperty('created_at');
    });
  });

  // ─── 并发与Promise测试 ───

  describe('并发行为', () => {
    it('list中findMany和count应并发执行（Promise.all）', async () => {
      mockArticleFindMany.mockResolvedValue([baseArticle]);
      mockArticleCount.mockResolvedValue(1);

      await service.list(10, 1, 10, sysadminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledTimes(1);
      expect(mockArticleCount).toHaveBeenCalledTimes(1);
    });
  });
});

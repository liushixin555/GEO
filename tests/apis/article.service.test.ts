/**
 * @jest-environment node
 */
import { ArticleServiceImpl } from '../../apis/service/impl/article.service.impl';
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
  getPrisma: jest.fn(() => ({
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
  })),
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
  platforms: null,
  skills: null,
  llmModelId: null,
  content: '文章内容',
  version: 1,
  status: 'draft',
  scheduledPublishAt: null,
  createdBy: 1,
  createdAt: new Date('2026-01-01'),
  updatedAt: new Date('2026-01-01'),
};

describe('ArticleServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ─── list ───

  describe('list', () => {
    it('应返回文章列表和总数', async () => {
      mockArticleFindMany.mockResolvedValue([baseArticle]);
      mockArticleCount.mockResolvedValue(1);

      const result = await service.list(10, 1, 10);

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

      const result = await service.list(10, 3, 10);

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

      await service.list(10, 1, 10, '测试关键词');

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

      await service.list(10, 1, 10, undefined, 'draft');

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('应支持搜索和状态同时过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, '关键词', 'pending_review');

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

      await service.list(10, 1, 10, undefined, undefined, 2, 'admin');

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

      await service.list(10, 1, 10, undefined, undefined, 1, 'sysadmin');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('admin角色但没有userId不添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(10, 1, 10, undefined, undefined, undefined, 'admin');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('应返回空列表', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const result = await service.list(10, 1, 10);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });
  });

  // ─── getById ───

  describe('getById', () => {
    it('应返回指定ID的文章', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      const result = await service.getById(1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('测试文章');
      expect(result.project_id).toBe(10);
      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow('文章不存在');
    });

    it('应传递userId和role参数', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await service.getById(1, 2, 'admin');

      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });
  });

  // ─── create ───

  describe('create', () => {
    it('应创建文章并返回映射后的对象', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      const result = await service.create(10, { title: '测试文章' }, 1);

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

      await service.create(10, {}, 1);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: '' }),
        }),
      );
    });

    it('未提供status时应默认为draft', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(10, { title: 'T' }, 1);

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
        platforms: ['新浪'],
        skills: 1,
        llm_model_id: 2,
        content: '内容',
        status: 'manual_writing',
      }, 1);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.articleType).toBe('seo');
      expect(callData.writeMode).toBe('manual');
      expect(callData.keywords).toBe('kw');
      expect(callData.portrait).toBe('画像');
      expect(callData.skills).toBe(1);
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
      }, 1);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.articleType).toBeNull();
      expect(callData.writeMode).toBeNull();
      expect(callData.keywords).toBeNull();
      expect(callData.portrait).toBeNull();
    });

    it('有content时应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(10, { title: 'T', content: '初始内容' }, 1);

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

      await service.create(10, { title: 'T' }, 1);

      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });
  });

  // ─── update ───

  describe('update', () => {
    it('应更新文章并返回映射后的对象', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, title: '新标题' });

      const result = await service.update(1, { title: '新标题' }, 1);

      expect(result.title).toBe('新标题');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.update(999, { title: 'T' })).rejects.toThrow('文章不存在');
    });

    it('只更新提供的字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, { title: '新标题' });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('新标题');
      expect(updateData.keywords).toBeUndefined();
      expect(updateData.content).toBeUndefined();
    });

    it('应支持更新所有可选字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, {
        title: '标题',
        article_type: 'blog',
        write_mode: 'manual',
        keywords: 'kw2',
        portrait: '画像2',
        images: ['new.jpg'],
        platforms: ['搜狐'],
        skills: 2,
        llm_model_id: 3,
        status: 'pending_review',
      });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('标题');
      expect(updateData.articleType).toBe('blog');
      expect(updateData.writeMode).toBe('manual');
      expect(updateData.keywords).toBe('kw2');
      expect(updateData.portrait).toBe('画像2');
      expect(updateData.status).toBe('pending_review');
    });

    it('空字符串字段应设为null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, {
        article_type: '',
        write_mode: '',
        keywords: '',
        portrait: '',
      });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.articleType).toBeNull();
      expect(updateData.writeMode).toBeNull();
      expect(updateData.keywords).toBeNull();
      expect(updateData.portrait).toBeNull();
    });

    it('images/platforms/skills为falsy值时应设为JsonNull或null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, {
        images: null as any,
        platforms: null as any,
        skills: 0,
        llm_model_id: 0,
      });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.images).toBe(Prisma.JsonNull);
      expect(updateData.platforms).toBe(Prisma.JsonNull);
      expect(updateData.skills).toBe(Prisma.JsonNull);
      expect(updateData.llmModelId).toBeNull();
    });

    it('应支持更新scheduled_publish_at', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, { scheduled_publish_at: '2026-06-01T10:00:00Z' });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.scheduledPublishAt).toBeInstanceOf(Date);
    });

    it('应支持清除scheduled_publish_at（传null）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(1, { scheduled_publish_at: null });

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.scheduledPublishAt).toBeNull();
    });

    it('内容变化时应递增版本号并创建版本快照', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: '新内容', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '新内容' }, 1);

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

      await service.update(1, { content: '文章内容' }); // same as baseArticle.content

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('AI生成文章内容更新且标题为空时应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, title: 'AI标题', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '# AI标题\n\n正文内容' }, 1);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('AI标题');
    });

    it('AI生成文章内容无有效行时不应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '   \n  \n  ' }, 1);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('手动编写文章内容更新时不应自动提取标题', async () => {
      const manualArticle = { ...baseArticle, writeMode: 'manual', title: '' };
      mockArticleFindFirst.mockResolvedValue(manualArticle);
      mockArticleUpdate.mockResolvedValue({ ...manualArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '# 标题\n\n正文' }, 1);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('已有标题的AI文章内容更新时不应覆盖标题', async () => {
      const aiArticleWithTitle = { ...baseArticle, writeMode: 'ai', title: '原标题' };
      mockArticleFindFirst.mockResolvedValue(aiArticleWithTitle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticleWithTitle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '新内容' }, 1);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('内容更新但userId为空时版本快照createdBy应为null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(1, { content: '新内容' }); // no userId

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          createdBy: null,
        }),
      });
    });
  });

  // ─── delete ───

  describe('delete', () => {
    it('应软删除文章（设置deletedAt）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(1);

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow('文章不存在');
    });
  });

  // ─── review ───

  describe('review', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('审核通过应将状态设为publishing', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'publishing' });

      const result = await service.review(1, true);

      expect(result.status).toBe('publishing');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'publishing' },
      });
    });

    it('AI文章审核不通过应将状态设为draft', async () => {
      const aiPending = { ...pendingArticle, writeMode: 'ai' };
      mockArticleFindFirst.mockResolvedValue(aiPending);
      mockArticleUpdate.mockResolvedValue({ ...aiPending, status: 'draft' });

      const result = await service.review(1, false);

      expect(result.status).toBe('draft');
    });

    it('手动文章审核不通过应将状态设为manual_writing', async () => {
      const manualPending = { ...pendingArticle, writeMode: 'manual' };
      mockArticleFindFirst.mockResolvedValue(manualPending);
      mockArticleUpdate.mockResolvedValue({ ...manualPending, status: 'manual_writing' });

      const result = await service.review(1, false);

      expect(result.status).toBe('manual_writing');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.review(999, true)).rejects.toThrow('文章不存在');
    });

    it('文章状态不是pending_review时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.review(1, true)).rejects.toThrow('文章当前状态不支持审核操作');
    });
  });

  // ─── regenerate ───

  describe('regenerate', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('应将状态设为generating', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'generating' });

      const result = await service.regenerate(1);

      expect(result.status).toBe('generating');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generating' },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.regenerate(999)).rejects.toThrow('文章不存在');
    });

    it('文章状态不是pending_review时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.regenerate(1)).rejects.toThrow('文章当前状态不支持重新生成');
    });
  });

  // ─── listVersions ───

  describe('listVersions', () => {
    it('应返回文章的版本列表（按版本号降序）', async () => {
      const versions = [
        { id: 2, articleId: 1, version: 2, content: 'v2', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 1, articleId: 1, version: 1, content: 'v1', createdBy: 1, createdAt: new Date(), deletedAt: null },
      ];
      mockArticleVersionFindMany.mockResolvedValue(versions);

      const result = await service.listVersions(1);

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
      mockArticleVersionFindMany.mockResolvedValue([]);

      const result = await service.listVersions(1);

      expect(result).toHaveLength(0);
    });

    it('版本映射应正确处理null的createdBy', async () => {
      const version = {
        id: 1, articleId: 1, version: 1, content: 'c',
        createdBy: null, createdAt: new Date(), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(1);

      expect(result[0].created_by).toBeNull();
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
        platforms: ['新浪'],
        skills: 1,
        llmModelId: 2,
        content: '内容',
        version: 3,
        status: 'draft',
        scheduledPublishAt: new Date('2026-06-01'),
        createdBy: 5,
        createdAt: new Date('2026-01-01'),
        updatedAt: new Date('2026-01-02'),
      };

      mockArticleFindFirst.mockResolvedValue(fullArticle);

      const result = await service.getById(42);

      expect(result.id).toBe(42);
      expect(result.project_id).toBe(10);
      expect(result.title).toBe('完整文章');
      expect(result.article_type).toBe('seo');
      expect(result.write_mode).toBe('ai');
      expect(result.keywords).toBe('kw');
      expect(result.portrait).toBe('画像');
      expect(result.images).toEqual(['img.jpg']);
      expect(result.platforms).toEqual(['新浪']);
      expect(result.skills).toBe(1);
      expect(result.llm_model_id).toBe(2);
      expect(result.content).toBe('内容');
      expect(result.version).toBe(3);
      expect(result.status).toBe('draft');
      expect(result.scheduled_publish_at).toEqual(new Date('2026-06-01'));
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
        platforms: null,
        skills: null,
        llmModelId: null,
        content: null,
        version: 0,
        status: 'draft',
        scheduledPublishAt: null,
        createdBy: null,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockArticleFindFirst.mockResolvedValue(nullArticle);

      const result = await service.getById(1);

      expect(result.article_type).toBeNull();
      expect(result.write_mode).toBeNull();
      expect(result.keywords).toBeNull();
      expect(result.portrait).toBeNull();
      expect(result.images).toBeNull();
      expect(result.platforms).toBeNull();
      expect(result.skills).toBeNull();
      expect(result.llm_model_id).toBeNull();
      expect(result.content).toBeNull();
      expect(result.scheduled_publish_at).toBeNull();
      expect(result.created_by).toBeNull();
    });
  });
});

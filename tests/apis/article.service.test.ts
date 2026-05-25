/**
 * @jest-environment node
 */
import { ArticleServiceImpl } from '../../apis/service/impl/article.service.impl';
import { ArticleStatus } from '../../apis/entity';
import { AuthContext } from '../../apis/service/article.service';
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

const PROJECT_ID = 10;
const sysadminAuth: AuthContext = { userId: 1, role: 'sysadmin' };
const adminAuth: AuthContext = { userId: 2, role: 'admin' };
const otherAuth: AuthContext = { userId: 3, role: 'sysadmin' };

const baseArticle = {
  id: 1,
  projectId: PROJECT_ID,
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

  // ─── Business rule queries (C-2: moved from controller) ───

  describe('Business rule queries', () => {
    it('isSettingsEditable: draft可编辑设置', () => {
      expect(service.isSettingsEditable('draft')).toBe(true);
    });

    it('isSettingsEditable: 非draft不可编辑设置', () => {
      expect(service.isSettingsEditable('manual_writing')).toBe(false);
      expect(service.isSettingsEditable('generating')).toBe(false);
      expect(service.isSettingsEditable('published')).toBe(false);
    });

    it('isContentEditable: 允许编辑正文的状态', () => {
      expect(service.isContentEditable('draft')).toBe(true);
      expect(service.isContentEditable('manual_writing')).toBe(true);
      expect(service.isContentEditable('generate_failed')).toBe(true);
      expect(service.isContentEditable('publish_failed')).toBe(true);
    });

    it('isContentEditable: 不允许编辑正文的状态', () => {
      expect(service.isContentEditable('generating')).toBe(false);
      expect(service.isContentEditable('pending_review')).toBe(false);
      expect(service.isContentEditable('publishing')).toBe(false);
      expect(service.isContentEditable('published')).toBe(false);
    });

    it('isValidStatusTransition: 合法转换', () => {
      expect(service.isValidStatusTransition('draft', 'generating')).toBe(true);
      expect(service.isValidStatusTransition('draft', 'manual_writing')).toBe(true);
      expect(service.isValidStatusTransition('manual_writing', 'pending_review')).toBe(true);
    });

    it('isValidStatusTransition: 非法转换', () => {
      expect(service.isValidStatusTransition('draft', 'pending_review')).toBe(false);
      expect(service.isValidStatusTransition('draft', 'published')).toBe(false);
      expect(service.isValidStatusTransition('published', 'draft')).toBe(false);
    });

    it('isValidStatusTransition: 不存在的源状态', () => {
      expect(service.isValidStatusTransition('nonexistent', 'draft')).toBe(false);
    });
  });

  // ─── list ───

  describe('list', () => {
    it('应返回文章列表和总数', async () => {
      mockArticleFindMany.mockResolvedValue([baseArticle]);
      mockArticleCount.mockResolvedValue(1);

      const result = await service.list(PROJECT_ID, 1, 10);

      expect(result.list).toHaveLength(1);
      expect(result.list[0].id).toBe(1);
      expect(result.list[0].title).toBe('测试文章');
      expect(result.total).toBe(1);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ projectId: PROJECT_ID, deletedAt: null }),
          orderBy: { id: 'desc' },
          skip: 0,
          take: 10,
        }),
      );
    });

    it('应支持分页参数', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(25);

      const result = await service.list(PROJECT_ID, 3, 10);

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

      await service.list(PROJECT_ID, 1, 10, '测试关键词');

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

      await service.list(PROJECT_ID, 1, 10, undefined, 'draft');

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('应支持搜索和状态同时过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, '关键词', 'pending_review');

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

      await service.list(PROJECT_ID, 1, 10, undefined, undefined, adminAuth);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            project: {
              operators: { some: { userId: adminAuth.userId } },
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

      await service.list(PROJECT_ID, 1, 10, undefined, undefined, sysadminAuth);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('admin角色但userId为0不添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, undefined, undefined, { userId: 0, role: 'admin' });

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('应返回空列表', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      const result = await service.list(PROJECT_ID, 1, 10);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('search为空字符串时不应添加搜索过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, '');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.keywords).toBeUndefined();
    });

    it('status为空字符串时不应添加状态过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, undefined, '');

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.status).toBeUndefined();
    });

    it('view角色不应添加项目操作员过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, undefined, undefined, { userId: 3, role: 'view' });

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.project).toBeUndefined();
    });

    it('admin角色同时带搜索、状态和userId时应组合所有过滤', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 10, '关键词', 'draft', adminAuth);

      const callArgs = mockArticleFindMany.mock.calls[0][0] as any;
      expect(callArgs.where.keywords).toEqual({ contains: '关键词', mode: 'insensitive' });
      expect(callArgs.where.status).toBe('draft');
      expect(callArgs.where.project).toEqual({
        operators: { some: { userId: adminAuth.userId } },
        company: { status: true },
        status: true,
      });
    });

    it('第一页skip应为0', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 1, 20);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 20 }),
      );
    });

    it('page为2 pageSize为5时skip应为5', async () => {
      mockArticleFindMany.mockResolvedValue([]);
      mockArticleCount.mockResolvedValue(0);

      await service.list(PROJECT_ID, 2, 5);

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });
  });

  // ─── getById ───

  describe('getById', () => {
    it('应返回指定ID的文章', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      const result = await service.getById(1);

      expect(result.id).toBe(1);
      expect(result.title).toBe('测试文章');
      expect(result.project_id).toBe(PROJECT_ID);
      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow('文章不存在');
    });

    it('getById不需要auth参数', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await service.getById(1);

      expect(mockArticleFindFirst).toHaveBeenCalledWith({
        where: { id: 1, deletedAt: null },
      });
    });
  });

  // ─── create ───

  describe('create', () => {
    it('应创建文章并返回映射后的对象', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      const result = await service.create(PROJECT_ID, { title: '测试文章' }, sysadminAuth);

      expect(result.id).toBe(1);
      expect(result.title).toBe('测试文章');
      expect(mockArticleCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          projectId: PROJECT_ID,
          title: '测试文章',
          version: 1,
          createdBy: sysadminAuth.userId,
        }),
      });
    });

    it('未提供title时应默认为空字符串', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, title: '' });

      await service.create(PROJECT_ID, {}, sysadminAuth);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ title: '' }),
        }),
      );
    });

    it('未提供status时应默认为draft', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T' }, sysadminAuth);

      expect(mockArticleCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'draft' }),
        }),
      );
    });

    it('应支持所有可选字段', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, {
        title: '标题',
        article_type: 'seo',
        write_mode: 'manual',
        keywords: 'kw',
        portrait: '画像',
        images: ['img.jpg'],
        platforms: ['新浪'],
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

      await service.create(PROJECT_ID, {
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

      await service.create(PROJECT_ID, { title: 'T', content: '初始内容' }, sysadminAuth);

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 1,
          version: 1,
          content: '初始内容',
          createdBy: sysadminAuth.userId,
        },
      });
    });

    it('无content时不应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T' }, sysadminAuth);

      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('content为空字符串时不应创建版本快照', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', content: '' }, sysadminAuth);

      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('images未提供时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toBe(Prisma.JsonNull);
    });

    it('platforms未提供时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.platforms).toBe(Prisma.JsonNull);
    });

    it('skills未提供时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.skills).toBe(Prisma.JsonNull);
    });

    it('images为空数组时应保留空数组', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', images: [] }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toEqual([]);
    });

    it('platforms为空数组时应保留空数组', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', platforms: [] }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.platforms).toEqual([]);
    });

    it('skills为空数组时应保留空数组', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', skills: [] }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.skills).toEqual([]);
    });

    it('status为generating时应正确设置', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await service.create(PROJECT_ID, { title: 'T', status: 'generating' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.status).toBe('generating');
    });

    it('status为manual_writing时应正确设置', async () => {
      mockArticleCreate.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await service.create(PROJECT_ID, { title: 'T', status: 'manual_writing' }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.status).toBe('manual_writing');
    });

    it('llm_model_id为0时应设为null', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', llm_model_id: 0 }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.llmModelId).toBeNull();
    });

    it('images为null时应设为Prisma.JsonNull', async () => {
      mockArticleCreate.mockResolvedValue(baseArticle);

      await service.create(PROJECT_ID, { title: 'T', images: null as any }, sysadminAuth);

      const callData = mockArticleCreate.mock.calls[0][0].data;
      expect(callData.images).toBe(Prisma.JsonNull);
    });

    it('content有值时版本快照应记录正确的articleId', async () => {
      const created = { ...baseArticle, id: 42 };
      mockArticleCreate.mockResolvedValue(created);
      mockArticleVersionCreate.mockResolvedValue({});

      await service.create(PROJECT_ID, { title: 'T', content: '内容' }, sysadminAuth);

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 42,
          version: 1,
          content: '内容',
          createdBy: sysadminAuth.userId,
        },
      });
    });
  });

  // ─── update (with H-3/H-4 auth checks inside transaction) ───

  describe('update', () => {
    it('应更新文章并返回映射后的对象', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, title: '新标题' });

      const result = await service.update(PROJECT_ID, 1, { title: '新标题' }, sysadminAuth);

      expect(result.title).toBe('新标题');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.update(PROJECT_ID, 999, { title: 'T' }, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('项目ID不匹配时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.update(999, 1, { title: 'T' }, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('非创建者非sysadmin应抛出权限异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle); // createdBy: 1

      await expect(service.update(PROJECT_ID, 1, { title: 'T' }, adminAuth)).rejects.toThrow('只能修改自己创建的文章');
    });

    it('非draft状态不可编辑设置', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await expect(service.update(PROJECT_ID, 1, { title: 'T' }, sysadminAuth)).rejects.toThrow('当前文章状态不可编辑');
    });

    it('非法状态转换应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle); // status: 'draft'

      await expect(service.update(PROJECT_ID, 1, { status: 'pending_review' }, sysadminAuth)).rejects.toThrow('非法的状态转换');
    });

    it('draft→generating状态转换应成功', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      const result = await service.update(PROJECT_ID, 1, { status: 'generating' }, sysadminAuth);

      expect(result.status).toBe('generating');
    });

    it('draft→manual_writing状态转换应成功', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      const result = await service.update(PROJECT_ID, 1, { status: 'manual_writing' }, sysadminAuth);

      expect(result.status).toBe('manual_writing');
    });

    it('只更新提供的字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, { title: '新标题' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('新标题');
      expect(updateData.keywords).toBeUndefined();
      expect(updateData.content).toBeUndefined();
    });

    it('应支持更新所有可选字段', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, {
        title: '标题',
        article_type: 'blog',
        write_mode: 'manual',
        keywords: 'kw2',
        portrait: '画像2',
        images: ['new.jpg'],
        platforms: ['搜狐'],
        skills: 2,
        llm_model_id: 3,
        status: 'generating',
      }, sysadminAuth);

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

      await service.update(PROJECT_ID, 1, {
        article_type: '',
        write_mode: '',
        keywords: '',
        portrait: '',
      }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.articleType).toBeNull();
      expect(updateData.writeMode).toBeNull();
      expect(updateData.keywords).toBeNull();
      expect(updateData.portrait).toBeNull();
    });

    it('images/platforms/skills为falsy值时应设为JsonNull或null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, {
        images: null as any,
        platforms: null as any,
        skills: 0,
        llm_model_id: 0,
      }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.images).toBe(Prisma.JsonNull);
      expect(updateData.platforms).toBe(Prisma.JsonNull);
      expect(updateData.skills).toBe(Prisma.JsonNull);
      expect(updateData.llmModelId).toBeNull();
    });

    it('应支持更新scheduled_publish_at', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, { scheduled_publish_at: '2026-06-01T10:00:00Z' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.scheduledPublishAt).toBeInstanceOf(Date);
    });

    it('应支持清除scheduled_publish_at（传null）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, { scheduled_publish_at: null }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.scheduledPublishAt).toBeNull();
    });

    it('内容变化时应递增版本号并创建版本快照', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: '新内容', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '新内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(updateData.content).toBe('新内容');
      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          articleId: 1,
          version: 2,
          content: '新内容',
          createdBy: sysadminAuth.userId,
        }),
      });
    });

    it('内容未变化时不应递增版本号', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, { content: '文章内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('AI生成文章内容更新且标题为空时应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, title: 'AI标题', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '# AI标题\n\n正文内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('AI标题');
    });

    it('AI生成文章内容无有效行时不应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '   \n  \n  ' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('手动编写文章内容更新时不应自动提取标题', async () => {
      const manualArticle = { ...baseArticle, writeMode: 'manual', title: '' };
      mockArticleFindFirst.mockResolvedValue(manualArticle);
      mockArticleUpdate.mockResolvedValue({ ...manualArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '# 标题\n\n正文' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('已有标题的AI文章内容更新时不应覆盖标题', async () => {
      const aiArticleWithTitle = { ...baseArticle, writeMode: 'ai', title: '原标题' };
      mockArticleFindFirst.mockResolvedValue(aiArticleWithTitle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticleWithTitle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '新内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBeUndefined();
    });

    it('版本号为非整数时Math.floor应正确计算新版本号', async () => {
      const nonIntArticle = { ...baseArticle, version: 2.5 };
      mockArticleFindFirst.mockResolvedValue(nonIntArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 3 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '更新内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(3);
    });

    it('标题提取应正确处理##开头的二级标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '## 二级标题\n正文内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('二级标题');
    });

    it('标题提取应正确处理###开头的三级标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '### 三级标题\n正文' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('三级标题');
    });

    it('标题提取应正确处理无#标记的普通行', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '普通标题行\n正文内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('普通标题行');
    });

    it('标题提取应跳过空行和纯空格行', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '   \n\n  \n## 有效标题\n正文' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('有效标题');
    });

    it('内容为null时更新为新内容应触发版本递增', async () => {
      const nullContentArticle = { ...baseArticle, content: null };
      mockArticleFindFirst.mockResolvedValue(nullContentArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2, content: '新内容' });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { content: '新内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBe(2);
      expect(updateData.content).toBe('新内容');
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('只更新status（合法转换）不触发版本递增', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await service.update(PROJECT_ID, 1, { status: 'generating' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.version).toBeUndefined();
      expect(updateData.status).toBe('generating');
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });

    it('同时更新content和其他字段时应正确处理', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, title: '新标题', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      await service.update(PROJECT_ID, 1, { title: '新标题', content: '新内容', keywords: '新关键词' }, sysadminAuth);

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

      await service.update(PROJECT_ID, 1, { images: [] }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.images).toEqual([]);
    });

    it('scheduled_publish_at为空字符串时应设为null', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue(baseArticle);

      await service.update(PROJECT_ID, 1, { scheduled_publish_at: '' as any }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.scheduledPublishAt).toBeNull();
    });

    it('generating状态转换应剥离content', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await service.update(PROJECT_ID, 1, { status: 'generating', content: '不应保存的内容' }, sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.status).toBe('generating');
      expect(updateData.content).toBeUndefined();
      expect(mockArticleVersionCreate).not.toHaveBeenCalled();
    });
  });

  // ─── updateContent ───

  describe('updateContent', () => {
    it('应更新文章正文并创建版本快照', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, content: '新正文', version: 2 });
      mockArticleVersionCreate.mockResolvedValue({});

      const result = await service.updateContent(PROJECT_ID, 1, '新正文', sysadminAuth);

      expect(result.content).toBe('新正文');
      expect(mockArticleVersionCreate).toHaveBeenCalled();
    });

    it('非创建者非sysadmin应抛出权限异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.updateContent(PROJECT_ID, 1, '内容', adminAuth)).rejects.toThrow('只能修改自己创建的文章');
    });

    it('项目ID不匹配应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.updateContent(999, 1, '内容', sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('非content-editable状态不可编辑正文', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'pending_review' });

      await expect(service.updateContent(PROJECT_ID, 1, '内容', sysadminAuth)).rejects.toThrow('当前文章状态不可编辑正文');
    });

    it('draft状态可编辑正文', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2 });

      await service.updateContent(PROJECT_ID, 1, '新内容', sysadminAuth);

      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('manual_writing状态可编辑正文', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, version: 2 });

      await service.updateContent(PROJECT_ID, 1, '新内容', sysadminAuth);

      expect(mockArticleUpdate).toHaveBeenCalled();
    });

    it('AI文章正文更新且标题为空时应提取标题', async () => {
      const aiArticle = { ...baseArticle, writeMode: 'ai', title: '' };
      mockArticleFindFirst.mockResolvedValue(aiArticle);
      mockArticleUpdate.mockResolvedValue({ ...aiArticle, version: 2 });

      await service.updateContent(PROJECT_ID, 1, '# 提取标题\n正文', sysadminAuth);

      const updateData = mockArticleUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('提取标题');
    });
  });

  // ─── delete ───

  describe('delete', () => {
    it('应软删除文章（设置deletedAt）', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(PROJECT_ID, 1, sysadminAuth);

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.delete(PROJECT_ID, 999, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('已软删除的文章再次删除应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.delete(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('文章不存在');
      expect(mockArticleUpdate).not.toHaveBeenCalled();
    });

    it('软删除应设置deletedAt为Date实例', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);
      mockArticleUpdate.mockResolvedValue({ ...baseArticle, deletedAt: new Date() });

      await service.delete(PROJECT_ID, 1, sysadminAuth);

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('非创建者非sysadmin应抛出权限异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.delete(PROJECT_ID, 1, adminAuth)).rejects.toThrow('只能删除自己创建的文章');
    });

    it('已发布的文章不能删除', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'published' });

      await expect(service.delete(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('已发布的文章不能删除');
    });

    it('项目ID不匹配应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle);

      await expect(service.delete(999, 1, sysadminAuth)).rejects.toThrow('文章不存在');
    });
  });

  // ─── review ───

  describe('review', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('审核通过应将状态设为publishing', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'publishing' });

      const result = await service.review(PROJECT_ID, 1, true, sysadminAuth);

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

      const result = await service.review(PROJECT_ID, 1, false, sysadminAuth);

      expect(result.status).toBe('draft');
    });

    it('手动文章审核不通过应将状态设为manual_writing', async () => {
      const manualPending = { ...pendingArticle, writeMode: 'manual' };
      mockArticleFindFirst.mockResolvedValue(manualPending);
      mockArticleUpdate.mockResolvedValue({ ...manualPending, status: 'manual_writing' });

      const result = await service.review(PROJECT_ID, 1, false, sysadminAuth);

      expect(result.status).toBe('manual_writing');
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.review(PROJECT_ID, 999, true, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('文章状态不是pending_review时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.review(PROJECT_ID, 1, true, sysadminAuth)).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('writeMode为null时审核不通过应设为draft', async () => {
      const nullModeArticle = { ...pendingArticle, writeMode: null };
      mockArticleFindFirst.mockResolvedValue(nullModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...nullModeArticle, status: 'draft' });

      const result = await service.review(PROJECT_ID, 1, false, sysadminAuth);

      expect(result.status).toBe('draft');
    });

    it('writeMode为undefined时审核不通过应设为draft', async () => {
      const undefinedModeArticle = { ...pendingArticle, writeMode: undefined };
      mockArticleFindFirst.mockResolvedValue(undefinedModeArticle);
      mockArticleUpdate.mockResolvedValue({ ...undefinedModeArticle, status: 'draft' });

      const result = await service.review(PROJECT_ID, 1, false, sysadminAuth);

      expect(result.status).toBe('draft');
    });

    it('generating状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await expect(service.review(PROJECT_ID, 1, true, sysadminAuth)).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('published状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'published' });

      await expect(service.review(PROJECT_ID, 1, true, sysadminAuth)).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('publish_failed状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'publish_failed' });

      await expect(service.review(PROJECT_ID, 1, true, sysadminAuth)).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('manual_writing状态的文件不能审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await expect(service.review(PROJECT_ID, 1, true, sysadminAuth)).rejects.toThrow('文章当前状态不支持审核操作');
    });

    it('创建者（非sysadmin）不能审核自己的文章', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle); // createdBy: 1

      await expect(service.review(PROJECT_ID, 1, true, { userId: 1, role: 'admin' })).rejects.toThrow('不能审核自己创建的文章');
    });

    it('项目ID不匹配应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.review(999, 1, true, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('非创建者的admin可以审核', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'publishing' });

      const result = await service.review(PROJECT_ID, 1, true, adminAuth); // userId: 2, not creator

      expect(result.status).toBe('publishing');
    });
  });

  // ─── regenerate ───

  describe('regenerate', () => {
    const pendingArticle = { ...baseArticle, status: 'pending_review' };

    it('应将状态设为generating', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);
      mockArticleUpdate.mockResolvedValue({ ...pendingArticle, status: 'generating' });

      const result = await service.regenerate(PROJECT_ID, 1, sysadminAuth);

      expect(result.status).toBe('generating');
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generating' },
      });
    });

    it('文章不存在时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(null);

      await expect(service.regenerate(PROJECT_ID, 999, sysadminAuth)).rejects.toThrow('文章不存在');
    });

    it('文章状态不是合法状态时应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('generate_failed状态应允许重新生成', async () => {
      const failedArticle = { ...baseArticle, status: 'generate_failed' };
      mockArticleFindFirst.mockResolvedValue(failedArticle);
      mockArticleUpdate.mockResolvedValue({ ...failedArticle, status: 'generating' });

      const result = await service.regenerate(PROJECT_ID, 1, sysadminAuth);

      expect(result.status).toBe('generating');
    });

    it('draft状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'draft' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('manual_writing状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'manual_writing' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('generating状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'generating' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('publishing状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'publishing' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('publish_failed状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'publish_failed' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('published状态不能重新生成', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status: 'published' });

      await expect(service.regenerate(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('当前文章状态不支持重新生成');
    });

    it('非创建者非sysadmin应抛出权限异常', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.regenerate(PROJECT_ID, 1, adminAuth)).rejects.toThrow('只能重新生成自己创建的文章');
    });

    it('项目ID不匹配应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(pendingArticle);

      await expect(service.regenerate(999, 1, sysadminAuth)).rejects.toThrow('文章不存在');
    });
  });

  // ─── submitForReview ───

  describe('submitForReview', () => {
    const manualArticle = { ...baseArticle, status: 'manual_writing', writeMode: 'manual', content: '正文内容' };

    it('手工编写中文章应成功提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue(manualArticle);
      mockArticleUpdate.mockResolvedValue({ ...manualArticle, status: 'pending_review' });

      const result = await service.submitForReview(PROJECT_ID, 1, sysadminAuth);

      expect(result.status).toBe('pending_review');
    });

    it('非manual_writing状态不能提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue(baseArticle); // status: 'draft'

      await expect(service.submitForReview(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('只有手工编写中的文章可以提交审核');
    });

    it('内容为空不能提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...manualArticle, content: '' });

      await expect(service.submitForReview(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('文章内容不能为空');
    });

    it('内容为null不能提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...manualArticle, content: null });

      await expect(service.submitForReview(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('文章内容不能为空');
    });

    it('内容为纯空格不能提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue({ ...manualArticle, content: '   ' });

      await expect(service.submitForReview(PROJECT_ID, 1, sysadminAuth)).rejects.toThrow('文章内容不能为空');
    });

    it('非创建者非sysadmin不能提交审核', async () => {
      mockArticleFindFirst.mockResolvedValue(manualArticle);

      await expect(service.submitForReview(PROJECT_ID, 1, adminAuth)).rejects.toThrow('只能操作自己创建的文章');
    });

    it('项目ID不匹配应抛出异常', async () => {
      mockArticleFindFirst.mockResolvedValue(manualArticle);

      await expect(service.submitForReview(999, 1, sysadminAuth)).rejects.toThrow('文章不存在');
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

    it('应正确映射版本的所有字段', async () => {
      const version = {
        id: 10, articleId: 5, version: 3, content: '版本3内容',
        createdBy: 7, createdAt: new Date('2026-03-15'), deletedAt: null,
      };
      mockArticleVersionFindMany.mockResolvedValue([version]);

      const result = await service.listVersions(5);

      expect(result[0].id).toBe(10);
      expect(result[0].article_id).toBe(5);
      expect(result[0].version).toBe(3);
      expect(result[0].content).toBe('版本3内容');
      expect(result[0].created_by).toBe(7);
      expect(result[0].created_at).toEqual(new Date('2026-03-15'));
    });

    it('多个版本应按版本号降序排列', async () => {
      const versions = [
        { id: 3, articleId: 1, version: 3, content: 'v3', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 2, articleId: 1, version: 2, content: 'v2', createdBy: 1, createdAt: new Date(), deletedAt: null },
        { id: 1, articleId: 1, version: 1, content: 'v1', createdBy: 1, createdAt: new Date(), deletedAt: null },
      ];
      mockArticleVersionFindMany.mockResolvedValue(versions);

      const result = await service.listVersions(1);

      expect(result).toHaveLength(3);
      expect(result[0].version).toBe(3);
      expect(result[1].version).toBe(2);
      expect(result[2].version).toBe(1);
      expect(mockArticleVersionFindMany).toHaveBeenCalledWith({
        where: { articleId: 1, deletedAt: null },
        orderBy: { version: 'desc' },
      });
    });
  });

  // ─── mapArticle 映射验证 ───

  describe('字段映射', () => {
    it('mapArticle应正确映射所有字段', async () => {
      const fullArticle = {
        id: 42,
        projectId: PROJECT_ID,
        title: '完整文章',
        articleType: 'seo',
        writeMode: 'ai',
        keywords: 'kw',
        portrait: '画像',
        images: ['img.jpg'],
        platforms: ['新浪'],
        skills: [1],
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
      expect(result.project_id).toBe(PROJECT_ID);
      expect(result.title).toBe('完整文章');
      expect(result.article_type).toBe('seo');
      expect(result.write_mode).toBe('ai');
      expect(result.keywords).toBe('kw');
      expect(result.portrait).toBe('画像');
      expect(result.images).toEqual(['img.jpg']);
      expect(result.platforms).toEqual(['新浪']);
      expect(result.skills).toEqual([1]);
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
        projectId: PROJECT_ID,
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

    it('应实现updateContent方法', () => {
      expect(typeof service.updateContent).toBe('function');
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

    it('应实现submitForReview方法', () => {
      expect(typeof service.submitForReview).toBe('function');
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
        'pending_review', 'publishing', 'publish_failed', 'published',
      ];

      for (const status of statuses) {
        mockArticleFindFirst.mockResolvedValue({ ...baseArticle, status });
        const result = await service.getById(1);
        expect(result.status).toBe(status);
      }
    });
  });
});

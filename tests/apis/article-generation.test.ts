/**
 * @jest-environment node
 */

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

// Mock config
const mockConfig = {
  cron: {
    articleGenerationInterval: '*/5 * * * *',
    articleGenerationEnabled: true,
  },
};

jest.mock('../../apis/config', () => ({
  __esModule: true,
  default: mockConfig,
}));

jest.mock('node-cron', () => ({
  validate: jest.fn().mockReturnValue(true),
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

const mockGenerateArticle = jest.fn();

jest.mock('../../apis/service/impl/llm.service.impl', () => ({
  LlmServiceImpl: jest.fn().mockImplementation(() => ({
    generateArticle: mockGenerateArticle,
  })),
}));

jest.spyOn(console, 'log').mockImplementation();
jest.spyOn(console, 'error').mockImplementation();

import cron from 'node-cron';
import {
  startArticleGenerationCron,
  stopArticleGenerationCron,
  processNextGeneratingArticle,
} from '../../apis/scheduler/article-generation.scheduler';
import { getPrisma } from '../../apis/utils';

function mockPrisma(methods: Record<string, any>) {
  (getPrisma as jest.Mock).mockReturnValue(methods);
}

function createDefaultPrisma(overrides: Record<string, any> = {}) {
  const {
    article = {},
    knowledgeBase = {},
    knowledgeImage = {},
    skills = {},
    articleVersion = {},
    $transaction = jest.fn((callbacks: any[]) => Promise.all(callbacks)),
    ...rest
  } = overrides;

  return {
    article: {
      findMany: jest.fn().mockResolvedValue([]),
      update: jest.fn().mockResolvedValue({}),
      ...article,
    },
    knowledgeBase: {
      findMany: jest.fn().mockResolvedValue([]),
      ...knowledgeBase,
    },
    knowledgeImage: {
      findMany: jest.fn().mockResolvedValue([]),
      ...knowledgeImage,
    },
    skills: {
      findFirst: jest.fn().mockResolvedValue(null),
      ...skills,
    },
    articleVersion: {
      create: jest.fn().mockResolvedValue({ id: 1 }),
      ...articleVersion,
    },
    $transaction,
    ...rest,
  };
}

describe('Article Generation Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    stopArticleGenerationCron();
    mockConfig.cron.articleGenerationEnabled = true;
    mockConfig.cron.articleGenerationInterval = '*/5 * * * *';
    (cron.validate as jest.Mock).mockReturnValue(true);
    (cron.schedule as jest.Mock).mockReturnValue({ stop: jest.fn() });
    mockGenerateArticle.mockReset();
    mockGenerateArticle.mockResolvedValue('# 生成内容\n\n这是测试内容');
  });

  // ─── startArticleGenerationCron ───

  describe('startArticleGenerationCron', () => {
    it('应在启用且表达式有效时启动定时任务', () => {
      startArticleGenerationCron();

      expect(cron.validate).toHaveBeenCalledWith('*/5 * * * *');
      expect(cron.schedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('[文章生成] 定时任务已启动'),
      );
    });

    it('应在禁用时不启动定时任务', () => {
      mockConfig.cron.articleGenerationEnabled = false;

      startArticleGenerationCron();

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[文章生成] 定时任务已禁用');
    });

    it('应在cron表达式无效时不启动', () => {
      mockConfig.cron.articleGenerationInterval = 'invalid';
      (cron.validate as jest.Mock).mockReturnValue(false);

      startArticleGenerationCron();

      expect(cron.schedule).not.toHaveBeenCalled();
      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('无效的cron表达式'),
      );
    });
  });

  // ─── stopArticleGenerationCron ───

  describe('stopArticleGenerationCron', () => {
    it('应停止运行中的定时任务', () => {
      const mockStop = jest.fn();
      (cron.schedule as jest.Mock).mockReturnValue({ stop: mockStop });

      startArticleGenerationCron();
      stopArticleGenerationCron();

      expect(mockStop).toHaveBeenCalled();
      expect(console.log).toHaveBeenCalledWith('[文章生成] 定时任务已停止');
    });

    it('应在没有运行中的任务时不执行任何操作', () => {
      stopArticleGenerationCron();

      // No error means success - no task to stop
      expect(console.log).not.toHaveBeenCalledWith('[文章生成] 定时任务已停止');
    });
  });

  // ─── processNextGeneratingArticle ───

  describe('processNextGeneratingArticle', () => {
    it('应在上一批次仍在执行时跳过', async () => {
      let resolveFindMany: (value: any[]) => void;
      const pendingFindMany = new Promise<any[]>(resolve => {
        resolveFindMany = resolve;
      });

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockReturnValue(pendingFindMany) },
      }));

      // 启动第一个调用（会在 findMany 处挂起，isRunning=true）
      const firstCall = processNextGeneratingArticle();

      // 第二次调用应跳过（isRunning=true）
      await processNextGeneratingArticle();

      expect(console.log).toHaveBeenCalledWith('[文章生成] 上一批次仍在执行，跳过本次调度');

      // 解除第一个调用
      resolveFindMany!([]);
      await firstCall;
    });

    it('应在没有待生成文章时直接返回', async () => {
      mockPrisma(createDefaultPrisma());

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).not.toHaveBeenCalled();
    });

    it('应完成处理后重置isRunning标志', async () => {
      mockPrisma(createDefaultPrisma());

      await processNextGeneratingArticle();

      // 第二次调用应正常进入（不跳过），证明 isRunning 已重置
      await processNextGeneratingArticle();

      // findMany 被调用两次证明两次都进入了处理逻辑
      const prisma = getPrisma() as any;
      expect(prisma.article.findMany).toHaveBeenCalledTimes(2);
    });

    it('应成功处理单篇文章的完整流程', async () => {
      const mockArticle = {
        id: 1,
        projectId: 10,
        title: '测试文章',
        keywords: '关键词1,关键词2',
        portrait: '技术从业者',
        skills: null,
        version: 1.0,
        status: 'generating',
        updatedAt: new Date(),
      };

      const mockKbs = [{ id: 100 }, { id: 101 }];
      const mockImages = [
        { title: '图片1', description: '描述1', imageUrl: '/uploads/1.jpg' },
        { title: '图片2', description: '', imageUrl: '/uploads/2.jpg' },
      ];

      const articleUpdate = jest.fn().mockResolvedValue({ ...mockArticle, status: 'pending_review' });
      const versionCreate = jest.fn().mockResolvedValue({ id: 1 });
      const kbFindMany = jest.fn().mockResolvedValue(mockKbs);
      const imgFindMany = jest.fn().mockResolvedValue(mockImages);
      const $transaction = jest.fn((callbacks: any[]) => Promise.all(callbacks));

      mockPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]), update: articleUpdate },
        knowledgeBase: { findMany: kbFindMany },
        knowledgeImage: { findMany: imgFindMany },
        skills: { findFirst: jest.fn().mockResolvedValue(null) },
        articleVersion: { create: versionCreate },
        $transaction,
      });

      await processNextGeneratingArticle();

      // 验证查询待生成文章
      expect(getPrisma()).toHaveProperty('article');
      const prisma = getPrisma() as any;
      expect(prisma.article.findMany).toHaveBeenCalledWith({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      });

      // 验证获取知识库
      expect(kbFindMany).toHaveBeenCalledWith({
        where: { projectId: 10, status: true },
        select: { id: true },
      });

      // 验证获取图片
      expect(imgFindMany).toHaveBeenCalledWith({
        where: { baseId: { in: [100, 101] } },
      });

      // 验证调用 LLM
      expect(mockGenerateArticle).toHaveBeenCalledWith({
        title: '测试文章',
        keywords: '关键词1,关键词2',
        portrait: '技术从业者',
        images: [
          { title: '图片1', description: '描述1', imageUrl: '/uploads/1.jpg' },
          { title: '图片2', description: '', imageUrl: '/uploads/2.jpg' },
        ],
        skills: '',
      });

      // 验证事务
      expect($transaction).toHaveBeenCalled();
      expect(versionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          articleId: 1,
          version: 2,
          content: '# 生成内容\n\n这是测试内容',
          createdBy: null,
        }),
      });
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          title: '测试文章',
          content: '# 生成内容\n\n这是测试内容',
          version: 2,
          status: 'pending_review',
        }),
      });
    });

    it('应按顺序处理多篇文章', async () => {
      const articles = [
        { id: 1, projectId: 10, title: '文章1', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
        { id: 2, projectId: 11, title: '文章2', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
      ];

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue(articles) },
      }));

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledTimes(2);
      expect(mockGenerateArticle).toHaveBeenNthCalledWith(1, expect.objectContaining({ title: '文章1' }));
      expect(mockGenerateArticle).toHaveBeenNthCalledWith(2, expect.objectContaining({ title: '文章2' }));

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('本批次取到 2 篇待生成文章'),
      );
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('本批次处理完成，成功 2/2'),
      );
    });

    it('应在文章处理失败时标记为generate_failed并继续处理下一篇', async () => {
      const articles = [
        { id: 1, projectId: 10, title: '成功文章', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
        { id: 2, projectId: 10, title: '失败文章', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
        { id: 3, projectId: 10, title: '成功文章2', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
      ];

      const articleUpdate = jest.fn().mockResolvedValue({});

      // 第二篇文章生成失败
      mockGenerateArticle
        .mockResolvedValueOnce('# 内容1')
        .mockRejectedValueOnce(new Error('LLM服务错误'))
        .mockResolvedValueOnce('# 内容3');

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue(articles), update: articleUpdate },
      }));

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledTimes(3);
      // 失败的文章应被标记为 generate_failed
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: 'generate_failed' },
      });
      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('成功 2/3'),
      );
    });

    it('应在更新失败状态也出错时处理异常', async () => {
      const articles = [
        { id: 1, projectId: 10, title: '失败文章', keywords: '', portrait: '通用读者', skills: null, version: 1, status: 'generating', updatedAt: new Date() },
      ];

      mockGenerateArticle.mockRejectedValue(new Error('生成失败'));

      const articleUpdate = jest.fn().mockRejectedValue(new Error('数据库错误'));

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue(articles), update: articleUpdate },
      }));

      // 不应抛出异常
      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('更新失败状态时出错'),
      );
    });

    it('应处理findMany的批次级错误', async () => {
      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockRejectedValue(new Error('数据库连接失败')) },
      }));

      // 不应抛出异常
      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();

      expect(console.error).toHaveBeenCalledWith(
        expect.stringContaining('批次处理失败'),
      );
    });

    // ─── processSingleArticle 分支覆盖 ───

    it('应在没有知识库时使用空图片列表', async () => {
      const mockArticle = {
        id: 5, projectId: 10, title: '无知识库文章', keywords: '', portrait: '通用读者',
        skills: null, version: 1, status: 'generating', updatedAt: new Date(),
      };

      const kbFindMany = jest.fn().mockResolvedValue([]);

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]) },
        knowledgeBase: { findMany: kbFindMany },
      }));

      await processNextGeneratingArticle();

      // 图片查询应使用空数组
      const prisma = getPrisma() as any;
      expect(prisma.knowledgeImage.findMany).toHaveBeenCalledWith({
        where: { baseId: { in: [] } },
      });

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ images: [] }),
      );
    });

    it('应在skills为对象时查找技能名称', async () => {
      const mockArticle = {
        id: 6, projectId: 10, title: '有技能文章', keywords: '', portrait: '通用读者',
        skills: { id: 42 }, version: 1, status: 'generating', updatedAt: new Date(),
      };

      const skillsFindFirst = jest.fn().mockResolvedValue({ id: 42, name: 'SEO优化' });

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]) },
        skills: { findFirst: skillsFindFirst },
      }));

      await processNextGeneratingArticle();

      expect(skillsFindFirst).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: 'SEO优化' }),
      );
    });

    it('应在skills为数字ID时查找技能名称', async () => {
      const mockArticle = {
        id: 7, projectId: 10, title: '技能ID文章', keywords: '', portrait: '通用读者',
        skills: 99, version: 1, status: 'generating', updatedAt: new Date(),
      };

      const skillsFindFirst = jest.fn().mockResolvedValue({ id: 99, name: '内容营销' });

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]) },
        skills: { findFirst: skillsFindFirst },
      }));

      await processNextGeneratingArticle();

      expect(skillsFindFirst).toHaveBeenCalledWith({ where: { id: 99 } });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '内容营销' }),
      );
    });

    it('应在skillsID查不到记录时使用空字符串', async () => {
      const mockArticle = {
        id: 8, projectId: 10, title: '技能查不到文章', keywords: '', portrait: '通用读者',
        skills: { id: 999 }, version: 1, status: 'generating', updatedAt: new Date(),
      };

      const skillsFindFirst = jest.fn().mockResolvedValue(null);

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]) },
        skills: { findFirst: skillsFindFirst },
      }));

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '' }),
      );
    });

    it('应在文章标题为空时从内容中提取标题', async () => {
      const mockArticle = {
        id: 9, projectId: 10, title: '', keywords: '', portrait: '通用读者',
        skills: null, version: 1, status: 'generating', updatedAt: new Date(),
      };

      mockGenerateArticle.mockResolvedValue('# 这是生成的标题\n\n正文内容');

      const versionCreate = jest.fn().mockResolvedValue({ id: 1 });
      const articleUpdate = jest.fn().mockResolvedValue({});

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]), update: articleUpdate },
        articleVersion: { create: versionCreate },
      }));

      await processNextGeneratingArticle();

      // 标题应从内容提取（去掉 # 前缀）
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 9 },
        data: expect.objectContaining({
          title: '这是生成的标题',
        }),
      });
    });

    it('应正确递增版本号', async () => {
      const mockArticle = {
        id: 10, projectId: 10, title: '版本递增', keywords: '', portrait: '通用读者',
        skills: null, version: 3, status: 'generating', updatedAt: new Date(),
      };

      const versionCreate = jest.fn().mockResolvedValue({ id: 1 });
      const articleUpdate = jest.fn().mockResolvedValue({});

      mockPrisma(createDefaultPrisma({
        article: { findMany: jest.fn().mockResolvedValue([mockArticle]), update: articleUpdate },
        articleVersion: { create: versionCreate },
      }));

      await processNextGeneratingArticle();

      expect(versionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 4 }),
      });
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 10 },
        data: expect.objectContaining({ version: 4 }),
      });
    });
  });
});

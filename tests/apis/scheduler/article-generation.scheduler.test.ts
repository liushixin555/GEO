/**
 * @jest-environment node
 */

// Mock node-cron before importing the scheduler
const mockSchedule = jest.fn();
const mockValidate = jest.fn();
const mockStop = jest.fn();
const mockScheduledTask = { stop: mockStop };

jest.mock('node-cron', () => ({
  schedule: mockSchedule,
  validate: mockValidate,
}));

// Mock prisma
const mockArticleFindMany = jest.fn();
const mockArticleUpdate = jest.fn();
const mockKnowledgeBaseFindMany = jest.fn();
const mockKnowledgeImageFindMany = jest.fn();
const mockSkillsFindFirst = jest.fn();
const mockArticleVersionCreate = jest.fn();
const mockTransaction = jest.fn();

const mockPrisma = {
  article: {
    findMany: mockArticleFindMany,
    update: mockArticleUpdate,
  },
  knowledgeBase: {
    findMany: mockKnowledgeBaseFindMany,
  },
  knowledgeImage: {
    findMany: mockKnowledgeImageFindMany,
  },
  skills: {
    findFirst: mockSkillsFindFirst,
  },
  articleVersion: {
    create: mockArticleVersionCreate,
  },
  $transaction: mockTransaction,
};

jest.mock('../../../apis/utils', () => ({
  getPrisma: () => mockPrisma,
}));

// Mock LlmServiceImpl
const mockGenerateArticle = jest.fn();
jest.mock('../../../apis/service/impl/llm.service.impl', () => ({
  LlmServiceImpl: jest.fn().mockImplementation(() => ({
    generateArticle: mockGenerateArticle,
  })),
}));

describe('article-generation.scheduler', () => {
  beforeEach(() => {
    jest.resetModules();
    jest.clearAllMocks();

    // Default config env vars
    process.env.CRON_ARTICLE_ENABLED = 'true';
    process.env.CRON_ARTICLE_INTERVAL = '*/5 * * * *';
    process.env.JWT_SECRET = 'test-secret';
    process.env.DB_PASSWORD = 'test';

    mockValidate.mockReturnValue(true);
    mockSchedule.mockReturnValue(mockScheduledTask);
    mockStop.mockReset();
  });

  afterEach(() => {
    delete process.env.CRON_ARTICLE_ENABLED;
    delete process.env.CRON_ARTICLE_INTERVAL;
    delete process.env.JWT_SECRET;
    delete process.env.DB_PASSWORD;
  });

  // =========================================================
  // 1. startArticleGenerationCron
  // =========================================================
  describe('startArticleGenerationCron', () => {
    test('应在启用时启动定时任务', () => {
      const { startArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();

      expect(mockSchedule).toHaveBeenCalledTimes(1);
      expect(mockSchedule).toHaveBeenCalledWith('*/5 * * * *', expect.any(Function));
    });

    test('应在禁用时不启动定时任务', () => {
      process.env.CRON_ARTICLE_ENABLED = 'false';

      const { startArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test('应在无效cron表达式时不启动定时任务', () => {
      mockValidate.mockReturnValue(false);

      const { startArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();

      expect(mockSchedule).not.toHaveBeenCalled();
    });

    test('应使用配置的cron表达式', () => {
      process.env.CRON_ARTICLE_INTERVAL = '0 * * * *';
      mockValidate.mockReturnValue(true);

      const { startArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();

      expect(mockSchedule).toHaveBeenCalledWith('0 * * * *', expect.any(Function));
    });

    test('定时回调应调用 processNextGeneratingArticle', async () => {
      let scheduledCallback: Function | null = null;
      mockSchedule.mockImplementation((_expr: string, cb: Function) => {
        scheduledCallback = cb;
        return mockScheduledTask;
      });

      const { startArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');
      startArticleGenerationCron();

      expect(scheduledCallback).not.toBeNull();

      // Execute the scheduled callback - should invoke processNextGeneratingArticle
      mockArticleFindMany.mockResolvedValue([]);
      await scheduledCallback!();

      expect(mockArticleFindMany).toHaveBeenCalled();
    });
  });

  // =========================================================
  // 2. stopArticleGenerationCron
  // =========================================================
  describe('stopArticleGenerationCron', () => {
    test('应在任务存在时停止定时任务', () => {
      mockSchedule.mockReturnValue(mockScheduledTask);

      const { startArticleGenerationCron, stopArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();
      stopArticleGenerationCron();

      expect(mockStop).toHaveBeenCalledTimes(1);
    });

    test('应在任务不存在时不报错', () => {
      const { stopArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      // Call stop without starting — task is null
      expect(() => stopArticleGenerationCron()).not.toThrow();
      expect(mockStop).not.toHaveBeenCalled();
    });

    test('应能正确停止后重新启动', () => {
      const { startArticleGenerationCron, stopArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();
      stopArticleGenerationCron();
      startArticleGenerationCron();

      expect(mockSchedule).toHaveBeenCalledTimes(2);
      expect(mockStop).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================
  // 3. processNextGeneratingArticle - 基本流程
  // =========================================================
  describe('processNextGeneratingArticle', () => {
    test('应在没有待处理文章时直接返回', async () => {
      mockArticleFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledWith({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      });
      expect(mockGenerateArticle).not.toHaveBeenCalled();
    });

    test('应正确查询状态为 generating 的文章', async () => {
      mockArticleFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledWith({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
        take: 10,
      });
    });

    test('应在正在运行时跳过调度', async () => {
      // Make the first call hang to simulate a running process
      let firstResolve: Function;
      const firstCall = new Promise<void>(resolve => { firstResolve = resolve; });
      mockArticleFindMany.mockImplementationOnce(() => firstCall);
      mockArticleFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      // Start first call (won't complete yet)
      const first = processNextGeneratingArticle();

      // Second call should be skipped because isRunning = true
      await processNextGeneratingArticle();

      // Resolve the first call
      mockArticleFindMany.mockResolvedValue([]);
      firstResolve!();
      await first;

      // Only 1 call because the second was skipped
      expect(mockArticleFindMany).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================
  // 4. processNextGeneratingArticle - 文章处理成功
  // =========================================================
  describe('processNextGeneratingArticle - 成功处理', () => {
    const mockArticle = {
      id: 1,
      title: '测试文章',
      keywords: '关键词1,关键词2',
      portrait: '技术读者',
      skills: null,
      projectId: 100,
      version: 1,
    };

    const generatedContent = '# 生成标题\n\n这是生成的内容。';

    beforeEach(() => {
      mockArticleFindMany.mockResolvedValue([mockArticle]);
      mockKnowledgeBaseFindMany.mockResolvedValue([{ id: 10 }, { id: 11 }]);
      mockKnowledgeImageFindMany.mockResolvedValue([
        { title: '图1', description: '描述1', imageUrl: 'http://img1.png' },
      ]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue(generatedContent);
      mockArticleVersionCreate.mockResolvedValue({ id: 1 });
      mockArticleUpdate.mockResolvedValue({ ...mockArticle, status: 'pending_review' });
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应成功处理单篇文章', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledTimes(1);
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    test('应查询项目的知识库', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockKnowledgeBaseFindMany).toHaveBeenCalledWith({
        where: { projectId: 100, status: true },
        select: { id: true },
      });
    });

    test('应查询知识库的图片', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockKnowledgeImageFindMany).toHaveBeenCalledWith({
        where: { baseId: { in: [10, 11] } },
      });
    });

    test('应调用 LLM 生成文章并传递正确参数', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith({
        title: '测试文章',
        keywords: '关键词1,关键词2',
        portrait: '技术读者',
        images: [{ title: '图1', description: '描述1', imageUrl: 'http://img1.png' }],
        skills: '',
      });
    });

    test('应使用事务保存文章版本和更新状态', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // Verify transaction contains version create and article update
      const txOps = mockTransaction.mock.calls[0][0];
      expect(txOps).toHaveLength(2);
    });

    test('应正确递增版本号', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // version 1 → newVersion = floor(1) + 1 = 2
      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 1,
          version: 2,
          content: generatedContent,
          createdBy: null,
        },
      });
    });

    test('应在没有标题时从内容提取标题', async () => {
      const articleNoTitle = { ...mockArticle, title: '' };
      mockArticleFindMany.mockResolvedValue([articleNoTitle]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Should use extracted title "生成标题" from content "# 生成标题"
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          title: '生成标题',
        }),
      });
    });

    test('应正确处理技能字段（对象格式）', async () => {
      const articleWithSkills = { ...mockArticle, skills: { id: 5 } };
      mockArticleFindMany.mockResolvedValue([articleWithSkills]);
      mockSkillsFindFirst.mockResolvedValue({ id: 5, name: 'SEO优化' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: 'SEO优化' }),
      );
    });

    test('应正确处理技能字段（数字格式）', async () => {
      const articleWithSkills = { ...mockArticle, skills: 5 };
      mockArticleFindMany.mockResolvedValue([articleWithSkills]);
      mockSkillsFindFirst.mockResolvedValue({ id: 5, name: '内容营销' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).toHaveBeenCalledWith({ where: { id: 5 } });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '内容营销' }),
      );
    });

    test('应处理空知识库的情况', async () => {
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockKnowledgeImageFindMany).toHaveBeenCalledWith({
        where: { baseId: { in: [] } },
      });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ images: [] }),
      );
    });

    test('应处理图片没有描述的情况', async () => {
      mockKnowledgeImageFindMany.mockResolvedValue([
        { title: '图1', description: null, imageUrl: 'http://img1.png' },
      ]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [{ title: '图1', description: '', imageUrl: 'http://img1.png' }],
        }),
      );
    });
  });

  // =========================================================
  // 5. processNextGeneratingArticle - 批量处理
  // =========================================================
  describe('processNextGeneratingArticle - 批量处理', () => {
    const articles = [
      { id: 1, title: '文章1', keywords: 'k1', portrait: 'p1', skills: null, projectId: 1, version: 0 },
      { id: 2, title: '文章2', keywords: 'k2', portrait: 'p2', skills: null, projectId: 1, version: 0 },
      { id: 3, title: '文章3', keywords: 'k3', portrait: 'p3', skills: null, projectId: 1, version: 0 },
    ];

    beforeEach(() => {
      mockArticleFindMany.mockResolvedValue(articles);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应顺序处理多篇文章', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledTimes(3);
    });

    test('应限制每批最多10篇文章', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ take: 10 }),
      );
    });
  });

  // =========================================================
  // 6. processNextGeneratingArticle - 错误处理
  // =========================================================
  describe('processNextGeneratingArticle - 错误处理', () => {
    const mockArticle = {
      id: 1,
      title: '测试文章',
      keywords: 'k1',
      portrait: 'p1',
      skills: null,
      projectId: 1,
      version: 0,
    };

    beforeEach(() => {
      mockArticleFindMany.mockResolvedValue([mockArticle]);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
    });

    test('应在文章处理失败时标记为 generate_failed', async () => {
      mockGenerateArticle.mockRejectedValue(new Error('LLM 服务不可用'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });

    test('应在更新失败状态也失败时不抛出异常', async () => {
      mockGenerateArticle.mockRejectedValue(new Error('LLM 失败'));
      mockArticleUpdate.mockRejectedValue(new Error('数据库错误'));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      // Should not throw
      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();
    });

    test('应在部分文章失败时继续处理其他文章', async () => {
      const articles = [
        { id: 1, title: '文章1', keywords: 'k1', portrait: 'p1', skills: null, projectId: 1, version: 0 },
        { id: 2, title: '文章2', keywords: 'k2', portrait: 'p2', skills: null, projectId: 1, version: 0 },
      ];
      mockArticleFindMany.mockResolvedValue(articles);

      // First article fails, second succeeds
      mockGenerateArticle
        .mockRejectedValueOnce(new Error('第一篇失败'))
        .mockResolvedValueOnce('第二篇内容');
      mockArticleUpdate.mockResolvedValue({});
      mockArticleVersionCreate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Both articles should be processed
      expect(mockGenerateArticle).toHaveBeenCalledTimes(2);
      // First article should be marked as failed
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
      // Second article should succeed via transaction
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    test('应在查询文章失败时不抛出异常', async () => {
      mockArticleFindMany.mockRejectedValue(new Error('数据库连接失败'));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();
    });

    test('应在错误后重置 isRunning 标志', async () => {
      mockArticleFindMany.mockRejectedValue(new Error('数据库错误'));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Should be able to call again (isRunning reset)
      mockArticleFindMany.mockResolvedValue([]);
      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();
      expect(mockArticleFindMany).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================
  // 7. 技能字段边界情况
  // =========================================================
  describe('技能字段边界情况', () => {
    test('应处理 skills 为 null 的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).not.toHaveBeenCalled();
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '' }),
      );
    });

    test('应处理 skills 对象但 id 为 null 的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: { id: null }, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).not.toHaveBeenCalled();
    });

    test('应处理 skills 记录不存在的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: { id: 999 }, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '' }),
      );
    });
  });

  // =========================================================
  // 8. 标题提取边界情况
  // =========================================================
  describe('标题提取边界情况', () => {
    beforeEach(() => {
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应在内容以 ## 开头时正确提取标题', async () => {
      const article = { id: 1, title: '', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('## Markdown标题\n\n正文内容');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ title: 'Markdown标题' }),
      });
    });

    test('应在内容只有空行时不修改原始标题', async () => {
      const article = { id: 1, title: '原始标题', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('\n\n\n');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ title: '原始标题' }),
      });
    });

    test('应在文章已有标题时保留原标题', async () => {
      const article = { id: 1, title: '已有标题', keywords: '', portrait: '', skills: null, projectId: 1, version: 3 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('# 新生成的标题\n\n内容');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ title: '已有标题' }),
      });
    });
  });

  // =========================================================
  // 9. 版本号处理
  // =========================================================
  describe('版本号处理', () => {
    beforeEach(() => {
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应正确处理版本号为0的文章', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 1 }),
      });
    });

    test('应正确处理版本号为5的文章', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 5 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 6 }),
      });
    });
  });

  // =========================================================
  // 10. 默认 portrait 处理
  // =========================================================
  describe('默认 portrait 处理', () => {
    beforeEach(() => {
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应在 portrait 为空时使用默认值 通用读者', async () => {
      const article = { id: 1, title: 'T', keywords: 'k', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('内容');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ portrait: '通用读者' }),
      );
    });

    test('应在 portrait 为 null 时使用默认值 通用读者', async () => {
      const article = { id: 1, title: 'T', keywords: 'k', portrait: null, skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('内容');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ portrait: '通用读者' }),
      );
    });
  });
});

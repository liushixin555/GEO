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
const mockArticleVersionFindFirst = jest.fn();
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
    findFirst: mockArticleVersionFindFirst,
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
    mockArticleVersionFindFirst.mockResolvedValue(null);
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
      });
      expect(mockGenerateArticle).not.toHaveBeenCalled();
    });

    test('应查询所有状态为 generating 的文章（不限制数量）', async () => {
      mockArticleFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledWith({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
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

    test('应查询文章最近一个版本的内容', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionFindFirst).toHaveBeenCalledWith({
        where: { articleId: 1 },
        orderBy: { version: 'desc' },
        select: { content: true },
      });
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
        previousContent: undefined,
      });
    });

    test('应使用事务保存文章版本和更新状态', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockTransaction).toHaveBeenCalledTimes(1);
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

    test('应在文章已有标题时保留原标题不修改', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // 已有标题 "测试文章"，不应从生成内容中提取新标题
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          title: '测试文章',
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
  // 5. processNextGeneratingArticle - 批量处理（无数量限制）
  // =========================================================
  describe('processNextGeneratingArticle - 批量处理', () => {
    const articles = [
      { id: 1, title: '文章1', keywords: 'k1', portrait: 'p1', skills: null, projectId: 1, version: 0 },
      { id: 2, title: '文章2', keywords: 'k2', portrait: 'p2', skills: null, projectId: 1, version: 0 },
      { id: 3, title: '文章3', keywords: 'k3', portrait: 'p3', skills: null, projectId: 1, version: 0 },
    ];

    beforeEach(() => {
      mockArticleFindMany.mockResolvedValue(articles);
      mockArticleVersionFindFirst.mockResolvedValue(null);
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

    test('应查询所有待生成文章（不限制数量）', async () => {
      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledWith({
        where: { status: 'generating' },
        orderBy: { updatedAt: 'asc' },
      });
    });

    test('应每完成一篇写入数据库后再处理下一篇', async () => {
      const callOrder: string[] = [];
      mockGenerateArticle.mockImplementation(async () => {
        callOrder.push('generate');
        return '内容';
      });
      mockTransaction.mockImplementation(async (ops: any[]) => {
        callOrder.push('transaction');
        return Promise.all(ops);
      });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Should interleave: generate → transaction → generate → transaction → generate → transaction
      expect(callOrder).toEqual([
        'generate', 'transaction',
        'generate', 'transaction',
        'generate', 'transaction',
      ]);
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
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
      mockArticleVersionFindFirst.mockResolvedValue(null);

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
      mockArticleVersionFindFirst.mockResolvedValue(null);
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // skills is {}, typeof === 'object', .id is undefined → if(skillsId) is false
      expect(mockSkillsFindFirst).not.toHaveBeenCalled();
    });

    test('应处理 skills 记录不存在的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: { id: 999 }, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应在内容以 ## 开头且文章无标题时正确提取标题', async () => {
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

    test('应在内容只有空行且文章无标题时不修改原始标题', async () => {
      const article = { id: 1, title: '', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockGenerateArticle.mockResolvedValue('\n\n\n');

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // title remains empty since both original and extracted are empty
      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ title: '' }),
      });
    });

    test('应在文章已有标题时始终保留原标题', async () => {
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
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
      mockArticleVersionFindFirst.mockResolvedValue(null);
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

  // =========================================================
  // 11. Skills 字段额外边界情况
  // =========================================================
  describe('Skills 字段额外边界情况', () => {
    beforeEach(() => {
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应处理 skills 为字符串数字的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: '7', projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockSkillsFindFirst.mockResolvedValue({ id: 7, name: '内容策略' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).toHaveBeenCalledWith({ where: { id: 7 } });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '内容策略' }),
      );
    });

    test('应处理 skills 为空对象的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: {}, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).not.toHaveBeenCalled();
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '' }),
      );
    });

    test('应处理 skills id 为 0（falsy）的情况', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: { id: 0 }, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockSkillsFindFirst).not.toHaveBeenCalled();
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ skills: '' }),
      );
    });
  });

  // =========================================================
  // 12. Keywords 默认值处理
  // =========================================================
  describe('Keywords 默认值处理', () => {
    beforeEach(() => {
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应在 keywords 为 null 时使用空字符串', async () => {
      const article = { id: 1, title: 'T', keywords: null, portrait: '读者', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ keywords: '' }),
      );
    });

    test('应在 keywords 为 undefined 时使用空字符串', async () => {
      const article = { id: 1, title: 'T', keywords: undefined, portrait: '读者', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ keywords: '' }),
      );
    });
  });

  // =========================================================
  // 13. 历史版本内容传递
  // =========================================================
  describe('历史版本内容传递', () => {
    beforeEach(() => {
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('新内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应在有历史版本时将内容传递给 LLM', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 2 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue({ content: '这是上一版内容' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionFindFirst).toHaveBeenCalledWith({
        where: { articleId: 1 },
        orderBy: { version: 'desc' },
        select: { content: true },
      });
      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ previousContent: '这是上一版内容' }),
      );
    });

    test('应在没有历史版本时不传递 previousContent', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ previousContent: undefined }),
      );
    });

    test('应在历史版本内容为空字符串时不传递 previousContent', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 1 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue({ content: '' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({ previousContent: undefined }),
      );
    });

    test('应为每篇文章独立查询历史版本', async () => {
      const articles = [
        { id: 1, title: '文章1', keywords: '', portrait: '', skills: null, projectId: 1, version: 1 },
        { id: 2, title: '文章2', keywords: '', portrait: '', skills: null, projectId: 2, version: 3 },
      ];
      mockArticleFindMany.mockResolvedValue(articles);
      mockArticleVersionFindFirst
        .mockResolvedValueOnce({ content: '文章1的历史版本' })
        .mockResolvedValueOnce({ content: '文章2的历史版本' });

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionFindFirst).toHaveBeenCalledTimes(2);
      expect(mockArticleVersionFindFirst).toHaveBeenNthCalledWith(1, {
        where: { articleId: 1 },
        orderBy: { version: 'desc' },
        select: { content: true },
      });
      expect(mockArticleVersionFindFirst).toHaveBeenNthCalledWith(2, {
        where: { articleId: 2 },
        orderBy: { version: 'desc' },
        select: { content: true },
      });
    });
  });

  // =========================================================
  // 14. 版本号额外边界情况
  // =========================================================
  describe('版本号额外边界情况', () => {
    beforeEach(() => {
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应正确处理版本号为小数的文章（Math.floor 取整）', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 2.7 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Math.floor(2.7) + 1 = 3
      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 3 }),
      });
    });

    test('应正确处理版本号为负数的文章', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: -1 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Math.floor(-1) + 1 = 0
      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({ version: 0 }),
      });
    });
  });

  // =========================================================
  // 15. 事务数据完整性验证
  // =========================================================
  describe('事务数据完整性验证', () => {
    const generatedContent = '# 完整标题\n\n完整内容段落。';

    beforeEach(() => {
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([{ id: 20 }]);
      mockKnowledgeImageFindMany.mockResolvedValue([
        { title: '图片A', description: '图片描述A', imageUrl: 'http://a.png' },
        { title: '图片B', description: '图片描述B', imageUrl: 'http://b.png' },
      ]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue(generatedContent);
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));
    });

    test('应通过事务同时创建版本记录和更新文章状态', async () => {
      const article = { id: 42, title: '完整测试', keywords: 'k1,k2', portrait: '技术读者', skills: null, projectId: 5, version: 3 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleVersionCreate).toHaveBeenCalledWith({
        data: {
          articleId: 42,
          version: 4,
          content: generatedContent,
          createdBy: null,
        },
      });

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 42 },
        data: {
          title: '完整测试',
          content: generatedContent,
          version: 4,
          status: 'pending_review',
        },
      });
    });

    test('应在事务中正确传递多张图片资源', async () => {
      const article = { id: 10, title: '图片测试', keywords: '', portrait: '', skills: null, projectId: 5, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith({
        title: '图片测试',
        keywords: '',
        portrait: '通用读者',
        images: [
          { title: '图片A', description: '图片描述A', imageUrl: 'http://a.png' },
          { title: '图片B', description: '图片描述B', imageUrl: 'http://b.png' },
        ],
        skills: '',
        previousContent: undefined,
      });
    });

    test('应在图片描述为 undefined 时使用空字符串', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockKnowledgeImageFindMany.mockResolvedValue([
        { title: '图1', description: undefined, imageUrl: 'http://img.png' },
      ]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockGenerateArticle).toHaveBeenCalledWith(
        expect.objectContaining({
          images: [{ title: '图1', description: '', imageUrl: 'http://img.png' }],
        }),
      );
    });
  });

  // =========================================================
  // 16. processSingleArticle 内部错误路径
  // =========================================================
  describe('processSingleArticle 内部错误路径', () => {
    test('应在知识库查询失败时标记文章为 generate_failed', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockRejectedValue(new Error('知识库查询失败'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });

    test('应在图片查询失败时标记文章为 generate_failed', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([{ id: 1 }]);
      mockKnowledgeImageFindMany.mockRejectedValue(new Error('图片查询失败'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });

    test('应在技能查询失败时标记文章为 generate_failed', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: { id: 5 }, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockSkillsFindFirst.mockRejectedValue(new Error('技能查询失败'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });

    test('应在事务执行失败时标记文章为 generate_failed', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle.mockResolvedValue('内容');
      mockTransaction.mockRejectedValue(new Error('事务执行失败'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });

    test('应在版本查询失败时标记文章为 generate_failed', async () => {
      const article = { id: 1, title: 'T', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 };
      mockArticleFindMany.mockResolvedValue([article]);
      mockArticleVersionFindFirst.mockRejectedValue(new Error('版本查询失败'));
      mockArticleUpdate.mockResolvedValue({});

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockArticleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'generate_failed' },
      });
    });
  });

  // =========================================================
  // 17. 定时任务生命周期
  // =========================================================
  describe('定时任务生命周期', () => {
    test('应支持多次启动停止循环', () => {
      const { startArticleGenerationCron, stopArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();
      stopArticleGenerationCron();
      startArticleGenerationCron();
      stopArticleGenerationCron();
      startArticleGenerationCron();
      stopArticleGenerationCron();

      expect(mockSchedule).toHaveBeenCalledTimes(3);
      expect(mockStop).toHaveBeenCalledTimes(3);
    });

    test('应在连续停止两次时不报错', () => {
      const { startArticleGenerationCron, stopArticleGenerationCron } = require('../../../apis/scheduler/article-generation.scheduler');

      startArticleGenerationCron();
      stopArticleGenerationCron();
      stopArticleGenerationCron();

      expect(mockStop).toHaveBeenCalledTimes(1);
    });
  });

  // =========================================================
  // 18. 并发调度防护
  // =========================================================
  describe('并发调度防护', () => {
    test('isRunning 标志应在成功完成后重置', async () => {
      mockArticleFindMany.mockResolvedValue([]);

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();
      await processNextGeneratingArticle();

      expect(mockArticleFindMany).toHaveBeenCalledTimes(2);
    });

    test('isRunning 标志应在部分失败后重置', async () => {
      const articles = [
        { id: 1, title: 'T1', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 },
        { id: 2, title: 'T2', keywords: '', portrait: '', skills: null, projectId: 1, version: 0 },
      ];
      mockArticleFindMany.mockResolvedValue(articles);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany.mockResolvedValue([]);
      mockKnowledgeImageFindMany.mockResolvedValue([]);
      mockGenerateArticle
        .mockRejectedValueOnce(new Error('第一篇失败'))
        .mockResolvedValueOnce('第二篇内容');
      mockArticleUpdate.mockResolvedValue({});
      mockArticleVersionCreate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      // Should be able to call again
      mockArticleFindMany.mockResolvedValue([]);
      await expect(processNextGeneratingArticle()).resolves.toBeUndefined();
      expect(mockArticleFindMany).toHaveBeenCalledTimes(2);
    });
  });

  // =========================================================
  // 19. 多项目文章处理
  // =========================================================
  describe('多项目文章处理', () => {
    test('应为不同项目的文章查询对应的知识库', async () => {
      const articles = [
        { id: 1, title: '项目A文章', keywords: '', portrait: '', skills: null, projectId: 100, version: 0 },
        { id: 2, title: '项目B文章', keywords: '', portrait: '', skills: null, projectId: 200, version: 0 },
      ];
      mockArticleFindMany.mockResolvedValue(articles);
      mockArticleVersionFindFirst.mockResolvedValue(null);
      mockKnowledgeBaseFindMany
        .mockResolvedValueOnce([{ id: 10 }])
        .mockResolvedValueOnce([{ id: 20 }, { id: 21 }]);
      mockKnowledgeImageFindMany
        .mockResolvedValueOnce([{ title: '图A', description: '', imageUrl: 'http://a.png' }])
        .mockResolvedValueOnce([{ title: '图B', description: '', imageUrl: 'http://b.png' }]);
      mockSkillsFindFirst.mockResolvedValue(null);
      mockGenerateArticle.mockResolvedValue('内容');
      mockArticleVersionCreate.mockResolvedValue({});
      mockArticleUpdate.mockResolvedValue({});
      mockTransaction.mockImplementation((ops: any[]) => Promise.all(ops));

      const { processNextGeneratingArticle } = require('../../../apis/scheduler/article-generation.scheduler');

      await processNextGeneratingArticle();

      expect(mockKnowledgeBaseFindMany).toHaveBeenCalledTimes(2);
      expect(mockKnowledgeBaseFindMany).toHaveBeenNthCalledWith(1, {
        where: { projectId: 100, status: true },
        select: { id: true },
      });
      expect(mockKnowledgeBaseFindMany).toHaveBeenNthCalledWith(2, {
        where: { projectId: 200, status: true },
        select: { id: true },
      });
    });
  });
});

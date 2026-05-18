/**
 * @jest-environment node
 */

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

// Mock node-cron before any imports
jest.mock('node-cron', () => ({
  validate: jest.fn().mockReturnValue(true),
  schedule: jest.fn().mockReturnValue({ stop: jest.fn() }),
}));

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

// Mock axios for LLM calls
jest.mock('axios');

import axios from 'axios';
import { processNextGeneratingArticle, startArticleGenerationCron, stopArticleGenerationCron } from '../../apis/scheduler/article-generation.scheduler';
import { getPrisma } from '../../apis/utils';

const mockAxios = axios as jest.Mocked<typeof axios>;

describe('Article Generation Scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  function mockPrisma(methods: any) {
    (getPrisma as jest.Mock).mockReturnValue(methods);
  }

  describe('startArticleGenerationCron', () => {
    it('should start cron task when enabled', () => {
      startArticleGenerationCron();
      const cron = require('node-cron');
      expect(cron.schedule).toHaveBeenCalled();
    });
  });

  describe('stopArticleGenerationCron', () => {
    it('should stop cron task', () => {
      startArticleGenerationCron();
      stopArticleGenerationCron();
      // No error means success
    });
  });

  describe('processNextGeneratingArticle', () => {
    it('should do nothing when no generating articles', async () => {
      mockPrisma({
        article: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });

      await processNextGeneratingArticle();

      expect(mockAxios.post).not.toHaveBeenCalled();
    });

    it('should generate article and update status to pending_review', async () => {
      const mockArticle = {
        id: 1,
        projectId: 10,
        title: 'GEO优化指南',
        keywords: ['GEO', 'SEO'],
        portrait: '技术从业者',
        skills: null,
        version: 1.0,
        status: 'generating',
        updatedAt: new Date(),
      };

      const mockImages = [
        { id: 1, title: '图片1', description: '描述1', imageUrl: '/uploads/1.jpg', projectId: 10 },
      ];

      const mockUpdatedArticle = {
        id: 1,
        projectId: 10,
        title: 'GEO优化指南',
        keywords: ['GEO', 'SEO'],
        portrait: '技术从业者',
        images: null,
        platforms: null,
        skills: null,
        llmModelId: 1,
        content: '# Generated Content\n\nHello world',
        version: 2.0,
        status: 'pending_review',
        createdBy: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const findFirstCall = jest.fn()
        .mockResolvedValueOnce(mockArticle)     // first call: find generating article
        .mockResolvedValueOnce(mockArticle);     // won't be called again in success path

      const articleVersionCreate = jest.fn().mockResolvedValue({ id: 1 });
      const articleUpdate = jest.fn().mockResolvedValue(mockUpdatedArticle);
      const knowledgeImageFindMany = jest.fn().mockResolvedValue(mockImages);

      mockPrisma({
        article: {
          findFirst: findFirstCall,
          update: articleUpdate,
        },
        articleVersion: {
          create: articleVersionCreate,
        },
        knowledgeImage: {
          findMany: knowledgeImageFindMany,
        },
        llmModel: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            baseUrl: 'http://localhost:11434/v1',
            apiKey: 'test-key',
            modelName: 'test-model',
          }),
        },
        skills: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
        $transaction: jest.fn((callbacks: any[]) => {
          return Promise.all(callbacks);
        }),
      });

      mockAxios.post.mockResolvedValue({
        data: {
          choices: [{
            message: { content: '# Generated Content\n\nHello world' },
          }],
        },
      });

      await processNextGeneratingArticle();

      // Verify LLM was called
      expect(mockAxios.post).toHaveBeenCalledTimes(1);
      expect(mockAxios.post).toHaveBeenCalledWith(
        'http://localhost:11434/v1/chat/completions',
        expect.objectContaining({
          model: 'test-model',
          temperature: 0.7,
        }),
        expect.any(Object),
      );

      // Verify version and status were saved via transaction
      const prisma = getPrisma() as any;
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(articleVersionCreate).toHaveBeenCalledWith({
        data: expect.objectContaining({
          articleId: 1,
          version: 2.0,
          content: '# Generated Content\n\nHello world',
          createdBy: null,
        }),
      });
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          content: '# Generated Content\n\nHello world',
          version: 2.0,
          status: 'pending_review',
        }),
      });
    });

    it('should update status to generate_failed when LLM fails', async () => {
      const mockArticle = {
        id: 2,
        projectId: 10,
        title: '失败测试',
        keywords: [],
        portrait: null,
        skills: null,
        version: 1.0,
        status: 'generating',
        updatedAt: new Date(),
      };

      // First findFirst returns the article, second returns it again for error handling
      const findFirstCall = jest.fn()
        .mockResolvedValueOnce(mockArticle)
        .mockResolvedValueOnce(mockArticle);

      const articleUpdate = jest.fn().mockResolvedValue({ ...mockArticle, status: 'generate_failed' });

      mockPrisma({
        article: {
          findFirst: findFirstCall,
          update: articleUpdate,
        },
        knowledgeImage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        llmModel: {
          findFirst: jest.fn().mockResolvedValue(null), // No LLM model
        },
        skills: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });

      await processNextGeneratingArticle();

      // Should not have called LLM
      expect(mockAxios.post).not.toHaveBeenCalled();

      // Should have updated status to generate_failed
      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: 'generate_failed' },
      });
    });

    it('should handle LLM API error gracefully', async () => {
      const mockArticle = {
        id: 3,
        projectId: 10,
        title: 'API错误测试',
        keywords: ['test'],
        portrait: '读者',
        skills: null,
        version: 1.0,
        status: 'generating',
        updatedAt: new Date(),
      };

      const findFirstCall = jest.fn()
        .mockResolvedValueOnce(mockArticle)
        .mockResolvedValueOnce(mockArticle);

      const articleUpdate = jest.fn().mockResolvedValue({ ...mockArticle, status: 'generate_failed' });

      mockPrisma({
        article: {
          findFirst: findFirstCall,
          update: articleUpdate,
        },
        knowledgeImage: {
          findMany: jest.fn().mockResolvedValue([]),
        },
        llmModel: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1,
            baseUrl: 'http://localhost:11434/v1',
            apiKey: 'test-key',
            modelName: 'test-model',
          }),
        },
        skills: {
          findFirst: jest.fn().mockResolvedValue(null),
        },
      });

      mockAxios.post.mockRejectedValue({
        response: { status: 500, data: { error: { message: 'Server error' } } },
        message: 'Request failed',
      });

      await processNextGeneratingArticle();

      expect(articleUpdate).toHaveBeenCalledWith({
        where: { id: 3 },
        data: { status: 'generate_failed' },
      });
    });
  });
});

/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import apiClient from '../../../../pages/lib/apiClient';
import type { ArticleData } from '../../../../pages/article/types';

jest.mock('../../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    put: jest.fn(),
  },
}));

const mockedPut = apiClient.put as jest.MockedFunction<typeof apiClient.put>;

const mockArticle = (overrides: Partial<ArticleData> = {}): ArticleData => ({
  id: 1,
  title: '测试文章',
  article_type: '案例分析',
  write_mode: 'ai',
  keywords: '测试',
  portrait: null,
  images: null,
  platforms: null,
  skills: null,
  llm_model_id: 1,
  content: '正文',
  version: 1.0,
  status: 'pending_review',
  created_by: 10,
  ...overrides,
});

const mockRefetch = jest.fn();

// Wrapper that provides App context for useArticleActions
const createWrapper = () => {
  const React = require('react');
  const { App } = require('antd');
  return function Wrapper({ children }: { children: React.ReactNode }) {
    return React.createElement(App, null, children);
  };
};

describe('useArticleActions', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockRefetch.mockResolvedValue(undefined);
  });

  describe('review', () => {
    it('审核通过应调用 PUT /review 并刷新', async () => {
      mockedPut.mockResolvedValueOnce({ data: { data: {} } });
      mockRefetch.mockResolvedValueOnce(mockArticle({ status: 'publishing' }));

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle(), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.review(true);
      });

      expect(mockedPut).toHaveBeenCalledWith('/projects/1/articles/1/review', { approved: true });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('审核不通过应调用 PUT /review 并刷新', async () => {
      mockedPut.mockResolvedValueOnce({ data: { data: {} } });

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle(), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.review(false);
      });

      expect(mockedPut).toHaveBeenCalledWith('/projects/1/articles/1/review', { approved: false });
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('审核 API 失败时应显示错误信息', async () => {
      mockedPut.mockRejectedValueOnce({ response: { data: { message: '无权限' } } });

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle(), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.review(true);
      });

      expect(mockRefetch).not.toHaveBeenCalled();
    });

    it('article 为 null 时不调用 API', async () => {
      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(null, 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.review(true);
      });

      expect(mockedPut).not.toHaveBeenCalled();
    });
  });

  describe('regenerate', () => {
    it('重新生成应调用 PUT /regenerate（BLK-04 修复验证）', async () => {
      mockedPut.mockResolvedValueOnce({ data: { data: {} } });

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle({ status: 'generate_failed' }), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockedPut).toHaveBeenCalledWith('/projects/1/articles/1/regenerate', {});
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('重新生成 API 失败时应显示错误', async () => {
      mockedPut.mockRejectedValueOnce({ response: { data: { message: '重新生成失败' } } });

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle({ status: 'generate_failed' }), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.regenerate();
      });

      expect(mockRefetch).not.toHaveBeenCalled();
    });
  });

  describe('submitForReview', () => {
    it('提交审核应调用 PUT /submit-review', async () => {
      mockedPut.mockResolvedValueOnce({ data: { data: {} } });

      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle({ status: 'manual_writing' }), 1, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.submitForReview();
      });

      expect(mockedPut).toHaveBeenCalledWith('/projects/1/articles/1/submit-review', {});
      expect(mockRefetch).toHaveBeenCalled();
    });

    it('projectId 为 undefined 时不调用 API', async () => {
      const { useArticleActions } = require('../../../../pages/article/hooks/useArticleActions');
      const { result } = renderHook(
        () => useArticleActions(mockArticle(), undefined, '1', mockRefetch),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.submitForReview();
      });

      expect(mockedPut).not.toHaveBeenCalled();
    });
  });
});

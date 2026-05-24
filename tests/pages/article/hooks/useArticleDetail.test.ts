/**
 * @jest-environment jsdom
 */
import { renderHook, act } from '@testing-library/react';
import apiClient from '../../../../pages/lib/apiClient';
import { useArticleDetail } from '../../../../pages/article/hooks/useArticleDetail';
import type { ArticleData } from '../../../../pages/article/types';

jest.mock('../../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;
const mockedPost = apiClient.post as jest.Mock;
const mockedPut = apiClient.put as jest.Mock;
const mockedDelete = apiClient.delete as jest.Mock;

const mockArticleData: ArticleData = {
  id: 42,
  title: '现有文章',
  article_type: '案例分析',
  write_mode: 'ai',
  keywords: '关键词',
  portrait: null,
  images: null,
  platforms: null,
  skills: null,
  llm_model_id: 1,
  content: '文章正文内容',
  version: 1.0,
  status: 'draft',
  created_by: 10,
};

// Stable mock objects to prevent useEffect infinite loops
const stableMessage = { success: jest.fn(), error: jest.fn(), warning: jest.fn() };
const stableNotification = { success: jest.fn(), error: jest.fn() };
const stableModal = { confirm: jest.fn() };

const createWrapper = () => {
  const React = require('react');
  // Create a wrapper that bypasses the Proxy issue by providing a custom App
  return function Wrapper({ children }: { children: React.ReactNode }) {
    // The antd mock's App component just renders children, and useApp is intercepted by the Proxy.
    // We need to provide a stable useApp return to prevent infinite useEffect loops.
    const { App } = require('antd');
    return React.createElement(App, null, children);
  };
};

describe('useArticleDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('新建文章（isNew=true）', () => {
    const mockForm = {
      getFieldValue: jest.fn(),
      getFieldsValue: jest.fn(() => ({})),
      setFieldValue: jest.fn(),
      setFieldsValue: jest.fn(),
      validateFields: jest.fn(() => Promise.resolve({})),
    };

    it('新建模式不调用 GET 且 loading 为 false', () => {
      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );
      expect(result.current.loading).toBe(false);
      expect(mockedGet).not.toHaveBeenCalled();
    });

    it('AI 生成模式新建文章应提交并返回 created', async () => {
      mockedPost.mockResolvedValueOnce({ data: { data: { ...mockArticleData, id: 100 } } });

      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );

      let saveResult: any;
      await act(async () => {
        saveResult = await result.current.saveSettings(
          { title: '新文章', keywords: '关键词', llm_model_id: 1, platforms: ['平台A'], write_mode: 'ai' },
          [],
          { submitForGeneration: true, writeMode: 'ai' },
        );
      });

      expect(mockedPost).toHaveBeenCalledWith('/projects/1/articles', expect.objectContaining({
        status: 'generating',
      }));
      expect(saveResult.action).toBe('created');
      expect(saveResult.data.id).toBe(100);
    });

    it('手工编写模式新建文章应设置 manual_writing 状态', async () => {
      mockedPost.mockResolvedValueOnce({ data: { data: { ...mockArticleData, id: 101 } } });

      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.saveSettings(
          { title: '手工文章', keywords: '关键词', platforms: ['平台A'], write_mode: 'manual' },
          [],
          { manualWrite: true, writeMode: 'manual' },
        );
      });

      expect(mockedPost).toHaveBeenCalledWith('/projects/1/articles', expect.objectContaining({
        status: 'manual_writing',
      }));
    });

    it('新建文章保存失败应设置 error', async () => {
      mockedPost.mockRejectedValueOnce({ response: { data: { message: '参数错误' } } });

      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        try {
          await result.current.saveSettings({ title: '' }, [], { writeMode: 'ai' });
        } catch {
          // expected
        }
      });

      expect(result.current.error).toBe('参数错误');
    });

    it('autoSave 在新建模式下内容为空不触发保存', async () => {
      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );

      await act(async () => {
        await result.current.autoSave([]);
      });

      expect(mockedPost).not.toHaveBeenCalled();
    });

    it('deleteArticle 在新建模式下不做任何操作', async () => {
      const { result } = renderHook(
        () => useArticleDetail('new', 1, true, mockForm as any),
        { wrapper: createWrapper() },
      );

      let deleteResult: any;
      await act(async () => {
        deleteResult = await result.current.deleteArticle();
      });

      expect(mockedDelete).not.toHaveBeenCalled();
      expect(deleteResult).toBeUndefined();
    });
  });
});

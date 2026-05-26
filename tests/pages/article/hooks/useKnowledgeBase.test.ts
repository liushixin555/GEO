/**
 * @jest-environment jsdom
 */
import { renderHook, waitFor } from '@testing-library/react';
import apiClient from '../../../../pages/lib/apiClient';

jest.mock('../../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
  },
}));

const mockedGet = apiClient.get as jest.Mock;

const createMockForm = () => ({
  getFieldValue: jest.fn(() => undefined),
  setFieldValue: jest.fn(),
  getFieldsValue: jest.fn(() => ({})),
  setFieldsValue: jest.fn(),
  validateFields: jest.fn(() => Promise.resolve({})),
});

const mockSkillsResponse = {
  data: { data: { list: [{ id: 1, name: '技能A' }, { id: 2, name: '技能B' }] } },
};

const mockLlmModelsResponse = {
  data: { data: [{ id: 1, provider: 'OpenAI', model_name: 'gpt-4' }, { id: 2, provider: 'Anthropic', model_name: 'claude-3' }] },
};

const mockKbKeywordsResponse = {
  data: { data: { list: [{ keyword: '关键词A' }, { keyword: '关键词B' }] } },
};

const mockKbPortraitsResponse = {
  data: { data: { list: [{ title: '画像A', content: '画像内容A' }] } },
};

const mockKbImagesResponse = {
  data: { data: { list: [{ id: 1, title: '图片A', image_url: 'https://example.com/img.png' }] } },
};

// NOTE: useKnowledgeBase uses module-level caches (kbCache, optionsCache).
// Tests run sequentially — the first test populates optionsCache, subsequent ones benefit from it.
// Use unique projectId values for knowledge base tests to avoid cross-test cache collisions.

describe('useKnowledgeBase', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('应正确加载技能和大模型选项', async () => {
    mockedGet
      .mockResolvedValueOnce(mockSkillsResponse)
      .mockResolvedValueOnce(mockLlmModelsResponse);

    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(undefined, true, form),
    );

    await waitFor(() => {
      expect(result.current.skillsOptions).toEqual([
        { label: '技能A', value: 1 },
        { label: '技能B', value: 2 },
      ]);
      expect(result.current.llmModelsOptions).toEqual([
        { label: 'OpenAI - gpt-4', value: 1 },
        { label: 'Anthropic - claude-3', value: 2 },
      ]);
    });
  });

  it('应正确加载知识库数据（关键词、画像、图片）', async () => {
    mockedGet
      .mockResolvedValueOnce(mockKbKeywordsResponse)
      .mockResolvedValueOnce(mockKbPortraitsResponse)
      .mockResolvedValueOnce(mockKbImagesResponse);

    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(100, false, form),
    );

    await waitFor(() => {
      expect(result.current.kbKeywords).toEqual([
        { label: '关键词A', value: '关键词A' },
        { label: '关键词B', value: '关键词B' },
      ]);
      expect(result.current.kbPortraits).toEqual([
        { label: '画像A', value: '画像内容A' },
      ]);
      expect(result.current.kbImages).toEqual([
        { id: 1, title: '图片A', image_url: 'https://example.com/img.png' },
      ]);
    });
  });

  it('projectId 为 undefined 时不加载知识库数据', async () => {
    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(undefined, false, form),
    );

    await waitFor(() => {
      expect(result.current.skillsOptions.length).toBeGreaterThan(0);
    });

    expect(result.current.kbKeywords).toEqual([]);
    expect(result.current.kbPortraits).toEqual([]);
    expect(result.current.kbImages).toEqual([]);
  });

  it('API 失败时应静默处理而非崩溃', async () => {
    mockedGet.mockRejectedValue(new Error('网络错误'));

    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(200, false, form),
    );

    // Hook should not throw — it silently catches errors and returns empty arrays
    await waitFor(() => {
      expect(result.current.kbKeywords).toEqual([]);
    });

    expect(result.current.kbPortraits).toEqual([]);
    expect(result.current.kbImages).toEqual([]);
  });

  it('画像 content 为空时 fallback 到 title', async () => {
    const noContentPortrait = {
      data: { data: { list: [{ title: '画像B' }] } },
    };
    mockedGet
      .mockResolvedValueOnce(mockKbKeywordsResponse)
      .mockResolvedValueOnce(noContentPortrait)
      .mockResolvedValueOnce(mockKbImagesResponse);

    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(300, false, form),
    );

    await waitFor(() => {
      expect(result.current.kbPortraits).toEqual([
        { label: '画像B', value: '画像B' },
      ]);
    });
  });

  it('API 返回空列表时状态应为空数组', async () => {
    mockedGet
      .mockResolvedValueOnce({ data: { data: { list: [] } } })
      .mockResolvedValueOnce({ data: { data: { list: [] } } })
      .mockResolvedValueOnce({ data: { data: { list: [] } } });

    const { useKnowledgeBase } = require('../../../../pages/article/hooks/useKnowledgeBase');
    const form = createMockForm();
    const { result } = renderHook(
      () => useKnowledgeBase(400, false, form),
    );

    await waitFor(() => {
      expect(result.current.kbKeywords).toEqual([]);
      expect(result.current.kbPortraits).toEqual([]);
      expect(result.current.kbImages).toEqual([]);
    });
  });
});

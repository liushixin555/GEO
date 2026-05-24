/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';

// Mock MDEditor
jest.mock('@uiw/react-md-editor/nohighlight', () => {
  const React = require('react');
  const MDEditor: any = (props: any) =>
    React.createElement('div', { 'data-testid': 'md-editor' }, props.value);
  MDEditor.Markdown = (props: any) =>
    React.createElement('div', { 'data-testid': 'md-preview' }, props.source);
  return { __esModule: true, default: MDEditor };
});

// Mock react-markdown-preview/nohighlight (ESM module incompatible with Jest)
jest.mock('@uiw/react-markdown-preview/nohighlight', () => {
  const React = require('react');
  const MarkdownPreview: any = (props: any) =>
    React.createElement('div', { 'data-testid': 'md-preview' }, props.source);
  return { __esModule: true, default: MarkdownPreview };
});

// Mock mammoth
jest.mock('mammoth', () => ({
  convertToHtml: jest.fn().mockResolvedValue({ value: '<p>Test content</p>' }),
}));

// Mock DOMPurify
jest.mock('dompurify', () => ({
  __esModule: true,
  default: { sanitize: jest.fn((html: string) => html) },
}));

// Mock axios
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  put: jest.fn(),
  delete: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  })),
}));

import axios from 'axios';
const mockedAxios = axios as jest.Mocked<typeof axios>;

// Mock AppContext
const mockAppContext = {
  companyId: 1,
  companyName: 'Test Company',
  projectId: 1,
  projectName: 'Test Project',
  setContext: jest.fn(),
};
jest.mock('../../../pages/context/AppContext', () => ({
  useAppContext: () => mockAppContext,
}));

import ArticleDetail from '../../../pages/article/ArticleDetail';

const renderWithRouter = (path: string) => {
  return render(
    <MemoryRouter initialEntries={[path]}>
      <Routes>
        <Route path="/article/:id" element={<ArticleDetail />} />
        <Route path="/article" element={<div data-testid="article-list">Article List</div>} />
      </Routes>
    </MemoryRouter>
  );
};

const mockArticle = {
  id: 1,
  title: '测试文章',
  article_type: '案例分析',
  write_mode: 'ai',
  keywords: '测试关键词',
  portrait: null,
  images: [] as string[],
  platforms: ['平台A'],
  skills: null,
  llm_model_id: 1,
  content: '# 测试内容\n\n这是测试正文',
  version: 2,
  status: 'draft',
  created_by: 1,
};

const defaultMockGet = (url: string) => {
  if (url.includes('/skills')) {
    return Promise.resolve({ data: { data: { list: [{ id: 1, name: '技能A' }] } } });
  }
  if (url.includes('/llm-models')) {
    return Promise.resolve({ data: { data: [{ id: 1, provider: 'OpenAI', model_name: 'gpt-4' }] } });
  }
  if (url.includes('/knowledge')) {
    return Promise.resolve({ data: { data: { list: [] } } });
  }
  if (url.includes('/publishing-platforms')) {
    return Promise.resolve({ data: { data: { list: [] } } });
  }
  return Promise.resolve({ data: { data: {} } });
};

describe('ArticleDetail', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    localStorage.clear();
    localStorage.setItem('token', 'mock-token');
    localStorage.setItem('user', JSON.stringify({ id: 1, role: 'sysadmin' }));
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: mockArticle } });
      }
      return defaultMockGet(url);
    });
  });

  // === 1. 新建文章 ===
  it('should render new article page', async () => {
    renderWithRouter('/article/new');

    await waitFor(() => {
      expect(screen.getByText('新建文章')).toBeInTheDocument();
    });
  });

  // === 2. 加载文章 ===
  it('should load and display article data', async () => {
    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('测试文章')).toBeInTheDocument();
    });
  });

  // === 3. 保存设置 ===
  it('should call PUT API when saving draft', async () => {
    mockedAxios.put.mockResolvedValueOnce({ data: { data: mockArticle } });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('测试文章')).toBeInTheDocument();
    });

    // The form-actions div contains buttons rendered outside Collapse
    // The antd mock renders buttons as <Button> HTML elements
    const buttons = screen.getAllByText('存草稿');
    if (buttons.length > 0) {
      fireEvent.click(buttons[0]);
    }

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalled();
    });
  });

  // === 4. 正文内容显示 ===
  it('should display content preview', async () => {
    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByTestId('md-preview')).toBeInTheDocument();
    });
  });

  // === 5. 待审核 — 显示审核提示 ===
  it('should show review alert for pending_review status', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: { ...mockArticle, status: 'pending_review' } } });
      }
      return defaultMockGet(url);
    });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('该文章待审核')).toBeInTheDocument();
    });
  });

  // === 6. 审核通过 ===
  it('should call review API when approved', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: { ...mockArticle, status: 'pending_review' } } });
      }
      return defaultMockGet(url);
    });
    mockedAxios.put.mockResolvedValueOnce({ data: { data: mockArticle } });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('该文章待审核')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('审核通过'));

    await waitFor(() => {
      expect(mockedAxios.put).toHaveBeenCalledWith(
        expect.stringContaining('/review'),
        { approved: true },
        expect.anything()
      );
    });
  });

  // === 7. 权限控制 — 非创建者不可编辑 ===
  it('should not show edit buttons for non-owner', async () => {
    localStorage.setItem('user', JSON.stringify({ id: 999, role: 'admin' }));

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('测试文章')).toBeInTheDocument();
    });

    expect(screen.queryByText('存草稿')).not.toBeInTheDocument();
  });

  // === 8. 删除按钮 — 草稿状态 ===
  it('should show delete button for draft article', async () => {
    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('测试文章')).toBeInTheDocument();
    });

    // Delete button should exist for draft + sysadmin
    expect(screen.getByText('删除文章')).toBeInTheDocument();
  });

  // === 9. 删除 API 调用 ===
  it('should call delete API', async () => {
    mockedAxios.delete.mockResolvedValueOnce({ data: {} });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('删除文章')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('删除文章'));

    // Confirm in Popconfirm
    await waitFor(() => {
      const okButtons = screen.getAllByText('确认');
      fireEvent.click(okButtons[0]);
    });

    await waitFor(() => {
      expect(mockedAxios.delete).toHaveBeenCalledWith(
        expect.stringContaining('/articles/1'),
        expect.objectContaining({ headers: { Authorization: 'Bearer mock-token' } })
      );
    });
  });

  // === 10. 重新生成按钮 ===
  it('should show regenerate button for generate_failed status', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: { ...mockArticle, status: 'generate_failed' } } });
      }
      return defaultMockGet(url);
    });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('重新生成')).toBeInTheDocument();
    });
  });

  // === 11. 待审核正文可编辑 ===
  it('should allow content editing in pending_review status', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: { ...mockArticle, status: 'pending_review' } } });
      }
      return defaultMockGet(url);
    });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('该文章待审核')).toBeInTheDocument();
    });

    expect(screen.getByText('浏览')).toBeInTheDocument();
    expect(screen.getByText('编辑')).toBeInTheDocument();
  });

  // === 12. JSON.parse 容错 ===
  it('should handle corrupted localStorage user data', async () => {
    localStorage.setItem('user', 'invalid-json{');

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('测试文章')).toBeInTheDocument();
    });
  });

  // === 13. 非草稿不显示删除按钮 ===
  it('should not show delete button for published article', async () => {
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) {
        return Promise.resolve({ data: { data: { ...mockArticle, status: 'published' } } });
      }
      return defaultMockGet(url);
    });

    renderWithRouter('/article/1');

    await waitFor(() => {
      expect(screen.getByText('已发布')).toBeInTheDocument();
    });

    expect(screen.queryByText('删除文章')).not.toBeInTheDocument();
  });

  // === 14. 加载状态 ===
  it('should show loading spinner', async () => {
    let resolveArticle: (value: any) => void;
    const articlePromise = new Promise((resolve) => { resolveArticle = resolve; });
    mockedAxios.get.mockImplementation((url: string) => {
      if (url.includes('/articles/1')) return articlePromise as any;
      return defaultMockGet(url);
    });

    renderWithRouter('/article/1');

    // Spin component renders as <spin> element with tip prop
    expect(screen.getByText('正在加载文章...')).toBeInTheDocument();

    await act(async () => {
      resolveArticle!({ data: { data: mockArticle } });
    });
  });
});

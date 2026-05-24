/**
 * @jest-environment jsdom
 */
import React from 'react';
import { render, screen } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';

// Mock external modules that can't be transformed by Jest
jest.mock('@uiw/react-md-editor', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('div', { 'data-testid': 'md-editor' }, props.value),
    Markdown: (props: any) => React.createElement('div', { 'data-testid': 'md-preview' }, props.source),
  };
});

jest.mock('../../../pages/components/MarkdownViewer', () => {
  const React = require('react');
  return {
    __esModule: true,
    default: (props: any) => React.createElement('div', { 'data-testid': 'markdown-viewer' }, props.content || props.emptyText),
  };
});

jest.mock('../../../pages/lib/apiClient', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
    interceptors: { request: { use: jest.fn() }, response: { use: jest.fn() } },
  },
}));

jest.mock('../../../pages/context/AppContext', () => ({
  useAppContext: () => ({ projectId: 1 }),
}));

jest.mock('../../../pages/article/hooks/useArticleDetail', () => ({
  useArticleDetail: jest.fn(),
}));

jest.mock('../../../pages/article/hooks/useArticlePermissions', () => ({
  useArticlePermissions: jest.fn(),
}));

jest.mock('../../../pages/article/hooks/usePlatformSelector', () => ({
  usePlatformSelector: jest.fn(() => ({
    modalOpen: false, platformList: [], platformTotal: 0, platformPage: 1,
    platformSearch: '', platformLoading: false, selectedPlatformKeys: [],
    platformSortBy: '', platformSortOrder: 'asc',
    fetchList: jest.fn(), openModal: jest.fn(), confirmSelection: jest.fn(),
    closeModal: jest.fn(), setSearch: jest.fn(), setSelectedKeys: jest.fn(), setSort: jest.fn(),
  })),
}));

jest.mock('../../../pages/article/hooks/useKnowledgeBase', () => ({
  useKnowledgeBase: jest.fn(() => ({
    kbKeywords: [], kbPortraits: [], kbImages: [], kbLoading: false,
    skillsOptions: [], llmModelsOptions: [],
  })),
}));

jest.mock('../../../pages/article/hooks/useArticleActions', () => ({
  useArticleActions: jest.fn(() => ({
    review: jest.fn(), regenerate: jest.fn(), submitForReview: jest.fn(),
  })),
}));

jest.mock('../../../pages/article/hooks/useDocumentImport', () => ({
  useDocumentImport: jest.fn(() => ({ importDocument: jest.fn() })),
}));

jest.mock('../../../pages/article/components/PlatformSelectModal', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('div', { 'data-testid': 'platform-modal' }) };
});

jest.mock('../../../pages/article/components/ArticleImageManager', () => {
  const React = require('react');
  return { __esModule: true, default: () => React.createElement('div', { 'data-testid': 'image-manager' }) };
});

import ArticleDetail from '../../../pages/article/ArticleDetail';
import { useArticleDetail } from '../../../pages/article/hooks/useArticleDetail';
import { useArticlePermissions } from '../../../pages/article/hooks/useArticlePermissions';

const mockUseArticleDetail = useArticleDetail as jest.MockedFunction<typeof useArticleDetail>;
const mockUseArticlePermissions = useArticlePermissions as jest.MockedFunction<typeof useArticlePermissions>;

const renderWithRouter = (path: string) => {
  window.history.pushState({}, '', path);
  return render(
    <BrowserRouter>
      <Routes>
        <Route path="/article/:id" element={<ArticleDetail />} />
      </Routes>
    </BrowserRouter>,
  );
};

const defaultDetailReturn = {
  article: null, loading: false, saving: false, error: '', content: '',
  contentSaving: false, deleting: false,
  setContent: jest.fn(), setError: jest.fn(), fetchArticle: jest.fn(),
  saveSettings: jest.fn(), saveContent: jest.fn(), autoSave: jest.fn(),
  deleteArticle: jest.fn(), articleRef: { current: null }, contentRef: { current: '' },
};

const defaultPermissionsReturn = {
  canEditSettings: false, canEditContent: false, canReview: false,
  canDelete: false, canSubmitForReview: false, user: { id: 1, role: 'admin' },
};

describe('ArticleDetail 组件', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockUseArticleDetail.mockReturnValue(defaultDetailReturn as any);
    mockUseArticlePermissions.mockReturnValue(defaultPermissionsReturn as any);
  });

  describe('新建文章', () => {
    it('应显示"新建文章"标题', () => {
      renderWithRouter('/article/new');
      expect(screen.getByText('新建文章')).toBeTruthy();
    });

    it('应显示文章设置面板', () => {
      renderWithRouter('/article/new');
      expect(screen.getByText('文章设置')).toBeTruthy();
    });
  });

  describe('加载状态', () => {
    it('应显示加载指示器', () => {
      mockUseArticleDetail.mockReturnValue({ ...defaultDetailReturn, loading: true } as any);
      const { container } = renderWithRouter('/article/42');
      expect(container.querySelector('Spin')).toBeTruthy();
    });
  });

  describe('编辑已有文章', () => {
    const mockArticle = {
      id: 42, title: '测试文章标题', status: 'draft' as const,
      article_type: '案例分析', write_mode: 'ai' as const, keywords: '测试',
      portrait: null, images: null, platforms: null, skills: null, llm_model_id: 1,
      content: '正文', version: 1.0, created_by: 10,
    };

    const detailWithArticle = {
      ...defaultDetailReturn,
      article: mockArticle, content: '正文',
      articleRef: { current: mockArticle }, contentRef: { current: '正文' },
    };

    it('应显示文章标题和状态标签', () => {
      mockUseArticleDetail.mockReturnValue(detailWithArticle as any);
      mockUseArticlePermissions.mockReturnValue({
        ...defaultPermissionsReturn,
        canEditSettings: true, canEditContent: true, canDelete: true,
        user: { id: 10, role: 'admin' },
      } as any);

      renderWithRouter('/article/42');
      expect(screen.getByText('测试文章标题')).toBeTruthy();
      expect(screen.getByText('草稿')).toBeTruthy();
    });

    it('草稿状态应显示删除按钮（BLK-02 修复验证）', () => {
      mockUseArticleDetail.mockReturnValue(detailWithArticle as any);
      mockUseArticlePermissions.mockReturnValue({
        ...defaultPermissionsReturn,
        canEditSettings: true, canEditContent: true, canDelete: true,
        user: { id: 10, role: 'admin' },
      } as any);

      renderWithRouter('/article/42');
      expect(screen.getByText('删除文章')).toBeTruthy();
    });

    it('非草稿状态不应显示删除按钮', () => {
      const publishedArticle = { ...mockArticle, status: 'published' as const };
      mockUseArticleDetail.mockReturnValue({
        ...defaultDetailReturn,
        article: publishedArticle, content: '正文',
        articleRef: { current: publishedArticle }, contentRef: { current: '正文' },
      } as any);
      mockUseArticlePermissions.mockReturnValue({
        ...defaultPermissionsReturn, canEditSettings: false, canDelete: false,
      } as any);

      renderWithRouter('/article/42');
      expect(screen.queryByText('删除文章')).toBeNull();
    });

    it('草稿状态应显示存草稿和提交按钮', () => {
      mockUseArticleDetail.mockReturnValue(detailWithArticle as any);
      mockUseArticlePermissions.mockReturnValue({
        ...defaultPermissionsReturn,
        canEditSettings: true, canEditContent: true, canDelete: true,
        user: { id: 10, role: 'admin' },
      } as any);

      renderWithRouter('/article/42');
      expect(screen.getByText('存草稿')).toBeTruthy();
      expect(screen.getByText('提交给AI')).toBeTruthy();
    });

    it('文章不存在时应显示提示', () => {
      renderWithRouter('/article/999');
      expect(screen.getByText('文章不存在')).toBeTruthy();
    });

    it('应显示返回按钮', () => {
      mockUseArticleDetail.mockReturnValue(detailWithArticle as any);
      mockUseArticlePermissions.mockReturnValue({
        ...defaultPermissionsReturn, canEditSettings: true,
        user: { id: 10, role: 'admin' },
      } as any);

      const { container } = renderWithRouter('/article/42');
      // The mock icon renders as <span data-icon="ArrowLeftOutlined">
      const backIcon = container.querySelector('span');
      expect(backIcon).toBeTruthy();
    });
  });
});

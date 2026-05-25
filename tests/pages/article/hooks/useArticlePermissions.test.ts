/**
 * @jest-environment jsdom
 */
import { renderHook } from '@testing-library/react';
import { useArticlePermissions } from '../../../../pages/article/hooks/useArticlePermissions';
import type { ArticleData } from '../../../../pages/article/types';

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
  content: '正文内容',
  version: 1.0,
  status: 'draft',
  created_by: 10,
  ...overrides,
});

describe('useArticlePermissions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  describe('canEditSettings', () => {
    it('草稿状态下创建者可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(true);
    });

    it('草稿状态下 sysadmin 可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'sysadmin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(true);
    });

    it('草稿状态下非创建者非 sysadmin 不可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 20, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(false);
    });

    it('manual_writing 状态下创建者可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'manual_writing', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(true);
    });

    it('generating 状态下不可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'generating', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(false);
    });

    it('pending_review 状态下不可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(false);
    });

    it('published 状态下不可编辑设置', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'published', created_by: 10 })));
      expect(result.current.canEditSettings).toBe(false);
    });
  });

  describe('canEditContent', () => {
    it('草稿状态下创建者可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canEditContent).toBe(true);
    });

    it('manual_writing 状态下创建者可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'manual_writing', created_by: 10 })));
      expect(result.current.canEditContent).toBe(true);
    });

    it('generate_failed 状态下创建者可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'generate_failed', created_by: 10 })));
      expect(result.current.canEditContent).toBe(true);
    });

    it('publish_failed 状态下创建者可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'publish_failed', created_by: 10 })));
      expect(result.current.canEditContent).toBe(true);
    });

    it('pending_review 状态下创建者不可编辑正文（待审核禁止编辑）', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canEditContent).toBe(false);
    });

    it('generating 状态下不可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'generating', created_by: 10 })));
      expect(result.current.canEditContent).toBe(false);
    });

    it('published 状态下不可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'published', created_by: 10 })));
      expect(result.current.canEditContent).toBe(false);
    });

    it('pending_review 状态下非创建者不可编辑正文', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canEditContent).toBe(false);
    });

    it('pending_review 状态下 sysadmin 也不可编辑正文（待审核禁止编辑）', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'sysadmin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canEditContent).toBe(false);
    });
  });

  describe('canReview', () => {
    it('sysadmin 可审核 pending_review 文章', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'sysadmin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review' })));
      expect(result.current.canReview).toBe(true);
    });

    it('admin 不可审核 pending_review 文章', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canReview).toBe(false);
    });

    it('sysadmin 对非 pending_review 文章不可审核', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'sysadmin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft' })));
      expect(result.current.canReview).toBe(false);
    });
  });

  describe('canDelete', () => {
    it('草稿状态下创建者可删除', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canDelete).toBe(true);
    });

    it('草稿状态下 sysadmin 可删除', () => {
      localStorage.setItem('user', JSON.stringify({ id: 99, role: 'sysadmin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canDelete).toBe(true);
    });

    it('非草稿状态不可删除', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'pending_review', created_by: 10 })));
      expect(result.current.canDelete).toBe(false);
    });

    it('草稿状态下非创建者非 sysadmin 不可删除', () => {
      localStorage.setItem('user', JSON.stringify({ id: 20, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canDelete).toBe(false);
    });
  });

  describe('canSubmitForReview', () => {
    it('manual_writing 状态下创建者可提交审核', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'manual_writing', created_by: 10 })));
      expect(result.current.canSubmitForReview).toBe(true);
    });

    it('draft 状态下不可提交审核', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(mockArticle({ status: 'draft', created_by: 10 })));
      expect(result.current.canSubmitForReview).toBe(false);
    });
  });

  describe('边界情况', () => {
    it('article 为 null 时所有权限为 false', () => {
      localStorage.setItem('user', JSON.stringify({ id: 10, role: 'admin' }));
      const { result } = renderHook(() => useArticlePermissions(null));
      expect(result.current.canEditSettings).toBe(false);
      expect(result.current.canEditContent).toBe(false);
      expect(result.current.canReview).toBe(false);
      expect(result.current.canDelete).toBe(false);
      expect(result.current.canSubmitForReview).toBe(false);
    });

    it('localStorage user 损坏时不应崩溃（HIG-01 修复验证）', () => {
      localStorage.setItem('user', '{invalid json###');
      const { result } = renderHook(() => useArticlePermissions(mockArticle()));
      expect(result.current.canEditSettings).toBe(false);
      expect(result.current.canEditContent).toBe(false);
    });

    it('localStorage 无 user 时不应崩溃', () => {
      const { result } = renderHook(() => useArticlePermissions(mockArticle()));
      expect(result.current.canEditSettings).toBe(false);
    });
  });
});

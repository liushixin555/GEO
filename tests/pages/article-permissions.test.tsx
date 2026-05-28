import { renderHook } from '@testing-library/react';
import { useArticlePermissions } from '../../pages/article/hooks/useArticlePermissions';
import type { ArticleData } from '../../pages/article/types';

function makeArticle(overrides: Partial<ArticleData> = {}): ArticleData {
  return {
    id: 1,
    title: 'Pending article',
    article_type: null,
    write_mode: 'manual',
    keywords: null,
    portrait: null,
    images: null,
    skills: null,
    llm_model_id: null,
    content: 'Article content',
    version: 1,
    status: 'pending_review',
    created_by: 7,
    ...overrides,
  };
}

describe('useArticlePermissions', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('allows an admin author to review their own pending article', () => {
    localStorage.setItem('user', JSON.stringify({ id: 7, role: 'admin' }));

    const { result } = renderHook(() => useArticlePermissions(makeArticle()));

    expect(result.current.canReview).toBe(true);
  });
});

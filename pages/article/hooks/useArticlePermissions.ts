import { useMemo } from 'react';
import type { ArticleData } from '../types';
import { EDITABLE_STATUSES } from '../types';

interface User {
  id?: number;
  role?: string;
}

function getCurrentUser(): User {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
}

export function useArticlePermissions(article: ArticleData | null) {
  const user = useMemo(() => getCurrentUser(), []);

  return useMemo(() => {
    const isOwnerOrAdmin = (article?.created_by != null && article.created_by === user.id) || user.role === 'sysadmin';

    const canEditSettings = article
      ? ['draft', 'manual_writing'].includes(article.status) && isOwnerOrAdmin
      : false;

    const canEditContent = article
      ? EDITABLE_STATUSES.includes(article.status) && isOwnerOrAdmin
      : false;

    const canReview = article?.status === 'pending_review' && user.role === 'sysadmin';

    const canSubmitForReview = article?.status === 'manual_writing' && isOwnerOrAdmin;

    const canDelete = article?.status === 'draft' && isOwnerOrAdmin;

    return { canEditSettings, canEditContent, canReview, canSubmitForReview, canDelete, user };
  }, [article, user]);
}

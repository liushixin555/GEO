import { useMemo } from 'react';
import { getSafeUser } from '../../utils/auth';
import type { ArticleData } from '../types';
import { EDITABLE_STATUSES } from '../types';

export function useArticlePermissions(article: ArticleData | null) {
  const user = useMemo(() => getSafeUser(), []);

  return useMemo(() => {
    const isOwnerOrAdmin = (article?.created_by != null && article.created_by === user.id) || user.role === 'sysadmin';

    const canEditSettings = article
      ? ['draft', 'manual_writing'].includes(article.status) && isOwnerOrAdmin
      : false;

    const canEditContent = article
      ? EDITABLE_STATUSES.includes(article.status) && isOwnerOrAdmin
      : false;

    const canReview = article?.status === 'pending_review'
      && user.role === 'sysadmin'
      && article.created_by !== user.id;

    const canSubmitForReview = article?.status === 'manual_writing' && isOwnerOrAdmin;

    const canDelete = article?.status === 'draft' && isOwnerOrAdmin;

    return { canEditSettings, canEditContent, canReview, canSubmitForReview, canDelete, user };
  }, [article, user]);
}

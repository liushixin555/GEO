import { useCallback } from 'react';
import { App } from 'antd';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import type { ArticleData } from '../types';

export function useArticleActions(
  article: ArticleData | null,
  projectId: number | null | undefined,
  id: string | undefined,
  refetch: () => Promise<ArticleData | undefined>,
) {
  const { message } = App.useApp();

  const review = useCallback(async (approved: boolean) => {
    if (!article || !projectId || !id) return;
    try {
      await apiClient.put(`/projects/${projectId}/articles/${id}/review`, { approved });
      message.success(approved ? '审核通过，自动发布中' : '审核不通过，已退回修改，可基于当前正文重新生成');
      refetch();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '审核操作失败'));
    }
  }, [article, projectId, id, refetch, message]);

  const regenerate = useCallback(async () => {
    if (!article || !projectId || !id) return;
    try {
      await apiClient.put(`/projects/${projectId}/articles/${id}/regenerate`, {});
      message.success('已重新提交AI生成');
      refetch();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '重新生成失败'));
    }
  }, [article, projectId, id, refetch, message]);

  const submitForReview = useCallback(async () => {
    if (!article || !projectId || !id) return;
    try {
      await apiClient.put(`/projects/${projectId}/articles/${id}/submit-review`, {});
      message.success('已提交审核');
      refetch();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '提交审核失败'));
    }
  }, [article, projectId, id, refetch, message]);

  return { review, regenerate, submitForReview };
}

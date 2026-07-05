import { useState, useCallback, useEffect, useRef } from 'react';
import { App, Form } from 'antd';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import type { ArticleData, ArticleFormValues, WriteMode } from '../types';

type FormInstance = ReturnType<typeof Form.useForm<ArticleFormValues>>[0];

function parseKeywords(value: string | null | undefined): string[] {
  if (!value) return [];
  return value
    .split(/[、,，]/)
    .map(item => item.trim())
    .filter(Boolean);
}

function parsePortrait(value: string | null | undefined): string[] | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = JSON.parse(trimmed);
    if (Array.isArray(parsed)) {
      const items = parsed
        .map(item => String(item ?? '').trim())
        .filter(Boolean);
      return items.length > 0 ? items : undefined;
    }
    if (typeof parsed === 'string') {
      const item = parsed.trim();
      return item ? [item] : undefined;
    }
  } catch {
    // Historical generated articles may store portrait as plain text.
  }

  return [trimmed];
}

function normalizeKeywords(value: string | string[] | undefined): string | undefined {
  const items = Array.isArray(value)
    ? value
    : value?.split(/[、,，]/) ?? [];
  const normalized = items.map(item => item.trim()).filter(Boolean);
  return normalized.length > 0 ? normalized.join('、') : undefined;
}

export function useArticleDetail(
  id: string | undefined,
  projectId: number | undefined,
  isNew: boolean,
  form: FormInstance,
) {
  const [article, setArticle] = useState<ArticleData | null>(null);
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [content, setContent] = useState('');
  const [contentSaving, setContentSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const { message } = App.useApp();
  const contentRef = useRef(content);
  contentRef.current = content;
  const articleRef = useRef(article);
  articleRef.current = article;
  const savingRef = useRef(false);
  const abortRef = useRef<AbortController | null>(null);

  const fetchArticle = useCallback(async () => {
    if (isNew || !projectId || !id) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setLoading(true);
    try {
      const res = await apiClient.get(`/projects/${projectId}/articles/${id}`, {
        signal: controller.signal,
      });
      if (controller.signal.aborted) return;
      const data = res.data.data as ArticleData;
      setArticle(data);
      form.setFieldsValue({
        title: data.title || '',
        article_type: data.article_type || undefined,
        write_mode: data.write_mode || undefined,
        keywords: parseKeywords(data.keywords),
        portrait: parsePortrait(data.portrait),
        skills: data.skills ?? undefined,
        llm_model_id: data.llm_model_id ?? undefined,
      });
      setContent(data.content || '');
      return data;
    } catch (err: unknown) {
      if (controller.signal.aborted) return;
      message.error(getApiErrorMessage(err, '加载文章失败'));
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  }, [id, projectId, isNew, form, message]);

  useEffect(() => {
    fetchArticle();
    return () => { abortRef.current?.abort(); };
  }, [fetchArticle]);

  const saveSettings = async (
    values: ArticleFormValues,
    imageList: string[],
    options: { submitForGeneration?: boolean; manualWrite?: boolean; writeMode?: WriteMode } = {},
  ) => {
    setSaving(true);
    setError('');
    try {
      const payload: Partial<ArticleData> & { status?: string; content?: string } = {
        title: values.title?.trim() || undefined,
        article_type: values.article_type || undefined,
        write_mode: values.write_mode || undefined,
        keywords: normalizeKeywords(values.keywords),
        portrait: Array.isArray(values.portrait) && values.portrait.length > 0
          ? JSON.stringify(values.portrait)
          : undefined,
        images: imageList.length ? imageList : undefined,
        skills: values.skills || undefined,
        llm_model_id: values.llm_model_id || undefined,
      };

      if (options.submitForGeneration) {
        payload.status = 'generating';
      } else if (options.manualWrite) {
        payload.status = 'manual_writing';
      }

      if (isNew) {
        if (contentRef.current.trim()) payload.content = contentRef.current;
        const res = await apiClient.post(`/projects/${projectId}/articles`, payload);
        return { action: 'created' as const, data: res.data.data };
      } else {
        await apiClient.put(`/projects/${projectId}/articles/${id}`, payload);
        return { action: 'updated' as const };
      }
    } catch (err: unknown) {
      const msg = getApiErrorMessage(err, '保存失败');
      setError(msg);
      throw err;
    } finally {
      setSaving(false);
    }
  };

  const saveContent = async () => {
    if (!article || !projectId || !id) return;
    if (savingRef.current) return;
    savingRef.current = true;
    setContentSaving(true);
    try {
      await apiClient.put(`/projects/${projectId}/articles/${id}/content`, { content });
      message.success('正文已保存');
      fetchArticle();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '保存正文失败'));
    } finally {
      setContentSaving(false);
      savingRef.current = false;
    }
  };

  const autoSave = async (imageList: string[]) => {
    const currentContent = contentRef.current.trim();
    if (!currentContent || !projectId) return;
    if (savingRef.current) return;
    savingRef.current = true;
    try {
      if (isNew) {
        const formValues = form.getFieldsValue();
        const keywords = normalizeKeywords(formValues.keywords);
        if (!keywords || !formValues.llm_model_id) return;
        const payload: Partial<ArticleData> & { content: string } = {
          article_type: formValues.article_type || undefined,
          write_mode: formValues.write_mode || undefined,
          keywords,
          portrait: Array.isArray(formValues.portrait) && formValues.portrait.length > 0
            ? JSON.stringify(formValues.portrait)
            : undefined,
          images: imageList.length ? imageList : undefined,
          skills: formValues.skills || undefined,
          llm_model_id: formValues.llm_model_id,
          content: currentContent,
        };
        const res = await apiClient.post(`/projects/${projectId}/articles`, payload);
        message.success('自动保存成功');
        return { navigateTo: `/article/${res.data.data.id}` };
      } else if (articleRef.current && id) {
        await apiClient.put(`/projects/${projectId}/articles/${id}/content`, { content: currentContent });
        message.success('正文已自动保存');
      }
    } catch {
      message.error('自动保存失败，请手动保存');
    } finally {
      savingRef.current = false;
    }
  };

  const deleteArticle = async () => {
    if (!article || !projectId || !id) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/projects/${projectId}/articles/${id}`);
      message.success('文章已删除');
      return true;
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '删除失败'));
      return false;
    } finally {
      setDeleting(false);
    }
  };

  return {
    article, loading, saving, error, content, contentSaving, deleting,
    setContent, setError, fetchArticle, saveSettings, saveContent, autoSave, deleteArticle,
    articleRef, contentRef,
  };
}

import { useState, useEffect } from 'react';
import { Form } from 'antd';
import apiClient from '../../lib/apiClient';
import type { KbKeyword, KbPortrait, KbImage, SkillOption, LlmModelOption, SkillApiItem, LlmModelApiItem, KbKeywordApiItem, KbPortraitApiItem, KbImageApiItem } from '../types';

type FormInstance = ReturnType<typeof Form.useForm<import('../types').ArticleFormValues>>[0];

const kbCache = new Map<number, { keywords: KbKeyword[]; portraits: KbPortrait[]; images: KbImage[] }>();
let optionsCache: { skills: SkillOption[]; models: LlmModelOption[] } | null = null;

export function useKnowledgeBase(projectId: number | undefined, isNew: boolean, form: FormInstance) {
  const [kbKeywords, setKbKeywords] = useState<KbKeyword[]>([]);
  const [kbPortraits, setKbPortraits] = useState<KbPortrait[]>([]);
  const [kbImages, setKbImages] = useState<KbImage[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [skillsOptions, setSkillsOptions] = useState<SkillOption[]>([]);
  const [llmModelsOptions, setLlmModelsOptions] = useState<LlmModelOption[]>([]);

  useEffect(() => {
    if (optionsCache) {
      setSkillsOptions(optionsCache.skills);
      setLlmModelsOptions(optionsCache.models);
      return;
    }
    const fetchOptions = async () => {
      try {
        const [skillsRes, llmRes] = await Promise.all([
          apiClient.get('/skills?status=true&pageSize=999'),
          apiClient.get('/llm-models/enabled'),
        ]);
        const skillsRaw: SkillApiItem[] = skillsRes.data.data?.list || skillsRes.data.data || [];
        const skills = skillsRaw.map((s) => ({ label: s.name, value: s.id }));
        const models: LlmModelApiItem[] = llmRes.data.data || [];
        const llmModels = models.map((m) => ({ label: `${m.provider} - ${m.model_name}`, value: m.id }));
        optionsCache = { skills, models: llmModels };
        setSkillsOptions(skills);
        setLlmModelsOptions(llmModels);
        if (isNew && models.length > 0 && !form.getFieldValue('llm_model_id')) {
          form.setFieldValue('llm_model_id', models[0].id);
        }
        if (isNew && !form.getFieldValue('write_mode')) {
          form.setFieldValue('write_mode', 'ai');
        }
      } catch (err) {
        console.warn('[useKnowledgeBase] 加载选项失败:', err);
      }
    };
    fetchOptions();
  }, [isNew, form]);

  useEffect(() => {
    if (!projectId) return;
    if (kbCache.has(projectId)) {
      const cached = kbCache.get(projectId)!;
      setKbKeywords(cached.keywords);
      setKbPortraits(cached.portraits);
      setKbImages(cached.images);
      return;
    }
    const fetchKnowledge = async () => {
      setKbLoading(true);
      try {
        const [kwRes, ptRes, imgRes] = await Promise.all([
          apiClient.get(`/projects/${projectId}/knowledge/keywords`, { params: { pageSize: 999 } }),
          apiClient.get(`/projects/${projectId}/knowledge/portraits`, { params: { pageSize: 999 } }),
          apiClient.get(`/projects/${projectId}/knowledge/images`, { params: { pageSize: 999 } }),
        ]);
        const kwList: KbKeywordApiItem[] = kwRes.data.data?.list || [];
        const ptList: KbPortraitApiItem[] = ptRes.data.data?.list || [];
        const imgList: KbImageApiItem[] = imgRes.data.data?.list || [];
        const keywords = kwList.map((k) => ({ label: k.keyword, value: k.keyword }));
        const portraits = ptList.map((p) => ({ label: p.title, value: p.content || p.title }));
        const images = imgList.map((i) => ({ id: i.id, title: i.title, image_url: i.image_url }));
        kbCache.set(projectId, { keywords, portraits, images });
        setKbKeywords(keywords);
        setKbPortraits(portraits);
        setKbImages(images);
      } catch (err) {
        console.warn('[useKnowledgeBase] 加载知识库数据失败:', err);
      } finally {
        setKbLoading(false);
      }
    };
    fetchKnowledge();
  }, [projectId]);

  return { kbKeywords, kbPortraits, kbImages, kbLoading, skillsOptions, llmModelsOptions };
}

import { useState, useEffect } from 'react';
import { Form } from 'antd';
import apiClient from '../../lib/apiClient';
import type { KbKeyword, KbPortrait, KbImage, SkillOption, LlmModelOption } from '../types';

type FormInstance = ReturnType<typeof Form.useForm<import('../types').ArticleFormValues>>[0];

export function useKnowledgeBase(projectId: number | undefined, isNew: boolean, form: FormInstance) {
  const [kbKeywords, setKbKeywords] = useState<KbKeyword[]>([]);
  const [kbPortraits, setKbPortraits] = useState<KbPortrait[]>([]);
  const [kbImages, setKbImages] = useState<KbImage[]>([]);
  const [kbLoading, setKbLoading] = useState(false);
  const [skillsOptions, setSkillsOptions] = useState<SkillOption[]>([]);
  const [llmModelsOptions, setLlmModelsOptions] = useState<LlmModelOption[]>([]);

  useEffect(() => {
    const fetchOptions = async () => {
      try {
        const [skillsRes, llmRes] = await Promise.all([
          apiClient.get('/skills?status=true&pageSize=999'),
          apiClient.get('/llm-models/enabled'),
        ]);
        setSkillsOptions((skillsRes.data.data?.list || skillsRes.data.data || []).map((s: any) => ({ label: s.name, value: s.id })));
        const models = llmRes.data.data || [];
        setLlmModelsOptions(models.map((m: any) => ({ label: `${m.provider} - ${m.model_name}`, value: m.id })));
        if (isNew && models.length > 0 && !form.getFieldValue('llm_model_id')) {
          form.setFieldValue('llm_model_id', models[0].id);
        }
        if (isNew && !form.getFieldValue('write_mode')) {
          form.setFieldValue('write_mode', 'ai');
        }
      } catch {
        // Silently fail — options are optional
      }
    };
    fetchOptions();
  }, [isNew, form]);

  useEffect(() => {
    if (!projectId) return;
    const fetchKnowledge = async () => {
      setKbLoading(true);
      try {
        const [kwRes, ptRes, imgRes] = await Promise.all([
          apiClient.get(`/projects/${projectId}/knowledge/keywords`, { params: { pageSize: 999 } }),
          apiClient.get(`/projects/${projectId}/knowledge/portraits`, { params: { pageSize: 999 } }),
          apiClient.get(`/projects/${projectId}/knowledge/images`, { params: { pageSize: 999 } }),
        ]);
        setKbKeywords((kwRes.data.data?.list || []).map((k: any) => ({ label: k.keyword, value: k.keyword })));
        setKbPortraits((ptRes.data.data?.list || []).map((p: any) => ({ label: p.title, value: p.content || p.title })));
        setKbImages((imgRes.data.data?.list || []).map((i: any) => ({ id: i.id, title: i.title, image_url: i.image_url })));
      } catch {
        // Silently fail
      } finally {
        setKbLoading(false);
      }
    };
    fetchKnowledge();
  }, [projectId]);

  return { kbKeywords, kbPortraits, kbImages, kbLoading, skillsOptions, llmModelsOptions };
}

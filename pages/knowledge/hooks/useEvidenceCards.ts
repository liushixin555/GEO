import { useCallback, useState } from 'react';
import apiClient from '../../lib/apiClient';
import type {
  EvidenceCard,
  EvidenceArticleType,
  EvidenceCardSourceType,
  EvidenceCardStatus,
  EvidenceCardType,
  EvidenceSourceQuality,
} from '../../article/types';

export interface EvidenceCardListParams {
  page?: number;
  pageSize?: number;
  search?: string;
  companyId?: number;
  projectId?: number;
  evidenceType?: EvidenceCardType;
  sourceType?: EvidenceCardSourceType;
  status?: EvidenceCardStatus;
  sourceQuality?: EvidenceSourceQuality;
  articleType?: EvidenceArticleType;
}

export interface EvidenceCardPayload {
  companyId?: number | null;
  projectId?: number | null;
  title: string;
  content: string;
  evidenceType: EvidenceCardType;
  sourceType: EvidenceCardSourceType;
  sourceUrl?: string | null;
  keywords?: string[] | null;
  status?: EvidenceCardStatus;
  sourceQuality?: EvidenceSourceQuality;
  articleTypes?: EvidenceArticleType[] | null;
  confidenceScore?: number | null;
  freshnessScore?: number | null;
}

interface EvidenceCardListResult {
  list: EvidenceCard[];
  total: number;
}

function normalizeListResponse(data: any): EvidenceCardListResult {
  const payload = data?.data;
  if (Array.isArray(payload?.list)) return { list: payload.list, total: payload.total ?? payload.list.length };
  if (Array.isArray(payload?.data?.list)) return { list: payload.data.list, total: payload.data.total ?? payload.data.list.length };
  if (Array.isArray(payload)) return { list: payload, total: payload.length };
  return { list: [], total: 0 };
}

function normalizeItemResponse(data: any): EvidenceCard {
  return data?.data?.data ?? data?.data;
}

export function splitKeywords(value: string | string[] | undefined | null): string[] {
  const items = Array.isArray(value) ? value : value?.split(/[、,，\n]/) ?? [];
  return [...new Set(items.map(item => item.trim()).filter(Boolean))];
}

export function useEvidenceCards() {
  const [loading, setLoading] = useState(false);

  const listEvidenceCards = useCallback(async (params: EvidenceCardListParams = {}) => {
    setLoading(true);
    try {
      const res = await apiClient.get('/evidence-cards', {
        params: {
          page: params.page ?? 1,
          pageSize: params.pageSize ?? 10,
          search: params.search || undefined,
          companyId: params.companyId,
          projectId: params.projectId,
          evidenceType: params.evidenceType,
          sourceType: params.sourceType,
          status: params.status,
          sourceQuality: params.sourceQuality,
          articleType: params.articleType,
        },
      });
      return normalizeListResponse(res.data);
    } finally {
      setLoading(false);
    }
  }, []);

  const getEvidenceCard = useCallback(async (id: number) => {
    const res = await apiClient.get(`/evidence-cards/${id}`);
    return normalizeItemResponse(res.data);
  }, []);

  const createEvidenceCard = useCallback(async (payload: EvidenceCardPayload) => {
    const res = await apiClient.post('/evidence-cards', payload);
    return normalizeItemResponse(res.data);
  }, []);

  const updateEvidenceCard = useCallback(async (id: number, payload: EvidenceCardPayload) => {
    const res = await apiClient.put(`/evidence-cards/${id}`, payload);
    return normalizeItemResponse(res.data);
  }, []);

  const deleteEvidenceCard = useCallback(async (id: number) => {
    try {
      await apiClient.delete(`/evidence-cards/${id}`);
    } catch {
      await apiClient.delete('/evidence-cards', { data: { ids: [id] } });
    }
  }, []);

  return {
    loading,
    listEvidenceCards,
    getEvidenceCard,
    createEvidenceCard,
    updateEvidenceCard,
    deleteEvidenceCard,
  };
}

import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import apiClient from '../../lib/apiClient';
import type { AuditDetail } from '../types';

export function useAuditDetail(jobId: string | null) {
  const [detail, setDetail] = useState<AuditDetail | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchDetail = useCallback(async () => {
    if (!jobId) {
      setDetail(null);
      return;
    }
    setLoading(true);
    try {
      const res = await apiClient.get(`/audit/${jobId}`);
      setDetail(res.data.data);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取诊断详情失败');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }, [jobId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  return { detail, loading, refresh: fetchDetail };
}

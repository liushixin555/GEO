import { useState, useEffect, useCallback } from 'react';
import { message } from 'antd';
import apiClient from '../../lib/apiClient';
import type { AuditListItem, AuditStatus } from '../types';

interface UseAuditListParams {
  page: number;
  pageSize: number;
  status?: AuditStatus;
  search?: string;
}

export function useAuditList(params: UseAuditListParams) {
  const [list, setList] = useState<AuditListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string | number> = {
        page: params.page,
        pageSize: params.pageSize,
      };
      if (params.status) query.status = params.status;
      if (params.search) query.search = params.search;
      const res = await apiClient.get('/audit', { params: query });
      setList(res.data.data.list);
      setTotal(res.data.data.total);
    } catch (err: any) {
      message.error(err?.response?.data?.message || '获取诊断列表失败');
    } finally {
      setLoading(false);
    }
  }, [params.page, params.pageSize, params.status, params.search]);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  const remove = useCallback(async (jobId: string): Promise<boolean> => {
    try {
      await apiClient.delete(`/audit/${jobId}`);
      message.success('删除成功');
      await fetchList();
      return true;
    } catch (err: any) {
      message.error(err?.response?.data?.message || '删除失败');
      return false;
    }
  }, [fetchList]);

  return { list, total, loading, refresh: fetchList, remove };
}

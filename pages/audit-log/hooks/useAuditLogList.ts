import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../lib/apiClient';

export interface AuditLogItem {
  id: number;
  level: string;
  event: string;
  user_id: number | null;
  ip: string | null;
  method: string | null;
  url: string | null;
  status: number | null;
  duration: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

interface UseAuditLogListParams {
  page?: number;
  pageSize?: number;
  level?: string;
  event?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}

export function useAuditLogList(params: UseAuditLogListParams) {
  const [list, setList] = useState<AuditLogItem[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [events, setEvents] = useState<string[]>([]);

  const fetchList = useCallback(async () => {
    setLoading(true);
    try {
      const query: Record<string, string | number> = {
        page: params.page ?? 1,
        pageSize: params.pageSize ?? 20,
      };
      if (params.level) query.level = params.level;
      if (params.event) query.event = params.event;
      if (params.startDate) query.startDate = params.startDate;
      if (params.endDate) query.endDate = params.endDate;
      if (params.search) query.search = params.search;

      const res = await apiClient.get('/audit-logs', { params: query });
      setList(res.data.data.list);
      setTotal(res.data.data.total);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [params.page, params.pageSize, params.level, params.event, params.startDate, params.endDate, params.search]);

  const fetchEvents = useCallback(async () => {
    try {
      const res = await apiClient.get('/audit-logs/events');
      setEvents(res.data.data);
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    fetchList();
  }, [fetchList]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { list, total, loading, events, refresh: fetchList };
}

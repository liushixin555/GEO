import { useState, useEffect, useRef, useCallback } from 'react';
import { App } from 'antd';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import type { UserItem } from '../../types/user';

interface ListUsersParams {
  page: number;
  pageSize: number;
  search?: string;
  role?: string;
  status?: string;
}

export function useUserList() {
  const { message } = App.useApp();

  const [data, setData] = useState<UserItem[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize] = useState(12);
  const [loading, setLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [filterRole, setFilterRole] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    debounceRef.current = setTimeout(() => {
      setSearch(searchInput);
      setPage(1);
    }, 300);
    return () => clearTimeout(debounceRef.current);
  }, [searchInput]);

  const fetchData = useCallback(async (signal?: AbortSignal) => {
    // 取消上一个未完成的请求
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    const effectiveSignal = signal ?? controller.signal;

    setLoading(true);
    try {
      const params: ListUsersParams = { page, pageSize };
      if (search) params.search = search;
      if (filterRole) params.role = filterRole;
      if (filterStatus !== '') params.status = filterStatus;

      const res = await apiClient.get('/users', { params, signal: effectiveSignal });
      if (!effectiveSignal.aborted) {
        setData(res.data.data.list);
        setTotal(res.data.data.total);
      }
    } catch (err: unknown) {
      if (effectiveSignal.aborted) return;
      message.error(getApiErrorMessage(err, '获取用户列表失败'));
    } finally {
      if (!effectiveSignal.aborted) {
        setLoading(false);
      }
    }
  }, [page, pageSize, search, filterRole, filterStatus, message]);

  useEffect(() => {
    fetchData();
    return () => {
      abortRef.current?.abort();
    };
  }, [fetchData]);

  const changeRole = (val: string) => { setFilterRole(val || ''); setPage(1); };
  const changeStatus = (val: string) => { setFilterStatus(val || ''); setPage(1); };

  return {
    data, total, page, pageSize, loading,
    searchInput, setSearchInput,
    filterRole, changeRole,
    filterStatus, changeStatus,
    setPage, fetchData,
  };
}

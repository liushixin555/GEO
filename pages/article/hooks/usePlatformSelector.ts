import { useState, useCallback } from 'react';
import { Form } from 'antd';
import apiClient from '../../lib/apiClient';
import type { Platform } from '../types';

type FormInstance = ReturnType<typeof Form.useForm<import('../types').ArticleFormValues>>[0];

interface PlatformSelectorState {
  modalOpen: boolean;
  platformList: Platform[];
  platformTotal: number;
  platformPage: number;
  platformSearch: string;
  platformLoading: boolean;
  selectedPlatformKeys: string[];
  platformSortBy: string;
  platformSortOrder: 'asc' | 'desc';
}

export function usePlatformSelector(form: FormInstance) {
  const [state, setState] = useState<PlatformSelectorState>({
    modalOpen: false,
    platformList: [],
    platformTotal: 0,
    platformPage: 1,
    platformSearch: '',
    platformLoading: false,
    selectedPlatformKeys: [],
    platformSortBy: '',
    platformSortOrder: 'asc',
  });

  const fetchList = useCallback(async (page = 1, search = '', sortBy = '', sortOrder: 'asc' | 'desc' = 'asc') => {
    setState((s) => ({ ...s, platformLoading: true }));
    try {
      const params: Record<string, any> = { page, pageSize: 10 };
      if (search) params.search = search;
      if (sortBy) { params.sortBy = sortBy; params.sortOrder = sortOrder; }
      const res = await apiClient.get('/publishing-platforms', { params });
      const data = res.data.data;
      if (data?.list) {
        setState((s) => ({ ...s, platformList: data.list, platformTotal: data.total, platformPage: page, platformLoading: false }));
      } else if (Array.isArray(data)) {
        setState((s) => ({ ...s, platformList: data, platformTotal: data.length, platformPage: page, platformLoading: false }));
      }
    } catch {
      setState((s) => ({ ...s, platformList: [], platformTotal: 0, platformLoading: false }));
    }
  }, []);

  const openModal = useCallback(() => {
    const currentPlatforms: string[] = form.getFieldValue('platforms') || [];
    setState({
      modalOpen: true, selectedPlatformKeys: currentPlatforms, platformSearch: '',
      platformSortBy: '', platformSortOrder: 'asc', platformList: [], platformTotal: 0, platformPage: 1, platformLoading: false,
    });
    fetchList(1, '', '', 'asc');
  }, [form, fetchList]);

  const confirmSelection = useCallback((onUpdate: (keys: string[]) => void) => {
    form.setFieldValue('platforms', state.selectedPlatformKeys);
    onUpdate(state.selectedPlatformKeys);
    setState((s) => ({ ...s, modalOpen: false }));
  }, [form, state.selectedPlatformKeys]);

  const closeModal = useCallback(() => {
    setState((s) => ({ ...s, modalOpen: false }));
  }, []);

  const setSearch = useCallback((search: string) => {
    setState((s) => ({ ...s, platformSearch: search }));
  }, []);

  const setSelectedKeys = useCallback((keys: string[]) => {
    setState((s) => ({ ...s, selectedPlatformKeys: keys }));
  }, []);

  const setSort = useCallback((sortBy: string, sortOrder: 'asc' | 'desc') => {
    setState((s) => ({ ...s, platformSortBy: sortBy, platformSortOrder: sortOrder }));
  }, []);

  return {
    ...state,
    fetchList, openModal, confirmSelection, closeModal, setSearch, setSelectedKeys, setSort,
  };
}

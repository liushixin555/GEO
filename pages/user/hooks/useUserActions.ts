import { useState } from 'react';
import { App } from 'antd';
import apiClient from '../../lib/apiClient';
import { getApiErrorMessage } from '../../utils/error';
import type { UserItem } from '../../types/user';

export function useUserActions(onRefresh: () => void) {
  const { message } = App.useApp();
  const [togglingId, setTogglingId] = useState<number | null>(null);

  const toggleStatus = async (item: UserItem) => {
    setTogglingId(item.id);
    try {
      await apiClient.put(`/users/${item.id}`, { status: !item.status });
      message.success(item.status ? '用户已禁用' : '用户已启用');
      onRefresh();
    } catch (err: unknown) {
      message.error(getApiErrorMessage(err, '操作失败'));
    } finally {
      setTogglingId(null);
    }
  };

  return { toggleStatus, togglingId };
}

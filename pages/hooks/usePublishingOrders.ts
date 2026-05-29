import { useCallback, useState } from 'react';
import { getPublishingScheduleOrders, syncPublishingScheduleOrders } from '../lib/apiClient';

export interface PublishingPlatformOrder {
  id: number;
  schedule_id: number;
  platform_id: number;
  rm_order_id: string;
  rm_status: number;
  rm_response_message: string | null;
  rm_resource_name: string | null;
  last_synced_at: string | null;
}

export function usePublishingOrders(scheduleId: number) {
  const [orders, setOrders] = useState<PublishingPlatformOrder[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const res = await getPublishingScheduleOrders(scheduleId);
      setOrders(res.data.data);
    } finally {
      setLoading(false);
    }
  }, [scheduleId]);

  const syncOrders = useCallback(async () => {
    setLoading(true);
    try {
      await syncPublishingScheduleOrders(scheduleId);
      await fetchOrders();
    } finally {
      setLoading(false);
    }
  }, [fetchOrders, scheduleId]);

  return { orders, loading, fetchOrders, syncOrders };
}

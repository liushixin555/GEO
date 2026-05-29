export interface PublishingOrderSyncResult {
  scanned: number;
  synced: number;
  failed: number;
}

export interface IPublishingOrderSyncService {
  syncAllPendingOrders(): Promise<PublishingOrderSyncResult>;
  syncOrderByScheduleId(scheduleId: number): Promise<PublishingOrderSyncResult>;
  syncOrderByRmOrderId(rmOrderId: string): Promise<PublishingOrderSyncResult>;
}

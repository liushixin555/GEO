import { getPrisma } from '../../utils';
import { getRmOrderById, getRmToken, type RmOrderItem, type RmOrderQueryResponse } from '../../utils/rmapi.utils';
import type { IPublishingOrderSyncService, PublishingOrderSyncResult } from '../publishing-order-sync.service';
import { Prisma } from '@prisma/client';

const RUANMENG_USERNAME_KEY = 'ruanmeng_username';
const RUANMENG_PASSWORD_KEY = 'ruanmeng_password';
const DEFAULT_BATCH_SIZE = 50;

export class PublishingOrderSyncServiceImpl implements IPublishingOrderSyncService {
  async syncAllPendingOrders(): Promise<PublishingOrderSyncResult> {
    const orders = await getPrisma().$queryRaw<Array<{ id: number; rmOrderId: string }>>(Prisma.sql`
      SELECT id, rm_order_id AS "rmOrderId"
      FROM publishing_platform_orders
      WHERE rm_status = 0
      ORDER BY updated_at ASC
      LIMIT ${DEFAULT_BATCH_SIZE}
    `);
    return this.syncLocalOrders(orders);
  }

  async syncOrderByScheduleId(scheduleId: number): Promise<PublishingOrderSyncResult> {
    const orders = await getPrisma().$queryRaw<Array<{ id: number; rmOrderId: string }>>(Prisma.sql`
      SELECT id, rm_order_id AS "rmOrderId"
      FROM publishing_platform_orders
      WHERE schedule_id = ${scheduleId}
      ORDER BY id ASC
    `);
    return this.syncLocalOrders(orders);
  }

  async syncOrderByRmOrderId(rmOrderId: string): Promise<PublishingOrderSyncResult> {
    const rows = await getPrisma().$queryRaw<Array<{ id: number; rmOrderId: string }>>(Prisma.sql`
      SELECT id, rm_order_id AS "rmOrderId"
      FROM publishing_platform_orders
      WHERE rm_order_id = ${rmOrderId}
      LIMIT 1
    `);
    const order = rows[0];
    if (!order) return { scanned: 0, synced: 0, failed: 0 };
    return this.syncLocalOrders([order]);
  }

  private async syncLocalOrders(localOrders: Array<{ id: number; rmOrderId: string }>): Promise<PublishingOrderSyncResult> {
    const result: PublishingOrderSyncResult = { scanned: localOrders.length, synced: 0, failed: 0 };
    if (localOrders.length === 0) return result;

    const credentials = await this.getRuanmengCredentials();
    let token = await getRmToken({ mobile: credentials.username, password: credentials.password });

    for (const localOrder of localOrders) {
      try {
        let response = await getRmOrderById(token, localOrder.rmOrderId);
        if (!response.success && response.status === 401) {
          token = await getRmToken({ mobile: credentials.username, password: credentials.password });
          response = await getRmOrderById(token, localOrder.rmOrderId);
        }
        const remoteOrder = this.extractOrder(response, localOrder.rmOrderId);
        await this.updateLocalOrder(localOrder.id, remoteOrder);
        result.synced++;
      } catch {
        result.failed++;
      }
    }

    return result;
  }

  private async getRuanmengCredentials(): Promise<{ username: string; password: string }> {
    const prisma = getPrisma();
    const configs = await prisma.systemConfig.findMany({
      where: { configKey: { in: [RUANMENG_USERNAME_KEY, RUANMENG_PASSWORD_KEY] } },
    });
    const configMap = new Map(configs.map((item: any) => [item.configKey, item.configValue]));
    const username = configMap.get(RUANMENG_USERNAME_KEY);
    const password = configMap.get(RUANMENG_PASSWORD_KEY);
    if (!username || !password) throw new Error('请先配置软盟账号和密码');
    return { username, password };
  }

  private extractOrder(response: RmOrderQueryResponse, rmOrderId: string): RmOrderItem {
    if (!response.success) {
      throw new Error(response.message || `软盟订单查询失败，状态码 ${response.status}`);
    }
    const order = response.data?.find(item => item.order_id === rmOrderId) || response.data?.[0];
    if (!order) throw new Error(`未找到软盟订单：${rmOrderId}`);
    return order;
  }

  private async updateLocalOrder(id: number, order: RmOrderItem): Promise<void> {
    await getPrisma().$executeRaw(Prisma.sql`
      UPDATE publishing_platform_orders
      SET
        rm_status = ${order.status},
        rm_response_message = ${order.response_message ?? null},
        rm_resource_name = ${order.resource_name ?? null},
        last_synced_at = NOW(),
        updated_at = NOW()
      WHERE id = ${id}
    `);
  }
}

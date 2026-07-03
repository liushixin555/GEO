import { Prisma } from '@prisma/client';
import { getPrisma } from '../../utils';
import { isInternalPublishedLinkUrl, normalizeCitationUrl } from '../../utils/citation-url.util';
import { getRmOrderById, getRmToken, type RmOrderItem, type RmOrderQueryResponse } from '../../utils/rmapi.utils';
import type { IPublishingOrderSyncService, PublishingOrderSyncResult } from '../publishing-order-sync.service';

const RUANMENG_USERNAME_KEY = 'ruanmeng_username';
const RUANMENG_PASSWORD_KEY = 'ruanmeng_password';
const DEFAULT_BATCH_SIZE = 50;
const PUBLIC_LINK_POLL_DAYS = 7;

export class PublishingOrderSyncServiceImpl implements IPublishingOrderSyncService {
  async syncAllPendingOrders(): Promise<PublishingOrderSyncResult> {
    const orders = await getPrisma().$queryRaw<Array<LocalOrder>>(Prisma.sql`
      SELECT
        ppo.id,
        ppo.rm_order_id AS "rmOrderId",
        ppo.schedule_id AS "scheduleId",
        ps.article_id AS "articleId",
        pp.name AS "platformName"
      FROM publishing_platform_orders ppo
      JOIN publishing_schedules ps ON ps.id = ppo.schedule_id
      LEFT JOIN publishing_platforms pp ON pp.id = ppo.platform_id
      WHERE ppo.rm_status = 0
        OR (
          ppo.created_at >= NOW() - (${PUBLIC_LINK_POLL_DAYS} * INTERVAL '1 day')
          AND NOT EXISTS (
            SELECT 1
            FROM published_article_links pal
            WHERE pal.schedule_id = ppo.schedule_id
              AND pal.deleted_at IS NULL
              AND NOT (
                LOWER(COALESCE(pal.domain, '')) = 'ruan.net'
                OR LOWER(COALESCE(pal.domain, '')) LIKE '%.ruan.net'
                OR LOWER(pal.normalized_url) = 'ruan.net'
                OR LOWER(pal.normalized_url) LIKE 'ruan.net/%'
                OR LOWER(pal.normalized_url) LIKE '%.ruan.net/%'
              )
          )
        )
      ORDER BY
        CASE WHEN ppo.rm_status = 0 THEN 0 ELSE 1 END,
        ppo.last_synced_at ASC NULLS FIRST,
        ppo.updated_at ASC
      LIMIT ${DEFAULT_BATCH_SIZE}
    `);
    return this.syncLocalOrders(orders);
  }

  async syncOrderByScheduleId(scheduleId: number): Promise<PublishingOrderSyncResult> {
    const orders = await getPrisma().$queryRaw<Array<LocalOrder>>(Prisma.sql`
      SELECT
        ppo.id,
        ppo.rm_order_id AS "rmOrderId",
        ppo.schedule_id AS "scheduleId",
        ps.article_id AS "articleId",
        pp.name AS "platformName"
      FROM publishing_platform_orders ppo
      JOIN publishing_schedules ps ON ps.id = ppo.schedule_id
      LEFT JOIN publishing_platforms pp ON pp.id = ppo.platform_id
      WHERE ppo.schedule_id = ${scheduleId}
      ORDER BY ppo.id ASC
    `);
    return this.syncLocalOrders(orders);
  }

  async syncOrderByRmOrderId(rmOrderId: string): Promise<PublishingOrderSyncResult> {
    const rows = await getPrisma().$queryRaw<Array<LocalOrder>>(Prisma.sql`
      SELECT
        ppo.id,
        ppo.rm_order_id AS "rmOrderId",
        ppo.schedule_id AS "scheduleId",
        ps.article_id AS "articleId",
        pp.name AS "platformName"
      FROM publishing_platform_orders ppo
      JOIN publishing_schedules ps ON ps.id = ppo.schedule_id
      LEFT JOIN publishing_platforms pp ON pp.id = ppo.platform_id
      WHERE ppo.rm_order_id = ${rmOrderId}
      LIMIT 1
    `);
    const order = rows[0];
    if (!order) return { scanned: 0, synced: 0, failed: 0 };
    return this.syncLocalOrders([order]);
  }

  private async syncLocalOrders(localOrders: LocalOrder[]): Promise<PublishingOrderSyncResult> {
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
        await this.deactivateInternalPublishedLinks(localOrder);
        await this.upsertPublishedLink(localOrder, remoteOrder);
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
    if (!username || !password) throw new Error('Ruanmeng credentials are not configured');
    return { username, password };
  }

  private extractOrder(response: RmOrderQueryResponse, rmOrderId: string): RmOrderItem {
    if (!response.success) {
      throw new Error(response.message || `Ruanmeng order query failed, status ${response.status}`);
    }
    const order = response.data?.find(item => item.order_id === rmOrderId) || response.data?.[0];
    if (!order) throw new Error(`Ruanmeng order not found: ${rmOrderId}`);
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

  private extractPublishedUrl(order: RmOrderItem): string | null {
    const candidates = [
      order.url,
      order.link,
      order.publish_url,
      order.article_url,
      order.source_url,
      order.response_message,
      JSON.stringify(order),
    ];

    for (const candidate of candidates) {
      if (!candidate) continue;
      const matches = String(candidate).match(/https?:\/\/[^\s"'<>;,)\]}\uFF0C\u3002\uFF1B]+/gi) || [];
      for (const match of matches) {
        const url = match.replace(/[.,;)\]}\uFF0C\u3002\uFF1B]+$/u, '');
        if (url && !isInternalPublishedLinkUrl(url)) return url;
      }
    }

    return null;
  }

  private async deactivateInternalPublishedLinks(localOrder: LocalOrder): Promise<void> {
    await getPrisma().$executeRaw(Prisma.sql`
      UPDATE published_article_links
      SET deleted_at = COALESCE(deleted_at, NOW()),
          updated_at = NOW()
      WHERE deleted_at IS NULL
        AND article_id = ${localOrder.articleId}
        AND (
          schedule_id = ${localOrder.scheduleId}
          OR schedule_id IS NULL
        )
        AND (
          LOWER(COALESCE(domain, '')) = 'ruan.net'
          OR LOWER(COALESCE(domain, '')) LIKE '%.ruan.net'
          OR LOWER(normalized_url) = 'ruan.net'
          OR LOWER(normalized_url) LIKE 'ruan.net/%'
          OR LOWER(normalized_url) LIKE '%.ruan.net/%'
          OR LOWER(url) LIKE 'http://ruan.net/%'
          OR LOWER(url) LIKE 'https://ruan.net/%'
          OR LOWER(url) LIKE 'http://%.ruan.net/%'
          OR LOWER(url) LIKE 'https://%.ruan.net/%'
        )
    `);
  }

  private async upsertPublishedLink(localOrder: LocalOrder, remoteOrder: RmOrderItem): Promise<void> {
    const url = this.extractPublishedUrl(remoteOrder);
    if (!url) return;

    const { normalizedUrl, domain } = normalizeCitationUrl(url);
    if (!normalizedUrl) return;
    if (isInternalPublishedLinkUrl(url)) return;

    await getPrisma().$executeRaw(Prisma.sql`
      INSERT INTO published_article_links
        (article_id, schedule_id, platform_name, url, normalized_url, domain, created_by)
      VALUES
        (${localOrder.articleId}, ${localOrder.scheduleId}, ${localOrder.platformName ?? remoteOrder.resource_name ?? null}, ${url}, ${normalizedUrl}, ${domain}, null)
      ON CONFLICT (article_id, normalized_url) WHERE deleted_at IS NULL
      DO UPDATE SET
        schedule_id = COALESCE(EXCLUDED.schedule_id, published_article_links.schedule_id),
        platform_name = COALESCE(EXCLUDED.platform_name, published_article_links.platform_name),
        url = EXCLUDED.url,
        domain = EXCLUDED.domain,
        updated_at = NOW()
    `);
  }
}

interface LocalOrder {
  id: number;
  rmOrderId: string;
  scheduleId: number;
  articleId: number;
  platformName: string | null;
}

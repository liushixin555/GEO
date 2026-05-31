import { getPrisma } from '../../utils';
import { getRmToken, submitRmOrder } from '../../utils/rmapi.utils';
import { markdownToPublishHtml } from '../../utils/publish-content.util';
import type { IPublishingExecutionService, PublishingExecutionResult } from '../publishing-execution.service';
import { Prisma } from '@prisma/client';

const RUANMENG_USERNAME_KEY = 'ruanmeng_username';
const RUANMENG_PASSWORD_KEY = 'ruanmeng_password';
const DEFAULT_BATCH_SIZE = 20;
const MAX_FAILURE_REASON_LENGTH = 500;

export class PublishingExecutionServiceImpl implements IPublishingExecutionService {
  async processDueSchedules(now: Date = new Date()): Promise<PublishingExecutionResult> {
    const prisma = getPrisma();
    const schedules = await prisma.publishingSchedule.findMany({
      where: {
        deletedAt: null,
        status: 'pending',
        article: { status: 'approved', deletedAt: null },
        OR: [
          { scheduleType: 'asap' },
          { scheduleType: { in: ['scheduled', 'after'] }, scheduledPublishAt: { lte: now } },
        ],
      },
      include: { article: true },
      orderBy: [{ scheduledPublishAt: 'asc' }, { id: 'asc' }],
      take: DEFAULT_BATCH_SIZE,
    });

    if (schedules.length === 0) {
      return { processed: 0, succeeded: 0, failed: 0 };
    }

    const credentials = await this.getRuanmengCredentials();
    let token = await getRmToken({ mobile: credentials.username, password: credentials.password });
    const result: PublishingExecutionResult = { processed: 0, succeeded: 0, failed: 0 };

    for (const schedule of schedules) {
      const claimed = await prisma.publishingSchedule.updateMany({
        where: { id: schedule.id, status: 'pending', deletedAt: null },
        data: { status: 'publishing' },
      });
      if (claimed.count !== 1) {
        continue;
      }

      result.processed++;
      try {
        token = await this.submitScheduleOrders(schedule, token, credentials);
        await prisma.publishingSchedule.update({
          where: { id: schedule.id },
          data: { status: 'published', rejectReason: null },
        });
        result.succeeded++;
      } catch (err) {
        result.failed++;
        await prisma.publishingSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'publish_failed',
            rejectReason: this.formatFailureReason(err),
          },
        });
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

    if (!username || !password) {
      throw new Error('请先配置软盟账号和密码');
    }

    return { username, password };
  }

  private async submitScheduleOrders(
    schedule: any,
    token: string,
    credentials: { username: string; password: string },
  ): Promise<string> {
    const title = schedule.article?.title?.trim();
    const content = schedule.article?.content?.trim();
    if (!title) throw new Error('文章标题为空，无法发布');
    if (!content) throw new Error('文章正文为空，无法发布');
    const publishContent = markdownToPublishHtml(content);

    const platformNames = Array.isArray(schedule.platforms) ? schedule.platforms : [];
    if (platformNames.length === 0) {
      throw new Error('发布计划未选择发布平台');
    }

    let activeToken = token;
    for (const platformName of platformNames) {
      const platform = await this.resolvePlatform(platformName);
      const response = await submitRmOrder({
        token: activeToken,
        title,
        content: publishContent,
        resource_id: platform.rmResourceId,
      });

      if (!response.success && response.status === 401) {
        activeToken = await getRmToken({ mobile: credentials.username, password: credentials.password });
        const retryResponse = await submitRmOrder({
          token: activeToken,
          title,
          content: publishContent,
          resource_id: platform.rmResourceId,
        });
        if (!retryResponse.success) {
          throw new Error(retryResponse.message || `软盟下单失败，状态码 ${retryResponse.status}`);
        }
        await this.recordPlatformOrder(schedule.id, platform.id, platformName, retryResponse);
        continue;
      }

      if (!response.success) {
        throw new Error(response.message || `软盟下单失败，状态码 ${response.status}`);
      }
      await this.recordPlatformOrder(schedule.id, platform.id, platformName, response);
    }

    return activeToken;
  }

  private async resolvePlatform(platformName: string): Promise<{ id: number; rmResourceId: number }> {
    const name = platformName.trim();
    if (!name) throw new Error('发布平台名称为空');

    const platform = await getPrisma().publishingPlatform.findFirst({
      where: { name },
      select: { id: true, rmResourceId: true },
    });
    if (!platform) {
      throw new Error(`未找到发布平台：${name}`);
    }
    return platform;
  }

  private async recordPlatformOrder(scheduleId: number, platformId: number, platformName: string, response: any): Promise<void> {
    const rmOrderId = this.extractRmOrderId(response);
    if (!rmOrderId) return;

    try {
      await getPrisma().$executeRaw(Prisma.sql`
        INSERT INTO publishing_platform_orders
          (schedule_id, platform_id, rm_order_id, rm_status, rm_response_message, rm_resource_name, last_synced_at)
        VALUES
          (${scheduleId}, ${platformId}, ${rmOrderId}, 0, ${response.message ?? null}, ${platformName}, NOW())
        ON CONFLICT (rm_order_id) DO UPDATE SET
          schedule_id = EXCLUDED.schedule_id,
          platform_id = EXCLUDED.platform_id,
          rm_status = 0,
          rm_response_message = EXCLUDED.rm_response_message,
          rm_resource_name = EXCLUDED.rm_resource_name,
          last_synced_at = NOW(),
          updated_at = NOW()
      `);
    } catch (err) {
      console.warn('[发布订单] 记录软盟订单失败', err instanceof Error ? err.message : String(err));
    }
  }

  private extractRmOrderId(response: any): string | null {
    const data = response?.data;
    const value = data?.order_id ?? data?.orderId ?? data?.id ?? data?.order?.order_id;
    return value == null ? null : String(value);
  }

  private formatFailureReason(err: unknown): string {
    const message = err instanceof Error ? err.message : String(err);
    return message.slice(0, MAX_FAILURE_REASON_LENGTH);
  }
}

import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import config from '../config';
import { createPublishingOrderSyncService } from '../service';

const syncService = createPublishingOrderSyncService();

let task: ScheduledTask | null = null;
let isRunning = false;

export function startPublishingOrderSync(): void {
  if (!config.cron.publishingOrderSyncEnabled) {
    console.log('[发布订单同步] 定时任务已禁用');
    return;
  }

  const expression = config.cron.publishingOrderSyncInterval;
  if (!cron.validate(expression)) {
    console.error(`[发布订单同步] 无效的 cron 表达式: ${expression}`);
    return;
  }

  task = cron.schedule(expression, () => {
    processOrderSync();
  });
  console.log(`[发布订单同步] 定时任务已启动 (${expression})`);
}

export function stopPublishingOrderSync(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[发布订单同步] 定时任务已停止');
  }
}

export async function processOrderSync(): Promise<void> {
  if (isRunning) {
    console.log('[发布订单同步] 上一批次仍在执行，跳过本次调度');
    return;
  }

  isRunning = true;
  try {
    const result = await syncService.syncAllPendingOrders();
    console.log(`[发布订单同步] 完成：扫描 ${result.scanned}，成功 ${result.synced}，失败 ${result.failed}`);
  } catch (err: any) {
    console.error(`[发布订单同步] 执行失败: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

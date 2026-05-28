import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import config from '../config';
import { createPublishingExecutionService } from '../service';

const publishingExecutionService = createPublishingExecutionService();

let task: ScheduledTask | null = null;
let isRunning = false;

export function startPublishingScheduleCron(): void {
  if (!config.cron.publishingScheduleEnabled) {
    console.log('[发布计划] 定时任务已禁用');
    return;
  }

  const expression = config.cron.publishingScheduleInterval;
  if (!cron.validate(expression)) {
    console.error(`[发布计划] 无效的cron表达式: ${expression}`);
    return;
  }

  task = cron.schedule(expression, () => {
    processDuePublishingSchedules();
  });

  console.log(`[发布计划] 定时任务已启动 (${expression})`);
}

export function stopPublishingScheduleCron(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[发布计划] 定时任务已停止');
  }
}

export async function processDuePublishingSchedules(): Promise<void> {
  if (isRunning) {
    console.log('[发布计划] 上一批次仍在执行，跳过本次调度');
    return;
  }

  isRunning = true;
  try {
    const result = await publishingExecutionService.processDueSchedules();
    if (result.processed > 0) {
      console.log(`[发布计划] 处理完成，成功 ${result.succeeded}/${result.processed}，失败 ${result.failed}`);
    }
  } catch (err) {
    console.error(`[发布计划] 批次处理失败: ${err instanceof Error ? err.message : String(err)}`);
  } finally {
    isRunning = false;
  }
}

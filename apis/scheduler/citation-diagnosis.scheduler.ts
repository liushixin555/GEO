import * as cron from 'node-cron';
import { ScheduledTask } from 'node-cron';
import config from '../config';
import { createCitationDiagnosisService } from '../service';

const citationDiagnosisService = createCitationDiagnosisService();

let task: ScheduledTask | null = null;
let isRunning = false;

export function startCitationDiagnosisCron(): void {
  if (!config.cron.citationDiagnosisEnabled) {
    console.log('[引用诊断] 定时任务已禁用');
    return;
  }

  const expression = config.cron.citationDiagnosisInterval;
  if (!cron.validate(expression)) {
    console.error(`[引用诊断] 无效的 cron 表达式: ${expression}`);
    return;
  }

  task = cron.schedule(expression, () => {
    processCitationDiagnosis();
  });
  console.log(`[引用诊断] 定时任务已启动 (${expression})`);
}

export function stopCitationDiagnosisCron(): void {
  if (task) {
    task.stop();
    task = null;
    console.log('[引用诊断] 定时任务已停止');
  }
}

export async function processCitationDiagnosis(): Promise<void> {
  if (isRunning) {
    console.log('[引用诊断] 上一批次仍在执行，跳过本次调度');
    return;
  }

  isRunning = true;
  try {
    const result = await citationDiagnosisService.runAutomaticDetection(
      { limit: 3, question_count: 1 },
      { role: 'sysadmin' }
    );
    console.log(`[引用诊断] 完成：链接 ${result.scanned_links}，命中 ${result.matched_count}`);
  } catch (err: any) {
    console.error(`[引用诊断] 执行失败: ${err.message}`);
  } finally {
    isRunning = false;
  }
}

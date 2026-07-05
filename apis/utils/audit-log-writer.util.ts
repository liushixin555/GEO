/**
 * Audit Log Writer 鈥?鏃ュ織鎸佷箙鍖栧啓鍏ュ伐鍏?
 *
 * 鎻愪緵 writeAuditLog / writeApiAccessLog 涓や釜鍑芥暟锛?
 * 琚?logger.util.ts 鍜?app.ts 涓棿浠惰皟鐢紝灏嗘棩蹇楀啓鍏?PostgreSQL audit_logs 琛ㄣ€?
 *
 * 璁捐鍘熷垯锛?
 * - 鍗冲彂鍗冲純锛坒ire-and-forget锛夛紝涓嶉樆濉炶姹傚鐞?
 * - .catch() 闈欓粯澶勭悊鍐欏叆澶辫触锛屼粎 console.error 杈撳嚭
 */

import { getPrisma } from './db.util';
import type { Prisma } from '@prisma/client';

type AuditLogLevel = 'debug' | 'info' | 'warn' | 'error';

interface AuditLogData {
  userId?: number;
  ip?: string;
  method?: string;
  url?: string;
  status?: number;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export function writeAuditLog(level: AuditLogLevel, event: string, data?: AuditLogData): void {
  const metadata: Prisma.InputJsonValue | undefined = data?.metadata as Prisma.InputJsonValue | undefined;
  getPrisma().auditLog.create({
    data: {
      level,
      event,
      userId: data?.userId,
      ip: data?.ip,
      method: data?.method,
      url: data?.url,
      status: data?.status,
      duration: data?.duration,
      metadata,
    },
  }).catch((err: Error) => {
    console.error(JSON.stringify({
      level: 'error',
      event: 'audit_log_write_failed',
      message: err.message,
    }));
  });
}

export interface ApiAccessLogData {
  userId?: number;
  ip: string;
  method: string;
  url: string;
  status: number;
  duration: number;
}

export function writeApiAccessLog(data: ApiAccessLogData): void {
  writeAuditLog(data.status >= 500 ? 'error' : 'warn', 'api_access', {
    userId: data.userId,
    ip: data.ip,
    method: data.method,
    url: data.url,
    status: data.status,
    duration: data.duration,
  });
}



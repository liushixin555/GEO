/**
 * Audit Log Writer — 日志持久化写入工具
 *
 * 提供 writeAuditLog / writeApiAccessLog 两个函数，
 * 被 logger.util.ts 和 app.ts 中间件调用，将日志写入 PostgreSQL audit_logs 表。
 *
 * 设计原则：
 * - 即发即弃（fire-and-forget），不阻塞请求处理
 * - .catch() 静默处理写入失败，仅 console.error 输出
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

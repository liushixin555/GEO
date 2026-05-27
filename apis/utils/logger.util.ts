import { writeAuditLog } from './audit-log-writer.util';

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

function formatLog(level: LogLevel, event: string, data?: Record<string, unknown>): string {
  const entry: Record<string, unknown> = {
    level,
    event,
    ts: new Date().toISOString(),
  };
  if (data) {
    Object.assign(entry, data);
  }
  return JSON.stringify(entry);
}

export const logger = {
  debug(event: string, data?: Record<string, unknown>): void {
    if (process.env.LOG_LEVEL === 'debug') {
      process.stdout.write(formatLog('debug', event, data) + '\n');
    }
    writeAuditLog('debug', event, data as any);
  },
  info(event: string, data?: Record<string, unknown>): void {
    process.stdout.write(formatLog('info', event, data) + '\n');
    writeAuditLog('info', event, data as any);
  },
  warn(event: string, data?: Record<string, unknown>): void {
    process.stderr.write(formatLog('warn', event, data) + '\n');
    writeAuditLog('warn', event, data as any);
  },
  error(event: string, data?: Record<string, unknown>): void {
    process.stderr.write(formatLog('error', event, data) + '\n');
    writeAuditLog('error', event, data as any);
  },
};

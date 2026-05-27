import { AuditLog, AuditLogListParams } from '../entity/audit-log.entity';

export interface IAuditLogService {
  list(params: AuditLogListParams): Promise<{ list: AuditLog[]; total: number }>;
  getEvents(): Promise<string[]>;
}

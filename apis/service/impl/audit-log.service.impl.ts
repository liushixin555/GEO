import { IAuditLogService } from '../audit-log.service';
import { AuditLog, AuditLogListParams } from '../../entity/audit-log.entity';
import { getPrisma } from '../../utils/db.util';
import { mapAuditLog } from '../../map';

export class AuditLogServiceImpl implements IAuditLogService {
  async list(params: AuditLogListParams): Promise<{ list: AuditLog[]; total: number }> {
    const { page, pageSize, level, event, startDate, endDate, search } = params;

    const where: Record<string, unknown> = {};

    if (level) {
      where.level = level;
    }
    if (event) {
      where.event = event;
    }
    if (startDate || endDate) {
      const createdAt: Record<string, Date> = {};
      if (startDate) createdAt.gte = new Date(startDate);
      if (endDate) createdAt.lte = new Date(endDate);
      where.createdAt = createdAt;
    }
    if (search) {
      where.OR = [
        { event: { contains: search, mode: 'insensitive' } },
        { url: { contains: search, mode: 'insensitive' } },
        { ip: { contains: search } },
      ];
    }

    const [rows, total] = await Promise.all([
      getPrisma().auditLog.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      getPrisma().auditLog.count({ where }),
    ]);

    return {
      list: rows.map(mapAuditLog),
      total,
    };
  }

  async getEvents(): Promise<string[]> {
    const results = await getPrisma().auditLog.findMany({
      select: { event: true },
      distinct: ['event'],
      orderBy: { event: 'asc' },
    });
    return results.map((r) => r.event);
  }
}

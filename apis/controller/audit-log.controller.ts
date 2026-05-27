import { Request, Response } from 'express';
import { createAuditLogService, IAuditLogService } from '../service';
import { paginate, handleControllerError } from '../utils';

const auditLogService: IAuditLogService = createAuditLogService();

export async function listAuditLogs(req: Request, res: Response): Promise<void> {
  try {
    const { page, pageSize, level, event, startDate, endDate, search } = req.query as any;

    const { list, total } = await auditLogService.list({
      page: Number(page),
      pageSize: Number(pageSize),
      level: level as string | undefined,
      event: event as string | undefined,
      startDate: startDate as string | undefined,
      endDate: endDate as string | undefined,
      search: search as string | undefined,
    });

    paginate(res, list, total, Number(page), Number(pageSize));
  } catch (err: unknown) {
    handleControllerError(res, err, '获取审计日志列表失败');
  }
}

export async function getAuditLogEvents(req: Request, res: Response): Promise<void> {
  try {
    const events = await auditLogService.getEvents();
    res.json({ code: 0, data: events });
  } catch (err: unknown) {
    handleControllerError(res, err, '获取审计事件列表失败');
  }
}

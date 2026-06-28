import { Request, Response } from 'express';
import { AuditServiceImpl } from '../service/impl/audit.service.impl';
import {
  paginate,
  success,
  handleControllerError,
} from '../../utils';
import type { IAuditService } from '../service/audit.service';

/**
 * 诊断管理 Controller
 */
const auditService: IAuditService = new AuditServiceImpl();

/** GET /api/v1/audit — 当前用户可见的诊断列表 */
export async function listAudits(req: Request, res: Response): Promise<void> {
  try {
    const { page, pageSize, status, search } = req.query as any;
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    const { list, total } = await auditService.list(userId, role, {
      page: Number(page),
      pageSize: Number(pageSize),
      status: status as any,
      search: search as string | undefined,
    });

    paginate(res, list, total, Number(page), Number(pageSize));
  } catch (err: unknown) {
    handleControllerError(res, err, '获取诊断列表失败');
  }
}

/** GET /api/v1/audit/:jobId — 诊断详情 */
export async function getAudit(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    const detail = await auditService.get(jobId, userId, role);
    if (!detail) {
      success(res, null, '诊断任务不存在');
      return;
    }
    success(res, detail);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取诊断详情失败');
  }
}

/** DELETE /api/v1/audit/:jobId — 软删除 */
export async function deleteAudit(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    await auditService.remove(jobId, userId, role);
    success(res, null, '删除成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '删除诊断任务失败');
  }
}

/** POST /api/v1/audit/detect — 品牌自动检测 */
export async function detectBrandController(req: Request, res: Response): Promise<void> {
  try {
    const data = await auditService.detect(req.body);
    success(res, data);
  } catch (err: unknown) {
    handleControllerError(res, err, '品牌检测失败');
  }
}

/** POST /api/v1/audit — 创建诊断 + 生成提示词计划 */
export async function createAudit(req: Request, res: Response): Promise<void> {
  try {
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';
    const companyId = req.user?.companyId ?? null;

    if (role === 'view') {
      res.status(403).json({ code: 403, message: '无权操作' });
      return;
    }

    const data = await auditService.create(req.body, userId, companyId);
    success(res, data, '诊断任务已创建');
  } catch (err: unknown) {
    handleControllerError(res, err, '创建诊断任务失败');
  }
}

/** POST /api/v1/audit/:jobId/execute — 触发批量执行 */
export async function executeAudit(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    const data = await auditService.execute(jobId, userId, role);
    success(res, data, data.dispatched ? '已开始执行' : '任务已完成，无需重复执行');
  } catch (err: unknown) {
    handleControllerError(res, err, '启动诊断执行失败');
  }
}

/** POST /api/v1/audit/:jobId/rerun — 基于已有诊断配置重新诊断 */
export async function rerunAudit(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';
    const companyId = req.user?.companyId ?? null;

    if (role === 'view') {
      res.status(403).json({ code: 403, message: '无权操作' });
      return;
    }

    const data = await auditService.rerun(jobId, userId, role, companyId);
    success(res, data, `已基于原配置创建新诊断任务，共 ${data.total} 条提示词 × 引擎组合`);
  } catch (err: unknown) {
    handleControllerError(res, err, '重新诊断失败');
  }
}

/** GET /api/v1/audit/:jobId/status — 轮询执行状态 */
export async function getAuditStatus(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    const data = await auditService.status(jobId, userId, role);
    success(res, data);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取诊断状态失败');
  }
}

/** GET /api/v1/audit/:jobId/skill — 下载诊断 Skill ZIP */
export async function downloadAuditSkill(req: Request, res: Response): Promise<void> {
  try {
    const jobId = String(req.params.jobId);
    const userId = req.user?.userId ?? 0;
    const role = req.user?.role ?? 'view';

    const { buffer, filename } = await auditService.downloadSkill(jobId, userId, role);
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(filename)}"`);
    res.setHeader('Content-Length', buffer.length.toString());
    res.send(buffer);
  } catch (err: unknown) {
    handleControllerError(res, err, '下载诊断报告失败');
  }
}

import { Request, Response } from 'express';
import { AppError } from '../errors';
import { createCitationDiagnosisService } from '../service';
import { Role } from '../constants/roles';
import { created, fail, paginate, success } from '../utils';
import { logger } from '../utils/logger.util';

const citationDiagnosisService = createCitationDiagnosisService();

function auth(req: Request) {
  return {
    userId: req.user?.userId,
    role: (req.user?.role || 'view') as Role,
  };
}

function queryParams(req: Request) {
  const query = req.query as any;
  return {
    page: Number(query.page),
    pageSize: Number(query.pageSize),
    projectId: query.projectId ? Number(query.projectId) : undefined,
    search: query.search as string | undefined,
  };
}

export async function createPublishedLink(req: Request, res: Response): Promise<void> {
  try {
    const item = await citationDiagnosisService.createPublishedLink(req.body, auth(req));
    created(res, item, '已保存发布链接');
  } catch (err: unknown) {
    handleError(res, err, '保存发布链接失败');
  }
}

export async function listPublishedLinks(req: Request, res: Response): Promise<void> {
  try {
    const params = queryParams(req);
    const { list, total } = await citationDiagnosisService.listPublishedLinks(params, auth(req));
    paginate(res, list, total, params.page, params.pageSize);
  } catch (err: unknown) {
    handleError(res, err, '获取发布链接失败');
  }
}

export async function createDetectionRun(req: Request, res: Response): Promise<void> {
  try {
    const item = await citationDiagnosisService.createDetectionRun(req.body, auth(req));
    created(res, item, '已保存检测引用记录');
  } catch (err: unknown) {
    handleError(res, err, '保存检测引用记录失败');
  }
}

export async function listDetectionRuns(req: Request, res: Response): Promise<void> {
  try {
    const params = queryParams(req);
    const { list, total } = await citationDiagnosisService.listDetectionRuns(params, auth(req));
    paginate(res, list, total, params.page, params.pageSize);
  } catch (err: unknown) {
    handleError(res, err, '获取检测记录失败');
  }
}

export async function listMarks(req: Request, res: Response): Promise<void> {
  try {
    const params = queryParams(req);
    const { list, total } = await citationDiagnosisService.listMarks(params, auth(req));
    paginate(res, list, total, params.page, params.pageSize);
  } catch (err: unknown) {
    handleError(res, err, '获取引用标签失败');
  }
}

function handleError(res: Response, err: unknown, fallback: string): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
    return;
  }
  logger.error('citation_diagnosis_failed', { error: err instanceof Error ? err.message : String(err), fallback });
  fail(res, 500, fallback);
}

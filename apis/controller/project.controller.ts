import { Request, Response } from 'express';
import { createProjectService, IProjectService } from '../service';
import { success, fail, paginate, created } from '../utils';
import { AppError } from '../errors';
import { logger } from '../utils/logger.util';

const projectService: IProjectService = createProjectService();

function getErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? (err.message || defaultMessage) : defaultMessage;
}

function handleServiceError(res: Response, err: unknown, defaultMessage: string): void {
  if (err instanceof AppError) {
    fail(res, err.statusCode, err.message);
  } else {
    logger.error('[ProjectController] 未预期错误', { error: err instanceof Error ? err.message : String(err), context: defaultMessage });
    fail(res, 500, getErrorMessage(err, defaultMessage));
  }
}

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const { userId, role } = req.user;

    // validate 中间件已验证 req.query，直接使用
    const { page: rawPage, pageSize: rawPageSize, search, company_id, status } = req.query as any;
    const page = Number(rawPage);
    const pageSize = Number(rawPageSize);

    const { list, total } = await projectService.list(page, pageSize, search, company_id != null ? Number(company_id) : undefined, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleServiceError(res, err, '获取项目列表失败');
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    // validate 中间件已验证 req.params.id 为正整数
    const id = Number(req.params.id);

    const { userId, role } = req.user;
    const item = await projectService.getById(id, userId, role);
    success(res, item);
  } catch (err: unknown) {
    handleServiceError(res, err, '获取项目详情失败');
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const { short_name, full_name } = req.body;

    const effectiveCompanyId = req.user.role === 'admin' ? req.user.companyId : req.body.company_id;
    if (!effectiveCompanyId) {
      fail(res, 400, '所属公司不能为空');
      return;
    }

    const data = {
      short_name,
      full_name,
      description: req.body.description,
      company_id: effectiveCompanyId,
      operator_ids: req.body.operator_ids,
      viewer_ids: req.body.viewer_ids,
    };

    const item = await projectService.create(data, req.user.role, req.user.companyId ?? undefined);
    created(res, item, '创建项目成功');
  } catch (err: unknown) {
    handleServiceError(res, err, '创建项目失败');
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    // validate 中间件已验证 req.params.id 为正整数
    const id = Number(req.params.id);

    const { userId, role } = req.user;

    const updateData = {
      short_name: req.body.short_name,
      full_name: req.body.full_name,
      description: req.body.description,
      company_id: req.body.company_id,
      operator_ids: req.body.operator_ids,
      viewer_ids: req.body.viewer_ids,
      status: req.body.status,
    };

    const item = await projectService.update(id, updateData, userId, role);
    success(res, item, '更新项目成功');
  } catch (err: unknown) {
    handleServiceError(res, err, '更新项目失败');
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    // validate 中间件已验证 req.params.id 为正整数
    const id = Number(req.params.id);

    const { userId, role } = req.user;
    await projectService.delete(id, userId, role);
    success(res, null, '删除项目成功');
  } catch (err: unknown) {
    handleServiceError(res, err, '删除项目失败');
  }
}

import { Request, Response } from 'express';
import { createProjectService, IProjectService } from '../service';
import { success, fail, paginate, created } from '../utils';
import { AppError } from '../errors';
import { logger } from '../utils/logger.util';

const projectService: IProjectService = createProjectService();

function getErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? (err.message || defaultMessage) : defaultMessage;
}

/** Unified service error handler — maps typed exceptions to HTTP responses */
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

    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string, 10) || 10);
    const search = req.query.search as string | undefined;
    if (search && search.length > 100) {
      fail(res, 400, '搜索关键词长度不能超过100个字符');
      return;
    }
    const company_id = req.query.company_id ? parseInt(req.query.company_id as string, 10) : undefined;
    if (company_id !== undefined && (isNaN(company_id) || company_id <= 0)) {
      fail(res, 400, '无效的公司ID');
      return;
    }
    const statusParam = req.query.status as string | undefined;
    let status: boolean | undefined;
    if (statusParam !== undefined) {
      if (statusParam !== 'true' && statusParam !== 'false') {
        fail(res, 400, '无效的 status 参数');
        return;
      }
      status = statusParam === 'true';
    }

    const { list, total } = await projectService.list(page, pageSize, search, company_id, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleServiceError(res, err, '获取项目列表失败');
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;

    // view role has no permission to view projects (iron rule)
    if (role === 'view') {
      fail(res, 403, '无权查看该项目');
      return;
    }

    // Admin operator check is now in service layer (C-1)
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

    // Admin's company_id comes from auth; sysadmin must provide it
    const effectiveCompanyId = req.user.role === 'admin' ? req.user.companyId : req.body.company_id;
    if (!effectiveCompanyId) {
      fail(res, 400, '所属公司不能为空');
      return;
    }

    // Construct clean data object — service handles company_id override for admin (C-2)
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
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;

    // view role cannot update projects (iron rule)
    if (role === 'view') {
      fail(res, 403, '查看者无权操作该项目');
      return;
    }

    // Whitelist: only extract known fields (M-2)
    const updateData = {
      short_name: req.body.short_name,
      full_name: req.body.full_name,
      description: req.body.description,
      company_id: req.body.company_id,
      operator_ids: req.body.operator_ids,
      viewer_ids: req.body.viewer_ids,
      status: req.body.status,
    };

    // Service handles company_id immutability (C-2) and admin operator check (C-1)
    const item = await projectService.update(id, updateData, userId, role);
    success(res, item, '更新项目成功');
  } catch (err: unknown) {
    handleServiceError(res, err, '更新项目失败');
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;

    // Only sysadmin and admin can delete
    if (role !== 'sysadmin' && role !== 'admin') {
      fail(res, 403, '无权删除项目');
      return;
    }

    // Service handles admin operator check (C-1)
    await projectService.delete(id, userId, role);
    success(res, null, '删除项目成功');
  } catch (err: unknown) {
    handleServiceError(res, err, '删除项目失败');
  }
}

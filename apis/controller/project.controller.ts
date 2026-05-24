import { Request, Response } from 'express';
import { IProjectService } from '../service/project.service';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, paginate, created } from '../utils';

const projectService: IProjectService = new ProjectServiceImpl();

function getErrorMessage(err: unknown, defaultMessage: string): string {
  return err instanceof Error ? (err.message || defaultMessage) : defaultMessage;
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
    fail(res, 500, getErrorMessage(err, '获取项目列表失败'));
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;
    const item = await projectService.getById(id, userId, role);

    // view role has no permission to view projects (iron rule)
    if (role === 'view') {
      fail(res, 403, '无权查看该项目');
      return;
    }

    // Admin can only access projects where they are an operator
    if (role === 'admin' && !item.operator_ids.includes(userId)) {
      fail(res, 403, '无权操作该项目');
      return;
    }

    success(res, item);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === '项目不存在') {
      fail(res, 404, message);
    } else {
      fail(res, 500, message || '获取项目详情失败');
    }
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const { short_name, full_name } = req.body;

    // Admin users don't need to provide company_id; it's set automatically
    const effectiveCompanyId = req.user.role === 'admin'
      ? req.user.companyId
      : req.body.company_id;

    if (!short_name || !full_name || !effectiveCompanyId) {
      fail(res, 400, '项目短名、项目全名、所属公司不能为空');
      return;
    }

    // Validate string lengths (matching DB constraints: shortName=50, fullName=200, description=500)
    if (short_name.length > 50) {
      fail(res, 400, '项目短名不能超过50个字符');
      return;
    }
    if (full_name.length > 200) {
      fail(res, 400, '项目全名不能超过200个字符');
      return;
    }
    const description: string | undefined = req.body.description;
    if (description && description.length > 500) {
      fail(res, 400, '项目描述不能超过500个字符');
      return;
    }

    // Construct a clean data object instead of mutating req.body
    const data = {
      short_name,
      full_name,
      description,
      company_id: effectiveCompanyId,
      operator_ids: req.body.operator_ids,
      viewer_ids: req.body.viewer_ids,
    };

    const item = await projectService.create(data);
    created(res, item, '创建项目成功');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === '运营者不属于指定公司' || message === '查看者不属于指定公司') {
      fail(res, 400, message);
    } else {
      fail(res, 500, message || '创建项目失败');
    }
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;

    // view role cannot update projects (iron rule)
    if (role === 'view') {
      fail(res, 403, '查看者无权操作该项目');
      return;
    }

    const existing = await projectService.getById(id, userId, role);

    // Universal: company_id cannot be changed
    if (req.body.company_id !== undefined && req.body.company_id !== existing.company_id) {
      fail(res, 400, '项目所属公司不可更改');
      return;
    }

    // Admin can only update projects where they are an operator
    if (role === 'admin' && !existing.operator_ids.includes(userId)) {
      fail(res, 403, '无权操作该项目');
      return;
    }

    // Strip company_id to prevent service from processing it
    const { company_id: _, ...updateData } = req.body;

    const item = await projectService.update(id, updateData, userId, role);
    success(res, item, '更新项目成功');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === '项目不存在') {
      fail(res, 404, message);
    } else if (message === '运营者不属于指定公司' || message === '查看者不属于指定公司') {
      fail(res, 400, message);
    } else {
      fail(res, 500, message || '更新项目失败');
    }
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    if (!req.user) { fail(res, 401, '未登录'); return; }
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user;

    // Admin can only delete projects where they are an operator
    if (role === 'admin') {
      const existing = await projectService.getById(id, userId, role);
      if (!existing.operator_ids.includes(userId)) {
        fail(res, 403, '无权操作该项目');
        return;
      }
    } else if (role !== 'sysadmin') {
      fail(res, 403, '无权删除项目');
      return;
    }

    await projectService.delete(id, userId, role);
    success(res, null, '删除项目成功');
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : '';
    if (message === '项目不存在') {
      fail(res, 404, message);
    } else {
      fail(res, 500, message || '删除项目失败');
    }
  }
}

import { Request, Response } from 'express';
import { IProjectService } from '../service/project.service';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, paginate, created } from '../utils';

const projectService: IProjectService = new ProjectServiceImpl();

export async function listProjects(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string, 10) || 1;
    const pageSize = Math.min(100, parseInt(req.query.pageSize as string, 10) || 10);
    const search = req.query.search as string | undefined;
    const company_id = req.query.company_id ? parseInt(req.query.company_id as string, 10) : undefined;
    const statusParam = req.query.status as string | undefined;
    let status: boolean | undefined;
    if (statusParam !== undefined) {
      if (statusParam !== 'true' && statusParam !== 'false') {
        fail(res, 400, '无效的 status 参数');
        return;
      }
      status = statusParam === 'true';
    }

    const { userId, role } = req.user!;
    const { list, total } = await projectService.list(page, pageSize, search, company_id, status, userId, role);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取项目列表失败');
  }
}

export async function getProject(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user!;
    const item = await projectService.getById(id, userId, role);

    // Admin can only access projects where they are an operator
    if (role === 'admin' && !item.operator_ids.includes(userId)) {
      fail(res, 403, '无权操作该项目');
      return;
    }

    success(res, item);
  } catch (err: any) {
    if (err.message === '项目不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取项目详情失败');
    }
  }
}

export async function createProject(req: Request, res: Response): Promise<void> {
  try {
    const { short_name, full_name } = req.body;

    // Admin users don't need to provide company_id; it's set automatically
    const effectiveCompanyId = req.user?.role === 'admin'
      ? req.user.companyId
      : req.body.company_id;

    if (!short_name || !full_name || !effectiveCompanyId) {
      fail(res, 400, '项目短名、项目全名、所属公司不能为空');
      return;
    }

    // Construct a clean data object instead of mutating req.body
    const data = {
      short_name,
      full_name,
      description: req.body.description,
      company_id: effectiveCompanyId,
      operator_ids: req.body.operator_ids,
      viewer_ids: req.body.viewer_ids,
    };

    const item = await projectService.create(data);
    created(res, item, '创建项目成功');
  } catch (err: any) {
    if (err.message === '运营者不属于指定公司' || err.message === '查看者不属于指定公司') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '创建项目失败');
    }
  }
}

export async function updateProject(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user!;
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
  } catch (err: any) {
    if (err.message === '项目不存在') {
      fail(res, 404, err.message);
    } else if (err.message === '运营者不属于指定公司' || err.message === '查看者不属于指定公司') {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, err.message || '更新项目失败');
    }
  }
}

export async function deleteProject(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的项目ID'); return; }

    const { userId, role } = req.user!;

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
  } catch (err: any) {
    if (err.message === '项目不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除项目失败');
    }
  }
}

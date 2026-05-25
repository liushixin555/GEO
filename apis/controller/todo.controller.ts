import { Request, Response } from 'express';
import { ITodoService } from '../service/todo.service';
import { IProjectService } from '../service/project.service';
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, created, paginate, handleControllerError } from '../utils';
import { NotFoundError, ForbiddenError } from '../errors';

const todoService: ITodoService = new TodoServiceImpl();
const projectService: IProjectService = new ProjectServiceImpl();

// 错误消息常量
const MSG_NO_ACCESS_ALL = '无权访问全部待办';

// 项目访问权限校验 — 统一返回 403 防止信息泄露
async function ensureProjectAccess(projectId: number, user: NonNullable<Request['user']>): Promise<void> {
  if (user.role === 'sysadmin') return;
  try {
    await projectService.getById(projectId, user.userId, user.role);
  } catch (err: unknown) {
    if (err instanceof NotFoundError) {
      throw new ForbiddenError('无权访问该项目');
    }
    throw err;
  }
}

// 从 params 中提取已验证的 ID（validate 中间件已将 parsed data 写入 req.params）
function getValidatedId(req: Request): number {
  return Number(req.params.id);
}

export async function listTodos(req: Request, res: Response): Promise<void> {
  try {
    // validate 中间件已验证 req.query，直接使用
    const { page, pageSize, tab, priority, search } = req.query as any;

    // 全部待办/全部已办仅 sysadmin 可访问
    if ((tab === 'all_open' || tab === 'all_closed') && req.user!.role !== 'sysadmin') {
      fail(res, 403, MSG_NO_ACCESS_ALL);
      return;
    }

    const { list, total } = await todoService.list({
      page: Number(page),
      pageSize: Number(pageSize),
      tab: tab as string,
      priority: priority as string | undefined,
      search: search as string | undefined,
      userId: req.user!.userId,
      role: req.user!.role,
      companyId: req.user!.companyId ?? null,
    });

    paginate(res, list, total, Number(page), Number(pageSize));
  } catch (err: unknown) {
    handleControllerError(res, err, '获取待办列表失败');
  }
}

export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    const item = await todoService.getById(id, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
    success(res, item);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取待办详情失败');
  }
}

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    // validate 中间件已验证 req.body，直接使用
    const body = req.body as any;

    // H-2: admin 强制使用自己的 companyId，防止跨公司创建待办
    const effectiveCompanyId = req.user!.role === 'admin'
      ? req.user!.companyId!
      : body.company_id;

    const request = {
      title: body.title,
      company_id: effectiveCompanyId,
      project_id: body.project_id ?? null,
      object_type: body.object_type,
      object_id: body.object_id ?? null,
      action: body.action,
      source: body.source,
      priority: body.priority,
      assignee_id: body.assignee_id,
      due_at: body.due_at,
    };
    const item = await todoService.create(request, req.user!.userId);
    created(res, item, '待办创建成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '创建待办失败');
  }
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    // validate 中间件已验证 req.body，直接使用
    const body = req.body as any;
    const request = {
      title: body.title,
      object_type: body.object_type,
      object_id: body.object_id,
      action: body.action,
      priority: body.priority,
      due_at: body.due_at,
    };
    const item = await todoService.update(id, request, req.user!.userId, req.user!.role);
    success(res, item, '更新待办成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '更新待办失败');
  }
}

export async function closeTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    const item = await todoService.close(id, req.user!.userId, req.user!.role);
    success(res, item, '关闭待办成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '关闭待办失败');
  }
}

export async function reopenTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    const item = await todoService.reopen(id, req.user!.userId, req.user!.role);
    success(res, item, '重新打开待办成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '重新打开待办失败');
  }
}

export async function transferTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    // validate 中间件已验证 req.body，直接使用
    const body = req.body as any;
    const request = { assignee_id: body.assignee_id, remark: body.remark };
    const item = await todoService.transfer(id, request, req.user!.userId, req.user!.role);
    success(res, item, '转交待办成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '转交待办失败');
  }
}

export async function rejectTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = getValidatedId(req);
    const item = await todoService.reject(id, req.user!.userId, req.user!.role);
    success(res, item, '驳回待办成功');
  } catch (err: unknown) {
    handleControllerError(res, err, '驳回待办失败');
  }
}

export async function getTodoLogs(req: Request, res: Response): Promise<void> {
  try {
    const todoId = getValidatedId(req);
    const logs = await todoService.getLogs(todoId, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
    success(res, logs);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取操作日志失败');
  }
}

export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  try {
    // validate 中间件已验证 req.query，直接使用
    const query = req.query as any;
    await ensureProjectAccess(Number(query.projectId), req.user!);

    const items = await todoService.getObjectOptions({
      projectId: Number(query.projectId),
      objectType: query.objectType as string,
      action: query.action as string | undefined,
    });
    success(res, items);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取操作对象失败');
  }
}

export async function getAssigneeCandidates(req: Request, res: Response): Promise<void> {
  try {
    // validate 中间件已验证 req.query，直接使用
    const query = req.query as any;
    await ensureProjectAccess(Number(query.projectId), req.user!);

    const result = await todoService.getAssigneeCandidates(Number(query.projectId));
    success(res, result);
  } catch (err: unknown) {
    handleControllerError(res, err, '获取责任人候选失败');
  }
}

import { Request, Response } from 'express';
import { z } from 'zod';
import { ITodoService } from '../service/todo.service';
import { IProjectService } from '../service/project.service';
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { success, fail, created, paginate } from '../utils';
import { NotFoundError, BusinessError, ForbiddenError } from '../errors';
import {
  listTodosSchema,
  createTodoSchema,
  updateTodoSchema,
  transferTodoSchema,
  objectOptionsSchema,
  assigneeCandidatesSchema,
} from '../schema/todo.schema';

const todoService: ITodoService = new TodoServiceImpl();
const projectService: IProjectService = new ProjectServiceImpl();

// 错误消息常量
const MSG_INVALID_ID = '无效的待办ID';
const MSG_NO_ACCESS_ALL = '无权访问全部待办';

// 统一错误处理
function handleError(res: Response, err: unknown, defaultMsg: string): void {
  if (err instanceof z.ZodError) {
    fail(res, 400, err.issues.map((e: any) => e.message).join('; '));
  } else if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof ForbiddenError) {
    fail(res, 403, err.message);
  } else if (err instanceof BusinessError) {
    fail(res, 400, err.message);
  } else {
    fail(res, 500, defaultMsg);
  }
}

// 项目访问权限校验 — projectService.getById 内部已做 operator 检查
async function ensureProjectAccess(projectId: number, user: NonNullable<Request['user']>): Promise<void> {
  if (user.role === 'sysadmin') return;
  await projectService.getById(projectId, user.userId, user.role);
}

export async function listTodos(req: Request, res: Response): Promise<void> {
  try {
    const parsed = listTodosSchema.parse(req.query);

    // 全部待办/全部已办仅 sysadmin 可访问
    if ((parsed.tab === 'all_open' || parsed.tab === 'all_closed') && req.user!.role !== 'sysadmin') {
      fail(res, 403, MSG_NO_ACCESS_ALL);
      return;
    }

    const { list, total } = await todoService.list({
      page: parsed.page,
      pageSize: parsed.pageSize,
      tab: parsed.tab,
      priority: parsed.priority,
      search: parsed.search,
      userId: req.user!.userId,
      role: req.user!.role,
      companyId: req.user!.companyId ?? null,
    });

    paginate(res, list, total, parsed.page, parsed.pageSize);
  } catch (err: unknown) {
    handleError(res, err, '获取待办列表失败');
  }
}

export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const item = await todoService.getById(id, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
    success(res, item);
  } catch (err: unknown) {
    handleError(res, err, '获取待办详情失败');
  }
}

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const validated = createTodoSchema.parse(req.body);
    const request = {
      title: validated.title,
      company_id: validated.company_id,
      project_id: validated.project_id ?? null,
      object_type: validated.object_type,
      object_id: validated.object_id ?? null,
      action: validated.action,
      source: validated.source,
      priority: validated.priority,
      assignee_id: validated.assignee_id,
      due_at: validated.due_at,
    };
    const item = await todoService.create(request, req.user!.userId);
    created(res, item, '待办创建成功');
  } catch (err: unknown) {
    handleError(res, err, '创建待办失败');
  }
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const validated = updateTodoSchema.parse(req.body);
    const request = {
      title: validated.title,
      object_type: validated.object_type,
      object_id: validated.object_id,
      action: validated.action,
      priority: validated.priority,
      due_at: validated.due_at,
    };
    const item = await todoService.update(id, request, req.user!.userId, req.user!.role);
    success(res, item, '更新待办成功');
  } catch (err: unknown) {
    handleError(res, err, '更新待办失败');
  }
}

export async function closeTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const item = await todoService.close(id, req.user!.userId, req.user!.role);
    success(res, item, '关闭待办成功');
  } catch (err: unknown) {
    handleError(res, err, '关闭待办失败');
  }
}

export async function reopenTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const item = await todoService.reopen(id, req.user!.userId, req.user!.role);
    success(res, item, '重新打开待办成功');
  } catch (err: unknown) {
    handleError(res, err, '重新打开待办失败');
  }
}

export async function transferTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const validated = transferTodoSchema.parse(req.body);
    const request = { assignee_id: validated.assignee_id, remark: validated.remark };
    const item = await todoService.transfer(id, request, req.user!.userId, req.user!.role);
    success(res, item, '转交待办成功');
  } catch (err: unknown) {
    handleError(res, err, '转交待办失败');
  }
}

export async function rejectTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id) || id <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const item = await todoService.reject(id, req.user!.userId, req.user!.role);
    success(res, item, '驳回待办成功');
  } catch (err: unknown) {
    handleError(res, err, '驳回待办失败');
  }
}

export async function getTodoLogs(req: Request, res: Response): Promise<void> {
  try {
    const todoId = parseInt(req.params.id as string, 10);
    if (isNaN(todoId) || todoId <= 0) { fail(res, 400, MSG_INVALID_ID); return; }

    const logs = await todoService.getLogs(todoId, req.user!.userId, req.user!.role, req.user!.companyId ?? null);
    success(res, logs);
  } catch (err: unknown) {
    handleError(res, err, '获取操作日志失败');
  }
}

export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  try {
    const parsed = objectOptionsSchema.parse(req.query);

    await ensureProjectAccess(parsed.projectId, req.user!);

    const items = await todoService.getObjectOptions({
      projectId: parsed.projectId,
      objectType: parsed.objectType,
      action: parsed.action,
    });
    success(res, items);
  } catch (err: unknown) {
    handleError(res, err, '获取操作对象失败');
  }
}

export async function getAssigneeCandidates(req: Request, res: Response): Promise<void> {
  try {
    const parsed = assigneeCandidatesSchema.parse(req.query);

    await ensureProjectAccess(parsed.projectId, req.user!);

    const result = await todoService.getAssigneeCandidates(parsed.projectId);
    success(res, result);
  } catch (err: unknown) {
    handleError(res, err, '获取责任人候选失败');
  }
}

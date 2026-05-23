import { Request, Response } from 'express';
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { success, fail, paginate } from '../utils';

const todoService = new TodoServiceImpl();

export async function listTodos(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const tab = (req.query.tab as string) || 'my_open';
    const priority = req.query.priority as string | undefined;
    const search = req.query.search as string | undefined;

    // 全部待办/全部已办仅 sysadmin 可访问
    if ((tab === 'all_open' || tab === 'all_closed') && req.user!.role !== 'sysadmin') {
      fail(res, 403, '无权访问全部待办');
      return;
    }

    const { list, total } = await todoService.list({
      page,
      pageSize,
      tab,
      priority,
      search,
      userId: req.user!.userId,
      role: req.user!.role,
      companyId: req.user!.companyId ?? null,
    });

    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取待办列表失败');
  }
}

export async function getTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.getById(id);
    success(res, item);
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取待办详情失败');
    }
  }
}

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const item = await todoService.create(req.body, req.user!.userId);
    res.status(201).json({ code: 0, message: '待办创建成功', data: item });
  } catch (err: any) {
    fail(res, 500, err.message || '创建待办失败');
  }
}

export async function updateTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.update(id, req.body, req.user!.userId, req.user!.role);
    success(res, item, '更新待办成功');
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 400, err.message || '更新待办失败');
    }
  }
}

export async function closeTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.close(id, req.user!.userId, req.user!.role);
    success(res, item, '关闭待办成功');
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 400, err.message || '关闭待办失败');
    }
  }
}

export async function reopenTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.reopen(id, req.user!.userId, req.user!.role);
    success(res, item, '重新打开待办成功');
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 400, err.message || '重新打开待办失败');
    }
  }
}

export async function transferTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.transfer(id, req.body, req.user!.userId, req.user!.role);
    success(res, item, '转交待办成功');
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 400, err.message || '转交待办失败');
    }
  }
}

export async function rejectTodo(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的待办ID'); return; }

    const item = await todoService.reject(id, req.user!.userId, req.user!.role);
    success(res, item, '驳回待办成功');
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 400, err.message || '驳回待办失败');
    }
  }
}

export async function getTodoLogs(req: Request, res: Response): Promise<void> {
  try {
    const todoId = parseInt(req.params.id as string, 10);
    if (isNaN(todoId)) { fail(res, 400, '无效的待办ID'); return; }

    const logs = await todoService.getLogs(todoId);
    success(res, logs);
  } catch (err: any) {
    if (err.message === '待办不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取操作日志失败');
    }
  }
}

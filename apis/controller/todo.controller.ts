import { Request, Response } from 'express';
import { TodoServiceImpl } from '../service/impl/todo.service.impl';
import { ProjectServiceImpl } from '../service/impl/project.service.impl';
import { getPrisma } from '../utils';
import { success, fail, paginate } from '../utils';

const todoService = new TodoServiceImpl();
const projectService = new ProjectServiceImpl();

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
  } catch (_err: any) {
    fail(res, 500, '获取待办列表失败');
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
      fail(res, 500, '获取待办详情失败');
    }
  }
}

export async function createTodo(req: Request, res: Response): Promise<void> {
  try {
    const item = await todoService.create(req.body, req.user!.userId);
    res.status(201).json({ code: 0, message: '待办创建成功', data: item });
  } catch (_err: any) {
    fail(res, 500, '创建待办失败');
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

export async function getObjectOptions(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.query.projectId as string);
    const objectType = req.query.objectType as string;
    const action = req.query.action as string;

    if (!projectId || !objectType) {
      fail(res, 400, '缺少必要参数');
      return;
    }

    // C-3: 验证用户是否有权访问该项目
    if (req.user!.role !== 'sysadmin') {
      const project = await projectService.getById(projectId, req.user!.userId, req.user!.role);
      if (!project.operator_ids.includes(req.user!.userId)) {
        fail(res, 403, '无权访问该项目');
        return;
      }
    }

    const prisma = getPrisma();
    const showDeleted = action === 'restore';
    const where: any = { projectId };

    if (showDeleted) {
      where.deletedAt = { not: null };
    } else {
      where.deletedAt = null;
    }

    if (objectType === 'article') {
      const items = await prisma.article.findMany({ where, select: { id: true, title: true }, orderBy: { id: 'desc' } });
      success(res, items.map(i => ({ id: i.id, name: i.title })));
    } else if (objectType === 'keyword') {
      const kbs = await prisma.knowledgeBase.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true },
      });
      const baseIds = kbs.map(kb => kb.id);
      if (baseIds.length === 0) { success(res, []); return; }

      const kwWhere: any = { baseId: { in: baseIds } };
      kwWhere.deletedAt = showDeleted ? { not: null } : null;

      const items = await prisma.knowledgeKeyword.findMany({
        where: kwWhere,
        select: { id: true, keyword: true },
        orderBy: { id: 'desc' },
      });
      success(res, items.map(i => ({ id: i.id, name: i.keyword })));
    } else {
      success(res, []);
    }
  } catch (err: any) {
    fail(res, 500, '获取操作对象失败');
  }
}

export async function getAssigneeCandidates(req: Request, res: Response): Promise<void> {
  try {
    const projectId = parseInt(req.query.projectId as string);
    if (!projectId) { fail(res, 400, '缺少项目ID'); return; }

    // C-3: 验证用户是否有权访问该项目
    if (req.user!.role !== 'sysadmin') {
      const project = await projectService.getById(projectId, req.user!.userId, req.user!.role);
      if (!project.operator_ids.includes(req.user!.userId)) {
        fail(res, 403, '无权访问该项目');
        return;
      }
    }

    const prisma = getPrisma();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { operators: { select: { userId: true } } },
    });
    if (!project) { fail(res, 404, '项目不存在'); return; }

    const operatorIds = project.operators.map(o => o.userId);

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { id: { in: operatorIds } },
          { role: 'sysadmin' },
        ],
        status: true,
        deletedAt: null,
      },
      select: { id: true, username: true, cnName: true, role: true },
      orderBy: { id: 'asc' },
    });

    const seen = new Set<number>();
    const result = users.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    }).map(u => ({ id: u.id, username: u.username, cn_name: u.cnName, role: u.role }));

    success(res, result);
  } catch (err: any) {
    fail(res, 500, '获取责任人候选失败');
  }
}

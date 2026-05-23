import { getPrisma } from '../../utils';
import { Todo, TodoLog, CreateTodoRequest, UpdateTodoRequest, TransferTodoRequest } from '../../entity';
import { mapTodo, mapTodoLog } from '../../map';
import { ITodoService } from '../todo.service';
import { NotFoundError, BusinessError, ForbiddenError } from '../../errors';

export class TodoServiceImpl implements ITodoService {
  async list(params: {
    page: number;
    pageSize: number;
    tab: string;
    priority?: string;
    search?: string;
    userId: number;
    role: string;
    companyId: number | null;
  }): Promise<{ list: Todo[]; total: number }> {
    const prisma = getPrisma();
    const { page, pageSize, tab, priority, search, userId, role, companyId } = params;

    const where: any = { deletedAt: null };

    switch (tab) {
      case 'my_open':
        where.assigneeId = userId;
        where.status = { in: ['open', 'draft'] };
        break;
      case 'my_closed':
        where.assigneeId = userId;
        where.status = 'closed';
        break;
      case 'all_open':
        where.status = { in: ['open', 'draft'] };
        break;
      case 'all_closed':
        where.status = 'closed';
        break;
      default:
        where.assigneeId = userId;
        where.status = { in: ['open', 'draft'] };
    }

    if ((tab === 'all_open' || tab === 'all_closed') && role !== 'sysadmin') {
      if (companyId) {
        where.companyId = companyId;
      }
    }

    if (priority) {
      where.priority = priority;
    }

    if (search) {
      where.title = { contains: search, mode: 'insensitive' };
    }

    const [items, total] = await Promise.all([
      prisma.todo.findMany({
        where,
        include: {
          company: true,
          project: true,
          assignee: true,
          createdBy: true,
        },
        orderBy: [
          { priority: 'asc' },
          { createdAt: 'desc' },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.todo.count({ where }),
    ]);

    return { list: items.map(mapTodo), total };
  }

  async getById(id: number, userId: number, role: string, companyId: number | null): Promise<Todo> {
    const prisma = getPrisma();
    const item = await prisma.todo.findFirst({
      where: { id, deletedAt: null },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });
    if (!item) throw new NotFoundError('待办');

    if (role !== 'sysadmin' && item.companyId !== companyId) {
      throw new ForbiddenError('无权访问该待办');
    }

    return mapTodo(item);
  }

  async create(request: CreateTodoRequest, createdById: number): Promise<Todo> {
    const prisma = getPrisma();

    const item = await prisma.todo.create({
      data: {
        title: request.title,
        companyId: request.company_id,
        projectId: request.project_id ?? null,
        objectType: request.object_type,
        objectId: request.object_id ?? null,
        action: request.action,
        source: (request.source as any) || 'manual',
        priority: (request.priority as any) || 'P2',
        assigneeId: request.assignee_id,
        createdById,
        status: 'open',
        ...(request.due_at ? { dueAt: new Date(request.due_at) } : {}),
      },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    await prisma.todoLog.create({
      data: {
        todoId: item.id,
        operatorId: createdById,
        action: 'submit',
      },
    });

    return mapTodo(item);
  }

  async update(id: number, request: UpdateTodoRequest, userId: number, role: string): Promise<Todo> {
    const prisma = getPrisma();

    const existing = await prisma.todo.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('待办');

    if (existing.status === 'closed') {
      throw new BusinessError('已关闭的待办不能修改');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new BusinessError('只能修改自己负责的待办');
    }

    const data: any = {};
    if (request.title !== undefined) data.title = request.title;
    if (request.object_type !== undefined) data.objectType = request.object_type;
    if (request.object_id !== undefined) data.objectId = request.object_id;
    if (request.action !== undefined) data.action = request.action;
    if (request.priority !== undefined) data.priority = request.priority;
    if (request.due_at !== undefined) data.dueAt = request.due_at ? new Date(request.due_at) : null;

    const updated = await prisma.todo.update({
      where: { id },
      data,
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    return mapTodo(updated);
  }

  async close(id: number, userId: number, role: string): Promise<Todo> {
    const prisma = getPrisma();

    const existing = await prisma.todo.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('待办');
    if (existing.status !== 'open') {
      throw new BusinessError('只有处理中的待办可以关闭');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new BusinessError('只能关闭自己负责的待办');
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: { status: 'closed' },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    await prisma.todoLog.create({
      data: {
        todoId: id,
        operatorId: userId,
        action: 'close',
      },
    });

    return mapTodo(updated);
  }

  async reopen(id: number, userId: number, role: string): Promise<Todo> {
    const prisma = getPrisma();

    const existing = await prisma.todo.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('待办');
    if (existing.status !== 'closed') {
      throw new BusinessError('只有已关闭的待办可以重新打开');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new BusinessError('只能重新打开自己负责的待办');
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: { status: 'open' },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    await prisma.todoLog.create({
      data: {
        todoId: id,
        operatorId: userId,
        action: 'reopen',
      },
    });

    return mapTodo(updated);
  }

  async transfer(id: number, request: TransferTodoRequest, userId: number, role: string): Promise<Todo> {
    const prisma = getPrisma();

    const existing = await prisma.todo.findFirst({ where: { id, deletedAt: null } });
    if (!existing) throw new NotFoundError('待办');
    if (existing.status !== 'open') {
      throw new BusinessError('只有处理中的待办可以转交');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new BusinessError('只能转交自己负责的待办');
    }

    const targetUser = await prisma.user.findFirst({ where: { id: request.assignee_id, deletedAt: null } });
    if (!targetUser) throw new BusinessError('目标用户不存在');

    const updated = await prisma.todo.update({
      where: { id },
      data: { assigneeId: request.assignee_id },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    await prisma.todoLog.create({
      data: {
        todoId: id,
        operatorId: userId,
        action: 'transfer',
        remark: `转交给 ${targetUser.cnName}`,
      },
    });

    return mapTodo(updated);
  }

  async reject(id: number, userId: number, role: string): Promise<Todo> {
    const prisma = getPrisma();

    const existing = await prisma.todo.findFirst({
      where: { id, deletedAt: null },
      include: { createdBy: true },
    });
    if (!existing) throw new NotFoundError('待办');
    if (existing.status !== 'open') {
      throw new BusinessError('只有处理中的待办可以驳回');
    }

    if (role !== 'sysadmin') {
      throw new ForbiddenError('只有系统管理员可以驳回待办');
    }

    let newAssigneeId: number;
    if (existing.source === 'manual') {
      newAssigneeId = existing.createdById;
    } else {
      const sysadmin = await prisma.user.findFirst({
        where: { role: 'sysadmin', deletedAt: null },
        orderBy: { id: 'asc' },
      });
      newAssigneeId = sysadmin?.id ?? existing.createdById;
    }

    const updated = await prisma.todo.update({
      where: { id },
      data: {
        status: 'draft',
        assigneeId: newAssigneeId,
      },
      include: {
        company: true,
        project: true,
        assignee: true,
        createdBy: true,
      },
    });

    await prisma.todoLog.create({
      data: {
        todoId: id,
        operatorId: userId,
        action: 'reject',
        remark: '驳回为草稿',
      },
    });

    return mapTodo(updated);
  }

  async getLogs(todoId: number, userId: number, role: string, companyId: number | null): Promise<TodoLog[]> {
    const prisma = getPrisma();

    const todo = await prisma.todo.findFirst({ where: { id: todoId, deletedAt: null } });
    if (!todo) throw new NotFoundError('待办');

    if (role !== 'sysadmin' && todo.companyId !== companyId) {
      throw new ForbiddenError('无权访问该待办');
    }

    const logs = await prisma.todoLog.findMany({
      where: { todoId },
      include: { operator: true },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(mapTodoLog);
  }

  async getObjectOptions(params: {
    projectId: number;
    objectType: string;
    action?: string;
  }): Promise<{ id: number; name: string }[]> {
    const prisma = getPrisma();
    const { projectId, objectType, action } = params;
    const showDeleted = action === 'restore';

    if (objectType === 'article') {
      const where: any = { projectId };
      where.deletedAt = showDeleted ? { not: null } : null;

      const items = await prisma.article.findMany({
        where,
        select: { id: true, title: true },
        orderBy: { id: 'desc' },
      });
      return items.map(i => ({ id: i.id, name: i.title }));
    }

    if (objectType === 'keyword') {
      const kbs = await prisma.knowledgeBase.findMany({
        where: { projectId, deletedAt: null },
        select: { id: true },
      });
      const baseIds = kbs.map(kb => kb.id);
      if (baseIds.length === 0) return [];

      const kwWhere: any = { baseId: { in: baseIds } };
      kwWhere.deletedAt = showDeleted ? { not: null } : null;

      const items = await prisma.knowledgeKeyword.findMany({
        where: kwWhere,
        select: { id: true, keyword: true },
        orderBy: { id: 'desc' },
      });
      return items.map(i => ({ id: i.id, name: i.keyword }));
    }

    return [];
  }

  async getAssigneeCandidates(projectId: number): Promise<{
    id: number;
    username: string;
    cn_name: string;
    role: string;
  }[]> {
    const prisma = getPrisma();

    const project = await prisma.project.findUnique({
      where: { id: projectId },
      include: { operators: { select: { userId: true } } },
    });
    if (!project) throw new NotFoundError('项目');

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
    return users.filter(u => {
      if (seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    }).map(u => ({ id: u.id, username: u.username, cn_name: u.cnName, role: u.role }));
  }
}

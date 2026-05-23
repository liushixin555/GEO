import { getPrisma } from '../../utils';
import { Todo, TodoLog, CreateTodoRequest, UpdateTodoRequest, TransferTodoRequest } from '../../entity';
import { mapTodo, mapTodoLog } from '../../map';
import { ITodoService } from '../todo.service';

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

    // Tab-based filtering
    // my_open: 我的待办 (assignee = me, status = open/draft)
    // my_closed: 我的已办 (assignee = me, status = closed)
    // all_open: 全部待办 (status = open/draft)
    // all_closed: 全部已办 (status = closed)
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

    // Role-based company filtering for "all" tabs
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

  async getById(id: number): Promise<Todo> {
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
    if (!item) throw new Error('待办不存在');
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

    // Create log
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
    if (!existing) throw new Error('待办不存在');

    if (existing.status === 'closed') {
      throw new Error('已关闭的待办不能修改');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new Error('只能修改自己负责的待办');
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
    if (!existing) throw new Error('待办不存在');
    if (existing.status !== 'open') {
      throw new Error('只有处理中的待办可以关闭');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new Error('只能关闭自己负责的待办');
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
    if (!existing) throw new Error('待办不存在');
    if (existing.status !== 'closed') {
      throw new Error('只有已关闭的待办可以重新打开');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new Error('只能重新打开自己负责的待办');
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
    if (!existing) throw new Error('待办不存在');
    if (existing.status !== 'open') {
      throw new Error('只有处理中的待办可以转交');
    }

    if (role !== 'sysadmin' && existing.assigneeId !== userId) {
      throw new Error('只能转交自己负责的待办');
    }

    // Verify target user exists
    const targetUser = await prisma.user.findFirst({ where: { id: request.assignee_id, deletedAt: null } });
    if (!targetUser) throw new Error('目标用户不存在');

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
    if (!existing) throw new Error('待办不存在');
    if (existing.status !== 'open') {
      throw new Error('只有处理中的待办可以驳回');
    }

    if (role !== 'sysadmin') {
      throw new Error('只有系统管理员可以驳回待办');
    }

    // Determine new assignee: user-created → creator, system-created → sysadmin
    let newAssigneeId: number;
    if (existing.source === 'manual') {
      newAssigneeId = existing.createdById;
    } else {
      // Find sysadmin user
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

  async getLogs(todoId: number): Promise<TodoLog[]> {
    const prisma = getPrisma();

    const todo = await prisma.todo.findFirst({ where: { id: todoId, deletedAt: null } });
    if (!todo) throw new Error('待办不存在');

    const logs = await prisma.todoLog.findMany({
      where: { todoId },
      include: { operator: true },
      orderBy: { createdAt: 'desc' },
    });

    return logs.map(mapTodoLog);
  }
}

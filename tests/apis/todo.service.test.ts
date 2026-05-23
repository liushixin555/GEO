/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { TodoServiceImpl } from '../../apis/service/impl/todo.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaTodo(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    title: '测试待办',
    companyId: 1,
    projectId: 10,
    objectType: 'article',
    objectId: 100,
    action: 'review',
    source: 'manual',
    priority: 'P2',
    assigneeId: 2,
    status: 'open',
    createdById: 1,
    dueAt: null,
    deletedAt: null,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    company: { shortName: '测试公司' },
    project: { shortName: '测试项目' },
    assignee: { cnName: '经办人A' },
    createdBy: { cnName: '创建者B' },
    ...overrides,
  };
}

function makePrismaTodoLog(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    todoId: 1,
    operatorId: 1,
    action: 'submit',
    objectType: null,
    objectId: null,
    remark: null,
    createdAt: new Date('2025-01-01'),
    operator: { cnName: '操作者' },
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('TodoServiceImpl', () => {
  let service: TodoServiceImpl;

  beforeEach(() => {
    service = new TodoServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('tab=my_open 应按 assigneeId + status=open/draft 过滤', async () => {
      const items = [makePrismaTodo({ id: 1 }), makePrismaTodo({ id: 2 })];
      const mockFindMany = jest.fn().mockResolvedValue(items);
      const mockCount = jest.fn().mockResolvedValue(2);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({
        page: 1,
        pageSize: 10,
        tab: 'my_open',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.assigneeId).toBe(2);
      expect(where.status).toEqual({ in: ['open', 'draft'] });
    });

    it('tab=my_closed 应按 assigneeId + status=closed 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'my_closed',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.assigneeId).toBe(2);
      expect(where.status).toBe('closed');
    });

    it('tab=all_open 应只按 status=open/draft 过滤（sysadmin 无 companyId 限制）', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'all_open',
        userId: 2,
        role: 'sysadmin',
        companyId: null,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.status).toEqual({ in: ['open', 'draft'] });
      expect(where).not.toHaveProperty('assigneeId');
      expect(where).not.toHaveProperty('companyId');
    });

    it('tab=all_open 且 role!=sysadmin 且有 companyId 应添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'all_open',
        userId: 2,
        role: 'admin',
        companyId: 5,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.companyId).toBe(5);
    });

    it('tab=all_closed 且 role!=sysadmin 且 companyId=null 不应添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'all_closed',
        userId: 2,
        role: 'admin',
        companyId: null,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('companyId');
    });

    it('应支持 priority 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'my_open',
        priority: 'P1',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.priority).toBe('P1');
    });

    it('应支持 search 模糊搜索', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'my_open',
        search: '关键词',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.title).toEqual({ contains: '关键词', mode: 'insensitive' });
    });

    it('未知的 tab 值应默认使用 my_open 逻辑', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1,
        pageSize: 10,
        tab: 'unknown_tab',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.assigneeId).toBe(2);
      expect(where.status).toEqual({ in: ['open', 'draft'] });
    });

    it('应正确计算分页偏移', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 3,
        pageSize: 5,
        tab: 'my_open',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      expect(mockFindMany.mock.calls[0][0].skip).toBe(10); // (3-1)*5
      expect(mockFindMany.mock.calls[0][0].take).toBe(5);
    });

    it('应返回正确映射的字段', async () => {
      const item = makePrismaTodo({ id: 1, title: '待办A' });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({
        page: 1,
        pageSize: 10,
        tab: 'my_open',
        userId: 2,
        role: 'admin',
        companyId: 1,
      });

      expect(result.list[0]).toEqual({
        id: 1,
        title: '待办A',
        company_id: 1,
        company_name: '测试公司',
        project_id: 10,
        project_name: '测试项目',
        object_type: 'article',
        object_id: 100,
        action: 'review',
        source: 'manual',
        priority: 'P2',
        assignee_id: 2,
        assignee_name: '经办人A',
        status: 'open',
        created_by_id: 1,
        created_by_name: '创建者B',
        due_at: null,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
      });
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('应返回映射后的待办', async () => {
      const item = makePrismaTodo({ id: 5, title: '待办5' });
      const mockFindFirst = jest.fn().mockResolvedValue(item);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(5);

      expect(result.id).toBe(5);
      expect(result.title).toBe('待办5');
      expect(mockFindFirst).toHaveBeenCalledWith({
        where: { id: 5, deletedAt: null },
        include: { company: true, project: true, assignee: true, createdBy: true },
      });
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(999)).rejects.toThrow('待办不存在');
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('应创建待办并记录日志', async () => {
      const item = makePrismaTodo({ id: 10, status: 'open' });
      const mockCreate = jest.fn().mockResolvedValue(item);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.create(
        {
          title: '新待办',
          company_id: 1,
          project_id: 10,
          object_type: 'article',
          object_id: 100,
          action: 'review',
          assignee_id: 2,
        },
        1,
      );

      expect(result.id).toBe(10);

      // verify todo creation data
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            title: '新待办',
            companyId: 1,
            projectId: 10,
            objectType: 'article',
            objectId: 100,
            action: 'review',
            source: 'manual',
            priority: 'P2',
            assigneeId: 2,
            createdById: 1,
            status: 'open',
          }),
        }),
      );

      // verify log
      expect(mockLogCreate).toHaveBeenCalledWith({
        data: {
          todoId: 10,
          operatorId: 1,
          action: 'submit',
        },
      });
    });

    it('应支持传入 source 和 priority', async () => {
      const item = makePrismaTodo({ id: 11 });
      const mockCreate = jest.fn().mockResolvedValue(item);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create(
        {
          title: '系统待办',
          company_id: 1,
          object_type: 'article',
          action: 'generate',
          source: 'system',
          priority: 'P1',
          assignee_id: 3,
        },
        1,
      );

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.source).toBe('system');
      expect(createData.priority).toBe('P1');
    });

    it('应支持 due_at 日期', async () => {
      const item = makePrismaTodo({ id: 12 });
      const mockCreate = jest.fn().mockResolvedValue(item);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create(
        {
          title: '有截止日期的待办',
          company_id: 1,
          object_type: 'article',
          action: 'review',
          assignee_id: 2,
          due_at: '2025-12-31',
        },
        1,
      );

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.dueAt).toEqual(new Date('2025-12-31'));
    });

    it('无 due_at 不应包含 dueAt 字段', async () => {
      const item = makePrismaTodo({ id: 13 });
      const mockCreate = jest.fn().mockResolvedValue(item);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create(
        {
          title: '无截止日期',
          company_id: 1,
          object_type: 'article',
          action: 'review',
          assignee_id: 2,
        },
        1,
      );

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.dueAt).toBeUndefined();
    });

    it('无 project_id 时 projectId 应为 null', async () => {
      const item = makePrismaTodo({ id: 14 });
      const mockCreate = jest.fn().mockResolvedValue(item);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create(
        {
          title: '无项目待办',
          company_id: 1,
          object_type: 'article',
          action: 'review',
          assignee_id: 2,
        },
        1,
      );

      const createData = mockCreate.mock.calls[0][0].data;
      expect(createData.projectId).toBeNull();
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('应更新待办字段并返回映射结果', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1, title: '更新后的标题' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(
        1,
        { title: '更新后的标题', priority: 'P1' },
        2,
        'admin',
      );

      expect(result.title).toBe('更新后的标题');
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.title).toBe('更新后的标题');
      expect(updateData.priority).toBe('P1');
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.update(999, { title: '测试' }, 2, 'admin'),
      ).rejects.toThrow('待办不存在');
    });

    it('已关闭的待办不能修改', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.update(1, { title: '测试' }, 2, 'admin'),
      ).rejects.toThrow('已关闭的待办不能修改');
    });

    it('非 sysadmin 修改非自己的待办应抛出错误', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 99, status: 'open' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.update(1, { title: '测试' }, 2, 'admin'),
      ).rejects.toThrow('只能修改自己负责的待办');
    });

    it('sysadmin 可以修改任何人的待办', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 99, status: 'open' });
      const updated = makePrismaTodo({ id: 1, title: '管理员修改' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      const result = await service.update(1, { title: '管理员修改' }, 1, 'sysadmin');
      expect(result.title).toBe('管理员修改');
    });

    it('应正确处理 due_at 为 null（清除截止日期）', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { due_at: null }, 2, 'admin');

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.dueAt).toBeNull();
    });

    it('应正确处理 due_at 为日期字符串', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { due_at: '2025-12-31' }, 2, 'admin');

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.dueAt).toEqual(new Date('2025-12-31'));
    });

    it('应正确更新 object_type, object_id, action', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(
        1,
        { object_type: 'project', object_id: 50, action: 'publish' },
        2,
        'admin',
      );

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.objectType).toBe('project');
      expect(updateData.objectId).toBe(50);
      expect(updateData.action).toBe('publish');
    });

    it('未传入的字段不应被更新', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, { title: '只更新标题' }, 2, 'admin');

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(Object.keys(updateData)).toEqual(['title']);
    });
  });

  // ──────────────────────────────────────
  //  close()
  // ──────────────────────────────────────
  describe('close', () => {
    it('应关闭待办并记录日志', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 2 });
      const updated = makePrismaTodo({ id: 1, status: 'closed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.close(1, 2, 'admin');

      expect(result.status).toBe('closed');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: 'closed' },
        }),
      );
      expect(mockLogCreate).toHaveBeenCalledWith({
        data: { todoId: 1, operatorId: 2, action: 'close' },
      });
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.close(999, 2, 'admin')).rejects.toThrow('待办不存在');
    });

    it('非 open 状态不能关闭', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'draft' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.close(1, 2, 'admin')).rejects.toThrow('只有处理中的待办可以关闭');
    });

    it('非 sysadmin 关闭非自己的待办应抛出错误', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.close(1, 2, 'admin')).rejects.toThrow('只能关闭自己负责的待办');
    });

    it('sysadmin 可以关闭任何人的待办', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 99 });
      const updated = makePrismaTodo({ id: 1, status: 'closed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.close(1, 1, 'sysadmin');
      expect(result.status).toBe('closed');
    });
  });

  // ──────────────────────────────────────
  //  reopen()
  // ──────────────────────────────────────
  describe('reopen', () => {
    it('应重新打开已关闭的待办并记录日志', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed', assigneeId: 2 });
      const updated = makePrismaTodo({ id: 1, status: 'open' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.reopen(1, 2, 'admin');

      expect(result.status).toBe('open');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: { status: 'open' },
        }),
      );
      expect(mockLogCreate).toHaveBeenCalledWith({
        data: { todoId: 1, operatorId: 2, action: 'reopen' },
      });
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reopen(999, 2, 'admin')).rejects.toThrow('待办不存在');
    });

    it('非 closed 状态不能重新打开', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reopen(1, 2, 'admin')).rejects.toThrow('只有已关闭的待办可以重新打开');
    });

    it('非 sysadmin 重新打开非自己的待办应抛出错误', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed', assigneeId: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reopen(1, 2, 'admin')).rejects.toThrow('只能重新打开自己负责的待办');
    });

    it('sysadmin 可以重新打开任何人的待办', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed', assigneeId: 99 });
      const updated = makePrismaTodo({ id: 1, status: 'open' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.reopen(1, 1, 'sysadmin');
      expect(result.status).toBe('open');
    });
  });

  // ──────────────────────────────────────
  //  transfer()
  // ──────────────────────────────────────
  describe('transfer', () => {
    it('应转交待办并记录日志（包含目标用户名）', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 2 });
      const updated = makePrismaTodo({ id: 1, assigneeId: 3 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 3, cnName: '新经办人' });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.transfer(1, { assignee_id: 3 }, 2, 'admin');

      expect(result.assignee_id).toBe(3);
      expect(mockLogCreate).toHaveBeenCalledWith({
        data: {
          todoId: 1,
          operatorId: 2,
          action: 'transfer',
          remark: '转交给 新经办人',
        },
      });
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.transfer(999, { assignee_id: 3 }, 2, 'admin'),
      ).rejects.toThrow('待办不存在');
    });

    it('非 open 状态不能转交', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed' });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.transfer(1, { assignee_id: 3 }, 2, 'admin'),
      ).rejects.toThrow('只有处理中的待办可以转交');
    });

    it('非 sysadmin 转交非自己的待办应抛出错误', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(
        service.transfer(1, { assignee_id: 3 }, 2, 'admin'),
      ).rejects.toThrow('只能转交自己负责的待办');
    });

    it('目标用户不存在应抛出错误', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 2 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
        user: { findFirst: mockUserFindFirst },
      } as any);

      await expect(
        service.transfer(1, { assignee_id: 999 }, 2, 'admin'),
      ).rejects.toThrow('目标用户不存在');
    });

    it('sysadmin 可以转交任何人的待办', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', assigneeId: 99 });
      const updated = makePrismaTodo({ id: 1, assigneeId: 3 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 3, cnName: '新经办人' });
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        user: { findFirst: mockUserFindFirst },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.transfer(1, { assignee_id: 3 }, 1, 'sysadmin');
      expect(result.assignee_id).toBe(3);
    });
  });

  // ──────────────────────────────────────
  //  reject()
  // ──────────────────────────────────────
  describe('reject', () => {
    it('应驳回为草稿（手动来源 → 指派给创建者）', async () => {
      const existing = makePrismaTodo({
        id: 1,
        status: 'open',
        source: 'manual',
        createdById: 5,
        createdBy: { cnName: '创建者' },
      });
      const updated = makePrismaTodo({ id: 1, status: 'draft', assigneeId: 5 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
      } as any);

      const result = await service.reject(1, 1, 'sysadmin');

      expect(result.status).toBe('draft');
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.status).toBe('draft');
      expect(updateData.assigneeId).toBe(5); // 创建者
      expect(mockLogCreate).toHaveBeenCalledWith({
        data: { todoId: 1, operatorId: 1, action: 'reject', remark: '驳回为草稿' },
      });
    });

    it('应驳回为草稿（系统来源 → 指派给 sysadmin）', async () => {
      const existing = makePrismaTodo({
        id: 1,
        status: 'open',
        source: 'system',
        createdById: 5,
        createdBy: { cnName: '创建者' },
      });
      const updated = makePrismaTodo({ id: 1, status: 'draft', assigneeId: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      const mockUserFindFirst = jest.fn().mockResolvedValue({ id: 1, cnName: '系统管理员' });

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
        user: { findFirst: mockUserFindFirst },
      } as any);

      const result = await service.reject(1, 1, 'sysadmin');

      expect(result.status).toBe('draft');
      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.assigneeId).toBe(1); // sysadmin
    });

    it('系统来源无 sysadmin 时应回退到创建者', async () => {
      const existing = makePrismaTodo({
        id: 1,
        status: 'open',
        source: 'system',
        createdById: 5,
        createdBy: { cnName: '创建者' },
      });
      const updated = makePrismaTodo({ id: 1, status: 'draft', assigneeId: 5 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      const mockUserFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
        todoLog: { create: mockLogCreate },
        user: { findFirst: mockUserFindFirst },
      } as any);

      const result = await service.reject(1, 1, 'sysadmin');

      const updateData = mockUpdate.mock.calls[0][0].data;
      expect(updateData.assigneeId).toBe(5); // 回退到创建者
    });

    it('待办不存在应抛出错误', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reject(999, 1, 'sysadmin')).rejects.toThrow('待办不存在');
    });

    it('非 open 状态不能驳回', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'closed', createdBy: { cnName: '创建者' } });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reject(1, 1, 'sysadmin')).rejects.toThrow('只有处理中的待办可以驳回');
    });

    it('非 sysadmin 不能驳回', async () => {
      const existing = makePrismaTodo({ id: 1, status: 'open', createdBy: { cnName: '创建者' } });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.reject(1, 2, 'admin')).rejects.toThrow('只有系统管理员可以驳回待办');
    });
  });

  // ──────────────────────────────────────
  //  getLogs()
  // ──────────────────────────────────────
  describe('getLogs', () => {
    it('应返回待办日志列表', async () => {
      const todo = makePrismaTodo({ id: 1 });
      const logs = [
        makePrismaTodoLog({ id: 1, todoId: 1, action: 'submit', operatorId: 1 }),
        makePrismaTodoLog({ id: 2, todoId: 1, action: 'close', operatorId: 2 }),
      ];
      const mockTodoFindFirst = jest.fn().mockResolvedValue(todo);
      const mockLogFindMany = jest.fn().mockResolvedValue(logs);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
        todoLog: { findMany: mockLogFindMany },
      } as any);

      const result = await service.getLogs(1);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        todo_id: 1,
        operator_id: 1,
        operator_name: '操作者',
        action: 'submit',
        object_type: null,
        object_id: null,
        remark: null,
        created_at: new Date('2025-01-01'),
      });
      expect(result[1].action).toBe('close');
    });

    it('待办不存在应抛出错误', async () => {
      const mockTodoFindFirst = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
      } as any);

      await expect(service.getLogs(999)).rejects.toThrow('待办不存在');
    });

    it('应按 createdAt 降序排列日志', async () => {
      const todo = makePrismaTodo({ id: 1 });
      const mockTodoFindFirst = jest.fn().mockResolvedValue(todo);
      const mockLogFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
        todoLog: { findMany: mockLogFindMany },
      } as any);

      await service.getLogs(1);

      expect(mockLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });
});

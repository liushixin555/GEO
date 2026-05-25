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

      const result = await service.getById(5, 1, 'sysadmin', 1);

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

      await expect(service.getById(999, 1, 'sysadmin', 1)).rejects.toThrow('待办不存在');
    });

    it('非 sysadmin 访问其他公司的待办应抛出 ForbiddenError', async () => {
      const item = makePrismaTodo({ id: 1, companyId: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(1, 2, 'admin', 1)).rejects.toThrow('无权访问该待办');
    });

    it('sysadmin 可以访问任何公司的待办', async () => {
      const item = makePrismaTodo({ id: 1, companyId: 99 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 1, 'sysadmin', 1);
      expect(result.id).toBe(1);
    });

    it('admin 可以访问自己公司的待办', async () => {
      const item = makePrismaTodo({ id: 1, companyId: 5 });
      const mockFindFirst = jest.fn().mockResolvedValue(item);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(1, 2, 'admin', 5);
      expect(result.id).toBe(1);
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

      const result = await service.getLogs(1, 1, 'sysadmin', 1);

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

      await expect(service.getLogs(999, 1, 'sysadmin', 1)).rejects.toThrow('待办不存在');
    });

    it('非 sysadmin 访问其他公司的待办日志应抛出 ForbiddenError', async () => {
      const todo = makePrismaTodo({ id: 1, companyId: 99 });
      const mockTodoFindFirst = jest.fn().mockResolvedValue(todo);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
      } as any);

      await expect(service.getLogs(1, 2, 'admin', 1)).rejects.toThrow('无权访问该待办');
    });

    it('应按 createdAt 降序排列日志', async () => {
      const todo = makePrismaTodo({ id: 1 });
      const mockTodoFindFirst = jest.fn().mockResolvedValue(todo);
      const mockLogFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
        todoLog: { findMany: mockLogFindMany },
      } as any);

      await service.getLogs(1, 1, 'sysadmin', 1);

      expect(mockLogFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { createdAt: 'desc' },
        }),
      );
    });
  });

  // ──────────────────────────────────────
  //  getObjectOptions()
  // ──────────────────────────────────────
  describe('getObjectOptions', () => {
    it('objectType=article 应返回文章选项', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, title: '文章A' },
        { id: 2, title: '文章B' },
      ]);

      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      } as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'article',
      });

      expect(result).toEqual([
        { id: 1, name: '文章A' },
        { id: 2, name: '文章B' },
      ]);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.projectId).toBe(10);
      expect(where.deletedAt).toBeNull();
    });

    it('objectType=article 且 action=restore 应查询已删除文章', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 3, title: '已删除文章' },
      ]);

      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      } as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'article',
        action: 'restore',
      });

      expect(result).toEqual([{ id: 3, name: '已删除文章' }]);
      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.deletedAt).toEqual({ not: null });
    });

    it('objectType=keyword 应返回关键词选项', async () => {
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: null });
      const mockKbFindMany = jest.fn().mockResolvedValue([
        { id: 1 },
        { id: 2 },
      ]);
      const mockKwFindMany = jest.fn().mockResolvedValue([
        { id: 10, keyword: '关键词A' },
        { id: 11, keyword: '关键词B' },
      ]);

      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKbFindMany },
        knowledgeKeyword: { findMany: mockKwFindMany },
      } as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'keyword',
      });

      expect(result).toEqual([
        { id: 10, name: '关键词A' },
        { id: 11, name: '关键词B' },
      ]);
    });

    it('objectType=keyword 且 action=restore 应查询已删除关键词', async () => {
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: null });
      const mockKbFindMany = jest.fn().mockResolvedValue([{ id: 1 }]);
      const mockKwFindMany = jest.fn().mockResolvedValue([
        { id: 20, keyword: '已删除关键词' },
      ]);

      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKbFindMany },
        knowledgeKeyword: { findMany: mockKwFindMany },
      } as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'keyword',
        action: 'restore',
      });

      const kwWhere = mockKwFindMany.mock.calls[0][0].where;
      expect(kwWhere.deletedAt).toEqual({ not: null });
      expect(result[0].name).toBe('已删除关键词');
    });

    it('objectType=keyword 无知识库时应返回空数组', async () => {
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: null });
      const mockKbFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKbFindMany },
      } as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'keyword',
      });

      expect(result).toEqual([]);
    });

    it('未知的 objectType 应返回空数组', async () => {
      mockedGetPrisma.mockReturnValue({} as any);

      const result = await service.getObjectOptions({
        projectId: 10,
        objectType: 'unknown',
      });

      expect(result).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  getAssigneeCandidates()
  // ──────────────────────────────────────
  describe('getAssigneeCandidates', () => {
    it('应返回项目操作员和 sysadmin 的去重列表', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10,
        operators: [{ userId: 2 }, { userId: 3 }],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'admin1', cnName: '管理员', role: 'sysadmin' },
        { id: 2, username: 'user2', cnName: '用户2', role: 'admin' },
        { id: 3, username: 'user3', cnName: '用户3', role: 'admin' },
      ]);

      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.getAssigneeCandidates(10);

      expect(result).toEqual([
        { id: 1, username: 'admin1', cn_name: '管理员', role: 'sysadmin' },
        { id: 2, username: 'user2', cn_name: '用户2', role: 'admin' },
        { id: 3, username: 'user3', cn_name: '用户3', role: 'admin' },
      ]);
      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { id: { in: [2, 3] } },
              { role: 'sysadmin' },
            ],
            status: true,
            deletedAt: null,
          },
        }),
      );
    });

    it('应去重同时是操作员和 sysadmin 的用户', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10,
        operators: [{ userId: 1 }],
      });
      // sysadmin(id=1) 同时出现在 operators 和 sysadmin 查询中
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'admin1', cnName: '管理员', role: 'sysadmin' },
        { id: 1, username: 'admin1', cnName: '管理员', role: 'sysadmin' },
      ]);

      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.getAssigneeCandidates(10);

      expect(result).toEqual([
        { id: 1, username: 'admin1', cn_name: '管理员', role: 'sysadmin' },
      ]);
      expect(result).toHaveLength(1);
    });

    it('项目不存在应抛出错误', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue(null);

      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
      } as any);

      await expect(service.getAssigneeCandidates(999)).rejects.toThrow('项目不存在');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：错误类型验证
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 错误类型验证', () => {
    describe('getById 错误类型', () => {
      it('待办不存在时应抛出 NotFoundError（Error 实例 + statusCode=404）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(null) },
        } as any);

        try {
          await service.getById(999, 1, 'sysadmin', 1);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(404);
          expect(e.message).toContain('待办不存在');
        }
      });

      it('无权访问时应抛出 ForbiddenError（statusCode=403）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ companyId: 99 })) },
        } as any);

        try {
          await service.getById(1, 2, 'admin', 1);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(403);
          expect(e.message).toContain('无权访问该待办');
        }
      });
    });

    describe('update 错误类型', () => {
      it('待办不存在时应抛出 NotFoundError（statusCode=404）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(null) },
        } as any);

        try {
          await service.update(999, { title: 'x' }, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(404);
        }
      });

      it('已关闭时应抛出 BusinessError（statusCode=400）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'closed' })) },
        } as any);

        try {
          await service.update(1, { title: 'x' }, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(400);
        }
      });

      it('非本人修改应抛出 BusinessError（statusCode=400）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ assigneeId: 99, status: 'open' })) },
        } as any);

        try {
          await service.update(1, { title: 'x' }, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(400);
        }
      });
    });

    describe('close 错误类型', () => {
      it('非 open 状态应抛出 BusinessError（statusCode=400）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'draft' })) },
        } as any);

        try {
          await service.close(1, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(400);
        }
      });
    });

    describe('reject 错误类型', () => {
      it('非 sysadmin 应抛出 ForbiddenError（statusCode=403）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'open', createdBy: { cnName: 'c' } })) },
        } as any);

        try {
          await service.reject(1, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(403);
        }
      });
    });

    describe('transfer 错误类型', () => {
      it('目标用户不存在应抛出 BusinessError（statusCode=400）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'open', assigneeId: 2 })) },
          user: { findFirst: jest.fn().mockResolvedValue(null) },
        } as any);

        try {
          await service.transfer(1, { assignee_id: 999 }, 2, 'admin');
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(400);
        }
      });
    });

    describe('getLogs 错误类型', () => {
      it('无权访问应抛出 ForbiddenError（statusCode=403）', async () => {
        mockedGetPrisma.mockReturnValue({
          todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ companyId: 99 })) },
        } as any);

        try {
          await service.getLogs(1, 2, 'admin', 1);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(403);
        }
      });
    });

    describe('getAssigneeCandidates 错误类型', () => {
      it('项目不存在应抛出 NotFoundError（statusCode=404）', async () => {
        mockedGetPrisma.mockReturnValue({
          project: { findUnique: jest.fn().mockResolvedValue(null) },
        } as any);

        try {
          await service.getAssigneeCandidates(999);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.statusCode).toBe(404);
        }
      });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：数据一致性（count/findMany where 同步）
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 数据一致性', () => {
    it('list 的 count 和 findMany 应使用相同的 where 条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);

      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({
        page: 1, pageSize: 10, tab: 'my_open',
        priority: 'P1', search: '关键词',
        userId: 2, role: 'admin', companyId: 1,
      });

      const findManyWhere = mockFindMany.mock.calls[0][0].where;
      const countWhere = mockCount.mock.calls[0][0].where;
      expect(countWhere).toEqual(findManyWhere);
    });

    it('list 不同 tab 值的 count/findMany where 一致', async () => {
      for (const tab of ['my_open', 'my_closed', 'all_open', 'all_closed', 'unknown']) {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockCount = jest.fn().mockResolvedValue(0);

        mockedGetPrisma.mockReturnValue({
          todo: { findMany: mockFindMany, count: mockCount },
        } as any);

        await service.list({
          page: 1, pageSize: 10, tab,
          userId: 2, role: 'admin', companyId: 5,
        });

        const findManyWhere = mockFindMany.mock.calls[0][0].where;
        const countWhere = mockCount.mock.calls[0][0].where;
        expect(countWhere).toEqual(findManyWhere);
      }
    });

    it('getById 的 include 应包含 company/project/assignee/createdBy', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaTodo());
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await service.getById(1, 1, 'sysadmin', 1);

      const call = mockFindFirst.mock.calls[0][0];
      expect(call.include).toEqual({
        company: true, project: true, assignee: true, createdBy: true,
      });
    });

    it('list 的 include 应包含 company/project/assignee/createdBy', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      const call = mockFindMany.mock.calls[0][0];
      expect(call.include).toEqual({
        company: true, project: true, assignee: true, createdBy: true,
      });
    });

    it('list 的 orderBy 应为 priority asc + createdAt desc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      const call = mockFindMany.mock.calls[0][0];
      expect(call.orderBy).toEqual([{ priority: 'asc' }, { createdAt: 'desc' }]);
    });

    it('list 的 where 应包含 deletedAt: null', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.deletedAt).toBeNull();
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：字符串边界
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 字符串边界', () => {
    it('list search 为空字符串不应添加 title 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', search: '', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('title');
    });

    it('list search 为纯空格应作为搜索条件', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', search: '   ', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.title).toEqual({ contains: '   ', mode: 'insensitive' });
    });

    it('list search 含特殊字符应原样传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', search: '<script>alert("xss")</script>', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.title).toEqual({ contains: '<script>alert("xss")</script>', mode: 'insensitive' });
    });

    it('list search 含 emoji 应正常传递', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', search: '🔍搜索', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.title).toEqual({ contains: '🔍搜索', mode: 'insensitive' });
    });

    it('list search 超长字符串应正常传递', async () => {
      const longStr = 'a'.repeat(10000);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', search: longStr, userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where.title.contains).toBe(longStr);
    });

    it('create title 为空字符串应正常创建', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo({ title: '' }));
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: '', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);

      expect(mockCreate.mock.calls[0][0].data.title).toBe('');
    });

    it('create title 含前后空格应原样保存', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo({ title: '  带空格  ' }));
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: '  带空格  ', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);

      expect(mockCreate.mock.calls[0][0].data.title).toBe('  带空格  ');
    });

    it('create title 含换行符和制表符应原样保存', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: '行1\n行2\t缩进', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);

      expect(mockCreate.mock.calls[0][0].data.title).toBe('行1\n行2\t缩进');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：数值边界
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 数值边界', () => {
    it('list page=0 的偏移量应为负数（0-1)*pageSize', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 0, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      expect(mockFindMany.mock.calls[0][0].skip).toBe(-10);
      expect(mockFindMany.mock.calls[0][0].take).toBe(10);
    });

    it('list page 极大值应正常计算偏移', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 999999, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      expect(mockFindMany.mock.calls[0][0].skip).toBe(999998 * 10);
    });

    it('getById id=0 应正常查询（Prisma 层返回 null 则 NotFound）', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      await expect(service.getById(0, 1, 'sysadmin', 1)).rejects.toThrow('待办不存在');
      expect(mockFindFirst).toHaveBeenCalledWith(
        expect.objectContaining({ where: { id: 0, deletedAt: null } }),
      );
    });

    it('getById id 极大值应正常查询', async () => {
      const mockFindFirst = jest.fn().mockResolvedValue(makePrismaTodo({ id: 2147483647 }));
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst },
      } as any);

      const result = await service.getById(2147483647, 1, 'sysadmin', 1);
      expect(result.id).toBe(2147483647);
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：mapTodo / mapTodoLog 综合映射
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 综合映射', () => {
    it('mapTodo 应正确处理 project=null 的场景', async () => {
      const item = makePrismaTodo({ project: null, projectId: null });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });
      expect(result.list[0].project_id).toBeNull();
      expect(result.list[0].project_name).toBeNull();
    });

    it('mapTodo 应正确处理 company.shortName 缺失（回退为空字符串）', async () => {
      const item = makePrismaTodo({ company: {} });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });
      expect(result.list[0].company_name).toBe('');
    });

    it('mapTodo 应正确处理 dueAt 日期', async () => {
      const dueDate = new Date('2025-06-15T00:00:00.000Z');
      const item = makePrismaTodo({ dueAt: dueDate });
      const mockFindMany = jest.fn().mockResolvedValue([item]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });
      expect(result.list[0].due_at).toBe(dueDate.toISOString());
    });

    it('mapTodoLog 应正确映射所有字段（含 null 值）', async () => {
      const log = makePrismaTodoLog({
        id: 5, todoId: 10, operatorId: 3, action: 'transfer',
        objectType: 'article', objectId: 100, remark: '测试备注',
        operator: { cnName: '操作者Z' },
      });
      const mockTodoFindFirst = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogFindMany = jest.fn().mockResolvedValue([log]);
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
        todoLog: { findMany: mockLogFindMany },
      } as any);

      const result = await service.getLogs(10, 1, 'sysadmin', 1);
      expect(result[0]).toEqual({
        id: 5, todo_id: 10, operator_id: 3, operator_name: '操作者Z',
        action: 'transfer', object_type: 'article', object_id: 100,
        remark: '测试备注', created_at: new Date('2025-01-01'),
      });
    });

    it('mapTodoLog 应正确处理 operator.cnName 缺失', async () => {
      const log = makePrismaTodoLog({ operator: {} });
      const mockTodoFindFirst = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogFindMany = jest.fn().mockResolvedValue([log]);
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockTodoFindFirst },
        todoLog: { findMany: mockLogFindMany },
      } as any);

      const result = await service.getLogs(1, 1, 'sysadmin', 1);
      expect(result[0].operator_name).toBe('');
    });

    it('getAssigneeCandidates 映射应使用 cn_name（下划线）而非 cnName（驼峰）', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10, operators: [{ userId: 2 }],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 2, username: 'u2', cnName: '中文名', role: 'admin' },
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.getAssigneeCandidates(10);
      expect(result[0]).toEqual({ id: 2, username: 'u2', cn_name: '中文名', role: 'admin' });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：实例独立性 + 接口一致性
  // ══════════════════════════════════════════

  describe('TDD第2轮 — 实例独立性与接口一致性', () => {
    it('不同的 TodoServiceImpl 实例应共享同一个 Prisma 实例', async () => {
      const service1 = new TodoServiceImpl();
      const service2 = new TodoServiceImpl();
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service1.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 1, role: 'admin', companyId: 1 });
      await service2.list({ page: 1, pageSize: 10, tab: 'my_open', userId: 2, role: 'admin', companyId: 1 });

      // 两个实例都应调用 getPrisma
      expect(mockedGetPrisma).toHaveBeenCalledTimes(2);
    });

    it('ITodoService 接口方法完整性——所有方法均存在于实例上', () => {
      expect(typeof service.list).toBe('function');
      expect(typeof service.getById).toBe('function');
      expect(typeof service.create).toBe('function');
      expect(typeof service.update).toBe('function');
      expect(typeof service.close).toBe('function');
      expect(typeof service.reopen).toBe('function');
      expect(typeof service.transfer).toBe('function');
      expect(typeof service.reject).toBe('function');
      expect(typeof service.getLogs).toBe('function');
      expect(typeof service.getObjectOptions).toBe('function');
      expect(typeof service.getAssigneeCandidates).toBe('function');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：list 全场景 where 条件逐字段验证
  // ══════════════════════════════════════════

  describe('TDD第2轮 — list where 条件逐字段验证', () => {
    it('tab=all_closed 且 role=sysadmin 不应添加 companyId 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'all_closed', userId: 1, role: 'sysadmin', companyId: 5 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('companyId');
    });

    it('tab=all_open 且 role=sysadmin 且 companyId 非 null 也不应添加 companyId', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'all_open', userId: 1, role: 'sysadmin', companyId: 99 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('companyId');
    });

    it('priority 为空字符串不应添加 priority 过滤', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list({ page: 1, pageSize: 10, tab: 'my_open', priority: '', userId: 2, role: 'admin', companyId: 1 });

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('priority');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：create 默认值和条件展开
  // ══════════════════════════════════════════

  describe('TDD第2轮 — create 默认值验证', () => {
    it('source 默认值应为 manual', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: 't', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);
      expect(mockCreate.mock.calls[0][0].data.source).toBe('manual');
    });

    it('priority 默认值应为 P2', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: 't', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);
      expect(mockCreate.mock.calls[0][0].data.priority).toBe('P2');
    });

    it('status 应始终为 open', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: 't', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);
      expect(mockCreate.mock.calls[0][0].data.status).toBe('open');
    });

    it('object_id 未传时 objectId 应为 null', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: 't', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);
      expect(mockCreate.mock.calls[0][0].data.objectId).toBeNull();
    });

    it('create 应包含 include 关联', async () => {
      const mockCreate = jest.fn().mockResolvedValue(makePrismaTodo());
      const mockLogCreate = jest.fn().mockResolvedValue({});
      mockedGetPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      } as any);

      await service.create({ title: 't', company_id: 1, object_type: 'article', action: 'review', assignee_id: 2 }, 1);
      expect(mockCreate.mock.calls[0][0].include).toEqual({
        company: true, project: true, assignee: true, createdBy: true,
      });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：draft 状态操作验证
  // ══════════════════════════════════════════

  describe('TDD第2轮 — draft 状态操作验证', () => {
    it('close 不应关闭 draft 状态的待办', async () => {
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'draft' })) },
      } as any);

      await expect(service.close(1, 2, 'admin')).rejects.toThrow('只有处理中的待办可以关闭');
    });

    it('reopen 不应重新打开 draft 状态的待办', async () => {
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'draft' })) },
      } as any);

      await expect(service.reopen(1, 2, 'admin')).rejects.toThrow('只有已关闭的待办可以重新打开');
    });

    it('transfer 不应转交 draft 状态的待办', async () => {
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'draft' })) },
      } as any);

      await expect(service.transfer(1, { assignee_id: 3 }, 2, 'admin')).rejects.toThrow('只有处理中的待办可以转交');
    });

    it('reject 不应驳回 draft 状态的待办', async () => {
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(makePrismaTodo({ status: 'draft', createdBy: { cnName: 'c' } })) },
      } as any);

      await expect(service.reject(1, 1, 'sysadmin')).rejects.toThrow('只有处理中的待办可以驳回');
    });

    it('update 应允许修改 draft 状态的待办', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'draft' });
      const updated = makePrismaTodo({ id: 1, title: '修改草稿' });
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(existing), update: jest.fn().mockResolvedValue(updated) },
      } as any);

      const result = await service.update(1, { title: '修改草稿' }, 2, 'admin');
      expect(result.title).toBe('修改草稿');
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：update 全字段覆盖
  // ══════════════════════════════════════════

  describe('TDD第2轮 — update 全字段覆盖', () => {
    it('传入所有可更新字段应全部写入', async () => {
      const existing = makePrismaTodo({ id: 1, assigneeId: 2, status: 'open' });
      const updated = makePrismaTodo({ id: 1 });
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: mockFindFirst, update: mockUpdate },
      } as any);

      await service.update(1, {
        title: '新标题',
        object_type: 'keyword',
        object_id: 200,
        action: 'delete',
        priority: 'P3',
        due_at: '2025-12-31',
      }, 2, 'admin');

      const data = mockUpdate.mock.calls[0][0].data;
      expect(data).toEqual({
        title: '新标题',
        objectType: 'keyword',
        objectId: 200,
        action: 'delete',
        priority: 'P3',
        dueAt: new Date('2025-12-31'),
      });
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：getById companyId 匹配验证
  // ══════════════════════════════════════════

  describe('TDD第2轮 — getById companyId 边界', () => {
    it('非 sysadmin 且 companyId=null 时访问任何待办应抛出 ForbiddenError', async () => {
      const item = makePrismaTodo({ companyId: 99 });
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(item) },
      } as any);

      await expect(service.getById(1, 2, 'admin', null)).rejects.toThrow('无权访问该待办');
    });

    it('非 sysadmin 且 companyId 匹配时应成功', async () => {
      const item = makePrismaTodo({ companyId: 5 });
      mockedGetPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(item) },
      } as any);

      const result = await service.getById(1, 2, 'admin', 5);
      expect(result.id).toBe(1);
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：getObjectOptions 排序验证
  // ══════════════════════════════════════════

  describe('TDD第2轮 — getObjectOptions 排序和字段选择', () => {
    it('article 应按 id 降序排列', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      } as any);

      await service.getObjectOptions({ projectId: 10, objectType: 'article' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('article 应只选择 id 和 title', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      } as any);

      await service.getObjectOptions({ projectId: 10, objectType: 'article' });

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, title: true } }),
      );
    });

    it('keyword 应按 id 降序排列', async () => {
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: null });
      const mockKbFindMany = jest.fn().mockResolvedValue([{ id: 1 }]);
      const mockKwFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKbFindMany },
        knowledgeKeyword: { findMany: mockKwFindMany },
      } as any);

      await service.getObjectOptions({ projectId: 10, objectType: 'keyword' });

      expect(mockKwFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'desc' } }),
      );
    });

    it('keyword 应只选择 id 和 keyword', async () => {
      const mockProjectFindFirst = jest.fn().mockResolvedValue({ id: 10, companyId: null });
      const mockKbFindMany = jest.fn().mockResolvedValue([{ id: 1 }]);
      const mockKwFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findFirst: mockProjectFindFirst },
        knowledgeBase: { findMany: mockKbFindMany },
        knowledgeKeyword: { findMany: mockKwFindMany },
      } as any);

      await service.getObjectOptions({ projectId: 10, objectType: 'keyword' });

      expect(mockKwFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, keyword: true } }),
      );
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮：getAssigneeCandidates 用户筛选
  // ══════════════════════════════════════════

  describe('TDD第2轮 — getAssigneeCandidates 用户查询条件', () => {
    it('应只查询 status=true 且 deletedAt=null 的用户', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10, operators: [{ userId: 2 }],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'a', cnName: 'A', role: 'sysadmin' },
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      await service.getAssigneeCandidates(10);

      const where = mockUserFindMany.mock.calls[0][0].where;
      expect(where.status).toBe(true);
      expect(where.deletedAt).toBeNull();
    });

    it('应按 id 升序排列用户', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10, operators: [{ userId: 2 }],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      await service.getAssigneeCandidates(10);

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: { id: 'asc' } }),
      );
    });

    it('应选择正确的用户字段', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10, operators: [{ userId: 2 }],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      await service.getAssigneeCandidates(10);

      expect(mockUserFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ select: { id: true, username: true, cnName: true, role: true } }),
      );
    });

    it('项目无操作员时应只返回 sysadmin', async () => {
      const mockProjectFindUnique = jest.fn().mockResolvedValue({
        id: 10, operators: [],
      });
      const mockUserFindMany = jest.fn().mockResolvedValue([
        { id: 1, username: 'admin', cnName: '管理员', role: 'sysadmin' },
      ]);
      mockedGetPrisma.mockReturnValue({
        project: { findUnique: mockProjectFindUnique },
        user: { findMany: mockUserFindMany },
      } as any);

      const result = await service.getAssigneeCandidates(10);

      const where = mockUserFindMany.mock.calls[0][0].where;
      expect(where.OR).toContainEqual({ id: { in: [] } });
      expect(result).toEqual([{ id: 1, username: 'admin', cn_name: '管理员', role: 'sysadmin' }]);
    });
  });
});

/**
 * @jest-environment node
 */
import {
  listTodosSchema,
  createTodoSchema,
  updateTodoSchema,
  transferTodoSchema,
  objectOptionsSchema,
  assigneeCandidatesSchema,
} from '../../apis/schema/todo.schema';

// ─── 共享的完整有效对象 ─────────────────────────────────────────────
const validCreateTodo = {
  title: '完成文章审核',
  company_id: 1,
  project_id: 10,
  object_type: 'article',
  object_id: 100,
  action: 'review',
  source: 'system',
  priority: 'P1',
  assignee_id: 5,
  due_at: '2026-06-01T00:00:00Z',
};

// ─── listTodosSchema ────────────────────────────────────────────────
describe('listTodosSchema', () => {
  // === page ===
  describe('page', () => {
    it('应使用默认值 1', () => {
      const result = listTodosSchema.parse({});
      expect(result.page).toBe(1);
    });

    it('应接受有效正整数', () => {
      expect(listTodosSchema.parse({ page: 5 }).page).toBe(5);
    });

    it('应接受大正整数', () => {
      expect(listTodosSchema.parse({ page: 99999 }).page).toBe(99999);
    });

    it('应强制转换字符串数字', () => {
      expect(listTodosSchema.parse({ page: '3' }).page).toBe(3);
    });

    it('应拒绝 0', () => {
      const result = listTodosSchema.safeParse({ page: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = listTodosSchema.safeParse({ page: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = listTodosSchema.safeParse({ page: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数字字符串', () => {
      const result = listTodosSchema.safeParse({ page: 'abc' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listTodosSchema.safeParse({ page: null });
      expect(result.success).toBe(false);
    });

    it('应将布尔值 true 强制转换为 1（z.coerce 行为）', () => {
      expect(listTodosSchema.parse({ page: true as unknown as number }).page).toBe(1);
    });
  });

  // === pageSize ===
  describe('pageSize', () => {
    it('应使用默认值 10', () => {
      const result = listTodosSchema.parse({});
      expect(result.pageSize).toBe(10);
    });

    it('应接受有效正整数', () => {
      expect(listTodosSchema.parse({ pageSize: 20 }).pageSize).toBe(20);
    });

    it('应接受最小值 1', () => {
      expect(listTodosSchema.parse({ pageSize: 1 }).pageSize).toBe(1);
    });

    it('应接受最大值 100', () => {
      expect(listTodosSchema.parse({ pageSize: 100 }).pageSize).toBe(100);
    });

    it('应拒绝超过 100', () => {
      const result = listTodosSchema.safeParse({ pageSize: 101 });
      expect(result.success).toBe(false);
    });

    it('应强制转换字符串数字', () => {
      expect(listTodosSchema.parse({ pageSize: '50' }).pageSize).toBe(50);
    });

    it('应拒绝 0', () => {
      const result = listTodosSchema.safeParse({ pageSize: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = listTodosSchema.safeParse({ pageSize: -5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = listTodosSchema.safeParse({ pageSize: 10.5 });
      expect(result.success).toBe(false);
    });
  });

  // === tab ===
  describe('tab', () => {
    const validTabs = ['my_open', 'my_closed', 'all_open', 'all_closed'] as const;

    it('应使用默认值 my_open', () => {
      const result = listTodosSchema.parse({});
      expect(result.tab).toBe('my_open');
    });

    it.each(validTabs)('应接受有效选项 "%s"', (tab) => {
      expect(listTodosSchema.parse({ tab }).tab).toBe(tab);
    });

    it('应拒绝无效的 tab 值', () => {
      const result = listTodosSchema.safeParse({ tab: 'invalid_tab' });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = listTodosSchema.safeParse({ tab: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字', () => {
      const result = listTodosSchema.safeParse({ tab: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listTodosSchema.safeParse({ tab: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝部分匹配的值', () => {
      const result = listTodosSchema.safeParse({ tab: 'my_open_extra' });
      expect(result.success).toBe(false);
    });
  });

  // === priority ===
  describe('priority', () => {
    const validPriorities = ['P0', 'P1', 'P2', 'P3'] as const;

    it('应接受 undefined（可选字段）', () => {
      const result = listTodosSchema.parse({});
      expect(result.priority).toBeUndefined();
    });

    it.each(validPriorities)('应接受有效优先级 "%s"', (priority) => {
      expect(listTodosSchema.parse({ priority }).priority).toBe(priority);
    });

    it('应拒绝无效的优先级', () => {
      const result = listTodosSchema.safeParse({ priority: 'P4' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 P5', () => {
      const result = listTodosSchema.safeParse({ priority: 'P5' });
      expect(result.success).toBe(false);
    });

    it('应拒绝小写 p0', () => {
      const result = listTodosSchema.safeParse({ priority: 'p0' });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = listTodosSchema.safeParse({ priority: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字', () => {
      const result = listTodosSchema.safeParse({ priority: 0 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === search ===
  describe('search', () => {
    it('应接受 undefined（可选字段）', () => {
      const result = listTodosSchema.parse({});
      expect(result.search).toBeUndefined();
    });

    it('应接受有效搜索字符串', () => {
      expect(listTodosSchema.parse({ search: '关键词' }).search).toBe('关键词');
    });

    it('应接受空字符串', () => {
      expect(listTodosSchema.parse({ search: '' }).search).toBe('');
    });

    it('应接受最长 100 个字符', () => {
      const s = 'a'.repeat(100);
      expect(listTodosSchema.parse({ search: s }).search).toBe(s);
    });

    it('应拒绝超过 100 个字符', () => {
      const result = listTodosSchema.safeParse({ search: 'a'.repeat(101) });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 字符', () => {
      const s = '搜索🎉关键词';
      expect(listTodosSchema.parse({ search: s }).search).toBe(s);
    });

    it('应拒绝数字', () => {
      const result = listTodosSchema.safeParse({ search: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = listTodosSchema.safeParse({ search: null });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = listTodosSchema.safeParse({
        page: 2,
        pageSize: 20,
        tab: 'all_closed',
        priority: 'P0',
        search: '测试',
      });
      expect(result.success).toBe(true);
    });

    it('应接受空对象（使用所有默认值）', () => {
      const result = listTodosSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('解析后的空对象应使用默认值', () => {
      const parsed = listTodosSchema.parse({});
      expect(parsed).toEqual({
        page: 1,
        pageSize: 10,
        tab: 'my_open',
      });
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = listTodosSchema.parse({ page: 1, extra: 'value' } as Record<string, unknown>);
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── createTodoSchema ───────────────────────────────────────────────
describe('createTodoSchema', () => {
  // === title ===
  describe('title', () => {
    it('应接受有效标题', () => {
      expect(createTodoSchema.parse(validCreateTodo).title).toBe('完成文章审核');
    });

    it('应接受1个字符的标题', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, title: 'A' }).title).toBe('A');
    });

    it('应接受最长200个字符的标题', () => {
      const t = 'a'.repeat(200);
      expect(createTodoSchema.parse({ ...validCreateTodo, title: t }).title).toBe(t);
    });

    it('应拒绝超过200个字符的标题', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, title: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 title', () => {
      const { title: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, title: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, title: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应接受 unicode 字符', () => {
      const t = '任务🎉标题';
      expect(createTodoSchema.parse({ ...validCreateTodo, title: t }).title).toBe(t);
    });
  });

  // === company_id ===
  describe('company_id', () => {
    it('应接受有效正整数', () => {
      expect(createTodoSchema.parse(validCreateTodo).company_id).toBe(1);
    });

    it('应接受大正整数', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, company_id: 999999 }).company_id).toBe(999999);
    });

    it('应拒绝 0', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, company_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, company_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, company_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, company_id: '1' as unknown as number });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 company_id', () => {
      const { company_id: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, company_id: null });
      expect(result.success).toBe(false);
    });
  });

  // === project_id（optional + nullable） ===
  describe('project_id', () => {
    it('应接受有效正整数', () => {
      expect(createTodoSchema.parse(validCreateTodo).project_id).toBe(10);
    });

    it('应接受 null', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, project_id: null }).project_id).toBeNull();
    });

    it('应接受 undefined（可选字段）', () => {
      const { project_id: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝 0', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, project_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, project_id: -5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, project_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, project_id: '10' as unknown as number });
      expect(result.success).toBe(false);
    });
  });

  // === object_type ===
  describe('object_type', () => {
    it('应接受有效字符串', () => {
      expect(createTodoSchema.parse(validCreateTodo).object_type).toBe('article');
    });

    it('应接受1个字符', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, object_type: 'A' }).object_type).toBe('A');
    });

    it('应拒绝空字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_type: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 object_type', () => {
      const { object_type: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_type: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_type: 123 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === object_id（optional + nullable） ===
  describe('object_id', () => {
    it('应接受有效正整数', () => {
      expect(createTodoSchema.parse(validCreateTodo).object_id).toBe(100);
    });

    it('应接受 null', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, object_id: null }).object_id).toBeNull();
    });

    it('应接受 undefined（可选字段）', () => {
      const { object_id: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝 0', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, object_id: 1.5 });
      expect(result.success).toBe(false);
    });
  });

  // === action ===
  describe('action', () => {
    it('应接受有效字符串', () => {
      expect(createTodoSchema.parse(validCreateTodo).action).toBe('review');
    });

    it('应拒绝空字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, action: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 action', () => {
      const { action: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, action: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, action: 123 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === source（optional） ===
  describe('source', () => {
    it('应接受有效字符串', () => {
      expect(createTodoSchema.parse(validCreateTodo).source).toBe('system');
    });

    it('应接受 undefined（可选字段）', () => {
      const { source: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝数字', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, source: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, source: null });
      expect(result.success).toBe(false);
    });
  });

  // === priority（optional） ===
  describe('priority', () => {
    it('应接受有效字符串', () => {
      expect(createTodoSchema.parse(validCreateTodo).priority).toBe('P1');
    });

    it('应接受 undefined（可选字段）', () => {
      const { priority: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝数字', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, priority: 1 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, priority: null });
      expect(result.success).toBe(false);
    });
  });

  // === assignee_id ===
  describe('assignee_id', () => {
    it('应接受有效正整数', () => {
      expect(createTodoSchema.parse(validCreateTodo).assignee_id).toBe(5);
    });

    it('应接受大正整数', () => {
      expect(createTodoSchema.parse({ ...validCreateTodo, assignee_id: 999999 }).assignee_id).toBe(999999);
    });

    it('应拒绝 0', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, assignee_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, assignee_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, assignee_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, assignee_id: '5' as unknown as number });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 assignee_id', () => {
      const { assignee_id: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, assignee_id: null });
      expect(result.success).toBe(false);
    });
  });

  // === due_at（optional） ===
  describe('due_at', () => {
    it('应接受有效日期字符串', () => {
      expect(createTodoSchema.parse(validCreateTodo).due_at).toBe('2026-06-01T00:00:00Z');
    });

    it('应接受 undefined（可选字段）', () => {
      const { due_at: _, ...without } = validCreateTodo;
      const result = createTodoSchema.safeParse(without);
      expect(result.success).toBe(true);
    });

    it('应拒绝数字', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, due_at: 12345 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = createTodoSchema.safeParse({ ...validCreateTodo, due_at: null });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = createTodoSchema.safeParse(validCreateTodo);
      expect(result.success).toBe(true);
    });

    it('应接受最小必填字段（不含可选字段）', () => {
      const minimal = {
        title: '测试任务',
        company_id: 1,
        object_type: 'article',
        action: 'review',
        assignee_id: 1,
      };
      const result = createTodoSchema.safeParse(minimal);
      expect(result.success).toBe(true);
    });

    it('解析后的完整对象应保持字段值一致', () => {
      const parsed = createTodoSchema.parse(validCreateTodo);
      expect(parsed).toEqual(validCreateTodo);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = createTodoSchema.parse({ ...validCreateTodo, extra: 'value' });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── updateTodoSchema ───────────────────────────────────────────────
describe('updateTodoSchema', () => {
  // === title（optional） ===
  describe('title', () => {
    it('应接受有效标题', () => {
      expect(updateTodoSchema.parse({ title: '更新标题' }).title).toBe('更新标题');
    });

    it('应接受1个字符的标题', () => {
      expect(updateTodoSchema.parse({ title: 'A' }).title).toBe('A');
    });

    it('应接受最长200个字符的标题', () => {
      const t = 'a'.repeat(200);
      expect(updateTodoSchema.parse({ title: t }).title).toBe(t);
    });

    it('应拒绝超过200个字符的标题', () => {
      const result = updateTodoSchema.safeParse({ title: 'a'.repeat(201) });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = updateTodoSchema.safeParse({ title: '' });
      expect(result.success).toBe(false);
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateTodoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝 null', () => {
      const result = updateTodoSchema.safeParse({ title: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateTodoSchema.safeParse({ title: 123 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === object_type（optional） ===
  describe('object_type', () => {
    it('应接受有效字符串', () => {
      expect(updateTodoSchema.parse({ object_type: 'keyword' }).object_type).toBe('keyword');
    });

    it('应拒绝空字符串', () => {
      const result = updateTodoSchema.safeParse({ object_type: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateTodoSchema.safeParse({ object_type: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateTodoSchema.safeParse({ object_type: 123 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === object_id（optional + nullable） ===
  describe('object_id', () => {
    it('应接受有效正整数', () => {
      expect(updateTodoSchema.parse({ object_id: 100 }).object_id).toBe(100);
    });

    it('应接受 null（可清空）', () => {
      expect(updateTodoSchema.parse({ object_id: null }).object_id).toBeNull();
    });

    it('应拒绝 0', () => {
      const result = updateTodoSchema.safeParse({ object_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = updateTodoSchema.safeParse({ object_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = updateTodoSchema.safeParse({ object_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = updateTodoSchema.safeParse({ object_id: '10' as unknown as number });
      expect(result.success).toBe(false);
    });
  });

  // === action（optional） ===
  describe('action', () => {
    it('应接受有效字符串', () => {
      expect(updateTodoSchema.parse({ action: 'approve' }).action).toBe('approve');
    });

    it('应拒绝空字符串', () => {
      const result = updateTodoSchema.safeParse({ action: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateTodoSchema.safeParse({ action: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字类型', () => {
      const result = updateTodoSchema.safeParse({ action: 123 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === priority（optional） ===
  describe('priority', () => {
    it('应接受有效字符串', () => {
      expect(updateTodoSchema.parse({ priority: 'P0' }).priority).toBe('P0');
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateTodoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝数字', () => {
      const result = updateTodoSchema.safeParse({ priority: 1 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = updateTodoSchema.safeParse({ priority: null });
      expect(result.success).toBe(false);
    });
  });

  // === due_at（optional + nullable） ===
  describe('due_at', () => {
    it('应接受有效日期字符串', () => {
      expect(updateTodoSchema.parse({ due_at: '2026-07-01T00:00:00Z' }).due_at).toBe('2026-07-01T00:00:00Z');
    });

    it('应接受 null（可清空截止时间）', () => {
      expect(updateTodoSchema.parse({ due_at: null }).due_at).toBeNull();
    });

    it('应接受 undefined（可选字段）', () => {
      const result = updateTodoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应拒绝数字', () => {
      const result = updateTodoSchema.safeParse({ due_at: 12345 as unknown as string });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = updateTodoSchema.safeParse({
        title: '更新标题',
        object_type: 'keyword',
        object_id: 200,
        action: 'publish',
        priority: 'P2',
        due_at: '2026-08-01T00:00:00Z',
      });
      expect(result.success).toBe(true);
    });

    it('应接受空对象（所有字段都是 optional）', () => {
      const result = updateTodoSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('应接受部分字段', () => {
      const result = updateTodoSchema.safeParse({ title: '新标题', priority: 'P3' });
      expect(result.success).toBe(true);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = updateTodoSchema.parse({ title: '测试', extra: 'value' });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── transferTodoSchema ─────────────────────────────────────────────
describe('transferTodoSchema', () => {
  // === assignee_id ===
  describe('assignee_id', () => {
    it('应接受有效正整数', () => {
      expect(transferTodoSchema.parse({ assignee_id: 5 }).assignee_id).toBe(5);
    });

    it('应接受大正整数', () => {
      expect(transferTodoSchema.parse({ assignee_id: 999999 }).assignee_id).toBe(999999);
    });

    it('应拒绝 0', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝字符串', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: '5' as unknown as number });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 assignee_id', () => {
      const result = transferTodoSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝 undefined', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: undefined });
      expect(result.success).toBe(false);
    });
  });

  // === remark（optional） ===
  describe('remark', () => {
    it('应接受有效字符串', () => {
      expect(transferTodoSchema.parse({ assignee_id: 1, remark: '转交备注' }).remark).toBe('转交备注');
    });

    it('应接受 undefined（可选字段）', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1 });
      expect(result.success).toBe(true);
    });

    it('应接受最长500个字符', () => {
      const r = 'a'.repeat(500);
      expect(transferTodoSchema.parse({ assignee_id: 1, remark: r }).remark).toBe(r);
    });

    it('应拒绝超过500个字符', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1, remark: 'a'.repeat(501) });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1, remark: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1, remark: null });
      expect(result.success).toBe(false);
    });

    it('应接受空字符串', () => {
      expect(transferTodoSchema.parse({ assignee_id: 1, remark: '' }).remark).toBe('');
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1, remark: '备注' });
      expect(result.success).toBe(true);
    });

    it('应接受仅必填字段', () => {
      const result = transferTodoSchema.safeParse({ assignee_id: 1 });
      expect(result.success).toBe(true);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = transferTodoSchema.parse({ assignee_id: 1, extra: 'value' });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── objectOptionsSchema ────────────────────────────────────────────
describe('objectOptionsSchema', () => {
  // === projectId ===
  describe('projectId', () => {
    it('应接受有效正整数', () => {
      expect(objectOptionsSchema.parse({ projectId: 1, objectType: 'article' }).projectId).toBe(1);
    });

    it('应强制转换字符串数字', () => {
      expect(objectOptionsSchema.parse({ projectId: '10', objectType: 'article' }).projectId).toBe(10);
    });

    it('应拒绝 0', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 0, objectType: 'article' });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = objectOptionsSchema.safeParse({ projectId: -1, objectType: 'article' });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1.5, objectType: 'article' });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数字字符串', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 'abc', objectType: 'article' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 projectId', () => {
      const result = objectOptionsSchema.safeParse({ objectType: 'article' });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = objectOptionsSchema.safeParse({ projectId: null, objectType: 'article' });
      expect(result.success).toBe(false);
    });
  });

  // === objectType ===
  describe('objectType', () => {
    it('应接受 "article"', () => {
      expect(objectOptionsSchema.parse({ projectId: 1, objectType: 'article' }).objectType).toBe('article');
    });

    it('应接受 "keyword"', () => {
      expect(objectOptionsSchema.parse({ projectId: 1, objectType: 'keyword' }).objectType).toBe('keyword');
    });

    it('应拒绝无效值', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 'invalid' });
      expect(result.success).toBe(false);
    });

    it('应拒绝空字符串', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: '' });
      expect(result.success).toBe(false);
    });

    it('应拒绝数字', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: null });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 objectType', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1 });
      expect(result.success).toBe(false);
    });
  });

  // === action（optional） ===
  describe('action', () => {
    it('应接受有效字符串', () => {
      expect(objectOptionsSchema.parse({ projectId: 1, objectType: 'article', action: 'review' }).action).toBe('review');
    });

    it('应接受 undefined（可选字段）', () => {
      const result = objectOptionsSchema.parse({ projectId: 1, objectType: 'article' });
      expect(result.action).toBeUndefined();
    });

    it('应拒绝数字', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 'article', action: 123 as unknown as string });
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 'article', action: null });
      expect(result.success).toBe(false);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受所有字段', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 'keyword', action: 'publish' });
      expect(result.success).toBe(true);
    });

    it('应接受不含可选字段', () => {
      const result = objectOptionsSchema.safeParse({ projectId: 1, objectType: 'article' });
      expect(result.success).toBe(true);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = objectOptionsSchema.parse({ projectId: 1, objectType: 'article', extra: 'value' });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

// ─── assigneeCandidatesSchema ───────────────────────────────────────
describe('assigneeCandidatesSchema', () => {
  // === projectId ===
  describe('projectId', () => {
    it('应接受有效正整数', () => {
      expect(assigneeCandidatesSchema.parse({ projectId: 1 }).projectId).toBe(1);
    });

    it('应强制转换字符串数字', () => {
      expect(assigneeCandidatesSchema.parse({ projectId: '10' }).projectId).toBe(10);
    });

    it('应接受大正整数', () => {
      expect(assigneeCandidatesSchema.parse({ projectId: 999999 }).projectId).toBe(999999);
    });

    it('应拒绝 0', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: 0 });
      expect(result.success).toBe(false);
    });

    it('应拒绝负数', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: -1 });
      expect(result.success).toBe(false);
    });

    it('应拒绝浮点数', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: 1.5 });
      expect(result.success).toBe(false);
    });

    it('应拒绝非数字字符串', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: 'abc' });
      expect(result.success).toBe(false);
    });

    it('应拒绝缺少 projectId', () => {
      const result = assigneeCandidatesSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it('应拒绝 null', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: null });
      expect(result.success).toBe(false);
    });

    it('应将布尔值 true 强制转换为 1（z.coerce 行为）', () => {
      expect(assigneeCandidatesSchema.parse({ projectId: true as unknown as number }).projectId).toBe(1);
    });
  });

  // === 完整有效对象 ===
  describe('完整有效对象', () => {
    it('应接受有效对象', () => {
      const result = assigneeCandidatesSchema.safeParse({ projectId: 1 });
      expect(result.success).toBe(true);
    });
  });

  // === 非严格模式 ===
  describe('非 strict 模式', () => {
    it('应 strip 未知字段', () => {
      const result = assigneeCandidatesSchema.parse({ projectId: 1, extra: 'value' });
      expect((result as Record<string, unknown>).extra).toBeUndefined();
    });
  });
});

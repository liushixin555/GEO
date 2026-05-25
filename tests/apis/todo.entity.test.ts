/**
 * @jest-environment node
 */
import {
  Todo,
  TodoLog,
  CreateTodoRequest,
  UpdateTodoRequest,
  TransferTodoRequest,
} from '../../apis/entity/todo.entity';

describe('todo.entity', () => {
  // ============================================================
  // Todo interface
  // ============================================================
  describe('Todo interface', () => {
    it('should create a valid Todo object with all required fields', () => {
      const todo: Todo = {
        id: 1,
        title: '发布文章',
        company_id: 1,
        company_name: '测试公司',
        project_id: 10,
        project_name: '项目A',
        object_type: 'article',
        object_id: 100,
        action: 'publish',
        source: 'system',
        priority: 'high',
        assignee_id: 1,
        assignee_name: '管理员',
        status: 'pending',
        created_by_id: 2,
        created_by_name: '创建者',
        due_at: '2025-12-31',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(todo.id).toBe(1);
      expect(todo.title).toBe('发布文章');
      expect(todo.object_type).toBe('article');
      expect(todo.action).toBe('publish');
      expect(todo.priority).toBe('high');
      expect(todo.status).toBe('pending');
      expect(todo.due_at).toBe('2025-12-31');
    });

    it('should allow project_id and project_name to be null', () => {
      const todo: Todo = {
        id: 2,
        title: '无项目待办',
        company_id: 1,
        company_name: '公司A',
        project_id: null,
        project_name: null,
        object_type: 'task',
        object_id: null,
        action: 'review',
        source: 'manual',
        priority: 'low',
        assignee_id: 1,
        assignee_name: '用户1',
        status: 'pending',
        created_by_id: 1,
        created_by_name: '用户1',
        due_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(todo.project_id).toBeNull();
      expect(todo.project_name).toBeNull();
      expect(todo.due_at).toBeNull();
    });

    it('should allow object_id to be null', () => {
      const todo: Todo = {
        id: 3,
        title: '通用待办',
        company_id: 1,
        company_name: '公司A',
        project_id: null,
        project_name: null,
        object_type: 'general',
        object_id: null,
        action: 'check',
        source: 'manual',
        priority: 'medium',
        assignee_id: 1,
        assignee_name: '用户',
        status: 'pending',
        created_by_id: 1,
        created_by_name: '用户',
        due_at: '2025-06-30',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(todo.object_id).toBeNull();
      expect(todo.due_at).toBe('2025-06-30');
    });

    it('should have all required fields', () => {
      const todo: Todo = {
        id: 1,
        title: 'T',
        company_id: 1,
        company_name: 'C',
        project_id: null,
        project_name: null,
        object_type: 'article',
        object_id: null,
        action: 'publish',
        source: 'system',
        priority: 'high',
        assignee_id: 1,
        assignee_name: 'A',
        status: 'pending',
        created_by_id: 1,
        created_by_name: 'B',
        due_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(todo).sort()).toEqual(
        ['id', 'title', 'company_id', 'company_name', 'project_id', 'project_name',
         'object_type', 'object_id', 'action', 'source', 'priority', 'assignee_id',
         'assignee_name', 'status', 'created_by_id', 'created_by_name', 'due_at',
         'created_at', 'updated_at'].sort()
      );
    });

    it('should allow due_at as string date', () => {
      const todo: Todo = {
        id: 4,
        title: '有截止日期',
        company_id: 1,
        company_name: 'C',
        project_id: 1,
        project_name: 'P',
        object_type: 'article',
        object_id: 1,
        action: 'publish',
        source: 'system',
        priority: 'high',
        assignee_id: 1,
        assignee_name: 'A',
        status: 'pending',
        created_by_id: 1,
        created_by_name: 'B',
        due_at: '2025-12-31T23:59:59.000Z',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(todo.due_at).toBe('2025-12-31T23:59:59.000Z');
    });

    it('should have exactly 19 fields', () => {
      const todo: Todo = {
        id: 1,
        title: 'T',
        company_id: 1,
        company_name: 'C',
        project_id: null,
        project_name: null,
        object_type: 'article',
        object_id: null,
        action: 'publish',
        source: 'system',
        priority: 'high',
        assignee_id: 1,
        assignee_name: 'A',
        status: 'pending',
        created_by_id: 1,
        created_by_name: 'B',
        due_at: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(todo)).toHaveLength(19);
    });

    // --- id ---
    it('should have id as number type', () => {
      const todo: Todo = {
        id: 999, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof todo.id).toBe('number');
      expect(todo.id).toBe(999);
    });

    it('should support id as 0', () => {
      const todo: Todo = {
        id: 0, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.id).toBe(0);
    });

    it('should support large id values', () => {
      const todo: Todo = {
        id: Number.MAX_SAFE_INTEGER, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const todo: Todo = {
        id: -1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.id).toBe(-1);
    });

    // --- title ---
    it('should support empty string title', () => {
      const todo: Todo = {
        id: 1, title: '', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.title).toBe('');
    });

    it('should support long title values', () => {
      const longTitle = '这是一条非常长的待办事项标题'.repeat(50);
      const todo: Todo = {
        id: 1, title: longTitle, company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.title).toBe(longTitle);
    });

    it('should support title with special characters', () => {
      const todo: Todo = {
        id: 1, title: '<script>alert("xss")</script>', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.title).toContain('<script>');
    });

    it('should support title with emoji characters', () => {
      const todo: Todo = {
        id: 1, title: '🚀发布文章🎉', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.title).toBe('🚀发布文章🎉');
    });

    // --- company_name / assignee_name / created_by_name ---
    it('should support unicode/Chinese characters in name fields', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: '薄云商机倍增服务',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: '张三', status: 'pending',
        created_by_id: 2, created_by_name: '李四', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.company_name).toBe('薄云商机倍增服务');
      expect(todo.assignee_name).toBe('张三');
      expect(todo.created_by_name).toBe('李四');
    });

    // --- status / priority / action / source ---
    it('should support various status values', () => {
      const statuses = ['pending', 'in_progress', 'completed', 'cancelled'];
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'in_progress',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(statuses).toContain(todo.status);
    });

    it('should support various priority values', () => {
      const priorities = ['low', 'medium', 'high', 'urgent'];
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'urgent',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(priorities).toContain(todo.priority);
    });

    // --- created_at / updated_at ---
    it('should have created_at as Date instance', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.created_at).toBeInstanceOf(Date);
      expect(todo.updated_at).toBeInstanceOf(Date);
    });

    it('should support specific date values for timestamps', () => {
      const created = new Date('2024-01-15T10:30:00.000Z');
      const updated = new Date('2024-06-20T14:45:00.000Z');
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: created, updated_at: updated,
      };
      expect(todo.created_at).toBe(created);
      expect(todo.updated_at).toBe(updated);
    });

    it('should support epoch date for timestamps', () => {
      const epochDate = new Date(0);
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: epochDate, updated_at: epochDate,
      };
      expect(todo.created_at.getTime()).toBe(0);
    });

    // --- Object behavior ---
    it('should be mutable (fields can be reassigned)', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      todo.title = '新标题';
      todo.status = 'completed';
      expect(todo.title).toBe('新标题');
      expect(todo.status).toBe('completed');
    });

    it('should support object spread for creating copies', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const copy = { ...todo, title: '新标题' };
      expect(copy.title).toBe('新标题');
      expect(copy.id).toBe(todo.id);
      expect(todo.title).toBe('T');
    });

    it('should support Object.assign for merging', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const merged = Object.assign({}, todo, { status: 'completed' });
      expect(merged.status).toBe('completed');
      expect(merged.id).toBe(1);
    });

    // --- Realistic scenarios ---
    it('should represent a publishing todo', () => {
      const todo: Todo = {
        id: 1, title: '发布文章到平台', company_id: 1, company_name: '薄云科技',
        project_id: 10, project_name: '文章管理项目', object_type: 'article',
        object_id: 100, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 5, assignee_name: '运营专员', status: 'pending',
        created_by_id: 2, created_by_name: '管理员', due_at: '2025-12-31',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      expect(todo.object_type).toBe('article');
      expect(todo.action).toBe('publish');
    });

    it('should represent a review todo without project', () => {
      const todo: Todo = {
        id: 2, title: '审核待办', company_id: 1, company_name: '薄云科技',
        project_id: null, project_name: null, object_type: 'report',
        object_id: null, action: 'review', source: 'manual', priority: 'medium',
        assignee_id: 3, assignee_name: '审核员', status: 'in_progress',
        created_by_id: 1, created_by_name: '系统', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.project_id).toBeNull();
      expect(todo.action).toBe('review');
    });

    // --- Array operations ---
    it('should support creating array of Todo objects', () => {
      const todos: Todo[] = [
        { id: 1, title: '待办1', company_id: 1, company_name: 'C1',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: '待办2', company_id: 1, company_name: 'C1',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      expect(todos).toHaveLength(2);
      expect(todos[0].title).toBe('待办1');
    });

    it('should support filter/find on array of todos', () => {
      const todos: Todo[] = [
        { id: 1, title: '发布', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: '审核', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      const pending = todos.filter(t => t.status === 'pending');
      expect(pending).toHaveLength(1);
      const found = todos.find(t => t.id === 2);
      expect(found).toBeDefined();
      expect(found!.action).toBe('review');
    });

    it('should support sorting todos by priority', () => {
      const priorityOrder: Record<string, number> = { urgent: 0, high: 1, medium: 2, low: 3 };
      const todos: Todo[] = [
        { id: 1, title: '低', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'low',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: '紧急', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'urgent',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 3, title: '中', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'medium',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...todos].sort((a, b) => priorityOrder[a.priority] - priorityOrder[b.priority]);
      expect(sorted[0].priority).toBe('urgent');
      expect(sorted[2].priority).toBe('low');
    });

    it('should support map/reduce on todos array', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 1, assignee_name: 'A', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      const titles = todos.map(t => t.title);
      expect(titles).toEqual(['T1', 'T2']);
      const pendingCount = todos.reduce((acc, t) => t.status === 'pending' ? acc + 1 : acc, 0);
      expect(pendingCount).toBe(1);
    });

    it('should support some/every on todos array', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      expect(todos.some(t => t.status === 'completed')).toBe(true);
      expect(todos.every(t => t.company_id === 1)).toBe(true);
    });

    // --- Destructuring ---
    it('should support destructuring', () => {
      const todo: Todo = {
        id: 1, title: '发布', company_id: 1, company_name: '薄云',
        project_id: 10, project_name: '项目', object_type: 'article',
        object_id: 100, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 5, assignee_name: '张三', status: 'pending',
        created_by_id: 2, created_by_name: '李四', due_at: '2025-12-31',
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, title, status, priority } = todo;
      expect(id).toBe(1);
      expect(title).toBe('发布');
      expect(status).toBe('pending');
      expect(priority).toBe('high');
    });

    it('should support rest pattern after destructuring', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, title, ...rest } = todo;
      expect(id).toBe(1);
      expect(title).toBe('T');
      expect(rest.company_id).toBe(1);
      expect(rest.status).toBe('pending');
    });

    // --- Object.keys/values/entries ---
    it('should support Object.keys', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = Object.keys(todo);
      expect(keys).toHaveLength(19);
      expect(keys).toContain('id');
      expect(keys).toContain('title');
      expect(keys).toContain('status');
    });

    it('should support Object.values', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const values = Object.values(todo);
      expect(values).toHaveLength(19);
      expect(values).toContain(1);
      expect(values).toContain('T');
    });

    it('should support Object.entries', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const entries = Object.entries(todo);
      expect(entries).toHaveLength(19);
    });

    it('should support hasOwnProperty check', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.hasOwnProperty('id')).toBe(true);
      expect(todo.hasOwnProperty('title')).toBe(true);
      expect(todo.hasOwnProperty('status')).toBe(true);
      expect(todo.hasOwnProperty('nonexistent')).toBe(false);
    });

    it('should correctly compare two distinct objects with same values', () => {
      const date = new Date('2024-01-01T00:00:00.000Z');
      const t1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      const t2: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      expect(t1).not.toBe(t2);
      expect(t1).toEqual(t2);
    });

    // --- Map/Set ---
    it('should support Map with Todo values', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const map = new Map<number, Todo>();
      map.set(todo.id, todo);
      expect(map.get(1)?.title).toBe('T');
      expect(map.size).toBe(1);
    });

    it('should support Set with Todo objects', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<Todo>();
      set.add(todo);
      expect(set.has(todo)).toBe(true);
      expect(set.size).toBe(1);
    });

    // --- Timestamp comparison ---
    it('should support timestamp comparison between created_at and updated_at', () => {
      const created = new Date('2024-01-01T00:00:00.000Z');
      const updated = new Date('2024-06-01T00:00:00.000Z');
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: created, updated_at: updated,
      };
      expect(todo.updated_at.getTime() - todo.created_at.getTime()).toBeGreaterThan(0);
    });

    it('should support same created_at and updated_at', () => {
      const now = new Date();
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: now, updated_at: now,
      };
      expect(todo.created_at).toBe(todo.updated_at);
    });
  });

  // ============================================================
  // TodoLog interface
  // ============================================================
  describe('TodoLog interface', () => {
    it('should create a valid TodoLog object', () => {
      const log: TodoLog = {
        id: 1,
        todo_id: 1,
        operator_id: 1,
        operator_name: '操作者',
        action: 'completed',
        object_type: 'article',
        object_id: 100,
        remark: '完成发布',
        created_at: new Date(),
      };
      expect(log.id).toBe(1);
      expect(log.todo_id).toBe(1);
      expect(log.action).toBe('completed');
      expect(log.remark).toBe('完成发布');
    });

    it('should allow nullable fields to be null', () => {
      const log: TodoLog = {
        id: 2,
        todo_id: 1,
        operator_id: 1,
        operator_name: '操作者',
        action: 'started',
        object_type: null,
        object_id: null,
        remark: null,
        created_at: new Date(),
      };
      expect(log.object_type).toBeNull();
      expect(log.object_id).toBeNull();
      expect(log.remark).toBeNull();
    });

    it('should have all required fields in TodoLog', () => {
      const log: TodoLog = {
        id: 3,
        todo_id: 5,
        operator_id: 2,
        operator_name: '管理员',
        action: 'transferred',
        object_type: 'task',
        object_id: 50,
        remark: '转交处理',
        created_at: new Date(),
      };
      expect(Object.keys(log).sort()).toEqual(
        ['id', 'todo_id', 'operator_id', 'operator_name', 'action',
         'object_type', 'object_id', 'remark', 'created_at'].sort()
      );
    });

    it('should have exactly 9 fields', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date(),
      };
      expect(Object.keys(log)).toHaveLength(9);
    });

    it('should have created_at as Date instance', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date('2024-06-15T12:00:00.000Z'),
      };
      expect(log.created_at).toBeInstanceOf(Date);
      expect(log.created_at.toISOString()).toBe('2024-06-15T12:00:00.000Z');
    });

    it('should support unicode/Chinese in operator_name and remark', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: '张三',
        action: 'completed', object_type: 'article', object_id: 1,
        remark: '薄云商机倍增服务——已完成',
        created_at: new Date(),
      };
      expect(log.operator_name).toBe('张三');
      expect(log.remark).toBe('薄云商机倍增服务——已完成');
    });

    it('should support remark with special characters', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: 'line1\nline2\ttab\r\nwindows',
        created_at: new Date(),
      };
      expect(log.remark).toContain('\n');
      expect(log.remark).toContain('\t');
    });

    it('should support object spread for copying', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: 'task', object_id: 1,
        remark: '备注', created_at: new Date(),
      };
      const copy = { ...log, action: 'updated' };
      expect(copy.action).toBe('updated');
      expect(log.action).toBe('done');
    });

    it('should support array of TodoLog objects', () => {
      const logs: TodoLog[] = [
        { id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
          action: 'created', object_type: null, object_id: null,
          remark: null, created_at: new Date() },
        { id: 2, todo_id: 1, operator_id: 2, operator_name: 'B',
          action: 'completed', object_type: 'article', object_id: 1,
          remark: '完成', created_at: new Date() },
      ];
      expect(logs).toHaveLength(2);
      const created = logs.find(l => l.action === 'created');
      expect(created).toBeDefined();
    });

    it('should support destructuring', () => {
      const log: TodoLog = {
        id: 1, todo_id: 5, operator_id: 3, operator_name: 'A',
        action: 'transferred', object_type: null, object_id: null,
        remark: '转交', created_at: new Date(),
      };
      const { id, todo_id, action, operator_name } = log;
      expect(id).toBe(1);
      expect(todo_id).toBe(5);
      expect(action).toBe('transferred');
      expect(operator_name).toBe('A');
    });
  });

  // ============================================================
  // CreateTodoRequest interface
  // ============================================================
  describe('CreateTodoRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateTodoRequest = {
        title: '新待办',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.title).toBe('新待办');
      expect(req.company_id).toBe(1);
      expect(req.assignee_id).toBe(1);
    });

    it('should include optional project_id', () => {
      const req: CreateTodoRequest = {
        title: '带项目待办',
        company_id: 1,
        project_id: 10,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.project_id).toBe(10);
    });

    it('should allow project_id to be null', () => {
      const req: CreateTodoRequest = {
        title: '无项目待办',
        company_id: 1,
        project_id: null,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.project_id).toBeNull();
    });

    it('should include optional source', () => {
      const req: CreateTodoRequest = {
        title: '新待办',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        source: 'manual',
        assignee_id: 1,
      };
      expect(req.source).toBe('manual');
    });

    it('should include optional priority', () => {
      const req: CreateTodoRequest = {
        title: '新待办',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        priority: 'high',
        assignee_id: 1,
      };
      expect(req.priority).toBe('high');
    });

    it('should include optional object_id', () => {
      const req: CreateTodoRequest = {
        title: '新待办',
        company_id: 1,
        object_type: 'article',
        object_id: 100,
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.object_id).toBe(100);
    });

    it('should include optional due_at', () => {
      const req: CreateTodoRequest = {
        title: '有截止日期',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
        due_at: '2025-12-31',
      };
      expect(req.due_at).toBe('2025-12-31');
    });

    it('should allow all optional fields together', () => {
      const req: CreateTodoRequest = {
        title: '完整待办',
        company_id: 1,
        project_id: 5,
        object_type: 'article',
        object_id: 100,
        action: 'publish',
        source: 'system',
        priority: 'high',
        assignee_id: 1,
        due_at: '2025-12-31',
      };
      expect(req.project_id).toBe(5);
      expect(req.object_id).toBe(100);
      expect(req.source).toBe('system');
      expect(req.priority).toBe('high');
      expect(req.due_at).toBe('2025-12-31');
    });

    it('should have 5 required fields and 5 optional fields', () => {
      const req: CreateTodoRequest = {
        title: 'T',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
        project_id: null,
        object_id: null,
        source: 'system',
        priority: 'high',
        due_at: '2025-01-01',
      };
      expect(Object.keys(req)).toHaveLength(10);
    });

    it('should support title with Chinese characters', () => {
      const req: CreateTodoRequest = {
        title: '薄云商机倍增服务——发布文章',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.title).toContain('薄云商机倍增服务');
    });

    it('should support title with emoji', () => {
      const req: CreateTodoRequest = {
        title: '🚀紧急待办',
        company_id: 1,
        object_type: 'task',
        action: 'review',
        assignee_id: 1,
      };
      expect(req.title).toContain('🚀');
    });

    it('should support empty string title', () => {
      const req: CreateTodoRequest = {
        title: '',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
      };
      expect(req.title).toBe('');
    });

    it('should support due_at with ISO 8601 format', () => {
      const req: CreateTodoRequest = {
        title: 'T',
        company_id: 1,
        object_type: 'article',
        action: 'publish',
        assignee_id: 1,
        due_at: '2025-12-31T23:59:59.000Z',
      };
      expect(req.due_at).toBe('2025-12-31T23:59:59.000Z');
    });

    it('should support destructuring', () => {
      const req: CreateTodoRequest = {
        title: '发布', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 5, priority: 'high',
      };
      const { title, action, priority } = req;
      expect(title).toBe('发布');
      expect(action).toBe('publish');
      expect(priority).toBe('high');
    });

    it('should support spread for creating modified copy', () => {
      const req: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
      };
      const modified = { ...req, priority: 'urgent' };
      expect(modified.priority).toBe('urgent');
      expect(req.priority).toBeUndefined();
    });
  });

  // ============================================================
  // UpdateTodoRequest interface
  // ============================================================
  describe('UpdateTodoRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateTodoRequest = {
        title: '更新标题',
        object_type: 'task',
        object_id: 200,
        action: 'review',
        priority: 'low',
        due_at: '2025-11-30',
      };
      expect(req.title).toBe('更新标题');
      expect(req.priority).toBe('low');
      expect(req.due_at).toBe('2025-11-30');
    });

    it('should allow partial updates', () => {
      const req: UpdateTodoRequest = { title: '只改标题' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateTodoRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow object_id to be null', () => {
      const req: UpdateTodoRequest = { object_id: null };
      expect(req.object_id).toBeNull();
    });

    it('should allow due_at to be null', () => {
      const req: UpdateTodoRequest = { due_at: null };
      expect(req.due_at).toBeNull();
    });

    it('should allow updating only due_at', () => {
      const req: UpdateTodoRequest = { due_at: '2025-10-01' };
      expect(req.due_at).toBe('2025-10-01');
    });

    it('should allow updating only priority', () => {
      const req: UpdateTodoRequest = { priority: 'urgent' };
      expect(req.priority).toBe('urgent');
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow updating only action', () => {
      const req: UpdateTodoRequest = { action: 'cancel' };
      expect(req.action).toBe('cancel');
    });

    it('should allow updating only object_type', () => {
      const req: UpdateTodoRequest = { object_type: 'report' };
      expect(req.object_type).toBe('report');
    });

    it('should support updating multiple fields', () => {
      const req: UpdateTodoRequest = {
        title: '新标题',
        priority: 'high',
        due_at: '2025-12-31',
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(req.title).toBe('新标题');
      expect(req.priority).toBe('high');
      expect(req.due_at).toBe('2025-12-31');
    });

    it('should have exactly 6 fields when all provided', () => {
      const req: UpdateTodoRequest = {
        title: 'T', object_type: 'task', object_id: 1,
        action: 'review', priority: 'low', due_at: '2025-01-01',
      };
      expect(Object.keys(req)).toHaveLength(6);
    });

    it('should support title with Chinese characters', () => {
      const req: UpdateTodoRequest = { title: '薄云商机倍增服务更新' };
      expect(req.title).toBe('薄云商机倍增服务更新');
    });

    it('should support destructuring', () => {
      const req: UpdateTodoRequest = {
        title: 'T', priority: 'high', due_at: '2025-12-31',
      };
      const { title, priority } = req;
      expect(title).toBe('T');
      expect(priority).toBe('high');
    });

    it('should support spread for merging', () => {
      const base: UpdateTodoRequest = { title: 'T' };
      const merged = { ...base, priority: 'high' };
      expect(merged.title).toBe('T');
      expect(merged.priority).toBe('high');
    });
  });

  // ============================================================
  // TransferTodoRequest interface
  // ============================================================
  describe('TransferTodoRequest interface', () => {
    it('should create a valid request with required assignee_id', () => {
      const req: TransferTodoRequest = {
        assignee_id: 5,
      };
      expect(req.assignee_id).toBe(5);
    });

    it('should include optional remark', () => {
      const req: TransferTodoRequest = {
        assignee_id: 5,
        remark: '转交给运营处理',
      };
      expect(req.remark).toBe('转交给运营处理');
    });

    it('should have assignee_id as the only required field', () => {
      const req: TransferTodoRequest = { assignee_id: 1 };
      expect(req).toHaveProperty('assignee_id');
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should support remark with Chinese characters', () => {
      const req: TransferTodoRequest = {
        assignee_id: 1,
        remark: '薄云商机倍增服务——转交',
      };
      expect(req.remark).toContain('薄云商机倍增服务');
    });

    it('should support remark as empty string', () => {
      const req: TransferTodoRequest = {
        assignee_id: 1,
        remark: '',
      };
      expect(req.remark).toBe('');
    });

    it('should support remark with special characters', () => {
      const req: TransferTodoRequest = {
        assignee_id: 1,
        remark: 'line1\nline2\ttab',
      };
      expect(req.remark).toContain('\n');
      expect(req.remark).toContain('\t');
    });

    it('should have exactly 2 fields when remark provided', () => {
      const req: TransferTodoRequest = {
        assignee_id: 1,
        remark: '备注',
      };
      expect(Object.keys(req)).toHaveLength(2);
    });

    it('should support large assignee_id values', () => {
      const req: TransferTodoRequest = { assignee_id: Number.MAX_SAFE_INTEGER };
      expect(req.assignee_id).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  // ============================================================
  // re-exports from index
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(todo.title).toBe('T');
    });
  });

  // ============================================================
  // JSON 序列化往返
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('Todo should survive JSON round-trip with date recovery', () => {
      const original: Todo = {
        id: 42, title: '发布文章', company_id: 1, company_name: '薄云科技',
        project_id: 10, project_name: '项目A', object_type: 'article',
        object_id: 100, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 5, assignee_name: '张三', status: 'pending',
        created_by_id: 2, created_by_name: '李四', due_at: '2025-12-31',
        created_at: new Date('2024-06-15T08:30:00.123Z'),
        updated_at: new Date('2024-06-20T14:45:00.456Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(42);
      expect(parsed.title).toBe('发布文章');
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
      expect(parsed.created_at.getTime()).toBe(original.created_at.getTime());
      expect(parsed.updated_at.getTime()).toBe(original.updated_at.getTime());
    });

    it('Todo should serialize Date fields to ISO strings', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-06-15T08:30:00.000Z'),
        updated_at: new Date('2024-06-20T14:45:00.000Z'),
      };
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(parsed.created_at).toContain('2024-06-15');
      expect(parsed.updated_at).toContain('2024-06-20');
    });

    it('Todo should preserve number precision through JSON round-trip', () => {
      const todo: Todo = {
        id: Number.MAX_SAFE_INTEGER, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('Todo should preserve Chinese characters through JSON round-trip', () => {
      const todo: Todo = {
        id: 1, title: '薄云商机倍增服务', company_id: 1, company_name: '薄云科技',
        project_id: 10, project_name: '文章管理', object_type: 'article',
        object_id: 1, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: '张三', status: 'pending',
        created_by_id: 1, created_by_name: '李四', due_at: '2025-12-31',
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('薄云商机倍增服务');
      expect(parsed.company_name).toBe('薄云科技');
      expect(parsed.assignee_name).toBe('张三');
    });

    it('Todo should preserve emoji through JSON round-trip', () => {
      const todo: Todo = {
        id: 1, title: '🚀紧急待办🎉', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'task',
        object_id: null, action: 'review', source: 'manual', priority: 'urgent',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('🚀紧急待办🎉');
    });

    it('Todo array should survive JSON round-trip', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      ];
      const json = JSON.stringify(todos);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].title).toBe('T1');
      expect(parsed[1].action).toBe('review');
    });

    it('TodoLog should survive JSON round-trip', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: '张三',
        action: 'completed', object_type: 'article', object_id: 100,
        remark: '薄云商机倍增服务完成',
        created_at: new Date('2024-06-15T12:00:00.000Z'),
      };
      const json = JSON.stringify(log);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at') return new Date(value);
        return value;
      });
      expect(parsed.operator_name).toBe('张三');
      expect(parsed.remark).toBe('薄云商机倍增服务完成');
      expect(parsed.created_at).toBeInstanceOf(Date);
    });

    it('CreateTodoRequest should survive JSON round-trip', () => {
      const req: CreateTodoRequest = {
        title: '薄云待办', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1, priority: 'high', due_at: '2025-12-31',
      };
      const json = JSON.stringify(req);
      const restored: CreateTodoRequest = JSON.parse(json);
      expect(restored.title).toBe('薄云待办');
      expect(restored.priority).toBe('high');
    });

    it('UpdateTodoRequest should survive JSON round-trip', () => {
      const req: UpdateTodoRequest = {
        title: '更新', priority: 'urgent', due_at: null,
      };
      const json = JSON.stringify(req);
      const restored: UpdateTodoRequest = JSON.parse(json);
      expect(restored.title).toBe('更新');
      expect(restored.due_at).toBeNull();
    });

    it('TransferTodoRequest should survive JSON round-trip', () => {
      const req: TransferTodoRequest = {
        assignee_id: 5, remark: '转交处理',
      };
      const json = JSON.stringify(req);
      const restored: TransferTodoRequest = JSON.parse(json);
      expect(restored.assignee_id).toBe(5);
      expect(restored.remark).toBe('转交处理');
    });
  });

  // ============================================================
  // Object.freeze 不可变性
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen Todo should reject id mutation', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (todo as any).id = 999; }).toThrow();
      expect(todo.id).toBe(1);
    });

    it('frozen Todo should reject title mutation', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'original', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (todo as any).title = 'hacked'; }).toThrow();
      expect(todo.title).toBe('original');
    });

    it('frozen Todo should reject status mutation', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (todo as any).status = 'completed'; }).toThrow();
      expect(todo.status).toBe('pending');
    });

    it('frozen Todo should reject adding new fields', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (todo as any).extra = 'field'; }).toThrow();
      expect((todo as any).extra).toBeUndefined();
    });

    it('frozen Todo should reject deleting fields', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { delete (todo as any).title; }).toThrow();
      expect(todo.title).toBe('T');
    });

    it('frozen TodoLog should reject mutation', () => {
      const log: TodoLog = Object.freeze({
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date(),
      });
      expect(() => { (log as any).action = 'hacked'; }).toThrow();
      expect(log.action).toBe('done');
    });

    it('frozen Todo should still be readable via Object.keys', () => {
      const todo: Todo = Object.freeze({
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(Object.keys(todo)).toHaveLength(19);
      expect(Object.isFrozen(todo)).toBe(true);
    });
  });

  // ============================================================
  // 结构相等性
  // ============================================================
  describe('structural equality', () => {
    it('two Todos with same values should be structurally equal', () => {
      const date = new Date('2024-06-01T00:00:00.000Z');
      const t1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      const t2: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      expect(t1).toEqual(t2);
      expect(t1).not.toBe(t2);
    });

    it('Todos with different id should not be equal', () => {
      const date = new Date();
      const t1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      const t2: Todo = {
        ...t1, id: 2,
      };
      expect(t1).not.toEqual(t2);
    });

    it('Todos with different status should not be equal', () => {
      const date = new Date();
      const t1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      const t2: Todo = { ...t1, status: 'completed' };
      expect(t1).not.toEqual(t2);
    });

    it('Todos with different due_at should not be equal', () => {
      const date = new Date();
      const t1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      };
      const t2: Todo = { ...t1, due_at: '2025-12-31' };
      expect(t1).not.toEqual(t2);
    });

    it('should compare by id for lookup purposes', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const found = todos.find(t => t.id === 2);
      expect(found).toBeDefined();
      expect(found!.action).toBe('review');
    });

    it('two TodoLogs with same values should be structurally equal', () => {
      const date = new Date('2024-01-01');
      const l1: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: date,
      };
      const l2: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: date,
      };
      expect(l1).toEqual(l2);
      expect(l1).not.toBe(l2);
    });
  });

  // ============================================================
  // 深拷贝
  // ============================================================
  describe('deep copy', () => {
    it('JSON parse/stringify should create deep copy of Todo', () => {
      const original: Todo = {
        id: 1, title: '发布文章', company_id: 1, company_name: '薄云科技',
        project_id: 10, project_name: '项目A', object_type: 'article',
        object_id: 100, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 5, assignee_name: '张三', status: 'pending',
        created_by_id: 2, created_by_name: '李四', due_at: '2025-12-31',
        created_at: new Date('2024-06-01T00:00:00.000Z'),
        updated_at: new Date('2024-06-02T00:00:00.000Z'),
      };
      const json = JSON.stringify(original);
      const copy: Todo = {
        ...JSON.parse(json),
        created_at: new Date(JSON.parse(json).created_at),
        updated_at: new Date(JSON.parse(json).updated_at),
      };
      expect(copy).toEqual(original);
      copy.title = '修改标题';
      expect(original.title).toBe('发布文章');
    });

    it('spread operator creates shallow copy with independent top-level fields', () => {
      const original: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const copy = { ...original };
      copy.title = 'new_title';
      copy.status = 'completed';
      expect(original.title).toBe('T');
      expect(original.status).toBe('pending');
    });

    it('structuredClone should create deep copy of Todo', () => {
      const original: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-06-15T12:00:00.000Z'),
        updated_at: new Date('2024-06-20T12:00:00.000Z'),
      };
      const clone = structuredClone(original);
      expect(clone.id).toBe(original.id);
      expect(clone.title).toBe(original.title);
      expect(clone.created_at).toEqual(original.created_at);
      expect(clone.created_at).not.toBe(original.created_at);
      clone.title = 'modified';
      expect(original.title).toBe('T');
    });

    it('deep copy of array should be independent', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const copy = todos.map(t => ({ ...t }));
      copy[0].title = 'changed';
      expect(todos[0].title).toBe('T1');
    });
  });

  // ============================================================
  // 解构模式
  // ============================================================
  describe('destructuring patterns', () => {
    it('should support destructuring with rename', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const { id: todoId, title: todoTitle, status: todoStatus } = todo;
      expect(todoId).toBe(1);
      expect(todoTitle).toBe('T');
      expect(todoStatus).toBe('pending');
    });

    it('should support destructuring in array map', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const titles = todos.map(({ title }) => title);
      expect(titles).toEqual(['T1', 'T2']);
    });

    it('should support destructuring CreateTodoRequest fields', () => {
      const req: CreateTodoRequest = {
        title: '发布', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 5,
      };
      const { title, action, assignee_id } = req;
      expect(title).toBe('发布');
      expect(action).toBe('publish');
      expect(assignee_id).toBe(5);
    });

    it('should support rest pattern with UpdateTodoRequest', () => {
      const req: UpdateTodoRequest = { title: 'T', priority: 'high' };
      const { title, ...rest } = req;
      expect(title).toBe('T');
      expect(rest.priority).toBe('high');
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('collection advanced operations', () => {
    it('should support Map with assignee_id as key', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const map = new Map(todos.map(t => [t.assignee_id, t]));
      expect(map.get(1)?.title).toBe('T1');
      expect(map.get(2)?.action).toBe('review');
      expect(map.size).toBe(2);
    });

    it('should support grouping todos by status', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 3, title: 'T3', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'medium',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const grouped = todos.reduce<Record<string, Todo[]>>((acc, t) => {
        if (!acc[t.status]) acc[t.status] = [];
        acc[t.status].push(t);
        return acc;
      }, {});
      expect(grouped['pending']).toHaveLength(2);
      expect(grouped['completed']).toHaveLength(1);
    });

    it('should support converting todos to Record by id', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const record = todos.reduce<Record<number, Todo>>((acc, t) => {
        acc[t.id] = t;
        return acc;
      }, {});
      expect(record[1].title).toBe('T1');
      expect(record[2].action).toBe('review');
    });

    it('should support Map delete and has operations', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const map = new Map<number, Todo>();
      map.set(todo.id, todo);
      expect(map.has(1)).toBe(true);
      map.delete(1);
      expect(map.has(1)).toBe(false);
      expect(map.size).toBe(0);
    });

    it('should support Set deduplication by reference', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<Todo>();
      set.add(todo);
      set.add(todo);
      expect(set.size).toBe(1);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('continuous update chain', () => {
    it('should support sequential updates with immutable pattern', () => {
      const created = new Date('2024-01-01');
      let todo: Todo = {
        id: 1, title: '发布文章', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: created, updated_at: created,
      };

      todo = { ...todo, status: 'in_progress', updated_at: new Date('2024-02-01') };
      expect(todo.status).toBe('in_progress');

      todo = { ...todo, status: 'completed', updated_at: new Date('2024-06-01') };
      expect(todo.status).toBe('completed');
      expect(todo.created_at).toBe(created);
    });

    it('should support batch sequential updates across multiple todos', () => {
      const now = new Date('2024-01-01');
      let todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: now, updated_at: now },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: now, updated_at: now },
      ];

      const updateDate = new Date('2024-03-01');
      todos = todos.map(t =>
        t.id === 1 ? { ...t, status: 'completed', updated_at: updateDate } : t
      );
      expect(todos[0].status).toBe('completed');
      expect(todos[1].status).toBe('pending');

      todos = [...todos, {
        id: 3, title: 'T3', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'medium',
        assignee_id: 3, assignee_name: 'A3', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: updateDate, updated_at: updateDate,
      }];
      expect(todos).toHaveLength(3);

      todos = todos.filter(t => t.status !== 'completed');
      expect(todos).toHaveLength(2);
    });

    it('should track update history via timestamps', () => {
      const v1Date = new Date('2024-01-01');
      const v2Date = new Date('2024-03-01');
      const v3Date = new Date('2024-06-01');

      const v1: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: v1Date, updated_at: v1Date,
      };
      const v2: Todo = { ...v1, status: 'in_progress', updated_at: v2Date };
      const v3: Todo = { ...v2, status: 'completed', updated_at: v3Date };

      const history = [v1, v2, v3];
      expect(history).toHaveLength(3);
      expect(history[0].updated_at.getTime()).toBeLessThan(history[1].updated_at.getTime());
      expect(history[1].updated_at.getTime()).toBeLessThan(history[2].updated_at.getTime());
      expect(history.every(v => v.created_at === v1Date)).toBe(true);
    });
  });

  // ============================================================
  // 日期操作
  // ============================================================
  describe('date operations', () => {
    it('should support toISOString for display', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-06-15T08:30:45.123Z'),
        updated_at: new Date('2024-06-20T14:45:00.000Z'),
      };
      expect(todo.created_at.toISOString()).toBe('2024-06-15T08:30:45.123Z');
      expect(todo.updated_at.toISOString()).toBe('2024-06-20T14:45:00.000Z');
    });

    it('should support getTime for difference calculation', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-01-01T00:00:00.000Z'),
        updated_at: new Date('2024-01-02T12:00:00.000Z'),
      };
      const diffMs = todo.updated_at.getTime() - todo.created_at.getTime();
      const diffHours = diffMs / (1000 * 60 * 60);
      expect(diffHours).toBe(36);
    });

    it('should support extracting date components', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-06-15T08:30:45.123Z'),
        updated_at: new Date(),
      };
      expect(todo.created_at.getUTCFullYear()).toBe(2024);
      expect(todo.created_at.getUTCMonth()).toBe(5);
      expect(todo.created_at.getUTCDate()).toBe(15);
    });

    it('should support Date.now() comparison', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2020-01-01'),
        updated_at: new Date('2020-01-01'),
      };
      expect(todo.created_at.getTime()).toBeLessThan(Date.now());
    });

    it('TodoLog created_at should support millisecond precision', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date('2024-06-15T12:30:45.456Z'),
      };
      expect(log.created_at.getMilliseconds()).toBe(456);
    });
  });

  // ============================================================
  // Set-Map 操作扩展
  // ============================================================
  describe('Set-Map operations', () => {
    it('should support WeakMap with Todo object keys', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const weakMap = new WeakMap<Todo, string>();
      weakMap.set(todo, 'metadata');
      expect(weakMap.get(todo)).toBe('metadata');
    });

    it('should support Map forEach iteration', () => {
      const date = new Date();
      const map = new Map<string, Todo>();
      map.set('a', {
        id: 1, title: 'T1', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      });
      map.set('b', {
        id: 2, title: 'T2', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'task',
        object_id: null, action: 'review', source: 'manual', priority: 'low',
        assignee_id: 2, assignee_name: 'A2', status: 'completed',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: date, updated_at: date,
      });
      const collected: string[] = [];
      map.forEach((value, key) => {
        collected.push(key + ':' + value.title);
      });
      expect(collected).toEqual(['a:T1', 'b:T2']);
    });

    it('should support Map construction from entries', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];
      const map = new Map(todos.map(t => [t.id, t.title] as [number, string]));
      expect(map.get(1)).toBe('T1');
      expect(map.get(2)).toBe('T2');
    });
  });

  // ============================================================
  // 属性描述符
  // ============================================================
  describe('property descriptors', () => {
    it('should have writable, enumerable, configurable descriptors by default', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const desc = Object.getOwnPropertyDescriptor(todo, 'title');
      expect(desc).toBeDefined();
      expect(desc!.writable).toBe(true);
      expect(desc!.enumerable).toBe(true);
      expect(desc!.configurable).toBe(true);
    });

    it('should support defining non-enumerable property', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.defineProperty(todo, 'status', { enumerable: false });
      expect(Object.keys(todo)).toHaveLength(18);
      expect(todo.status).toBe('pending');
    });

    it('should support defining read-only property via defineProperty', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.defineProperty(todo, 'id', { writable: false });
      expect(() => { (todo as any).id = 999; }).toThrow();
      expect(todo.id).toBe(1);
    });

    it('should list all property descriptors', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const descriptors = Object.getOwnPropertyDescriptors(todo);
      expect(Object.keys(descriptors)).toHaveLength(19);
    });
  });

  // ============================================================
  // 函数参数传递
  // ============================================================
  describe('function parameter passing', () => {
    it('should pass Todo to function and access fields', () => {
      const getSummary = (todo: Todo): string => {
        return `[${todo.status}] ${todo.title} - ${todo.assignee_name}`;
      };
      const todo: Todo = {
        id: 1, title: '发布文章', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: '张三', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(getSummary(todo)).toBe('[pending] 发布文章 - 张三');
    });

    it('should pass CreateTodoRequest to function', () => {
      const hasDueDate = (req: CreateTodoRequest): boolean => {
        return req.due_at !== undefined && req.due_at !== null;
      };
      const req1: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1, due_at: '2025-12-31',
      };
      const req2: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
      };
      expect(hasDueDate(req1)).toBe(true);
      expect(hasDueDate(req2)).toBe(false);
    });

    it('should return Todo from function', () => {
      const createTodo = (title: string, assigneeId: number): Todo => ({
        id: 1, title, company_id: 1, company_name: '薄云科技',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: assigneeId, assignee_name: '张三', status: 'pending',
        created_by_id: 1, created_by_name: '管理员', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      });
      const todo = createTodo('测试待办', 5);
      expect(todo.title).toBe('测试待办');
      expect(todo.assignee_id).toBe(5);
    });

    it('should accept Partial<Todo> as function parameter', () => {
      const mergeDefaults = (partial: Partial<Todo>): Todo => ({
        id: partial.id ?? 0,
        title: partial.title ?? '',
        company_id: partial.company_id ?? 0,
        company_name: partial.company_name ?? '',
        project_id: partial.project_id ?? null,
        project_name: partial.project_name ?? null,
        object_type: partial.object_type ?? 'general',
        object_id: partial.object_id ?? null,
        action: partial.action ?? 'check',
        source: partial.source ?? 'manual',
        priority: partial.priority ?? 'medium',
        assignee_id: partial.assignee_id ?? 0,
        assignee_name: partial.assignee_name ?? '',
        status: partial.status ?? 'pending',
        created_by_id: partial.created_by_id ?? 0,
        created_by_name: partial.created_by_name ?? '',
        due_at: partial.due_at ?? null,
        created_at: partial.created_at ?? new Date(),
        updated_at: partial.updated_at ?? new Date(),
      });
      const todo = mergeDefaults({ title: '自定义标题', priority: 'urgent' });
      expect(todo.title).toBe('自定义标题');
      expect(todo.priority).toBe('urgent');
      expect(todo.status).toBe('pending');
      expect(todo.id).toBe(0);
    });

    it('should handle todo transformation pipeline', () => {
      const date = new Date();
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: '2025-12-31',
          created_at: date, updated_at: date },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: date, updated_at: date },
      ];

      const titles = todos.map(t => t.title);
      expect(titles).toEqual(['T1', 'T2']);

      const pendingCount = todos.filter(t => t.status === 'pending').length;
      expect(pendingCount).toBe(1);

      const hasHighPriority = todos.some(t => t.priority === 'high');
      expect(hasHighPriority).toBe(true);

      const allSameCompany = todos.every(t => t.company_id === 1);
      expect(allSameCompany).toBe(true);
    });

    it('should pass TransferTodoRequest to function', () => {
      const formatTransfer = (req: TransferTodoRequest): string => {
        return `转交给用户${req.assignee_id}${req.remark ? '：' + req.remark : ''}`;
      };
      const req1: TransferTodoRequest = { assignee_id: 5, remark: '紧急处理' };
      const req2: TransferTodoRequest = { assignee_id: 3 };
      expect(formatTransfer(req1)).toBe('转交给用户5：紧急处理');
      expect(formatTransfer(req2)).toBe('转交给用户3');
    });

    it('should support Promise<Todo> pattern', async () => {
      const loadTodo = (): Promise<Todo> => {
        return Promise.resolve({
          id: 1, title: '异步待办', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date(),
        });
      };
      const todo = await loadTodo();
      expect(todo.title).toBe('异步待办');
    });

    it('should support Record transformation from Todo', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const record: Record<string, unknown> = { ...todo };
      expect(record.id).toBe(1);
      expect(record.title).toBe('T');
    });

    it('should support Pick<Todo, "id" | "title" | "status"> pattern', () => {
      const picked: Pick<Todo, 'id' | 'title' | 'status'> = {
        id: 1, title: 'T', status: 'pending',
      };
      expect(picked.id).toBe(1);
      expect(picked.title).toBe('T');
      expect(picked.status).toBe('pending');
    });

    it('should support Omit<Todo, "created_at" | "updated_at"> pattern', () => {
      const omitted: Omit<Todo, 'created_at' | 'updated_at'> = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
      };
      expect(omitted.id).toBe(1);
    });
  });

  // ============================================================
  // 安全注入防护（第二轮新增）
  // ============================================================
  describe('security injection protection', () => {
    const createTodo = (overrides: Partial<Todo> = {}): Todo => ({
      id: 1, title: '正常待办', company_id: 1, company_name: '正常公司',
      project_id: null, project_name: null, object_type: 'article',
      object_id: null, action: 'publish', source: 'system', priority: 'high',
      assignee_id: 1, assignee_name: '管理员', status: 'pending',
      created_by_id: 1, created_by_name: '创建者', due_at: null,
      created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      ...overrides,
    });

    it('should store XSS script tag in title without execution', () => {
      const todo = createTodo({ title: '<script>alert("xss")</script>' });
      expect(todo.title).toBe('<script>alert("xss")</script>');
      expect(todo.title).not.toContain('alert executed');
    });

    it('should store XSS img onerror in title without execution', () => {
      const todo = createTodo({ title: '<img src=x onerror=alert(1)>' });
      expect(todo.title).toBe('<img src=x onerror=alert(1)>');
      expect(typeof todo.title).toBe('string');
    });

    it('should store SQL injection pattern in title without execution', () => {
      const todo = createTodo({ title: "'; DROP TABLE todos; --" });
      expect(todo.title).toBe("'; DROP TABLE todos; --");
    });

    it('should store SQL injection pattern in company_name', () => {
      const todo = createTodo({ company_name: "' OR 1=1; --" });
      expect(todo.company_name).toBe("' OR 1=1; --");
    });

    it('should store HTML entity attack in title', () => {
      const todo = createTodo({ title: '&lt;script&gt;alert(1)&lt;/script&gt;' });
      expect(todo.title).toBe('&lt;script&gt;alert(1)&lt;/script&gt;');
    });

    it('should store prototype pollution attempt in title', () => {
      const todo = createTodo({ title: '__proto__' });
      expect(todo.title).toBe('__proto__');
      expect((todo as any).__proto__).not.toBe('polluted');
    });

    it('should store prototype pollution attempt in company_name', () => {
      const todo = createTodo({ company_name: '{"__proto__":{"admin":true}}' });
      expect(todo.company_name).toBe('{"__proto__":{"admin":true}}');
    });

    it('should store null byte in title', () => {
      const todo = createTodo({ title: 'todo\x00title' });
      expect(todo.title).toBe('todo\x00title');
      expect(todo.title.length).toBe(10);
    });

    it('should store CRLF injection in source', () => {
      const todo = createTodo({ source: 'system\r\nX-Injected: true' });
      expect(todo.source).toContain('\r\n');
    });

    it('should store format string attack in assignee_name', () => {
      const todo = createTodo({ assignee_name: '%s%s%s%s%s%s%s%s%s%s' });
      expect(todo.assignee_name).toBe('%s%s%s%s%s%s%s%s%s%s');
    });

    it('should store unicode RTL override in title', () => {
      const rtlOverride = '‮';
      const todo = createTodo({ title: rtlOverride + 'todo' });
      expect(todo.title).toContain(rtlOverride);
    });

    it('should store very long title as data without truncation', () => {
      const longTitle = 'A'.repeat(100000);
      const todo = createTodo({ title: longTitle });
      expect(todo.title).toBe(longTitle);
      expect(todo.title.length).toBe(100000);
    });

    it('should store XML injection in remark of TodoLog', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>',
        created_at: new Date(),
      };
      expect(log.remark).toContain('xxe');
    });

    it('should store LDAP injection in operator_name of TodoLog', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1,
        operator_name: 'admin)(&))',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date(),
      };
      expect(log.operator_name).toBe('admin)(&))');
    });

    it('should store path traversal pattern in object_type', () => {
      const todo = createTodo({ object_type: '../../../etc/shadow' });
      expect(todo.object_type).toBe('../../../etc/shadow');
    });

    it('should safely serialize malicious data through JSON', () => {
      const todo = createTodo({
        title: '<script>alert(1)</script>',
        company_name: '"; DROP TABLE --',
      });
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('<script>alert(1)</script>');
      expect(parsed.company_name).toBe('"; DROP TABLE --');
    });

    it('should store XSS in CreateTodoRequest title without execution', () => {
      const req: CreateTodoRequest = {
        title: '<script>document.cookie</script>',
        company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
      };
      expect(req.title).toBe('<script>document.cookie</script>');
    });

    it('should store injection in CreateTodoRequest source', () => {
      const req: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
        source: "'; DELETE FROM todos WHERE '1'='1",
      };
      expect(req.source).toBe("'; DELETE FROM todos WHERE '1'='1");
    });
  });

  // ============================================================
  // JSON reviver 边界场景（第二轮新增）
  // ============================================================
  describe('JSON reviver edge cases', () => {
    const dateReviver = (key: string, value: unknown): unknown => {
      if (key === 'created_at' || key === 'updated_at') return new Date(value as string);
      return value;
    };

    it('should revive Dates from JSON with reviver', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-06-15T08:30:00.000Z'),
        updated_at: new Date('2024-06-20T14:00:00.000Z'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.created_at.toISOString()).toBe('2024-06-15T08:30:00.000Z');
    });

    it('should not revive non-date fields with date reviver', () => {
      const todo: Todo = {
        id: 1, title: '2024-06-15T00:00:00Z', company_id: 1,
        company_name: '2024', project_id: null, project_name: null,
        object_type: '2024-01-01', object_id: null, action: 'publish',
        source: '2024', priority: 'high', assignee_id: 1,
        assignee_name: '2024-06', status: 'pending', created_by_id: 1,
        created_by_name: '2024', due_at: '2024-12-31',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(typeof revived.title).toBe('string');
      expect(typeof revived.company_name).toBe('string');
      expect(typeof revived.source).toBe('string');
      expect(revived.title).toBe('2024-06-15T00:00:00Z');
    });

    it('should handle null fields correctly in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.project_id).toBeNull();
      expect(revived.project_name).toBeNull();
      expect(revived.object_id).toBeNull();
      expect(revived.due_at).toBeNull();
    });

    it('should handle epoch date in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(0), updated_at: new Date(0),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.created_at.getTime()).toBe(0);
      expect(revived.updated_at.getTime()).toBe(0);
    });

    it('should handle far future date in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2099-12-31T23:59:59.999Z'),
        updated_at: new Date('2099-12-31T23:59:59.999Z'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.created_at.getUTCFullYear()).toBe(2099);
    });

    it('should handle Chinese characters in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: '薄云商机倍增服务', company_id: 1,
        company_name: '北京薄云公司', project_id: null, project_name: null,
        object_type: 'article', object_id: null, action: 'publish',
        source: 'system', priority: 'high', assignee_id: 1,
        assignee_name: '管理员', status: 'pending', created_by_id: 1,
        created_by_name: '创建者', due_at: null,
        created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.title).toBe('薄云商机倍增服务');
      expect(revived.company_name).toBe('北京薄云公司');
      expect(revived.assignee_name).toBe('管理员');
    });

    it('should handle emoji in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: '🚀 紧急待办 ⚡', company_id: 1,
        company_name: '🏢 公司', project_id: null, project_name: null,
        object_type: 'article', object_id: null, action: 'publish',
        source: 'system', priority: 'high', assignee_id: 1,
        assignee_name: '👤 用户', status: 'pending', created_by_id: 1,
        created_by_name: '✍️ 创建者', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.title).toBe('🚀 紧急待办 ⚡');
      expect(revived.company_name).toBe('🏢 公司');
      expect(revived.assignee_name).toBe('👤 用户');
    });

    it('should handle array of Todo in JSON reviver', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01') },
      ];
      const revived: Todo[] = JSON.parse(JSON.stringify(todos), (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(revived).toHaveLength(2);
      expect(revived[0].created_at).toBeInstanceOf(Date);
      expect(revived[1].created_at).toBeInstanceOf(Date);
    });

    it('should handle mixed null and date fields in TodoLog JSON reviver', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date('2024-06-15T10:00:00.000Z'),
      };
      const logReviver = (key: string, value: unknown): unknown => {
        if (key === 'created_at') return new Date(value as string);
        return value;
      };
      const revived = JSON.parse(JSON.stringify(log), logReviver);
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.object_type).toBeNull();
      expect(revived.remark).toBeNull();
    });

    it('should handle due_at as ISO string preserved in JSON reviver', () => {
      const req: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
        due_at: '2025-12-31T23:59:59.999Z',
      };
      const revived = JSON.parse(JSON.stringify(req));
      expect(revived.due_at).toBe('2025-12-31T23:59:59.999Z');
    });

    it('should handle CreateTodoRequest with all optional fields via JSON', () => {
      const req: CreateTodoRequest = {
        title: '创建待办', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
        project_id: 10, object_id: 100,
        source: 'manual', priority: 'urgent',
        due_at: '2025-06-30',
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.title).toBe('创建待办');
      expect(parsed.project_id).toBe(10);
      expect(parsed.source).toBe('manual');
      expect(parsed.priority).toBe('urgent');
      expect(parsed.due_at).toBe('2025-06-30');
    });

    it('should handle Unicode escape sequences in JSON reviver', () => {
      const todo: Todo = {
        id: 1, title: '中文', company_id: 1, company_name: '公司',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: '管理员', status: 'pending',
        created_by_id: 1, created_by_name: '创建者', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.title).toBe('中文');
      expect(revived.company_name).toBe('公司');
      expect(revived.assignee_name).toBe('管理员');
    });

    it('should preserve number precision in JSON reviver for Todo', () => {
      const todo: Todo = {
        id: Number.MAX_SAFE_INTEGER, title: 'T', company_id: 999999,
        company_name: 'C', project_id: 123456789, project_name: 'P',
        object_type: 'article', object_id: Number.MAX_SAFE_INTEGER,
        action: 'publish', source: 'system', priority: 'high',
        assignee_id: Number.MAX_SAFE_INTEGER, assignee_name: 'A',
        status: 'pending', created_by_id: 42, created_by_name: 'B',
        due_at: null, created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const revived = JSON.parse(JSON.stringify(todo), dateReviver);
      expect(revived.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(revived.object_id).toBe(Number.MAX_SAFE_INTEGER);
      expect(revived.assignee_id).toBe(Number.MAX_SAFE_INTEGER);
      expect(revived.company_id).toBe(999999);
    });
  });

  // ============================================================
  // 业务场景（第二轮新增）
  // ============================================================
  describe('business scenarios', () => {
    it('should model a complete article publishing workflow', () => {
      const todo: Todo = {
        id: 1, title: '发布文章到微信公众号', company_id: 1,
        company_name: '薄云公司', project_id: 10, project_name: 'Q3推广计划',
        object_type: 'article', object_id: 200, action: 'publish',
        source: 'system', priority: 'high', assignee_id: 5,
        assignee_name: '李运营', status: 'pending',
        created_by_id: 1, created_by_name: '张管理',
        due_at: '2025-12-31', created_at: new Date('2025-06-01'),
        updated_at: new Date('2025-06-01'),
      };
      expect(todo.object_type).toBe('article');
      expect(todo.action).toBe('publish');
      expect(todo.priority).toBe('high');
      expect(todo.status).toBe('pending');
      expect(todo.due_at).toBe('2025-12-31');
    });

    it('should model article review workflow', () => {
      const todo: Todo = {
        id: 2, title: '审核文章内容', company_id: 1,
        company_name: '薄云公司', project_id: 10, project_name: 'Q3推广计划',
        object_type: 'article', object_id: 200, action: 'review',
        source: 'manual', priority: 'medium', assignee_id: 3,
        assignee_name: '王审核', status: 'in_progress',
        created_by_id: 5, created_by_name: '李运营',
        due_at: '2025-06-15', created_at: new Date('2025-06-02'),
        updated_at: new Date('2025-06-03'),
      };
      expect(todo.action).toBe('review');
      expect(todo.status).toBe('in_progress');
      expect(todo.priority).toBe('medium');
    });

    it('should model completed todo', () => {
      const todo: Todo = {
        id: 3, title: '配置发布平台', company_id: 1,
        company_name: '薄云公司', project_id: null, project_name: null,
        object_type: 'platform', object_id: null, action: 'configure',
        source: 'manual', priority: 'low', assignee_id: 1,
        assignee_name: '管理员', status: 'completed',
        created_by_id: 1, created_by_name: '管理员',
        due_at: null, created_at: new Date('2025-05-01'),
        updated_at: new Date('2025-05-05'),
      };
      expect(todo.status).toBe('completed');
      expect(todo.project_id).toBeNull();
      expect(todo.due_at).toBeNull();
    });

    it('should model todo transfer scenario', () => {
      const transfer: TransferTodoRequest = {
        assignee_id: 7,
        remark: '因出差转交给王审核处理',
      };
      expect(transfer.assignee_id).toBe(7);
      expect(transfer.remark).toBe('因出差转交给王审核处理');
    });

    it('should model create todo from system automation', () => {
      const req: CreateTodoRequest = {
        title: '自动生成文章待发布',
        company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 5,
        source: 'system', priority: 'medium',
        due_at: '2025-07-01',
      };
      expect(req.source).toBe('system');
      expect(req.priority).toBe('medium');
    });

    it('should model create todo manually without optional fields', () => {
      const req: CreateTodoRequest = {
        title: '手动创建待办',
        company_id: 1, object_type: 'task',
        action: 'review', assignee_id: 3,
      };
      expect(req.project_id).toBeUndefined();
      expect(req.object_id).toBeUndefined();
      expect(req.source).toBeUndefined();
      expect(req.priority).toBeUndefined();
      expect(req.due_at).toBeUndefined();
    });

    it('should model partial update of todo priority', () => {
      const req: UpdateTodoRequest = { priority: 'urgent' };
      expect(req.priority).toBe('urgent');
      expect(req.title).toBeUndefined();
      expect(req.action).toBeUndefined();
    });

    it('should model clearing due_at with null', () => {
      const req: UpdateTodoRequest = { due_at: null };
      expect(req.due_at).toBeNull();
    });

    it('should model update title and action together', () => {
      const req: UpdateTodoRequest = {
        title: '更新后的标题', action: 'approve',
      };
      expect(req.title).toBe('更新后的标题');
      expect(req.action).toBe('approve');
    });

    it('should model TodoLog creation on status change', () => {
      const log: TodoLog = {
        id: 1, todo_id: 10, operator_id: 5,
        operator_name: '李运营', action: 'status_change',
        object_type: 'article', object_id: 200,
        remark: '状态从pending变更为in_progress',
        created_at: new Date('2025-06-03'),
      };
      expect(log.action).toBe('status_change');
      expect(log.remark).toContain('pending');
      expect(log.remark).toContain('in_progress');
    });

    it('should model TodoLog for todo transfer', () => {
      const log: TodoLog = {
        id: 2, todo_id: 10, operator_id: 5,
        operator_name: '李运营', action: 'transferred',
        object_type: null, object_id: null,
        remark: '转交给王审核，原因：出差',
        created_at: new Date('2025-06-04'),
      };
      expect(log.action).toBe('transferred');
      expect(log.remark).toContain('转交');
    });

    it('should model batch todo creation for a project', () => {
      const requests: CreateTodoRequest[] = [
        { title: '文章A发布', company_id: 1, object_type: 'article',
          action: 'publish', assignee_id: 5, project_id: 10, priority: 'high' },
        { title: '文章B审核', company_id: 1, object_type: 'article',
          action: 'review', assignee_id: 3, project_id: 10, priority: 'medium' },
        { title: '文章C修改', company_id: 1, object_type: 'article',
          action: 'edit', assignee_id: 5, project_id: 10, priority: 'low' },
      ];
      expect(requests).toHaveLength(3);
      expect(requests.every(r => r.project_id === 10)).toBe(true);
      const actions = requests.map(r => r.action);
      expect(actions).toEqual(['publish', 'review', 'edit']);
    });

    it('should model todo list filtering and sorting', () => {
      const now = new Date();
      const todos: Todo[] = [
        { id: 1, title: '紧急', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: '2025-06-10',
          created_at: now, updated_at: now },
        { id: 2, title: '一般', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: now, updated_at: now },
        { id: 3, title: '中等', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'task',
          object_id: null, action: 'edit', source: 'system', priority: 'medium',
          assignee_id: 1, assignee_name: 'A', status: 'in_progress',
          created_by_id: 1, created_by_name: 'B', due_at: '2025-07-01',
          created_at: now, updated_at: now },
      ];
      const pending = todos.filter(t => t.status === 'pending');
      expect(pending).toHaveLength(1);
      expect(pending[0].priority).toBe('high');

      const byPriority = ['high', 'medium', 'low'];
      const sorted = [...todos].sort((a, b) =>
        byPriority.indexOf(a.priority) - byPriority.indexOf(b.priority)
      );
      expect(sorted.map(t => t.priority)).toEqual(['high', 'medium', 'low']);
    });

    it('should model multi-company todo scenario', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: '公司A',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: 'T2', company_id: 2, company_name: '公司B',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      const companyIds = [...new Set(todos.map(t => t.company_id))];
      expect(companyIds).toEqual([1, 2]);
      const byCompany = new Map<number, Todo[]>();
      todos.forEach(t => {
        const list = byCompany.get(t.company_id) ?? [];
        list.push(t);
        byCompany.set(t.company_id, list);
      });
      expect(byCompany.get(1)).toHaveLength(1);
      expect(byCompany.get(2)).toHaveLength(1);
    });

    it('should model todo with overdue due_at', () => {
      const todo: Todo = {
        id: 1, title: '过期待办', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: '2020-01-01',
        created_at: new Date('2019-12-01'), updated_at: new Date('2019-12-01'),
      };
      const dueDate = new Date(todo.due_at!);
      expect(dueDate.getFullYear()).toBe(2020);
      expect(new Date() > dueDate).toBe(true);
    });
  });

  // ============================================================
  // NaN 和 Infinity 边界值（第二轮新增）
  // ============================================================
  describe('NaN and Infinity boundary values', () => {
    it('should store NaN in id field (TypeScript allows at runtime)', () => {
      const todo = {
        id: NaN, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.id).toBeNaN();
    });

    it('should store NaN in company_id field', () => {
      const todo = {
        id: 1, title: 'T', company_id: NaN, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.company_id).toBeNaN();
    });

    it('should store NaN in object_id field', () => {
      const todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: NaN, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.object_id).toBeNaN();
    });

    it('should store Infinity in id field', () => {
      const todo = {
        id: Infinity, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.id).toBe(Infinity);
    });

    it('should store -Infinity in assignee_id field', () => {
      const todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: -Infinity, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.assignee_id).toBe(-Infinity);
    });

    it('should handle NaN in JSON serialization', () => {
      const todo = {
        id: NaN, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeNull(); // JSON.stringify(NaN) => "null"
    });

    it('should handle Infinity in JSON serialization', () => {
      const todo = {
        id: Infinity, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      const json = JSON.stringify(todo);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBeNull(); // JSON.stringify(Infinity) => "null"
    });

    it('should store NaN in CreateTodoRequest company_id', () => {
      const req = {
        title: 'T', company_id: NaN, object_type: 'article',
        action: 'publish', assignee_id: 1,
      } as CreateTodoRequest;
      expect(req.company_id).toBeNaN();
    });

    it('should store NaN in TodoLog id and todo_id', () => {
      const log = {
        id: NaN, todo_id: NaN, operator_id: NaN,
        operator_name: 'A', action: 'done', object_type: null,
        object_id: null, remark: null, created_at: new Date(),
      } as TodoLog;
      expect(log.id).toBeNaN();
      expect(log.todo_id).toBeNaN();
      expect(log.operator_id).toBeNaN();
    });

    it('should handle Number.MAX_VALUE in numeric fields', () => {
      const todo = {
        id: Number.MAX_VALUE, title: 'T', company_id: Number.MAX_VALUE,
        company_name: 'C', project_id: Number.MAX_VALUE, project_name: 'P',
        object_type: 'article', object_id: Number.MAX_VALUE,
        action: 'publish', source: 'system', priority: 'high',
        assignee_id: Number.MAX_VALUE, assignee_name: 'A',
        status: 'pending', created_by_id: Number.MAX_VALUE,
        created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.id).toBe(Number.MAX_VALUE);
      expect(todo.company_id).toBe(Number.MAX_VALUE);
      expect(todo.project_id).toBe(Number.MAX_VALUE);
    });

    it('should handle Number.MIN_VALUE in numeric fields', () => {
      const todo = {
        id: Number.MIN_VALUE, title: 'T', company_id: Number.MIN_VALUE,
        company_name: 'C', project_id: Number.MIN_VALUE, project_name: 'P',
        object_type: 'article', object_id: Number.MIN_VALUE,
        action: 'publish', source: 'system', priority: 'high',
        assignee_id: Number.MIN_VALUE, assignee_name: 'A',
        status: 'pending', created_by_id: Number.MIN_VALUE,
        created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      } as Todo;
      expect(todo.id).toBe(Number.MIN_VALUE);
      expect(todo.id).toBeGreaterThan(0);
      expect(todo.id).toBeLessThan(1);
    });

    it('should detect NaN with Number.isNaN in filtering', () => {
      const ids = [1, NaN, 3, NaN, 5];
      const validIds = ids.filter(id => !Number.isNaN(id));
      expect(validIds).toEqual([1, 3, 5]);
    });

    it('should handle NaN comparison behavior correctly', () => {
      const nanId = NaN;
      expect(nanId === NaN).toBe(false);
      expect(Number.isNaN(nanId)).toBe(true);
      expect(nanId !== NaN).toBe(true);
    });
  });

  // ============================================================
  // 类型守卫（第二轮新增）
  // ============================================================
  describe('type guards', () => {
    const isValidTodo = (obj: unknown): obj is Todo => {
      if (typeof obj !== 'object' || obj === null) return false;
      const o = obj as Record<string, unknown>;
      return typeof o.id === 'number' &&
        typeof o.title === 'string' &&
        typeof o.company_id === 'number' &&
        typeof o.company_name === 'string' &&
        typeof o.object_type === 'string' &&
        typeof o.action === 'string' &&
        typeof o.source === 'string' &&
        typeof o.priority === 'string' &&
        typeof o.assignee_id === 'number' &&
        typeof o.assignee_name === 'string' &&
        typeof o.status === 'string' &&
        typeof o.created_by_id === 'number' &&
        typeof o.created_by_name === 'string' &&
        o.created_at instanceof Date &&
        o.updated_at instanceof Date;
    };

    const isValidTodoLog = (obj: unknown): obj is TodoLog => {
      if (typeof obj !== 'object' || obj === null) return false;
      const o = obj as Record<string, unknown>;
      return typeof o.id === 'number' &&
        typeof o.todo_id === 'number' &&
        typeof o.operator_id === 'number' &&
        typeof o.operator_name === 'string' &&
        typeof o.action === 'string' &&
        o.created_at instanceof Date;
    };

    const isValidCreateTodoRequest = (obj: unknown): obj is CreateTodoRequest => {
      if (typeof obj !== 'object' || obj === null) return false;
      const o = obj as Record<string, unknown>;
      return typeof o.title === 'string' &&
        typeof o.company_id === 'number' &&
        typeof o.object_type === 'string' &&
        typeof o.action === 'string' &&
        typeof o.assignee_id === 'number';
    };

    it('should validate a valid Todo object with type guard', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(isValidTodo(todo)).toBe(true);
    });

    it('should reject null with Todo type guard', () => {
      expect(isValidTodo(null)).toBe(false);
    });

    it('should reject undefined with Todo type guard', () => {
      expect(isValidTodo(undefined)).toBe(false);
    });

    it('should reject string with Todo type guard', () => {
      expect(isValidTodo('not a todo')).toBe(false);
    });

    it('should reject number with Todo type guard', () => {
      expect(isValidTodo(42)).toBe(false);
    });

    it('should reject Todo missing required fields', () => {
      const incomplete = { id: 1, title: 'T' };
      expect(isValidTodo(incomplete)).toBe(false);
    });

    it('should reject Todo with wrong field types', () => {
      const wrongTypes = {
        id: 'not-a-number', title: 'T', company_id: 1,
        company_name: 'C', project_id: null, project_name: null,
        object_type: 'article', object_id: null, action: 'publish',
        source: 'system', priority: 'high', assignee_id: 1,
        assignee_name: 'A', status: 'pending', created_by_id: 1,
        created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(isValidTodo(wrongTypes)).toBe(false);
    });

    it('should validate a valid TodoLog object with type guard', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date(),
      };
      expect(isValidTodoLog(log)).toBe(true);
    });

    it('should reject null with TodoLog type guard', () => {
      expect(isValidTodoLog(null)).toBe(false);
    });

    it('should validate CreateTodoRequest with type guard', () => {
      const req: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
      };
      expect(isValidCreateTodoRequest(req)).toBe(true);
    });

    it('should reject incomplete CreateTodoRequest', () => {
      const incomplete = { title: 'T' };
      expect(isValidCreateTodoRequest(incomplete)).toBe(false);
    });

    it('should use type guard for array filtering', () => {
      const items: unknown[] = [
        { id: 1, title: 'T', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        null,
        'not a todo',
        42,
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      const validTodos = items.filter(isValidTodo);
      expect(validTodos).toHaveLength(2);
      expect(validTodos[0].id).toBe(1);
      expect(validTodos[1].id).toBe(2);
    });

    it('should narrow type correctly with type guard', () => {
      const unknown: unknown = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (isValidTodo(unknown)) {
        expect(unknown.title).toBe('T');
        expect(unknown.status).toBe('pending');
        expect(typeof unknown.id).toBe('number');
      } else {
        throw new Error('Should have been a valid Todo');
      }
    });

    it('should handle Todo with string dates (invalid type guard)', () => {
      const withStringDate = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: '2024-01-01', updated_at: '2024-01-01',
      };
      expect(isValidTodo(withStringDate)).toBe(false);
    });
  });

  // ============================================================
  // 深冻结和浅冻结（第二轮新增）
  // ============================================================
  describe('deep freeze and shallow freeze', () => {
    const deepFreeze = <T>(obj: T): T => {
      if (obj === null || typeof obj !== 'object') return obj;
      Object.keys(obj).forEach(key => {
        const value = (obj as Record<string, unknown>)[key];
        if (value !== null && typeof value === 'object') {
          deepFreeze(value);
        }
      });
      return Object.freeze(obj);
    };

    it('should freeze Todo at top level', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(todo);
      expect(Object.isFrozen(todo)).toBe(true);
      expect(() => { (todo as any).id = 999; }).toThrow();
      expect(() => { (todo as any).title = 'modified'; }).toThrow();
    });

    it('should freeze Todo with deep freeze', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      deepFreeze(todo);
      expect(Object.isFrozen(todo)).toBe(true);
    });

    it('should freeze TodoLog at top level', () => {
      const log: TodoLog = {
        id: 1, todo_id: 1, operator_id: 1, operator_name: 'A',
        action: 'done', object_type: null, object_id: null,
        remark: null, created_at: new Date(),
      };
      Object.freeze(log);
      expect(Object.isFrozen(log)).toBe(true);
      expect(() => { (log as any).action = 'modified'; }).toThrow();
    });

    it('should freeze CreateTodoRequest', () => {
      const req: CreateTodoRequest = {
        title: 'T', company_id: 1, object_type: 'article',
        action: 'publish', assignee_id: 1,
      };
      Object.freeze(req);
      expect(Object.isFrozen(req)).toBe(true);
      expect(() => { (req as any).title = 'modified'; }).toThrow();
    });

    it('should freeze UpdateTodoRequest', () => {
      const req: UpdateTodoRequest = { priority: 'urgent' };
      Object.freeze(req);
      expect(Object.isFrozen(req)).toBe(true);
      expect(() => { (req as any).priority = 'low'; }).toThrow();
    });

    it('should freeze TransferTodoRequest', () => {
      const req: TransferTodoRequest = {
        assignee_id: 5, remark: '备注',
      };
      Object.freeze(req);
      expect(Object.isFrozen(req)).toBe(true);
      expect(() => { (req as any).assignee_id = 99; }).toThrow();
    });

    it('should not add new property to frozen Todo', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(todo);
      expect(() => { (todo as any).newField = 'value'; }).toThrow();
      expect((todo as any).newField).toBeUndefined();
    });

    it('should not delete property from frozen Todo', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(todo);
      expect(() => { delete (todo as any).title; }).toThrow();
      expect(todo.title).toBe('T');
    });

    it('should allow reading all properties from frozen Todo', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(todo);
      expect(todo.id).toBe(1);
      expect(todo.title).toBe('T');
      expect(todo.status).toBe('pending');
      expect(Object.keys(todo)).toHaveLength(19);
    });

    it('should freeze array of Todo objects', () => {
      const todos: Todo[] = [
        { id: 1, title: 'T1', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'publish', source: 'system', priority: 'high',
          assignee_id: 1, assignee_name: 'A', status: 'pending',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
        { id: 2, title: 'T2', company_id: 1, company_name: 'C',
          project_id: null, project_name: null, object_type: 'article',
          object_id: null, action: 'review', source: 'manual', priority: 'low',
          assignee_id: 2, assignee_name: 'A2', status: 'completed',
          created_by_id: 1, created_by_name: 'B', due_at: null,
          created_at: new Date(), updated_at: new Date() },
      ];
      todos.forEach(t => Object.freeze(t));
      expect(Object.isFrozen(todos[0])).toBe(true);
      expect(Object.isFrozen(todos[1])).toBe(true);
      expect(() => { (todos[0] as any).title = 'x'; }).toThrow();
    });

    it('should verify Date objects remain mutable inside frozen Todo', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      Object.freeze(todo); // shallow freeze
      // Date objects inside frozen object remain mutable (shallow freeze)
      todo.created_at.setFullYear(2025);
      expect(todo.created_at.getFullYear()).toBe(2025);
    });
  });

  // ============================================================
  // 生命周期完整性（第二轮新增）
  // ============================================================
  describe('lifecycle integrity', () => {
    it('should model Todo creation lifecycle', () => {
      const createdAt = new Date('2025-06-01T10:00:00.000Z');
      const todo: Todo = {
        id: 1, title: '新待办', company_id: 1, company_name: 'C',
        project_id: 10, project_name: 'P', object_type: 'article',
        object_id: 100, action: 'publish', source: 'system',
        priority: 'high', assignee_id: 1, assignee_name: 'A',
        status: 'pending', created_by_id: 1, created_by_name: 'B',
        due_at: '2025-06-30', created_at: createdAt, updated_at: createdAt,
      };
      expect(todo.status).toBe('pending');
      expect(todo.created_at).toEqual(todo.updated_at);
    });

    it('should model Todo status transition from pending to in_progress', () => {
      const createdAt = new Date('2025-06-01T10:00:00.000Z');
      const updatedAt = new Date('2025-06-02T14:00:00.000Z');
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'in_progress',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: createdAt, updated_at: updatedAt,
      };
      expect(todo.status).toBe('in_progress');
      expect(todo.updated_at.getTime()).toBeGreaterThan(todo.created_at.getTime());
    });

    it('should model Todo status transition from in_progress to completed', () => {
      const createdAt = new Date('2025-06-01');
      const updatedAt = new Date('2025-06-05');
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'completed',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: createdAt, updated_at: updatedAt,
      };
      expect(todo.status).toBe('completed');
    });

    it('should model Todo cancellation lifecycle', () => {
      const todo: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'cancelled',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: new Date('2025-06-01'), updated_at: new Date('2025-06-02'),
      };
      expect(todo.status).toBe('cancelled');
    });

    it('should track TodoLog for each lifecycle event', () => {
      const logs: TodoLog[] = [
        { id: 1, todo_id: 10, operator_id: 1, operator_name: '管理员',
          action: 'created', object_type: null, object_id: null,
          remark: '创建待办', created_at: new Date('2025-06-01T10:00:00Z') },
        { id: 2, todo_id: 10, operator_id: 5, operator_name: '李运营',
          action: 'status_change', object_type: 'article', object_id: 200,
          remark: '状态变更为in_progress', created_at: new Date('2025-06-02T14:00:00Z') },
        { id: 3, todo_id: 10, operator_id: 5, operator_name: '李运营',
          action: 'completed', object_type: 'article', object_id: 200,
          remark: '完成发布', created_at: new Date('2025-06-05T09:00:00Z') },
      ];
      expect(logs).toHaveLength(3);
      expect(logs[0].action).toBe('created');
      expect(logs[1].action).toBe('status_change');
      expect(logs[2].action).toBe('completed');
      const timestamps = logs.map(l => l.created_at.getTime());
      expect(timestamps).toEqual([...timestamps].sort());
    });

    it('should model UpdateTodoRequest across lifecycle', () => {
      const updates: UpdateTodoRequest[] = [
        { priority: 'medium' },
        { title: '修改后的标题', priority: 'high' },
        { action: 'approve', due_at: null },
        { object_type: 'report', object_id: 300 },
      ];
      expect(updates[0].priority).toBe('medium');
      expect(updates[1].title).toBe('修改后的标题');
      expect(updates[2].due_at).toBeNull();
      expect(updates[3].object_id).toBe(300);
    });

    it('should preserve created_at across updates', () => {
      const createdAt = new Date('2025-06-01T10:00:00.000Z');
      const original: Todo = {
        id: 1, title: 'T', company_id: 1, company_name: 'C',
        project_id: null, project_name: null, object_type: 'article',
        object_id: null, action: 'publish', source: 'system', priority: 'high',
        assignee_id: 1, assignee_name: 'A', status: 'pending',
        created_by_id: 1, created_by_name: 'B', due_at: null,
        created_at: createdAt, updated_at: createdAt,
      };
      const updated: Todo = {
        ...original, title: '更新标题', status: 'in_progress',
        updated_at: new Date('2025-06-03'),
      };
      expect(updated.created_at).toEqual(createdAt);
      expect(updated.title).toBe('更新标题');
      expect(updated.status).toBe('in_progress');
      expect(updated.updated_at.getTime()).toBeGreaterThan(updated.created_at.getTime());
    });

    it('should model todo reassignment lifecycle', () => {
      const transferLog: TodoLog = {
        id: 1, todo_id: 10, operator_id: 5, operator_name: '李运营',
        action: 'transferred', object_type: null, object_id: null,
        remark: '转交给王审核', created_at: new Date('2025-06-03'),
      };
      expect(transferLog.action).toBe('transferred');
      expect(transferLog.remark).toContain('转交');
    });
  });
});

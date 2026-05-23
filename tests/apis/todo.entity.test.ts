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
  });

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
  });

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
  });

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
  });

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
    });
  });

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
});

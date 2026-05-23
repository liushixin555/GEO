/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken(userId = 1, companyId = 1) {
  return jwt.sign(
    { userId, username: 'sysadmin', role: 'sysadmin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken(userId = 2, companyId = 2) {
  return jwt.sign(
    { userId, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken(userId = 3, companyId = 2) {
  return jwt.sign(
    { userId, username: 'viewer', role: 'view', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

const mockTodoFull = {
  id: 1,
  title: '处理文章审核',
  companyId: 1,
  company: { id: 1, shortName: '测试公司' },
  projectId: 1,
  project: { id: 1, shortName: '测试项目' },
  objectType: '文章',
  objectId: 10,
  action: '审核文章内容',
  source: 'manual',
  priority: 'P2',
  assigneeId: 1,
  assignee: { id: 1, cnName: '管理员' },
  createdById: 1,
  createdBy: { id: 1, cnName: '管理员' },
  status: 'open',
  dueAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  deletedAt: null,
};

const mockTodoLog = {
  id: 1,
  todoId: 1,
  operatorId: 1,
  operator: { id: 1, cnName: '管理员' },
  action: 'submit',
  objectType: null,
  objectId: null,
  remark: null,
  createdAt: new Date(),
};

describe('Todo Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ============================================================
  // GET /api/todos — listTodos
  // ============================================================
  describe('GET /api/todos', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/todos');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/todos')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return todo list for sysadmin (my_open tab)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([mockTodoFull]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=my_open')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.list[0].title).toBe('处理文章审核');
    });

    it('should return todo list for admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should filter by my_open tab (assignee = me, status open/draft)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=my_open')
        .set('Authorization', `Bearer ${sysadminToken(5, 1)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 5,
            status: { in: ['open', 'draft'] },
          }),
        })
      );
    });

    it('should filter by my_closed tab (assignee = me, status closed)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=my_closed')
        .set('Authorization', `Bearer ${sysadminToken(5, 1)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            assigneeId: 5,
            status: 'closed',
          }),
        })
      );
    });

    it('should filter by all_open tab (status open/draft)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=all_open')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: { in: ['open', 'draft'] },
          }),
        })
      );
    });

    it('should filter by all_closed tab (status closed)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=all_closed')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            status: 'closed',
          }),
        })
      );
    });

    it('should filter by priority', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?priority=P0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            priority: 'P0',
          }),
        })
      );
    });

    it('should filter by search keyword', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?search=文章')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            title: { contains: '文章', mode: 'insensitive' },
          }),
        })
      );
    });

    it('should support pagination parameters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should deny admin access to all_open tab', async () => {
      const response = await agent
        .get('/api/todos?tab=all_open')
        .set('Authorization', `Bearer ${adminToken(5, 10)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权访问全部待办');
    });

    it('should deny admin access to all_closed tab', async () => {
      const response = await agent
        .get('/api/todos?tab=all_closed')
        .set('Authorization', `Bearer ${adminToken(5, 10)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权访问全部待办');
    });

    it('should allow sysadmin access to all_open tab', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=all_open')
        .set('Authorization', `Bearer ${sysadminToken(1)}`);

      expect(response.status).toBe(200);
    });

    it('should allow sysadmin access to all_closed tab', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos?tab=all_closed')
        .set('Authorization', `Bearer ${sysadminToken(1)}`);

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB Error'));
      const mockCount = jest.fn().mockRejectedValue(new Error('DB Error'));
      getPrisma.mockReturnValue({
        todo: { findMany: mockFindMany, count: mockCount },
      });

      const response = await agent
        .get('/api/todos')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  // ============================================================
  // GET /api/todos/:id — getTodo
  // ============================================================
  describe('GET /api/todos/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/todos/1');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/todos/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的待办ID');
    });

    it('should return 404 for non-existent todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/todos/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('待办不存在');
    });

    it('should return todo detail for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .get('/api/todos/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.title).toBe('处理文章审核');
    });
  });

  // ============================================================
  // POST /api/todos — createTodo
  // ============================================================
  describe('POST /api/todos', () => {
    const createPayload = {
      title: '新建待办任务',
      company_id: 1,
      object_type: '文章',
      action: '检查文章质量',
      assignee_id: 2,
      priority: 'P1',
    };

    it('should return 401 without token', async () => {
      const response = await agent.post('/api/todos').send(createPayload);
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/todos')
        .send(createPayload)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should create todo successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos')
        .send(createPayload)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('待办创建成功');
      expect(mockLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'submit' }),
        })
      );
    });

    it('should create todo successfully for admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos')
        .send(createPayload)
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(201);
      expect(response.body.code).toBe(0);
    });

    it('should default priority to P2 when not specified', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      const { priority: _p, ...payloadNoPriority } = createPayload;

      await agent
        .post('/api/todos')
        .send(payloadNoPriority)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ priority: 'P2' }),
        })
      );
    });

    it('should default source to manual when not specified', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      const payload = {
        title: '新建待办任务',
        company_id: 1,
        object_type: '文章',
        action: '检查文章质量',
        assignee_id: 2,
      };

      await agent
        .post('/api/todos')
        .send(payload)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ source: 'manual' }),
        })
      );
    });

    it('should default status to open on creation', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      await agent
        .post('/api/todos')
        .send(createPayload)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ status: 'open' }),
        })
      );
    });

    it('should accept due_at field', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue(mockTodoFull);
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: { create: mockCreate },
        todoLog: { create: mockLogCreate },
      });

      const dueAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await agent
        .post('/api/todos')
        .send({ ...createPayload, due_at: dueAt })
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ dueAt: expect.any(Date) }),
        })
      );
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { create: jest.fn().mockRejectedValue(new Error('DB Error')) },
      });

      const response = await agent
        .post('/api/todos')
        .send(createPayload)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  // ============================================================
  // PUT /api/todos/:id — updateTodo
  // ============================================================
  describe('PUT /api/todos/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.put('/api/todos/1').send({ title: 'updated' });
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/todos/abc')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put('/api/todos/999')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should reject update for closed todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const closedTodo = { ...mockTodoFull, status: 'closed' };
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(closedTodo) },
      });

      const response = await agent
        .put('/api/todos/1')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('已关闭的待办不能修改');
    });

    it('should reject update by non-owner non-sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .put('/api/todos/1')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${adminToken(99, 2)}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只能修改自己负责的待办');
    });

    it('should update todo successfully for owner', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUpdate = jest.fn().mockResolvedValue({ ...mockTodoFull, title: 'updated' });
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(mockTodoFull),
          update: mockUpdate,
        },
      });

      const response = await agent
        .put('/api/todos/1')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('更新待办成功');
    });

    it('should update todo for sysadmin even when not assignee', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const otherTodo = { ...mockTodoFull, assigneeId: 99 };
      const mockUpdate = jest.fn().mockResolvedValue({ ...otherTodo, title: 'updated' });
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(otherTodo),
          update: mockUpdate,
        },
      });

      const response = await agent
        .put('/api/todos/1')
        .send({ title: 'updated' })
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(200);
    });
  });

  // ============================================================
  // POST /api/todos/:id/close — closeTodo
  // ============================================================
  describe('POST /api/todos/:id/close', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/todos/1/close');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .post('/api/todos/abc/close')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .post('/api/todos/999/close')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should reject close for non-open todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const closedTodo = { ...mockTodoFull, status: 'closed' };
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(closedTodo) },
      });

      const response = await agent
        .post('/api/todos/1/close')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有处理中的待办可以关闭');
    });

    it('should reject close by non-owner non-sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .post('/api/todos/1/close')
        .set('Authorization', `Bearer ${adminToken(99, 2)}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只能关闭自己负责的待办');
    });

    it('should close todo successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUpdate = jest.fn().mockResolvedValue({ ...mockTodoFull, status: 'closed' });
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(mockTodoFull),
          update: mockUpdate,
        },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos/1/close')
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('关闭待办成功');
      expect(mockLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'close' }),
        })
      );
    });
  });

  // ============================================================
  // POST /api/todos/:id/reopen — reopenTodo
  // ============================================================
  describe('POST /api/todos/:id/reopen', () => {
    const closedTodo = { ...mockTodoFull, status: 'closed' };

    it('should return 401 without token', async () => {
      const response = await agent.post('/api/todos/1/reopen');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .post('/api/todos/abc/reopen')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should reject reopen for non-closed todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .post('/api/todos/1/reopen')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有已关闭的待办可以重新打开');
    });

    it('should reopen todo successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUpdate = jest.fn().mockResolvedValue({ ...closedTodo, status: 'open' });
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(closedTodo),
          update: mockUpdate,
        },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos/1/reopen')
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('重新打开待办成功');
      expect(mockLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ action: 'reopen' }),
        })
      );
    });
  });

  // ============================================================
  // POST /api/todos/:id/transfer — transferTodo
  // ============================================================
  describe('POST /api/todos/:id/transfer', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/todos/1/transfer')
        .send({ assignee_id: 2 });
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .post('/api/todos/abc/transfer')
        .send({ assignee_id: 2 })
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .post('/api/todos/999/transfer')
        .send({ assignee_id: 2 })
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should reject transfer for non-open todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const closedTodo = { ...mockTodoFull, status: 'closed' };
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(closedTodo) },
      });

      const response = await agent
        .post('/api/todos/1/transfer')
        .send({ assignee_id: 2 })
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有处理中的待办可以转交');
    });

    it('should reject transfer by non-owner non-sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .post('/api/todos/1/transfer')
        .send({ assignee_id: 2 })
        .set('Authorization', `Bearer ${adminToken(99, 2)}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只能转交自己负责的待办');
    });

    it('should reject transfer to non-existent user', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
        user: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .post('/api/todos/1/transfer')
        .send({ assignee_id: 999 })
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('目标用户不存在');
    });

    it('should transfer todo successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockUpdate = jest.fn().mockResolvedValue({ ...mockTodoFull, assigneeId: 2 });
      const mockLogCreate = jest.fn().mockResolvedValue({});
      const targetUser = { id: 2, cnName: '用户B' };
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(mockTodoFull),
          update: mockUpdate,
        },
        user: { findFirst: jest.fn().mockResolvedValue(targetUser) },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos/1/transfer')
        .send({ assignee_id: 2 })
        .set('Authorization', `Bearer ${sysadminToken(1, 1)}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('转交待办成功');
      expect(mockLogCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            action: 'transfer',
            remark: '转交给 用户B',
          }),
        })
      );
    });
  });

  // ============================================================
  // POST /api/todos/:id/reject — rejectTodo
  // ============================================================
  describe('POST /api/todos/:id/reject', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/todos/1/reject');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .post('/api/todos/abc/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should reject reject by non-sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
      });

      const response = await agent
        .post('/api/todos/1/reject')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有系统管理员可以驳回待办');
    });

    it('should reject for non-open todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const closedTodo = { ...mockTodoFull, status: 'closed' };
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(closedTodo) },
      });

      const response = await agent
        .post('/api/todos/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有处理中的待办可以驳回');
    });

    it('should reject manual todo and reassign to creator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const manualTodo = { ...mockTodoFull, source: 'manual', createdById: 5 };
      const mockUpdate = jest.fn().mockResolvedValue({ ...manualTodo, status: 'draft', assigneeId: 5 });
      const mockLogCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(manualTodo),
          update: mockUpdate,
        },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('驳回待办成功');
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
            assigneeId: 5,
          }),
        })
      );
    });

    it('should reject system todo and reassign to sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const sysTodo = { ...mockTodoFull, source: 'daily_check', createdById: 5 };
      const mockUpdate = jest.fn().mockResolvedValue({ ...sysTodo, status: 'draft' });
      const mockLogCreate = jest.fn().mockResolvedValue({});
      const sysadminUser = { id: 1, cnName: '系统管理员' };
      getPrisma.mockReturnValue({
        todo: {
          findFirst: jest.fn().mockResolvedValue(sysTodo),
          update: mockUpdate,
        },
        user: { findFirst: jest.fn().mockResolvedValue(sysadminUser) },
        todoLog: { create: mockLogCreate },
      });

      const response = await agent
        .post('/api/todos/1/reject')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: 'draft',
            assigneeId: 1,
          }),
        })
      );
    });
  });

  // ============================================================
  // GET /api/todos/:id/logs — getTodoLogs
  // ============================================================
  describe('GET /api/todos/:id/logs', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/todos/1/logs');
      expect(response.status).toBe(401);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/todos/abc/logs')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/todos/999/logs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return logs for existing todo', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
        todoLog: {
          findMany: jest.fn().mockResolvedValue([mockTodoLog]),
        },
      });

      const response = await agent
        .get('/api/todos/1/logs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].operator_name).toBe('管理员');
    });

    it('should return empty array when no logs', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        todo: { findFirst: jest.fn().mockResolvedValue(mockTodoFull) },
        todoLog: { findMany: jest.fn().mockResolvedValue([]) },
      });

      const response = await agent
        .get('/api/todos/1/logs')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // ============================================================
  // GET /api/todos/object-options — getObjectOptions
  // ============================================================
  describe('GET /api/todos/object-options', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/todos/object-options');
      expect(response.status).toBe(401);
    });

    it('should return 400 when missing params', async () => {
      const response = await agent
        .get('/api/todos/object-options?projectId=1&objectType=article')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return active articles for delete action', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, title: '文章A' },
        { id: 2, title: '文章B' },
      ]);
      getPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      });

      const response = await agent
        .get('/api/todos/object-options?projectId=1&objectType=article&action=delete')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0]).toEqual({ id: 1, name: '文章A' });
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: null }),
        })
      );
    });

    it('should return deleted articles for restore action', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 3, title: '已删除文章' },
      ]);
      getPrisma.mockReturnValue({
        article: { findMany: mockFindMany },
      });

      const response = await agent
        .get('/api/todos/object-options?projectId=1&objectType=article&action=restore')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({ deletedAt: { not: null } }),
        })
      );
    });

    it('should return keywords for a project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKbFindMany = jest.fn().mockResolvedValue([{ id: 10 }]);
      const mockKwFindMany = jest.fn().mockResolvedValue([
        { id: 1, keyword: '关键词A' },
      ]);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockKbFindMany },
        knowledgeKeyword: { findMany: mockKwFindMany },
      });

      const response = await agent
        .get('/api/todos/object-options?projectId=1&objectType=keyword&action=update')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0]).toEqual({ id: 1, name: '关键词A' });
    });

    it('should return empty when no knowledge bases', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockKbFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({
        knowledgeBase: { findMany: mockKbFindMany },
      });

      const response = await agent
        .get('/api/todos/object-options?projectId=1&objectType=keyword&action=delete')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });
  });

  // ============================================================
  // GET /api/todos/assignee-candidates — getAssigneeCandidates
  // ============================================================
  describe('GET /api/todos/assignee-candidates', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/todos/assignee-candidates');
      expect(response.status).toBe(401);
    });

    it('should return 400 when missing projectId', async () => {
      const response = await agent
        .get('/api/todos/assignee-candidates')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        project: { findUnique: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get('/api/todos/assignee-candidates?projectId=999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return operators and sysadmin users', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockProject = {
        id: 1,
        operators: [{ userId: 10 }, { userId: 20 }],
      };
      const mockUsers = [
        { id: 10, username: 'op1', cnName: '运营1', role: 'admin' },
        { id: 20, username: 'op2', cnName: '运营2', role: 'admin' },
        { id: 1, username: 'sysadmin', cnName: '超级管理', role: 'sysadmin' },
      ];
      getPrisma.mockReturnValue({
        project: { findUnique: jest.fn().mockResolvedValue(mockProject) },
        user: { findMany: jest.fn().mockResolvedValue(mockUsers) },
      });

      const response = await agent
        .get('/api/todos/assignee-candidates?projectId=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(3);
      expect(response.body.data[2]).toEqual({
        id: 1,
        username: 'sysadmin',
        cn_name: '超级管理',
        role: 'sysadmin',
      });
    });

    it('should deduplicate users', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockProject = {
        id: 1,
        operators: [{ userId: 1 }],
      };
      // sysadmin (id=1) is also an operator
      const mockUsers = [
        { id: 1, username: 'sysadmin', cnName: '超级管理', role: 'sysadmin' },
      ];
      getPrisma.mockReturnValue({
        project: { findUnique: jest.fn().mockResolvedValue(mockProject) },
        user: { findMany: jest.fn().mockResolvedValue(mockUsers) },
      });

      const response = await agent
        .get('/api/todos/assignee-candidates?projectId=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(1);
    });
  });
});

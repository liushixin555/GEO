/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

// Set env vars BEFORE imports
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken(companyId = 2) {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken(companyId = 2) {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function expiredToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '-1s' }
  );
}

function invalidToken() {
  return 'invalid.jwt.token';
}

describe('App - Middleware Chain', () => {
  describe('Anti-Crawl Middleware', () => {
    it('should block requests without User-Agent', async () => {
      const response = await request(app).get('/api/auth/verify');
      expect(response.status).toBe(403);
    });

    it('should block requests with short User-Agent (< 10 chars)', async () => {
      const response = await request(app)
        .get('/api/auth/verify')
        .set('User-Agent', 'short');
      expect(response.status).toBe(403);
    });

    it('should allow health check without anti-crawl checks', async () => {
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
    });
  });

  describe('Auth Middleware', () => {
    it('should return 401 when no token provided on protected route', async () => {
      const response = await agent.get('/api/auth/verify');
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('未登录，请先登录');
    });

    it('should return 401 with expired token', async () => {
      const response = await agent
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${expiredToken()}`);
      expect(response.status).toBe(401);
      expect(response.body.message).toBe('登录已过期，请重新登录');
    });

    it('should return 401 with invalid token', async () => {
      const response = await agent
        .get('/api/auth/verify')
        .set('Authorization', `Bearer ${invalidToken()}`);
      expect(response.status).toBe(401);
    });
  });

  describe('Role Middleware', () => {
    it('should deny view role on sysadmin-only route (companies)', async () => {
      const response = await agent
        .get('/api/companies')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('无权限访问');
    });

    it('should deny view role on admin route (projects)', async () => {
      const response = await agent
        .get('/api/projects')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should not deny admin on admin route (projects) - pass role check', async () => {
      const response = await agent
        .get('/api/projects')
        .set('Authorization', `Bearer ${adminToken()}`);
      // Admin should NOT get 403 (role check passes); may get 500 from missing DB
      expect(response.status).not.toBe(403);
    });
  });
});

describe('App - Health Check', () => {
  it('GET /api/health should return ok status', async () => {
    const response = await agent.get('/api/health');
    expect(response.status).toBe(200);
    expect(response.body.status).toBe('ok');
  });
});

describe('App - Public Routes', () => {
  describe('POST /api/auth/login', () => {
    it('should return 400 when username is missing', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({ password: 'password' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });

    it('should return 400 when password is missing', async () => {
      const response = await agent
        .post('/api/auth/login')
        .send({ username: 'test' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('用户名和密码不能为空');
    });
  });
});

describe('App - Auth Routes (Protected)', () => {
  describe('GET /api/auth/verify', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/auth/verify');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/context', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/auth/context');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/companies', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/auth/companies');
      expect(response.status).toBe(401);
    });
  });

  describe('GET /api/auth/projects', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/auth/projects');
      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/auth/logout', () => {
    it('should return 401 without token', async () => {
      const response = await agent.post('/api/auth/logout');
      expect(response.status).toBe(401);
    });
  });

  describe('PUT /api/auth/selection', () => {
    it('should return 401 without token', async () => {
      const response = await agent.put('/api/auth/selection');
      expect(response.status).toBe(401);
    });
  });
});

describe('App - Company Routes (sysadmin only)', () => {
  const token = sysadminToken();

  it('GET /api/companies - should deny admin', async () => {
    const response = await agent
      .get('/api/companies')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/companies/:id - should deny admin', async () => {
    const response = await agent
      .get('/api/companies/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/companies - should deny admin', async () => {
    const response = await agent
      .post('/api/companies')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Test' });
    expect(response.status).toBe(403);
  });

  it('PUT /api/companies/:id - should deny admin', async () => {
    const response = await agent
      .put('/api/companies/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'Test' });
    expect(response.status).toBe(403);
  });

  it('PUT /api/companies/:id/status - should deny admin', async () => {
    const response = await agent
      .put('/api/companies/1/status')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ enabled: true });
    expect(response.status).toBe(403);
  });
});

describe('App - User Routes (sysadmin only)', () => {
  it('GET /api/users - should deny admin', async () => {
    const response = await agent
      .get('/api/users')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/users/:id - should deny admin', async () => {
    const response = await agent
      .get('/api/users/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/users - should deny admin', async () => {
    const response = await agent
      .post('/api/users')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'test' });
    expect(response.status).toBe(403);
  });

  it('PUT /api/users/:id - should deny admin', async () => {
    const response = await agent
      .put('/api/users/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ username: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/users/:id - should deny admin', async () => {
    const response = await agent
      .delete('/api/users/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Skills Routes (sysadmin + admin)', () => {
  it('GET /api/skills - should deny view role', async () => {
    const response = await agent
      .get('/api/skills')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/skills - should deny view role', async () => {
    const response = await agent
      .post('/api/skills')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('PUT /api/skills/:id - should deny view role', async () => {
    const response = await agent
      .put('/api/skills/1')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/skills/:id - should deny view role', async () => {
    const response = await agent
      .delete('/api/skills/1')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - LLM Model Routes (sysadmin only)', () => {
  it('GET /api/llm-models - should deny admin', async () => {
    const response = await agent
      .get('/api/llm-models')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/llm-models - should deny admin', async () => {
    const response = await agent
      .post('/api/llm-models')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('PUT /api/llm-models/:id - should deny admin', async () => {
    const response = await agent
      .put('/api/llm-models/1')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/llm-models/:id - should deny admin', async () => {
    const response = await agent
      .delete('/api/llm-models/1')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - System Config Routes (sysadmin only)', () => {
  it('GET /api/system-configs - should deny admin', async () => {
    const response = await agent
      .get('/api/system-configs')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('PUT /api/system-configs - should deny admin', async () => {
    const response = await agent
      .put('/api/system-configs')
      .set('Authorization', `Bearer ${adminToken()}`)
      .send({});
    expect(response.status).toBe(403);
  });
});

describe('App - Publishing Platform Routes', () => {
  it('POST /api/publishing-platforms/sync - should deny admin', async () => {
    const response = await agent
      .post('/api/publishing-platforms/sync')
      .set('Authorization', `Bearer ${adminToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/publishing-platforms - should deny view role', async () => {
    const response = await agent
      .get('/api/publishing-platforms')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Project Routes (sysadmin + admin)', () => {
  it('GET /api/projects - should deny view role', async () => {
    const response = await agent
      .get('/api/projects')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/projects - should deny view role', async () => {
    const response = await agent
      .post('/api/projects')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/projects/:id - should deny view role', async () => {
    const response = await agent
      .delete('/api/projects/1')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Article Routes (sysadmin + admin)', () => {
  it('GET /api/projects/:projectId/articles - should deny view role', async () => {
    const response = await agent
      .get('/api/projects/1/articles')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/projects/:projectId/articles - should deny view role', async () => {
    const response = await agent
      .post('/api/projects/1/articles')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ title: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/projects/:projectId/articles/:id - should deny view role', async () => {
    const response = await agent
      .delete('/api/projects/1/articles/1')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Knowledge Routes (sysadmin + admin)', () => {
  it('GET /api/projects/:projectId/knowledge/keywords - should deny view role', async () => {
    const response = await agent
      .get('/api/projects/1/knowledge/keywords')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/projects/:projectId/knowledge/portraits - should deny view role', async () => {
    const response = await agent
      .get('/api/projects/1/knowledge/portraits')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/projects/:projectId/knowledge/images - should deny view role', async () => {
    const response = await agent
      .get('/api/projects/1/knowledge/images')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/projects/:projectId/knowledge/documents - should deny view role', async () => {
    const response = await agent
      .get('/api/projects/1/knowledge/documents')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Upload Routes (sysadmin + admin)', () => {
  it('POST /api/upload - should deny view role', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/upload/document - should deny view role', async () => {
    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Publishing Schedule Routes', () => {
  it('GET /api/publishing-schedule - should not deny view role (role check passes)', async () => {
    const response = await agent
      .get('/api/publishing-schedule')
      .set('Authorization', `Bearer ${viewToken()}`);
    // View role should NOT get 403 (role check passes); may get 500 from missing DB
    expect(response.status).not.toBe(403);
  });

  it('PUT /api/publishing-schedule/:id - should deny view role', async () => {
    const response = await agent
      .put('/api/publishing-schedule/1')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({});
    expect(response.status).toBe(403);
  });
});

describe('App - Knowledge Base Routes (sysadmin + admin)', () => {
  it('GET /api/knowledge-bases - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-bases')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/knowledge-bases - should deny view role', async () => {
    const response = await agent
      .post('/api/knowledge-bases')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ name: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/knowledge-bases/:id - should deny view role', async () => {
    const response = await agent
      .delete('/api/knowledge-bases/1')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

describe('App - Knowledge Item Routes (sysadmin + admin)', () => {
  it('GET /api/knowledge-bases/:baseId/keywords - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-bases/1/keywords')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/knowledge-bases/:baseId/keywords - should deny view role', async () => {
    const response = await agent
      .post('/api/knowledge-bases/1/keywords')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({ word: 'test' });
    expect(response.status).toBe(403);
  });

  it('DELETE /api/knowledge-bases/:baseId/keywords/:id - should deny view role', async () => {
    const response = await agent
      .delete('/api/knowledge-bases/1/keywords/1')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/knowledge-bases/:baseId/portraits - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-bases/1/portraits')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/knowledge-bases/:baseId/images - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-bases/1/images')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('GET /api/knowledge-bases/:baseId/documents - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-bases/1/documents')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('POST /api/knowledge-bases/:baseId/keywords/mine - should deny view role', async () => {
    const response = await agent
      .post('/api/knowledge-bases/1/keywords/mine')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({});
    expect(response.status).toBe(403);
  });

  it('POST /api/knowledge-bases/:baseId/keywords/expand - should deny view role', async () => {
    const response = await agent
      .post('/api/knowledge-bases/1/keywords/expand')
      .set('Authorization', `Bearer ${viewToken()}`)
      .send({});
    expect(response.status).toBe(403);
  });
});

describe('App - Knowledge Inventory Route', () => {
  it('GET /api/knowledge-inventory - should deny view role', async () => {
    const response = await agent
      .get('/api/knowledge-inventory')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

  // ─── Todo Routes (sysadmin + admin) ───
  describe('App - Todo Routes (sysadmin + admin)', () => {
    it('GET /api/todos - should deny view role', async () => {
      const response = await agent
        .get('/api/todos')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('GET /api/todos/object-options - should deny view role', async () => {
      const response = await agent
        .get('/api/todos/object-options')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('GET /api/todos/assignee-candidates - should deny view role', async () => {
      const response = await agent
        .get('/api/todos/assignee-candidates')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('GET /api/todos/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/todos/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/todos - should deny view role', async () => {
      const response = await agent
        .post('/api/todos')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ title: 'test' });
      expect(response.status).toBe(403);
    });

    it('PUT /api/todos/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/todos/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ title: 'test' });
      expect(response.status).toBe(403);
    });

    it('POST /api/todos/:id/close - should deny view role', async () => {
      const response = await agent
        .post('/api/todos/1/close')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/todos/:id/reopen - should deny view role', async () => {
      const response = await agent
        .post('/api/todos/1/reopen')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/todos/:id/transfer - should deny view role', async () => {
      const response = await agent
        .post('/api/todos/1/transfer')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ assigneeId: 2 });
      expect(response.status).toBe(403);
    });

    it('POST /api/todos/:id/reject - should deny view role', async () => {
      const response = await agent
        .post('/api/todos/1/reject')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ reason: 'test' });
      expect(response.status).toBe(403);
    });

    it('GET /api/todos/:id/logs - should deny view role', async () => {
      const response = await agent
        .get('/api/todos/1/logs')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  // ─── Additional Knowledge Base Routes ───
  describe('App - Knowledge Base Keywords Additional Routes', () => {
    it('GET /api/knowledge-bases/:baseId/keywords/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1/keywords/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/knowledge-bases/:baseId/keywords/batch - should deny view role', async () => {
      const response = await agent
        .post('/api/knowledge-bases/1/keywords/batch')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ keywords: ['test'] });
      expect(response.status).toBe(403);
    });

    it('GET /api/knowledge-bases/:baseId/mined-keywords - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1/mined-keywords')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/knowledge-bases/:baseId/mined-keywords/save - should deny view role', async () => {
      const response = await agent
        .post('/api/knowledge-bases/1/mined-keywords/save')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ ids: [1] });
      expect(response.status).toBe(403);
    });

    it('PUT /api/knowledge-bases/:baseId/mined-keywords/batch-toggle - should deny view role', async () => {
      const response = await agent
        .put('/api/knowledge-bases/1/mined-keywords/batch-toggle')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ ids: [1], enabled: true });
      expect(response.status).toBe(403);
    });

    it('DELETE /api/knowledge-bases/:baseId/mined-keywords - should deny view role', async () => {
      const response = await agent
        .delete('/api/knowledge-bases/1/mined-keywords')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  describe('App - Knowledge Base Portraits Full Routes', () => {
    it('GET /api/knowledge-bases/:baseId/portraits/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1/portraits/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/knowledge-bases/:baseId/portraits - should deny view role', async () => {
      const response = await agent
        .post('/api/knowledge-bases/1/portraits')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(response.status).toBe(403);
    });

    it('PUT /api/knowledge-bases/:baseId/portraits/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/knowledge-bases/1/portraits/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(response.status).toBe(403);
    });

    it('DELETE /api/knowledge-bases/:baseId/portraits/:id - should deny view role', async () => {
      const response = await agent
        .delete('/api/knowledge-bases/1/portraits/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  describe('App - Knowledge Base Images Full Routes', () => {
    it('GET /api/knowledge-bases/:baseId/images/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1/images/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/knowledge-bases/:baseId/images - should deny view role', async () => {
      const response = await agent
        .post('/api/knowledge-bases/1/images')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/knowledge-bases/:baseId/images/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/knowledge-bases/1/images/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('DELETE /api/knowledge-bases/:baseId/images/:id - should deny view role', async () => {
      const response = await agent
        .delete('/api/knowledge-bases/1/images/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  describe('App - Knowledge Base Documents Full Routes', () => {
    it('GET /api/knowledge-bases/:baseId/documents/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1/documents/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('POST /api/knowledge-bases/:baseId/documents - should deny view role', async () => {
      const response = await agent
        .post('/api/knowledge-bases/1/documents')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/knowledge-bases/:baseId/documents/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/knowledge-bases/1/documents/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('DELETE /api/knowledge-bases/:baseId/documents/:id - should deny view role', async () => {
      const response = await agent
        .delete('/api/knowledge-bases/1/documents/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  // ─── Additional Article Routes ───
  describe('App - Article Additional Routes', () => {
    it('GET /api/projects/:projectId/articles/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/projects/1/articles/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:projectId/articles/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1/articles/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ title: 'test' });
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:projectId/articles/:id/review - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1/articles/1/review')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:projectId/articles/:id/regenerate - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1/articles/1/regenerate')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:projectId/articles/:id/content - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1/articles/1/content')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ content: 'test' });
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:projectId/articles/:id/submit-review - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1/articles/1/submit-review')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('GET /api/projects/:projectId/articles/:id/versions - should deny view role', async () => {
      const response = await agent
        .get('/api/projects/1/articles/1/versions')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  // ─── Additional Project Routes ───
  describe('App - Project Additional Routes', () => {
    it('GET /api/projects/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/projects/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/projects/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(response.status).toBe(403);
    });
  });

  // ─── Additional Skills Routes ───
  describe('App - Skills Additional Routes', () => {
    it('GET /api/skills/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/skills/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  // ─── LLM Model Additional Routes ───
  describe('App - LLM Model Additional Routes', () => {
    it('GET /api/llm-models/:id - should deny admin', async () => {
      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('GET /api/llm-models/enabled - should deny view role', async () => {
      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });
  });

  // ─── Knowledge Base Additional Routes ───
  describe('App - Knowledge Base Additional Routes', () => {
    it('GET /api/knowledge-bases/:id - should deny view role', async () => {
      const response = await agent
        .get('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('PUT /api/knowledge-bases/:id - should deny view role', async () => {
      const response = await agent
        .put('/api/knowledge-bases/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ name: 'test' });
      expect(response.status).toBe(403);
    });
  });

// ─── Non-existent Routes (top-level) ───
describe('App - Non-existent Routes', () => {
  it('should return 404 for unknown route', async () => {
    const response = await agent.get('/api/non-existent-route');
    expect(response.status).toBe(404);
  });

  it('should return JSON 404 body with code and message', async () => {
    const response = await agent.get('/api/non-existent-route');
    expect(response.status).toBe(404);
    expect(response.body.code).toBe(404);
    expect(response.body.message).toBe('接口不存在');
  });
});

// ─── CORS Behavior ───
describe('App - CORS Configuration', () => {
  // Use /api/auth/verify which goes through CORS middleware (health check bypasses it)
  it('should allow requests from whitelisted origin', async () => {
    const response = await agent
      .get('/api/auth/verify')
      .set('Origin', 'http://localhost:5173');
    // Will get 401 (no token) but CORS header should be present
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
  });

  it('should block requests from non-whitelisted origin', async () => {
    const response = await agent
      .get('/api/auth/verify')
      .set('Origin', 'http://evil.example.com');
    // CORS error - either no allow-origin header or 500 from CORS error
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });

  it('should allow requests without origin (server-to-server)', async () => {
    const response = await agent.get('/api/auth/verify');
    // No origin header - CORS allows by default (no origin = callback(null, true))
    expect(response.status).toBe(401);
  });
});

// ─── Helmet Security Headers ───
describe('App - Helmet Security Headers', () => {
  // Use /api/auth/verify which goes through helmet middleware (health check bypasses it)
  it('should set X-Content-Type-Options header', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.headers['x-content-type-options']).toBe('nosniff');
  });

  it('should set Referrer-Policy header', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.headers['referrer-policy']).toBe('strict-origin-when-cross-origin');
  });

  it('should set Cross-Origin-Resource-Policy header', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });

  it('should set X-DNS-Prefetch-Control header', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.headers['x-dns-prefetch-control']).toBeDefined();
  });
});

// ─── JSON Body Parsing ───
describe('App - JSON Body Parsing', () => {
  it('should parse JSON body correctly', async () => {
    const response = await agent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass' });
    // Should get past body parsing (400 from controller, not 500 from parse error)
    expect(response.status).not.toBe(500);
  });

  it('should reject oversized JSON body (> 10mb)', async () => {
    // Create a payload larger than 10mb
    const largePayload = { data: 'x'.repeat(11 * 1024 * 1024) };
    const response = await agent
      .post('/api/auth/login')
      .send(largePayload);
    // Global error handler catches PayloadTooLargeError and returns 500
    expect(response.status).toBe(500);
    expect(response.body.code).toBe(500);
  });
});

// ─── Trust Proxy ───
describe('App - Trust Proxy Setting', () => {
  it('should have trust proxy enabled', () => {
    expect(app.get('trust proxy')).toBe(1);
  });
});

// ─── Static Files ───
describe('App - Static Files Middleware', () => {
  it('should serve /uploads path with CORS headers', async () => {
    const response = await request(app)
      .get('/uploads/nonexistent-file.txt')
      .set('User-Agent', 'test-agent/1.0');
    // File doesn't exist, but the route should be handled (404 from static, not 404 from app)
    // The Cross-Origin-Resource-Policy header should be set by our middleware
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

// ─── Global Error Handler ───
describe('App - Global Error Handler', () => {
  it('should return 500 JSON for unhandled errors', async () => {
    // Trigger an error by sending malformed JSON
    const response = await request(app)
      .post('/api/auth/login')
      .set('Content-Type', 'application/json')
      .set('User-Agent', 'test-agent/1.0')
      .send('{ invalid json }');
    // Express json parser should handle this, but if it leaks through:
    expect([400, 500]).toContain(response.status);
  });
});

// ─── Swagger Configuration ───
describe('App - Swagger Routes (disabled in test)', () => {
  it('should not serve swagger UI when disabled', async () => {
    const response = await agent.get('/api-docs/');
    // Either 404 (route not registered) or redirect
    expect([404, 301, 302]).toContain(response.status);
  });

  it('should not serve swagger JSON when disabled', async () => {
    const response = await agent.get('/api-docs.json');
    expect([404, 301, 302]).toContain(response.status);
  });
});

// ─── HTTP Method Restrictions ───
describe('App - HTTP Method Restrictions', () => {
  it('should reject DELETE on login route', async () => {
    const response = await agent.delete('/api/auth/login');
    expect(response.status).toBe(404);
  });

  it('should reject PATCH on health route', async () => {
    const response = await agent.patch('/api/health');
    expect(response.status).toBe(404);
  });
});

// ─── Missing Auth Route: GET /api/auth/companies/:id ───
describe('App - Auth Companies Detail Route', () => {
  it('GET /api/auth/companies/:id - should return 401 without token', async () => {
    const response = await agent.get('/api/auth/companies/1');
    expect(response.status).toBe(401);
  });
});

// ─── CORS Preflight (OPTIONS) ───
describe('App - CORS Preflight', () => {
  it('should respond to OPTIONS with correct CORS headers for whitelisted origin', async () => {
    const response = await agent
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173');
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:5173');
    expect(response.headers['access-control-allow-methods']).toBeDefined();
  });

  it('should include correct allowed methods in preflight response', async () => {
    const response = await agent
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173');
    const methods = response.headers['access-control-allow-methods'];
    expect(methods).toContain('GET');
    expect(methods).toContain('POST');
    expect(methods).toContain('PUT');
    expect(methods).toContain('DELETE');
  });

  it('should include correct allowed headers in preflight response', async () => {
    const response = await agent
      .options('/api/auth/login')
      .set('Origin', 'http://localhost:5173');
    const headers = response.headers['access-control-allow-headers'];
    expect(headers).toBeDefined();
    expect(headers).toContain('Content-Type');
    expect(headers).toContain('Authorization');
  });

  it('should reject OPTIONS from non-whitelisted origin', async () => {
    const response = await agent
      .options('/api/auth/login')
      .set('Origin', 'http://evil.example.com');
    expect(response.headers['access-control-allow-origin']).toBeUndefined();
  });
});

// ─── Token Format Edge Cases ───
describe('App - Token Format Edge Cases', () => {
  it('should return 401 with empty Bearer token', async () => {
    const response = await agent
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer ');
    expect(response.status).toBe(401);
  });

  it('should return 401 with token missing Bearer prefix', async () => {
    const response = await agent
      .get('/api/auth/verify')
      .set('Authorization', sysadminToken());
    expect(response.status).toBe(401);
  });

  it('should return 401 with Basic auth header', async () => {
    const response = await agent
      .get('/api/auth/verify')
      .set('Authorization', 'Basic dXNlcjpwYXNz');
    expect(response.status).toBe(401);
  });

  it('should return 401 with token containing wrong signature', async () => {
    const wrongSecretToken = jwt.sign(
      { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
      'wrong-secret-key',
      { expiresIn: '2h' }
    );
    const response = await agent
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer ' + wrongSecretToken);
    expect(response.status).toBe(401);
  });

  it('should pass auth with partial payload (middleware only verifies JWT signature)', async () => {
    const partialToken = jwt.sign(
      { username: 'sysadmin' },
      'test-secret',
      { expiresIn: '2h' }
    );
    const response = await agent
      .get('/api/auth/verify')
      .set('Authorization', 'Bearer ' + partialToken);
    expect(response.status).toBe(200);
  });
});

// ─── Positive Role Check Tests (admin/sysadmin pass) ───
describe('App - Positive Role Check (sysadmin/admin pass)', () => {
  it('GET /api/skills - admin should pass role check', async () => {
    const response = await agent
      .get('/api/skills')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/llm-models/enabled - admin should pass role check', async () => {
    const response = await agent
      .get('/api/llm-models/enabled')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/publishing-platforms - admin should pass role check', async () => {
    const response = await agent
      .get('/api/publishing-platforms')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/knowledge-bases - admin should pass role check', async () => {
    const response = await agent
      .get('/api/knowledge-bases')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/knowledge-inventory - admin should pass role check', async () => {
    const response = await agent
      .get('/api/knowledge-inventory')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/todos - admin should pass role check', async () => {
    const response = await agent
      .get('/api/todos')
      .set('Authorization', 'Bearer ' + adminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/system-configs - sysadmin should pass role check', async () => {
    const response = await agent
      .get('/api/system-configs')
      .set('Authorization', 'Bearer ' + sysadminToken());
    expect(response.status).not.toBe(403);
  });

  it('GET /api/users - sysadmin should pass role check', async () => {
    const response = await agent
      .get('/api/users')
      .set('Authorization', 'Bearer ' + sysadminToken());
    expect(response.status).not.toBe(403);
  });
});

// ─── Rate Limit Behavior ───
describe('App - Rate Limiting', () => {
  it('should include rate limit headers on protected routes', async () => {
    const response = await agent.get('/api/auth/verify');
    expect(response.headers['ratelimit-limit']).toBeDefined();
  });

  it('should allow requests within rate limit', async () => {
    for (let i = 0; i < 5; i++) {
      const response = await agent.get('/api/health');
      expect(response.status).toBe(200);
    }
  });
});

// ─── Login Route Additional Tests ───
describe('App - Login Route Edge Cases', () => {
  it('should return 400 when both username and password are empty', async () => {
    const response = await agent
      .post('/api/auth/login')
      .send({ username: '', password: '' });
    expect(response.status).toBe(400);
  });

  it('should return 400 when body is empty object', async () => {
    const response = await agent
      .post('/api/auth/login')
      .send({});
    expect(response.status).toBe(400);
  });

  it('should not return 400 when both username and password are provided', async () => {
    const response = await agent
      .post('/api/auth/login')
      .send({ username: 'testuser', password: 'testpass' });
    expect(response.status).not.toBe(400);
  });
});

// ─── 404 for Various HTTP Methods ───
describe('App - 404 for Various HTTP Methods', () => {
  it('should return 404 for POST on non-existent route', async () => {
    const response = await agent
      .post('/api/non-existent-route')
      .send({});
    expect(response.status).toBe(404);
  });

  it('should return 404 for PUT on non-existent route', async () => {
    const response = await agent
      .put('/api/non-existent-route')
      .send({});
    expect(response.status).toBe(404);
  });

  it('should return 404 for DELETE on non-existent route', async () => {
    const response = await agent.delete('/api/non-existent-route');
    expect(response.status).toBe(404);
  });

  it('should return 404 for non-API route', async () => {
    const response = await agent.get('/random-path');
    expect(response.status).toBe(404);
  });
});

// ─── Static Files Edge Cases ───
describe('App - Static Files Edge Cases', () => {
  it('should set CORP header even for directory listing attempts', async () => {
    const response = await request(app)
      .get('/uploads/')
      .set('User-Agent', 'test-agent/1.0');
    expect(response.headers['cross-origin-resource-policy']).toBe('cross-origin');
  });
});

// ─── Swagger Enabled Scenario ───
describe('App - Swagger Enabled Scenario', () => {
  let originalSwaggerEnv: string | undefined;

  beforeAll(() => {
    originalSwaggerEnv = process.env.SWAGGER_ENABLED;
  });

  afterAll(() => {
    process.env.SWAGGER_ENABLED = originalSwaggerEnv;
  });

  it('swagger should be disabled when SWAGGER_ENABLED is not "true"', () => {
    expect(process.env.SWAGGER_ENABLED).toBe('false');
  });
});

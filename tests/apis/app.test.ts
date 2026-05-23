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
process.env.RATE_LIMIT_MAX = '100';

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
      const response = await request(app).get('/api/health');
      expect(response.status).toBe(403);
    });

    it('should block requests with short User-Agent (< 10 chars)', async () => {
      const response = await request(app)
        .get('/api/health')
        .set('User-Agent', 'short');
      expect(response.status).toBe(403);
    });

    it('should allow requests with valid User-Agent', async () => {
      const response = await agent.get('/api/health');
      expect(response.status).toBe(200);
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
    expect(response.body.timestamp).toBeDefined();
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

describe('App - Non-existent Routes', () => {
  it('should return 404 for unknown route', async () => {
    const response = await agent.get('/api/non-existent-route');
    expect(response.status).toBe(404);
  });
});

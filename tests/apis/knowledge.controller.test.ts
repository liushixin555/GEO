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

function sysadminToken() {
  return jwt.sign({ userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 }, 'test-secret', { expiresIn: '2h' });
}

function adminToken(userId = 2, companyId = 2) {
  return jwt.sign({ userId, username: 'admin', role: 'admin', companyId }, 'test-secret', { expiresIn: '2h' });
}

function viewToken() {
  return jwt.sign({ userId: 3, username: 'viewer', role: 'view', companyId: 2 }, 'test-secret', { expiresIn: '2h' });
}

const PK = '/api/projects/1/knowledge';

function mockPrismaForAggregation(entityOverrides: Record<string, any> = {}) {
  const { getPrisma } = require('../../apis/utils/db.util');
  getPrisma.mockReturnValue({
    project: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
      }),
    },
    knowledgeBase: {
      findMany: jest.fn().mockResolvedValue([{ id: 10 }, { id: 20 }]),
    },
    ...entityOverrides,
  });
}

// ==================== Project Knowledge Aggregation ====================

describe('Project Knowledge Aggregation - Auth & Role', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 without token on keyword list', async () => {
    const res = await agent.get(`${PK}/keywords`);
    expect(res.status).toBe(401);
  });

  it('should return 403 for view role on keyword list', async () => {
    const res = await agent.get(`${PK}/keywords`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 for view role on portrait list', async () => {
    const res = await agent.get(`${PK}/portraits`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 for view role on image list', async () => {
    const res = await agent.get(`${PK}/images`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });
});

describe('Project Knowledge Keywords Aggregation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return aggregated keyword list for sysadmin', async () => {
    mockPrismaForAggregation({
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, keyword: 'SEO优化', createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
          { id: 2, baseId: 20, keyword: 'GEO增长', createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
    });

    const res = await agent.get(`${PK}/keywords`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    expect(res.body.data.list[0].keyword).toBe('SEO优化');
  });

  it('should return 400 for invalid projectId', async () => {
    const res = await agent.get('/api/projects/abc/knowledge/keywords').set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(400);
  });

  it('should return 403 when admin is not operator', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, operators: [{ userId: 5 }], viewers: [],
          company: { shortName: 'Other' },
        }),
      },
    });

    const res = await agent.get(`${PK}/keywords`).set('Authorization', `Bearer ${adminToken(2, 2)}`);
    expect(res.status).toBe(403);
  });

  it('should return empty list when no accessible knowledge bases', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, companyId: 2, status: true,
        }),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const res = await agent.get(`${PK}/keywords`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(0);
  });
});

describe('Project Knowledge Portraits Aggregation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return aggregated portrait list', async () => {
    mockPrismaForAggregation({
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, title: '画像1', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const res = await agent.get(`${PK}/portraits`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Project Knowledge Images Aggregation', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return aggregated image list', async () => {
    mockPrismaForAggregation({
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, title: '图片1', description: null, imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() },
        ]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const res = await agent.get(`${PK}/images`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

// ==================== Knowledge Base CRUD (base-scoped) ====================

describe('Knowledge Base Keywords CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should list keywords for a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO优化', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should create keyword in a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeKeyword: {
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.post('/api/knowledge-bases/10/keywords').set('Authorization', `Bearer ${sysadminToken()}`).send({ keyword: 'SEO' });
    expect(res.status).toBe(201);
    expect(res.body.data.keyword).toBe('SEO');
  });

  it('should update keyword as sysadmin', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = { id: 1, base_id: 10, keyword: 'SEO', created_by: 2, created_at: new Date(), updated_at: new Date() };
    getPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue([existing]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ ...existing, baseId: 10, createdBy: 2 }),
        update: jest.fn().mockResolvedValue({ ...existing, baseId: 10, createdBy: 2, keyword: 'Updated' }),
      },
      keywordExpandedWord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', `Bearer ${sysadminToken()}`).send({ keyword: 'Updated' });
    expect(res.status).toBe(200);
    expect(res.body.data.keyword).toBe('Updated');
  });

  it('should return 403 when non-creator admin tries to edit keyword', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = { id: 1, base_id: 10, keyword: 'SEO', created_by: 2, created_at: new Date(), updated_at: new Date() };
    getPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue([existing]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }),
      },
      keywordExpandedWord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', `Bearer ${adminToken(4, 2)}`).send({ keyword: 'Updated' });
    expect(res.status).toBe(403);
  });

  it('should delete keyword as sysadmin', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = { id: 1, base_id: 10, keyword: 'SEO', created_by: 2, created_at: new Date(), updated_at: new Date() };
    getPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue([existing]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }),
        delete: jest.fn().mockResolvedValue({}),
      },
      keywordExpandedWord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
  });

  it('should return 403 when non-creator admin tries to delete keyword', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = { id: 1, base_id: 10, keyword: 'SEO', created_by: 2, created_at: new Date(), updated_at: new Date() };
    getPrisma.mockReturnValue({
      $queryRaw: jest.fn().mockResolvedValue([existing]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }),
      },
      keywordExpandedWord: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    });

    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', `Bearer ${adminToken(4, 2)}`);
    expect(res.status).toBe(403);
  });
});

describe('Knowledge Base Portraits CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should list portraits for a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像1', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.get('/api/knowledge-bases/10/portraits').set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should create portrait in a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgePortrait: {
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '画像', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '画像', content: '内容' });
    expect(res.status).toBe(201);
  });

  it('should return 400 when title is missing', async () => {
    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', `Bearer ${sysadminToken()}`).send({ content: 'no title' });
    expect(res.status).toBe(400);
  });
});

describe('Knowledge Base Images CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should list images for a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '图片1', description: null, imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.get('/api/knowledge-bases/10/images').set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should create image in a knowledge base', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '图片', description: null, imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }),
      },
    });

    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '图片', image_url: '/uploads/test.png' });
    expect(res.status).toBe(201);
  });

  it('should return 400 when title is missing', async () => {
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', `Bearer ${sysadminToken()}`).send({ image_url: '/uploads/test.png' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when image_url is missing', async () => {
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '图片' });
    expect(res.status).toBe(400);
  });

  it('should update image title and description only', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', description: '旧描述', imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({ ...existing, title: '新标题', description: '新描述' }),
      },
    });

    const res = await agent.put('/api/knowledge-bases/10/images/1').set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '新标题', description: '新描述' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('新标题');
  });
});

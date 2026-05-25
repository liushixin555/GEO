/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '1000';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('../../apis/middleware/anti-crawl.middleware', () => ({
  antiCrawlMiddleware: (_req: any, _res: any, next: any) => next(),
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

const auth = (tokenFn = sysadminToken) => `Bearer ${tokenFn()}`;

function mockPrisma(overrides: Record<string, any> = {}) {
  const { getPrisma } = require('../../apis/utils/db.util');
  getPrisma.mockReturnValue({
    knowledgeBase: { findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true }) },
    ...overrides,
  });
}

// ==================== Auth & Role Guards ====================

describe('Knowledge Controller - Auth & Role Guards', () => {
  beforeEach(() => jest.clearAllMocks());

  test('未登录访问关键词列表返回401', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords');
    expect(res.status).toBe(401);
  });

  test('view角色访问关键词列表返回403', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问画像列表返回403', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问图片列表返回403', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/images').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问文档列表返回403', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/documents').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问知识清单返回403', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问项目关键词返回403', async () => {
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });
});

// ==================== Keywords CRUD ====================
// KeywordServiceImpl.getById uses $queryRaw (returns snake_case)
// KeywordServiceImpl.list uses findMany + count (returns camelCase, mapped to snake_case)

describe('Keywords - listKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取关键词列表', async () => {
    mockPrisma({
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的知识库ID');
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Keywords - getKeyword', () => {
  // KeywordServiceImpl.getById uses $queryRaw → returns snake_case rows
  // then listExpandedWords also uses $queryRaw
  beforeEach(() => jest.clearAllMocks());

  test('成功获取关键词详情', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]), // expanded words
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.keyword).toBe('SEO');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('关键词不存在');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]), // empty result
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Keywords - createKeyword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功创建关键词', async () => {
    mockPrisma({
      knowledgeKeyword: {
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: '新关键词', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth()).send({ keyword: '新关键词' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('创建关键词成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/keywords').set('Authorization', auth()).send({ keyword: 'test' });
    expect(res.status).toBe(400);
  });

  test('keyword为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('关键词不能为空');
  });

  test('知识库不存在返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/999/keywords').set('Authorization', auth()).send({ keyword: 'test' });
    expect(res.status).toBe(500);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        create: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth()).send({ keyword: 'test' });
    expect(res.status).toBe(500);
  });
});

describe('Keywords - updateKeyword', () => {
  // Chain: getById ($queryRaw x2) → update (findFirst + update + $queryRaw)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功更新关键词', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 2, created_at: new Date(), updated_at: new Date() }]) // getById
        .mockResolvedValueOnce([]) // getById expanded words
        .mockResolvedValueOnce([]), // update listExpandedWords
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: '旧', createdBy: 2 }),
        update: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: '新', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: '新' });
    expect(res.status).toBe(200);
    expect(res.body.data.keyword).toBe('新');
  });

  test('创建者本人成功更新关键词', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 2, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: '旧', createdBy: 2 }),
        update: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: '新', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken)).send({ keyword: '新' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/abc/keywords/1').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/abc').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 5, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken)).send({ keyword: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的关键词');
  });

  test('keyword为空返回400', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('关键词不能为空');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/999').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('Keywords - deleteKeyword', () => {
  // Chain: getById ($queryRaw x2) → delete (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功删除关键词', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 2, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2 }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('创建者本人成功删除关键词', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 2, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2 }),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/abc/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 5, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的关键词');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });
});

describe('Keywords - batchCreateKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功批量创建关键词', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockResolvedValue({ count: 3 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: ['A', 'B', 'C'], seed_word: '种子词' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/keywords/batch').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(400);
  });

  test('keywords非数组返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: 'not-array' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('参数验证失败');
  });

  test('keywords为空数组返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: [] });
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockRejectedValue(new Error('DB error')),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(500);
  });
});

describe('Keywords - expandKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
    expect(res.status).toBe(400);
  });

  test('keyword为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('关键词不能为空');
  });
});

// ==================== Portraits CRUD ====================
// PortraitServiceImpl uses findFirst/findMany (standard Prisma, camelCase → mapped to snake_case)

describe('Portraits - listPortraits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取画像列表', async () => {
    mockPrisma({
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像1', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/portraits').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Portraits - getPortrait', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取画像详情', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '画像1', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('画像1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '画像', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('画像不存在返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Portraits - createPortrait', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功创建画像', async () => {
    mockPrisma({
      knowledgePortrait: {
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '画像', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: '画像', content: '内容' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建画像成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/portraits').set('Authorization', auth()).send({ title: 'x', content: 'y' });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth()).send({ content: '内容' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('标题不能为空');
  });

  test('content为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: '标题' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('内容不能为空');
  });

  test('知识库不存在返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/999/portraits').set('Authorization', auth()).send({ title: 't', content: 'c' });
    expect(res.status).toBe(500);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: 't', content: 'c' });
    expect(res.status).toBe(500);
  });
});

describe('Portraits - updatePortrait', () => {
  // Chain: getById (findFirst) → permission check → update (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功更新画像', async () => {
    const existing = { id: 1, baseId: 10, title: '旧', content: '旧内容', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)          // getById
          .mockResolvedValueOnce(existing),          // update's internal findFirst
        update: jest.fn().mockResolvedValue({ ...existing, title: '新标题' }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/abc/portraits/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', content: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的画像');
  });

  test('画像不存在返回404 (getById throw)', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/999').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('Portraits - deletePortrait', () => {
  // Chain: getById (findFirst) → permission check → delete (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功删除画像', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(existing),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/abc/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', content: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的画像');
  });

  test('画像不存在返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });
});

// ==================== Images CRUD ====================

describe('Images - listImages', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取图片列表', async () => {
    mockPrisma({
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '图片1', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/images').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Images - getImage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取图片详情', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '图片1', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('图片1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/images/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/images/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '图片', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('图片不存在返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Images - createImage', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功创建图片', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null), // no dup title, no dup URL
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '图片', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建图片成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/images').set('Authorization', auth()).send({ title: 'x', image_url: '/y' });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ image_url: '/test.png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('标题不能为空');
  });

  test('image_url为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('图片地址不能为空');
  });

  test('标题重复返回409', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, baseId: 10, title: '重复标题' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '重复标题', image_url: '/test.png' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同标题的图片');
  });

  test('图片URL重复返回409', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)            // title not dup
          .mockResolvedValueOnce({ id: 3, baseId: 10, imageUrl: '/dup.png' }), // URL dup
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '新标题', image_url: '/dup.png' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同的图片');
  });

  test('知识库不存在返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/999/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(500);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(500);
  });
});

describe('Images - updateImage', () => {
  // Chain: getById (findFirst) → permission → title dup check (findFirst) → update (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功更新图片', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', imageUrl: '/test.png', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)     // getById
          .mockResolvedValueOnce(null)          // title dup check (no dup)
          .mockResolvedValueOnce(existing),     // update's internal findFirst
        update: jest.fn().mockResolvedValue({ ...existing, title: '新标题', description: '新描述' }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: '新标题', description: '新描述' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('新标题');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/abc/images/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/images/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', imageUrl: '/y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的图片');
  });

  test('新标题与其他重复返回409', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({ id: 2, baseId: 10, title: '重复标题' }),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: '重复标题' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同标题的图片');
  });

  test('图片不存在返回404 (getById throw)', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/999').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('Images - deleteImage', () => {
  // Chain: getById (findFirst) → permission → delete (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功删除图片', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(existing),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/abc/images/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', imageUrl: '/y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的图片');
  });

  test('图片不存在返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });
});

// ==================== Documents CRUD ====================

describe('Documents - listDocuments', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取文档列表', async () => {
    mockPrisma({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '文档1', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/documents').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Documents - getDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取文档详情', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '文档1', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('文档1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/documents/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '文档', fileName: 'x.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('文档不存在返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Documents - createDocument', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功创建文档', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: '文档', fileName: 'test.pdf', fileUrl: '/test.pdf', fileType: 'pdf', fileSize: 1024, createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '文档', file_url: '/test.pdf', file_name: 'test.pdf', file_type: 'pdf', file_size: 1024 });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建文档成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('标题不能为空');
  });

  test('file_url为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('文档地址不能为空');
  });

  test('file_name为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('文件名不能为空');
  });

  test('file_type为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('文件类型不能为空');
  });

  test('file_size为空返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('文件大小必须为正数');
  });

  test('标题重复返回409', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, baseId: 10, title: '重复' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '重复', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同标题的文档');
  });

  test('文件URL重复返回409', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 3, baseId: 10, fileUrl: '/dup.pdf' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '新文档', file_url: '/dup.pdf', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同的文档');
  });

  test('知识库不存在返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/999/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(500);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(500);
  });
});

describe('Documents - updateDocument', () => {
  // Chain: getById (findFirst) → permission → title dup check (findFirst) → update (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功更新文档', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', fileName: 'test.pdf', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)      // getById
          .mockResolvedValueOnce(null)           // title dup check
          .mockResolvedValueOnce(existing),      // update's internal findFirst
        update: jest.fn().mockResolvedValue({ ...existing, title: '新标题' }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/abc/documents/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', fileName: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的文档');
  });

  test('新标题与其他重复返回409', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({ id: 2, baseId: 10, title: '重复标题' }),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: '重复标题' });
    expect(res.status).toBe(409);
    expect(res.body.message).toBe('该知识库已存在相同标题的文档');
  });

  test('文档不存在返回404 (getById null)', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/999').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });
});

describe('Documents - deleteDocument', () => {
  // Chain: getById (findFirst) → permission → delete (findFirst + update)
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功删除文档', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(existing),
        update: jest.fn().mockResolvedValue({}),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/abc/documents/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', fileName: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的文档');
  });

  test('文档不存在返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });
});

// ==================== Project Knowledge Aggregation ====================

describe('Project Knowledge - listProjectKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/v1/projects/abc/knowledge/keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectPortraits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/v1/projects/abc/knowledge/portraits').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectImages', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/v1/projects/abc/knowledge/images').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectDocuments', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/v1/projects/abc/knowledge/documents').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

// ==================== Knowledge Inventory ====================

describe('Knowledge Inventory - listInventory', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无知识库时返回空统计', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.stats.total).toBe(0);
    expect(res.body.data.list).toHaveLength(0);
  });

  test('成功获取知识清单含统计数据', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgePortrait: {
        count: jest.fn().mockResolvedValue(3),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgeImage: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.stats.keyword).toBe(5);
    expect(res.body.data.stats.portrait).toBe(3);
    expect(res.body.data.stats.image).toBe(2);
    expect(res.body.data.stats.document).toBe(1);
    expect(res.body.data.stats.total).toBe(11);
  });

  test('支持category过滤', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(5),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(3), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=keyword').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

// ==================== Mined Keywords ====================

describe('Mined Keywords - listMinedKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功获取挖掘关键词列表', async () => {
    mockPrisma({
      minedKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'AI营销', selected: true, createdBy: 1, createdAt: new Date() }]),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/abc/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - mineKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(400);
  });

  test('知识库无内容返回400', async () => {
    mockPrisma({
      knowledgeDocument: { findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('知识库中暂无内容可供挖掘');
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: { findMany: jest.fn().mockRejectedValue(new Error('DB error')) },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'document' });
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - saveMinedKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/abc/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(400);
  });

  test('keywords非数组返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: 'not-array' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('参数验证失败');
  });

  test('keywords为空数组返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: [] });
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockRejectedValue(new Error('DB error')),
        findMany: jest.fn().mockResolvedValue([]),
      },
      minedKeyword: {
        updateMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
      $transaction: jest.fn((cb: Function) => cb()),
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - toggleMinedKeywordsBatch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/abc/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1, 2], selected: true });
    expect(res.status).toBe(400);
  });

  test('ids非数组返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: 'not-array', selected: true });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('参数验证失败');
  });

  test('ids为空数组返回400', async () => {
    const res = await agent.put('/api/v1/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [], selected: true });
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        updateMany: jest.fn().mockRejectedValue(new Error('DB error')),
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1], selected: true });
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - deleteMinedKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功清空挖掘关键词', async () => {
    mockPrisma({
      minedKeyword: {
        updateMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('已清空挖掘关键词');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/abc/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        updateMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

// ==================== checkBaseAccess - Company Scope ====================

describe('checkBaseAccess - company scope (admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin访问company范围知识库(同公司)成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 2, status: true, company: { shortName: '测试公司' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('admin访问company范围知识库(不同公司)返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他公司' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });

  test('admin访问company范围知识库(用户不存在)返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 2, status: true, company: { shortName: '公司' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== checkBaseAccess - Project Scope ====================

describe('checkBaseAccess - project scope (admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin访问project范围知识库(是运营者)成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'project', projectId: 1, status: true, company: null, project: { shortName: '项目A' }, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
          viewers: [],
        }),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  test('admin访问project范围知识库(无project_id)返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'project', projectId: null, status: true, company: null, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });

  test('admin访问project范围知识库(非运营者)返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'project', projectId: 1, status: true, company: null, project: { shortName: '项目A' }, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

// ==================== expandKeywords - success ====================

describe('Keywords - expandKeywords success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功扩词返回关键词列表', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: 'SEO优化\n搜索引擎优化\n网站排名\n关键词分析' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      llmModel: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test-model', apiKey: 'test-key' }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
    expect(res.status).toBe(200);
    expect(res.body.data).toContain('SEO优化');
    axios.post.mockRestore();
  });
});

// ==================== Project Knowledge - success paths ====================

describe('Project Knowledge - listProjectKeywords success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin(运营者)成功获取项目关键词', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, shortName: '项目A', deletedAt: null }), // getAccessibleBaseIds
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10 }]), // getAccessibleBaseIds
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('admin(非运营者)获取项目关键词返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

describe('Project Knowledge - listProjectPortraits success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin(运营者)成功获取项目画像', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, shortName: '项目A', deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像1', content: '内容', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Project Knowledge - listProjectImages success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin(运营者)成功获取项目图片', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, shortName: '项目A', deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '图片1', imageUrl: '/test.png', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/images').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Project Knowledge - listProjectDocuments success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin(运营者)成功获取项目文档', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, shortName: '项目A', deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '文档1', fileName: 'test.pdf', createdBy: 2, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

// ==================== listInventory - comprehensive coverage ====================

describe('Knowledge Inventory - comprehensive', () => {
  beforeEach(() => jest.clearAllMocks());

  test('含图片和文档(有创建者)的知识清单', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, title: '图片1', createdBy: 1, updatedAt: new Date() },
          { id: 2, baseId: 10, title: '图片2', createdBy: 2, updatedAt: new Date() },
        ]),
      },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, title: '文档1', fileName: 'test.pdf', createdBy: 1, updatedAt: new Date() },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }, { id: 2, cnName: '用户2' }]),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.stats.image).toBe(2);
    expect(res.body.data.stats.document).toBe(1);
    expect(res.body.data.list).toHaveLength(3);
  });

  test('搜索文档时使用OR条件匹配文件名', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, title: '文档1', fileName: 'report.pdf', createdBy: 1, updatedAt: new Date() },
        ]),
      },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=document&search=report').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('所有条目无创建者时显示"-"', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, keyword: 'SEO', createdBy: null, updatedAt: new Date() },
        ]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].creatorName).toBe('-');
  });
});

// ==================== mineKeywords - success ====================

describe('Mined Keywords - mineKeywords success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功挖掘关键词', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: 'AI营销\n数字营销\n搜索引擎\n内容优化\n社交媒体' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: { findMany: jest.fn().mockResolvedValue([{ id: 1, title: '文档1', description: '描述' }]) },
      knowledgePortrait: { findMany: jest.fn().mockResolvedValue([{ id: 1, title: '画像1', content: '内容' }]) },
      knowledgeImage: { findMany: jest.fn().mockResolvedValue([]) },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])  // addMinedKeywords: no existing keywords
          .mockResolvedValueOnce([    // listByBase: return all mined keywords
            { id: 1, baseId: 10, keyword: 'AI营销', selected: false, createdBy: 1, createdAt: new Date() },
            { id: 2, baseId: 10, keyword: '数字营销', selected: false, createdBy: 1, createdAt: new Date() },
          ]),
        createMany: jest.fn().mockResolvedValue({ count: 5 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(200);
    expect(res.body.data.mined).toBe(5);
    expect(res.body.data.list).toHaveLength(2);
    axios.post.mockRestore();
  });
});

// ==================== saveMinedKeywords - success ====================

describe('Mined Keywords - saveMinedKeywords success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功保存挖掘关键词', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockPrismaInstance = {
      knowledgeKeyword: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      minedKeyword: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn((cb: Function) => cb()),
    };
    getPrisma.mockReturnValue(mockPrismaInstance);
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['AI营销', '数字营销'] });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('成功保存');
  });
});

// ==================== toggleMinedKeywordsBatch - success ====================

describe('Mined Keywords - toggleMinedKeywordsBatch success', () => {
  beforeEach(() => jest.clearAllMocks());

  test('成功批量切换选中状态', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      minedKeyword: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, keyword: 'AI营销', selected: true, createdBy: 1, createdAt: new Date() },
          { id: 2, baseId: 10, keyword: '数字营销', selected: true, createdBy: 1, createdAt: new Date() },
        ]),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1, 2], selected: true });
    expect(res.status).toBe(200);
    expect(res.body.data).toHaveLength(2);
  });
});

// ==================== Remaining uncovered error paths ====================

describe('expandKeywords - LLM error', () => {
  beforeEach(() => jest.clearAllMocks());

  test('LLM调用失败返回500', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockRejectedValue(new Error('LLM连接超时'));
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      llmModel: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test-model', apiKey: 'test-key' }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('智能扩词失败');
    axios.post.mockRestore();
  });
});

describe('Project Knowledge - error paths', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectPortraits服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取画像列表失败');
  });

  test('listProjectImages服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/images').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取图片列表失败');
  });

  test('listProjectDocuments服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取文档列表失败');
  });
});

// ==================== Inventory - mixed creator coverage ====================

describe('Knowledge Inventory - mixed creators', () => {
  beforeEach(() => jest.clearAllMocks());

  test('部分条目有创建者部分无创建者正确显示名称', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, keyword: '有创建者', createdBy: 1, updatedAt: new Date() },
          { id: 2, baseId: 10, keyword: '无创建者', createdBy: null, updatedAt: new Date() },
        ]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    const withCreator = res.body.data.list.find((i: any) => i.name === '有创建者');
    const withoutCreator = res.body.data.list.find((i: any) => i.name === '无创建者');
    expect(withCreator.creatorName).toBe('管理员');
    expect(withoutCreator.creatorName).toBe('-');
  });
});

// ==================== checkProjectOperator - sysadmin bypass ====================

describe('checkProjectOperator - sysadmin bypass', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin访问项目关键词无需运营者身份', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他' } }],
          viewers: [],
        }),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
  });
});

// ==================== checkBaseAccess - platform scope for admin ====================

describe('checkBaseAccess - platform scope (admin)', () => {
  beforeEach(() => jest.clearAllMocks());

  test('admin访问platform范围知识库成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'platform', status: true, company: null, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });
});

// ==================== Error catch - specific error message branches ====================

describe('Error catch - getKeyword 知识库不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getKeyword中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - updateKeyword 关键词不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateKeyword中service.update抛出关键词不存在返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 1, baseId: 10, keyword: '旧', createdBy: 1 }).mockResolvedValueOnce(null),
        update: jest.fn().mockRejectedValue(new Error('关键词不存在')),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: '新' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('更新关键词失败');
  });
});

describe('Error catch - deleteKeyword 关键词不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteKeyword中service.delete抛出关键词不存在返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValueOnce({ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1 }).mockResolvedValueOnce(null),
        update: jest.fn().mockRejectedValue(new Error('关键词不存在')),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('删除关键词失败');
  });
});

describe('Error catch - batchCreateKeywords with duplicates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('批量创建含重复项返回成功消息含跳过信息', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([{ keyword: 'A' }, { keyword: 'B' }]),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: ['A', 'B', 'C'], seed_word: '种子' });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('已存在被跳过');
  });

  test('批量创建知识库不存在返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockRejectedValue(new Error('知识库不存在')),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/999/keywords/batch').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('批量创建关键词失败');
  });
});

// ==================== Error catch - portrait specific branches ====================

describe('Error catch - listPortraits 知识库不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listPortraits中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - getPortrait multi-branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getPortrait中checkBaseAccess抛出知识库不存在', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - updatePortrait 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updatePortrait中service.update抛出非画像不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: '旧', content: '旧内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('更新画像失败');
  });
});

describe('Error catch - deletePortrait 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deletePortrait中service.delete抛出非画像不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('删除画像失败');
  });
});

// ==================== Error catch - image specific branches ====================

describe('Error catch - listImages 知识库不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listImages中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - getImage multi-branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getImage中checkBaseAccess抛出知识库不存在', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - updateImage 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateImage中service.update抛出非图片不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('更新图片失败');
  });
});

describe('Error catch - deleteImage 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteImage中service.delete抛出非图片不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('删除图片失败');
  });
});

// ==================== Error catch - document specific branches ====================

describe('Error catch - listDocuments 知识库不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listDocuments中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - getDocument multi-branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('getDocument中checkBaseAccess抛出知识库不存在', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - updateDocument 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateDocument中service.update抛出非文档不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('更新文档失败');
  });
});

describe('Error catch - deleteDocument 500 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteDocument中service.delete抛出非文档不存在异常返回500', async () => {
    const existing = { id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockRejectedValueOnce(new Error('DB crash')),
        update: jest.fn(),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('删除文档失败');
  });
});

// ==================== updateImage/Document - title unchanged path ====================

describe('updateImage - title unchanged skip dup check', () => {
  beforeEach(() => jest.clearAllMocks());

  test('标题未变时跳过重复检查直接更新', async () => {
    const existing = { id: 1, baseId: 10, title: '标题', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)     // getById
          .mockResolvedValueOnce(existing),    // update's internal findFirst (no dup check since title same)
        update: jest.fn().mockResolvedValue({ ...existing, description: '新描述' }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/images/1').set('Authorization', auth()).send({ description: '新描述' });
    expect(res.status).toBe(200);
  });
});

describe('updateDocument - title unchanged skip dup check', () => {
  beforeEach(() => jest.clearAllMocks());

  test('标题未变时跳过重复检查直接更新', async () => {
    const existing = { id: 1, baseId: 10, title: '标题', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce(existing),
        update: jest.fn().mockResolvedValue({ ...existing, description: '新描述' }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ description: '新描述' });
    expect(res.status).toBe(200);
  });
});

// ==================== mineKeywords - individual source types ====================

describe('mineKeywords - source_type=document only', () => {
  beforeEach(() => jest.clearAllMocks());

  test('仅从文档挖掘关键词', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '文档关键词1\n文档关键词2' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: { findMany: jest.fn().mockResolvedValue([{ id: 1, title: '文档1', description: '描述' }]) },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '文档关键词1', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'document' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

describe('mineKeywords - source_type=portrait only', () => {
  beforeEach(() => jest.clearAllMocks());

  test('仅从画像挖掘关键词', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '画像关键词1\n画像关键词2' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgePortrait: { findMany: jest.fn().mockResolvedValue([{ id: 1, title: '画像1', content: '内容' }]) },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '画像关键词1', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'portrait' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

describe('mineKeywords - source_type=image only', () => {
  beforeEach(() => jest.clearAllMocks());

  test('仅从图片挖掘关键词', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '图片关键词1\n图片关键词2' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: { findMany: jest.fn().mockResolvedValue([{ id: 1, title: '图片1', description: '描述' }]) },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '图片关键词1', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'image' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

describe('mineKeywords - 知识库不存在返回404', () => {
  beforeEach(() => jest.clearAllMocks());

  test('mineKeywords中checkBaseAccess抛出知识库不存在', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth(adminToken)).send({ source_type: 'all' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== listInventory - search by keyword/portrait/image ====================

describe('Knowledge Inventory - search keyword', () => {
  beforeEach(() => jest.clearAllMocks());

  test('搜索关键词时使用contains条件', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO优化', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=keyword&search=SEO').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Knowledge Inventory - search portrait', () => {
  beforeEach(() => jest.clearAllMocks());

  test('搜索画像时使用contains条件', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '目标画像', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=portrait&search=目标').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Knowledge Inventory - search image', () => {
  beforeEach(() => jest.clearAllMocks());

  test('搜索图片时使用contains条件', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '目标图片', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=image&search=目标').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

// ==================== listInventory - project scope base ====================

describe('Knowledge Inventory - project scope base', () => {
  beforeEach(() => jest.clearAllMocks());

  test('项目范围知识库显示project_name', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'project', project_name: '项目A', company_name: null, project: { shortName: '项目A' }, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].scope).toBe('project');
  });
});

describe('Knowledge Inventory - company scope base', () => {
  beforeEach(() => jest.clearAllMocks());

  test('公司范围知识库显示company_name', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'company', company_name: '测试公司', project_name: null, project: null, company: { shortName: '测试公司' } }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].scope).toBe('company');
  });
});

// ==================== Mined Keywords - specific error branches ====================

describe('Mined Keywords - saveMinedKeywords 知识库不存在', () => {
  beforeEach(() => jest.clearAllMocks());

  test('saveMinedKeywords中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth(adminToken)).send({ keywords: ['A'] });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Mined Keywords - toggleMinedKeywordsBatch 知识库不存在', () => {
  beforeEach(() => jest.clearAllMocks());

  test('toggleMinedKeywordsBatch中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth(adminToken)).send({ ids: [1], selected: true });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Mined Keywords - deleteMinedKeywords 知识库不存在', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteMinedKeywords中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Mined Keywords - listMinedKeywords 知识库不存在', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listMinedKeywords中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/mined-keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== listKeywords 知识库不存在 branch ====================

describe('Error catch - listKeywords 知识库不存在 branch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listKeywords中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.get('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== createKeyword/Portrait/Image/Document 知识库不存在 ====================

describe('Error catch - createKeyword 知识库不存在', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createKeyword中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords').set('Authorization', auth(adminToken)).send({ keyword: 'test' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - createPortrait 知识库不存在 via checkBaseAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createPortrait中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/portraits').set('Authorization', auth(adminToken)).send({ title: 't', content: 'c' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - createImage 知识库不存在 via checkBaseAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createImage中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/images').set('Authorization', auth(adminToken)).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

describe('Error catch - createDocument 知识库不存在 via checkBaseAccess', () => {
  beforeEach(() => jest.clearAllMocks());

  test('createDocument中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/documents').set('Authorization', auth(adminToken)).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== Project Knowledge - sysadmin success paths ====================

describe('Project Knowledge - sysadmin listProjectKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('sysadmin成功获取项目关键词(无运营者身份)', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 99, user: { id: 99, cnName: '其他' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, shortName: '项目A', deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10 }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });
});

describe('Project Knowledge - listProjectKeywords error 500', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectKeywords服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取关键词列表失败');
  });
});

// ==================== Inventory - pagination ====================

describe('Knowledge Inventory - pagination', () => {
  beforeEach(() => jest.clearAllMocks());

  test('分页参数正确工作', async () => {
    const items = Array.from({ length: 5 }, (_, i) => ({
      id: i + 1, baseId: 10, keyword: `关键词${i + 1}`, createdBy: 1, updatedAt: new Date(),
    }));
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(5), findMany: jest.fn().mockResolvedValue(items) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?page=2&pageSize=2').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.total).toBe(5);
    expect(res.body.data.list).toHaveLength(2);
  });
});

// ==================== Inventory - no creator IDs ====================

describe('Knowledge Inventory - no creator IDs to batch lookup', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无创建者ID时跳过批量查询用户', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].creatorName).toBe('-');
  });
});

// ==================== Inventory - multiple bases ====================

describe('Knowledge Inventory - multiple bases', () => {
  beforeEach(() => jest.clearAllMocks());

  test('多个知识库的内容合并展示', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([
          { id: 10, name: '库A', scope: 'platform', project: null, company: null },
          { id: 11, name: '库B', scope: 'platform', project: null, company: null },
        ]),
        count: jest.fn().mockResolvedValue(2),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(2),
        findMany: jest.fn().mockResolvedValue([
          { id: 1, baseId: 10, keyword: '关键词A', createdBy: 1, updatedAt: new Date() },
          { id: 2, baseId: 11, keyword: '关键词B', createdBy: 1, updatedAt: new Date() },
        ]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    const names = res.body.data.list.map((i: any) => i.baseName);
    expect(names).toContain('库A');
    expect(names).toContain('库B');
  });
});

// ==================== saveMinedKeywords - success with duplicates ====================

describe('Mined Keywords - saveMinedKeywords with duplicates', () => {
  beforeEach(() => jest.clearAllMocks());

  test('保存含重复关键词返回跳过信息', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockPrismaInstance = {
      knowledgeKeyword: {
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
        findMany: jest.fn().mockResolvedValue([{ keyword: 'A' }]),
      },
      minedKeyword: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
      $transaction: jest.fn((cb: Function) => cb()),
    };
    getPrisma.mockReturnValue(mockPrismaInstance);
    const res = await agent.post('/api/v1/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['A', 'B'] });
    expect(res.status).toBe(200);
    expect(res.body.message).toContain('已存在被跳过');
  });
});

// ==================== 补全覆盖：updateKeyword 关键词不存在 error branch ====================

describe('Keywords - updateKeyword 关键词不存在 error catch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('update中service.findFirst返回null抛出关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: '新' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('关键词不存在');
  });
});

// ==================== 补全覆盖：deleteKeyword 关键词不存在 error branch ====================

describe('Keywords - deleteKeyword 关键词不存在 error catch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('delete中service.findFirst返回null抛出关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('关键词不存在');
  });
});

// ==================== 补全覆盖：Portraits invalid id ====================

describe('Portraits - getPortrait 无效的id返回400', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的portrait id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/portraits/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的画像ID');
  });
});

// ==================== 补全覆盖：Images invalid id ====================

describe('Images - getImage 无效的id返回400', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的image id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/images/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的图片ID');
  });
});

// ==================== 补全覆盖：Documents invalid id ====================

describe('Documents - getDocument 无效的id返回400', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的document id返回400', async () => {
    const res = await agent.get('/api/v1/knowledge-bases/10/documents/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的文档ID');
  });
});

// ==================== 补全覆盖：Project Knowledge list error branches ====================

describe('Project Knowledge - listProjectPortraits error 500', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectPortraits服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取画像列表失败');
  });
});

describe('Project Knowledge - listProjectImages error 500', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectImages服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/images').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取图片列表失败');
  });
});

describe('Project Knowledge - listProjectDocuments error 500', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectDocuments服务异常返回500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn()
          .mockResolvedValueOnce({
            id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
            company: { shortName: '公司' },
            operators: [{ userId: 2, user: { id: 2, cnName: '管理员' } }],
            viewers: [],
          })
          .mockResolvedValueOnce({ id: 1, deletedAt: null }),
        count: jest.fn().mockResolvedValue(0),
      },
      knowledgeBase: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockResolvedValue(0),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('获取文档列表失败');
  });
});

// ==================== 补全覆盖：Inventory category=portrait with creator ====================

describe('Knowledge Inventory - category=portrait with creator', () => {
  beforeEach(() => jest.clearAllMocks());

  test('按画像分类查询显示创建者名称', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '画像A', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=portrait').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].creatorName).toBe('管理员');
  });
});

// ==================== 补全覆盖：Inventory category=image ====================

describe('Knowledge Inventory - category=image with creator', () => {
  beforeEach(() => jest.clearAllMocks());

  test('按图片分类查询显示创建者名称', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '图片A', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=image').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].creatorName).toBe('管理员');
  });
});

// ==================== 补全覆盖：Inventory category=document ====================

describe('Knowledge Inventory - category=document with creator', () => {
  beforeEach(() => jest.clearAllMocks());

  test('按文档分类查询显示创建者名称', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '文档A', createdBy: 1, updatedAt: new Date() }]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=document').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].creatorName).toBe('管理员');
  });
});

// ==================== 补全覆盖：Inventory search=document with OR condition ====================

describe('Knowledge Inventory - search document with OR condition', () => {
  beforeEach(() => jest.clearAllMocks());

  test('搜索文档时使用OR条件查询标题和文件名', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, title: '报告', fileName: '报告.pdf', createdBy: 1, updatedAt: new Date() }]),
      },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: '管理员' }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory?category=document&search=报告').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.list[0].name).toBe('报告');
  });
});

// ==================== 补全覆盖：mineKeywords default source_type=all ====================

describe('mineKeywords - default source_type=all', () => {
  beforeEach(() => jest.clearAllMocks());

  test('不指定source_type默认为all', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '关键词1\n关键词2' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([{ title: '文档1', description: '描述' }]),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ title: '画像1', content: '内容' }]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ title: '图片1', description: '描述' }]),
      },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '关键词1', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({});
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

// ==================== 补全覆盖：mineKeywords with descriptions ====================

describe('mineKeywords - all source types with descriptions', () => {
  beforeEach(() => jest.clearAllMocks());

  test('挖掘关键词包含描述字段', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '关键词A\n关键词B' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([{ title: '文档1', description: '文档描述' }]),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ title: '画像1', content: '画像内容' }]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ title: '图片1', description: '图片描述' }]),
      },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '关键词A', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

// ==================== 补全覆盖：mineKeywords error 500 ====================

describe('mineKeywords - 知识库不存在返回404 via service', () => {
  beforeEach(() => jest.clearAllMocks());

  test('mineKeywords中checkBaseAccess抛出知识库不存在返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'company', companyId: 99, status: true, company: { shortName: '其他' }, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
      user: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, companyId: 2, deletedAt: null }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth(adminToken)).send({ source_type: 'all' });
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });
});

// ==================== 补全覆盖：Inventory creator not found fallback ====================

describe('Knowledge Inventory - creator not in user table', () => {
  beforeEach(() => jest.clearAllMocks());

  test('创建者ID存在但用户表中无记录时显示"-"', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 999, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].creatorName).toBe('-');
  });
});

// ==================== 第二轮补全：17个用例覆盖剩余分支 ====================

// 1. updateKeyword generic error → 500
describe('Keywords - updateKeyword generic error', () => {
  beforeEach(() => jest.clearAllMocks());

  test('updateKeyword中service抛出非关键词不存在异常返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockRejectedValue(new Error('DB连接失败')),
      },
    });
    const res = await agent.put('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: '新' });
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('更新关键词失败');
  });
});

// 2. deleteKeyword generic error → 500
describe('Keywords - deleteKeyword generic error', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteKeyword中service抛出非关键词不存在异常返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
      knowledgeKeyword: {
        findFirst: jest.fn().mockRejectedValue(new Error('DB连接失败')),
      },
    });
    const res = await agent.delete('/api/v1/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(500);
    expect(res.body.message).toBe('删除关键词失败');
  });
});

// 3. deletePortrait invalid id → 400
describe('Portraits - deletePortrait 无效id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deletePortrait无效的画像ID返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/10/portraits/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的画像ID');
  });
});

// 4. deleteImage invalid id → 400
describe('Images - deleteImage 无效id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteImage无效的图片ID返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/10/images/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的图片ID');
  });
});

// 5. deleteDocument invalid id → 400
describe('Documents - deleteDocument 无效id', () => {
  beforeEach(() => jest.clearAllMocks());

  test('deleteDocument无效的文档ID返回400', async () => {
    const res = await agent.delete('/api/v1/knowledge-bases/10/documents/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('无效的文档ID');
  });
});

// 6. listProjectPortraits admin non-operator → 403
describe('Project Knowledge - listProjectPortraits admin非运营者', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectPortraits admin非运营者返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

// 7. listProjectImages admin non-operator → 403
describe('Project Knowledge - listProjectImages admin非运营者', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectImages admin非运营者返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/images').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

// 8. listProjectDocuments admin non-operator → 403
describe('Project Knowledge - listProjectDocuments admin非运营者', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectDocuments admin非运营者返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

// 9-12. Inventory baseId not in baseMap fallback
describe('Knowledge Inventory - baseId not in baseMap fallbacks', () => {
  beforeEach(() => jest.clearAllMocks());

  test('关键词baseId不在baseMap中使用默认值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 999, keyword: 'SEO', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].baseName).toBe('-');
    expect(res.body.data.list[0].projectName).toBe('-');
  });

  test('画像baseId不在baseMap中使用默认值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 999, title: '画像', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].baseName).toBe('-');
    expect(res.body.data.list[0].projectName).toBe('-');
  });

  test('图片baseId不在baseMap中使用默认值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 999, title: '图片', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].baseName).toBe('-');
    expect(res.body.data.list[0].projectName).toBe('-');
  });

  test('文档baseId不在baseMap中使用默认值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 999, title: '文档', createdBy: null, updatedAt: new Date() }]),
      },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].baseName).toBe('-');
    expect(res.body.data.list[0].projectName).toBe('-');
  });
});

// 13. platform scope without project_name/company_name → "平台"
describe('Knowledge Inventory - platform scope fallback', () => {
  beforeEach(() => jest.clearAllMocks());

  test('platform范围知识库无project_name和company_name时显示"平台"', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project_name: null, company_name: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: null, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].projectName).toBe('平台');
  });
});

// 14. creator with null cnName → show "-"
describe('Knowledge Inventory - creator null cnName', () => {
  beforeEach(() => jest.clearAllMocks());

  test('创建者cnName为null时显示"-"', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([{ id: 10, name: '测试库', scope: 'platform', project: null, company: null }]),
        count: jest.fn().mockResolvedValue(1),
      },
      knowledgeKeyword: {
        count: jest.fn().mockResolvedValue(1),
        findMany: jest.fn().mockResolvedValue([{ id: 1, baseId: 10, keyword: 'SEO', createdBy: 1, updatedAt: new Date() }]),
      },
      knowledgePortrait: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      knowledgeDocument: { count: jest.fn().mockResolvedValue(0), findMany: jest.fn().mockResolvedValue([]) },
      user: { findMany: jest.fn().mockResolvedValue([{ id: 1, cnName: null }]) },
    });
    const res = await agent.get('/api/v1/knowledge-bases/inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list[0].creatorName).toBe('-');
  });
});

// 15-17. mineKeywords without description/content
describe('mineKeywords - without optional fields', () => {
  beforeEach(() => jest.clearAllMocks());

  test('文档无描述字段时省略描述部分', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '关键词A' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([{ title: '文档1' }]),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '关键词A', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'document' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });

  test('画像无内容字段时省略内容部分', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '关键词A' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ title: '画像1' }]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '关键词A', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'portrait' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });

  test('图片无描述字段时省略描述部分', async () => {
    const axios = require('axios');
    jest.spyOn(axios, 'post').mockResolvedValue({
      data: { choices: [{ message: { content: '关键词A' } }] },
    });
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeDocument: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ title: '图片1' }]),
      },
      llmModel: { findFirst: jest.fn().mockResolvedValue({ id: 1, baseUrl: 'http://localhost:11434', modelName: 'test', apiKey: 'key' }) },
      minedKeyword: {
        findMany: jest.fn()
          .mockResolvedValueOnce([])
          .mockResolvedValueOnce([{ id: 1, baseId: 10, keyword: '关键词A', selected: false, createdBy: 1, createdAt: new Date() }]),
        createMany: jest.fn().mockResolvedValue({ count: 1 }),
      },
    });
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'image' });
    expect(res.status).toBe(200);
    axios.post.mockRestore();
  });
});

// ==================== 第三轮补全：覆盖剩余 3 个分支 ====================

// 1. batchCreateKeywords > 500 limit
describe('Keywords - batchCreateKeywords 超过500限制', () => {
  beforeEach(() => jest.clearAllMocks());

  test('关键词数量超过500返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: Array.from({ length: 501 }, (_, i) => `关键词${i}`) });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('单次批量创建不能超过500个');
  });
});

// 2. mineKeywords invalid source_type
describe('mineKeywords - invalid source_type', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的source_type返回400', async () => {
    const res = await agent.post('/api/v1/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'invalid' });
    expect(res.status).toBe(400);
    expect(res.body.message).toContain('无效的资源类型');
  });
});

// 3. checkProjectOperator - non-sysadmin non-operator throws
describe('checkProjectOperator - admin非运营者检查', () => {
  beforeEach(() => jest.clearAllMocks());

  test('listProjectKeywords admin非运营者返回403', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      project: {
        findFirst: jest.fn().mockResolvedValue({
          id: 1, shortName: '项目A', fullName: '项目A全称', companyId: 2, status: true, deletedAt: null,
          company: { shortName: '公司' },
          operators: [{ userId: 99, user: { id: 99, cnName: '其他用户' } }],
          viewers: [],
        }),
      },
    });
    const res = await agent.get('/api/v1/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('无权操作该项目');
  });
});

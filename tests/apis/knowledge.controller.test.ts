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
    const res = await agent.get('/api/knowledge-bases/10/keywords');
    expect(res.status).toBe(401);
  });

  test('view角色访问关键词列表返回403', async () => {
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问画像列表返回403', async () => {
    const res = await agent.get('/api/knowledge-bases/10/portraits').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问图片列表返回403', async () => {
    const res = await agent.get('/api/knowledge-bases/10/images').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问文档列表返回403', async () => {
    const res = await agent.get('/api/knowledge-bases/10/documents').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问知识清单返回403', async () => {
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth(viewToken));
    expect(res.status).toBe(403);
  });

  test('view角色访问项目关键词返回403', async () => {
    const res = await agent.get('/api/projects/1/knowledge/keywords').set('Authorization', auth(viewToken));
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
    expect(res.body.data.list).toHaveLength(1);
    expect(res.body.data.total).toBe(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/keywords').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.keyword).toBe('SEO');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/10/keywords/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.get('/api/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('关键词不存在');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]), // empty result
    });
    const res = await agent.get('/api/knowledge-bases/10/keywords/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockRejectedValue(new Error('DB error')),
    });
    const res = await agent.get('/api/knowledge-bases/10/keywords/1').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/keywords').set('Authorization', auth()).send({ keyword: '新关键词' });
    expect(res.status).toBe(201);
    expect(res.body.code).toBe(0);
    expect(res.body.message).toBe('创建关键词成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/keywords').set('Authorization', auth()).send({ keyword: 'test' });
    expect(res.status).toBe(400);
  });

  test('keyword为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/keywords').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('关键词不能为空');
  });

  test('知识库不存在返回404', async () => {
    mockPrisma({
      knowledgeKeyword: {
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/999/keywords').set('Authorization', auth()).send({ keyword: 'test' });
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        create: jest.fn().mockRejectedValue(new Error('Unexpected error')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/keywords').set('Authorization', auth()).send({ keyword: 'test' });
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
    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: '新' });
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
    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken)).send({ keyword: '新' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/abc/keywords/1').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/keywords/abc').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({ keyword: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 5, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken)).send({ keyword: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的关键词');
  });

  test('keyword为空返回400', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: '旧', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/knowledge-bases/10/keywords/1').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('关键词不能为空');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]),
    });
    const res = await agent.put('/api/knowledge-bases/10/keywords/999').set('Authorization', auth()).send({ keyword: 'x' });
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
    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', auth());
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
    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/abc/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/10/keywords/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 99, keyword: 'SEO', seed_word: null, group_id: null, created_by: 1, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      $queryRaw: jest.fn()
        .mockResolvedValueOnce([{ id: 1, base_id: 10, keyword: 'SEO', seed_word: null, group_id: null, created_by: 5, created_at: new Date(), updated_at: new Date() }])
        .mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/knowledge-bases/10/keywords/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的关键词');
  });

  test('关键词不存在返回404', async () => {
    mockPrisma({
      $queryRaw: jest.fn().mockResolvedValueOnce([]),
    });
    const res = await agent.delete('/api/knowledge-bases/10/keywords/999').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: ['A', 'B', 'C'], seed_word: '种子词' });
    expect(res.status).toBe(200);
    expect(res.body.code).toBe(0);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/keywords/batch').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(400);
  });

  test('keywords非数组返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: 'not-array' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('关键词列表不能为空');
  });

  test('keywords为空数组返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: [] });
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeKeyword: {
        createMany: jest.fn().mockRejectedValue(new Error('DB error')),
        findMany: jest.fn().mockResolvedValue([]),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/keywords/batch').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(500);
  });
});

describe('Keywords - expandKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
    expect(res.status).toBe(400);
  });

  test('keyword为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({});
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('关键词不能为空');
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
    const res = await agent.get('/api/knowledge-bases/10/portraits').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/portraits').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/portraits').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('画像1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/10/portraits/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '画像', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('画像不存在返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/portraits/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/portraits/1').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: '画像', content: '内容' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建画像成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/portraits').set('Authorization', auth()).send({ title: 'x', content: 'y' });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', auth()).send({ content: '内容' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('画像标题不能为空');
  });

  test('content为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: '标题' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('画像内容不能为空');
  });

  test('知识库不存在返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/999/portraits').set('Authorization', auth()).send({ title: 't', content: 'c' });
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgePortrait: {
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/portraits').set('Authorization', auth()).send({ title: 't', content: 'c' });
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
    const res = await agent.put('/api/knowledge-bases/10/portraits/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/abc/portraits/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/portraits/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', content: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/portraits/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/portraits/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的画像');
  });

  test('画像不存在返回404 (getById throw)', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/portraits/999').set('Authorization', auth()).send({ title: 'x' });
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
    const res = await agent.delete('/api/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/abc/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', content: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/portraits/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', content: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/portraits/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的画像');
  });

  test('画像不存在返回404', async () => {
    mockPrisma({
      knowledgePortrait: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/portraits/999').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/images').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/images').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/images').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('图片1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/images/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/10/images/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '图片', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('图片不存在返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/images/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/images/1').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建图片成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/images').set('Authorization', auth()).send({ title: 'x', image_url: '/y' });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ image_url: '/test.png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('图片标题不能为空');
  });

  test('image_url为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('图片地址不能为空');
  });

  test('标题重复返回400', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, baseId: 10, title: '重复标题' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '重复标题', image_url: '/test.png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同标题的图片');
  });

  test('图片URL重复返回400', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)            // title not dup
          .mockResolvedValueOnce({ id: 3, baseId: 10, imageUrl: '/dup.png' }), // URL dup
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '新标题', image_url: '/dup.png' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同的图片');
  });

  test('知识库不存在返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/999/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/images').set('Authorization', auth()).send({ title: '图片', image_url: '/test.png' });
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
    const res = await agent.put('/api/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: '新标题', description: '新描述' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('新标题');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/abc/images/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/images/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', imageUrl: '/y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/images/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的图片');
  });

  test('新标题与其他重复返回400', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', imageUrl: '/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({ id: 2, baseId: 10, title: '重复标题' }),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/images/1').set('Authorization', auth()).send({ title: '重复标题' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同标题的图片');
  });

  test('图片不存在返回404 (getById throw)', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/images/999').set('Authorization', auth()).send({ title: 'x' });
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
    const res = await agent.delete('/api/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/abc/images/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', imageUrl: '/y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/images/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', imageUrl: '/y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/images/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的图片');
  });

  test('图片不存在返回404', async () => {
    mockPrisma({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/images/999').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/documents').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/documents').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
        count: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/documents').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('文档1');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/documents/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/10/documents/abc').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: '文档', fileName: 'x.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('文档不存在返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/documents/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/documents/1').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '文档', file_url: '/test.pdf', file_name: 'test.pdf', file_type: 'pdf', file_size: 1024 });
    expect(res.status).toBe(201);
    expect(res.body.message).toBe('创建文档成功');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
  });

  test('title为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('文档标题不能为空');
  });

  test('file_url为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('文档地址不能为空');
  });

  test('file_name为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('文件名不能为空');
  });

  test('file_type为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('文件类型不能为空');
  });

  test('file_size为空返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('文件大小不能为空');
  });

  test('标题重复返回400', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 2, baseId: 10, title: '重复' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '重复', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同标题的文档');
  });

  test('文件URL重复返回400', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(null)
          .mockResolvedValueOnce({ id: 3, baseId: 10, fileUrl: '/dup.pdf' }),
        create: jest.fn(),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: '新文档', file_url: '/dup.pdf', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同的文档');
  });

  test('知识库不存在返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('知识库不存在')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/999/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
    expect(res.status).toBe(404);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockRejectedValue(new Error('Unexpected')),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/documents').set('Authorization', auth()).send({ title: 'x', file_url: '/y', file_name: 'z', file_type: 'pdf', file_size: 1 });
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
    const res = await agent.put('/api/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: '新标题' });
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/abc/documents/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('无效的id返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/documents/abc').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', fileName: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: 'x' });
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/documents/1').set('Authorization', auth(adminToken)).send({ title: 'x' });
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能修改自己创建的文档');
  });

  test('新标题与其他重复返回400', async () => {
    const existing = { id: 1, baseId: 10, title: '旧标题', fileName: 'test.pdf', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn()
          .mockResolvedValueOnce(existing)
          .mockResolvedValueOnce({ id: 2, baseId: 10, title: '重复标题' }),
        update: jest.fn(),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/documents/1').set('Authorization', auth()).send({ title: '重复标题' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('该知识库已存在相同标题的文档');
  });

  test('文档不存在返回404 (getById null)', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/documents/999').set('Authorization', auth()).send({ title: 'x' });
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
    const res = await agent.delete('/api/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/abc/documents/1').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('baseId不匹配返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 99, title: 'x', fileName: 'y', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/documents/1').set('Authorization', auth());
    expect(res.status).toBe(404);
  });

  test('非创建者非sysadmin返回403', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue({ id: 1, baseId: 10, title: 'x', fileName: 'y', createdBy: 5, createdAt: new Date(), updatedAt: new Date() }),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/documents/1').set('Authorization', auth(adminToken));
    expect(res.status).toBe(403);
    expect(res.body.message).toBe('只能删除自己创建的文档');
  });

  test('文档不存在返回404', async () => {
    mockPrisma({
      knowledgeDocument: {
        findFirst: jest.fn().mockResolvedValue(null),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/documents/999').set('Authorization', auth());
    expect(res.status).toBe(404);
  });
});

// ==================== Project Knowledge Aggregation ====================

describe('Project Knowledge - listProjectKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/projects/abc/knowledge/keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectPortraits', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/projects/abc/knowledge/portraits').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectImages', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/projects/abc/knowledge/images').set('Authorization', auth());
    expect(res.status).toBe(400);
  });
});

describe('Project Knowledge - listProjectDocuments', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的projectId返回400', async () => {
    const res = await agent.get('/api/projects/abc/knowledge/documents').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory?category=keyword').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.get('/api/knowledge-bases/abc/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - mineKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(400);
  });

  test('知识库无内容返回400', async () => {
    mockPrisma({
      knowledgeDocument: { findMany: jest.fn().mockResolvedValue([]) },
      knowledgePortrait: { findMany: jest.fn().mockResolvedValue([]) },
      knowledgeImage: { findMany: jest.fn().mockResolvedValue([]) },
    });
    const res = await agent.post('/api/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('知识库中暂无内容可供挖掘');
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      knowledgeDocument: { findMany: jest.fn().mockRejectedValue(new Error('DB error')) },
    });
    const res = await agent.post('/api/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'document' });
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - saveMinedKeywords', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/abc/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(400);
  });

  test('keywords非数组返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: 'not-array' });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请选择至少一个关键词');
  });

  test('keywords为空数组返回400', async () => {
    const res = await agent.post('/api/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: [] });
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
    });
    const res = await agent.post('/api/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['A'] });
    expect(res.status).toBe(500);
  });
});

describe('Mined Keywords - toggleMinedKeywordsBatch', () => {
  beforeEach(() => jest.clearAllMocks());

  test('无效的baseId返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/abc/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1, 2], selected: true });
    expect(res.status).toBe(400);
  });

  test('ids非数组返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: 'not-array', selected: true });
    expect(res.status).toBe(400);
    expect(res.body.message).toBe('请选择关键词');
  });

  test('ids为空数组返回400', async () => {
    const res = await agent.put('/api/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [], selected: true });
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        updateMany: jest.fn().mockRejectedValue(new Error('DB error')),
        findMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.put('/api/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1], selected: true });
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
    const res = await agent.delete('/api/knowledge-bases/10/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.message).toBe('已清空挖掘关键词');
  });

  test('无效的baseId返回400', async () => {
    const res = await agent.delete('/api/knowledge-bases/abc/mined-keywords').set('Authorization', auth());
    expect(res.status).toBe(400);
  });

  test('服务异常返回500', async () => {
    mockPrisma({
      minedKeyword: {
        updateMany: jest.fn().mockRejectedValue(new Error('DB error')),
      },
    });
    const res = await agent.delete('/api/knowledge-bases/10/mined-keywords').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(200);
  });

  test('admin访问project范围知识库(无project_id)返回404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeBase: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, scope: 'project', projectId: null, status: true, company: null, project: null, creator: null, _count: { keywords: 0, portraits: 0, images: 0, documents: 0 } }),
      },
    });
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    expect(res.status).toBe(404);
    expect(res.body.message).toBe('知识库不存在');
  });

  test('admin访问project范围知识库(非运营者)返回500(未专门处理403)', async () => {
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
    const res = await agent.get('/api/knowledge-bases/10/keywords').set('Authorization', auth(adminToken));
    // listKeywords 未专门处理"无权操作该项目"错误，会走通用500路径
    expect(res.status).toBe(500);
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
    const res = await agent.post('/api/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
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
    const res = await agent.get('/api/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/keywords').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/images').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory?category=document&search=report').set('Authorization', auth());
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
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
    const res = await agent.post('/api/knowledge-bases/10/keywords/mine').set('Authorization', auth()).send({ source_type: 'all' });
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
    getPrisma.mockReturnValue({
      knowledgeKeyword: {
        createMany: jest.fn().mockResolvedValue({ count: 2 }),
        findMany: jest.fn().mockResolvedValue([]),
      },
      minedKeyword: {
        updateMany: jest.fn().mockResolvedValue({ count: 2 }),
      },
    });
    const res = await agent.post('/api/knowledge-bases/10/mined-keywords/save').set('Authorization', auth()).send({ keywords: ['AI营销', '数字营销'] });
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
    const res = await agent.put('/api/knowledge-bases/10/mined-keywords/batch-toggle').set('Authorization', auth()).send({ ids: [1, 2], selected: true });
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
    const res = await agent.post('/api/knowledge-bases/10/keywords/expand').set('Authorization', auth()).send({ keyword: 'SEO' });
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
    const res = await agent.get('/api/projects/1/knowledge/portraits').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/images').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/projects/1/knowledge/documents').set('Authorization', auth(adminToken));
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
    const res = await agent.get('/api/knowledge-inventory').set('Authorization', auth());
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(2);
    const withCreator = res.body.data.list.find((i: any) => i.name === '有创建者');
    const withoutCreator = res.body.data.list.find((i: any) => i.name === '无创建者');
    expect(withCreator.creatorName).toBe('管理员');
    expect(withoutCreator.creatorName).toBe('-');
  });
});

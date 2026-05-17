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

const KB = '/api/projects/1/knowledge';

function mockPrismaWithProjectAccess(entityMethods: Record<string, any> = {}) {
  const { getPrisma } = require('../../apis/utils/db.util');
  getPrisma.mockReturnValue({
    ...entityMethods,
    project: {
      findFirst: jest.fn().mockResolvedValue({
        id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
        createdAt: new Date(), updatedAt: new Date(),
        company: { shortName: 'Company A' },
        operators: [{ userId: 2, user: { cnName: '张三' } }],
        viewers: [],
      }),
    },
  });
}

describe('Knowledge Controller - Auth & Role', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return 401 without token on keyword list', async () => {
    const res = await agent.get(`${KB}/keywords`);
    expect(res.status).toBe(401);
  });

  it('should return 403 for view role on keyword list', async () => {
    const res = await agent.get(`${KB}/keywords`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 for view role on portrait list', async () => {
    const res = await agent.get(`${KB}/portraits`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });

  it('should return 403 for view role on image list', async () => {
    const res = await agent.get(`${KB}/images`).set('Authorization', `Bearer ${viewToken()}`);
    expect(res.status).toBe(403);
  });
});

describe('Knowledge Keywords CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  describe('GET /keywords', () => {
    it('should return keyword list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        knowledgeKeyword: {
          findMany: jest.fn().mockResolvedValue([{ id: 1, projectId: 1, keyword: 'SEO优化', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
          count: jest.fn().mockResolvedValue(1),
        },
      });

      const res = await agent.get(`${KB}/keywords`).set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res.status).toBe(200);
      expect(res.body.data.list).toHaveLength(1);
      expect(res.body.data.list[0].keyword).toBe('SEO优化');
    });

    it('should return 400 for invalid projectId', async () => {
      const res = await agent.get('/api/projects/abc/knowledge/keywords').set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res.status).toBe(400);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        knowledgeKeyword: {},
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, operators: [{ userId: 5 }], viewers: [],
            company: { shortName: 'Other' },
          }),
        },
      });

      const res = await agent.get(`${KB}/keywords`).set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(res.status).toBe(403);
    });
  });

  describe('POST /keywords', () => {
    it('should return 400 when keyword is missing', async () => {
      const res = await agent.post(`${KB}/keywords`).set('Authorization', `Bearer ${sysadminToken()}`).send({});
      expect(res.status).toBe(400);
    });

    it('should create keyword successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        knowledgeKeyword: {
          create: jest.fn().mockResolvedValue({ id: 1, projectId: 1, keyword: 'SEO', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
        },
      });

      const res = await agent.post(`${KB}/keywords`).set('Authorization', `Bearer ${sysadminToken()}`).send({ keyword: 'SEO' });
      expect(res.status).toBe(201);
      expect(res.body.data.keyword).toBe('SEO');
    });
  });

  describe('PUT /keywords/:id', () => {
    const existing = { id: 1, projectId: 1, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };

    it('should update keyword as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        knowledgeKeyword: {
          findFirst: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue({ ...existing, keyword: 'Updated' }),
        },
      });

      const res = await agent.put(`${KB}/keywords/1`).set('Authorization', `Bearer ${sysadminToken()}`).send({ keyword: 'Updated' });
      expect(res.status).toBe(200);
      expect(res.body.data.keyword).toBe('Updated');
    });

    it('should return 403 when non-creator admin tries to edit', async () => {
      mockPrismaWithProjectAccess({
        knowledgeKeyword: {
          findFirst: jest.fn().mockResolvedValue(existing),
        },
      });

      const res = await agent.put(`${KB}/keywords/1`).set('Authorization', `Bearer ${adminToken(4, 2)}`).send({ keyword: 'Updated' });
      expect(res.status).toBe(403);
    });
  });

  describe('DELETE /keywords/:id', () => {
    const existing = { id: 1, projectId: 1, keyword: 'SEO', createdBy: 2, createdAt: new Date(), updatedAt: new Date() };

    it('should delete keyword as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        knowledgeKeyword: {
          findFirst: jest.fn().mockResolvedValue(existing),
          delete: jest.fn().mockResolvedValue(existing),
        },
      });

      const res = await agent.delete(`${KB}/keywords/1`).set('Authorization', `Bearer ${sysadminToken()}`);
      expect(res.status).toBe(200);
    });

    it('should return 403 when non-creator admin tries to delete', async () => {
      mockPrismaWithProjectAccess({
        knowledgeKeyword: {
          findFirst: jest.fn().mockResolvedValue(existing),
        },
      });

      const res = await agent.delete(`${KB}/keywords/1`).set('Authorization', `Bearer ${adminToken(4, 2)}`);
      expect(res.status).toBe(403);
    });
  });
});

describe('Knowledge Portraits CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return portrait list', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgePortrait: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, projectId: 1, title: '画像1', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const res = await agent.get(`${KB}/portraits`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should create portrait', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgePortrait: {
        create: jest.fn().mockResolvedValue({ id: 1, projectId: 1, title: '画像', content: '内容', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });

    const res = await agent.post(`${KB}/portraits`).set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '画像', content: '内容' });
    expect(res.status).toBe(201);
  });

  it('should return 400 when title is missing', async () => {
    const res = await agent.post(`${KB}/portraits`).set('Authorization', `Bearer ${sysadminToken()}`).send({ content: 'no title' });
    expect(res.status).toBe(400);
  });
});

describe('Knowledge Images CRUD', () => {
  beforeEach(() => jest.clearAllMocks());

  it('should return image list', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([{ id: 1, projectId: 1, title: '图片1', description: null, imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }]),
        count: jest.fn().mockResolvedValue(1),
      },
    });

    const res = await agent.get(`${KB}/images`).set('Authorization', `Bearer ${sysadminToken()}`);
    expect(res.status).toBe(200);
    expect(res.body.data.list).toHaveLength(1);
  });

  it('should create image', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        create: jest.fn().mockResolvedValue({ id: 1, projectId: 1, title: '图片', description: null, imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() }),
      },
    });

    const res = await agent.post(`${KB}/images`).set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '图片', image_url: '/uploads/test.png' });
    expect(res.status).toBe(201);
  });

  it('should return 400 when title is missing', async () => {
    const res = await agent.post(`${KB}/images`).set('Authorization', `Bearer ${sysadminToken()}`).send({ image_url: '/uploads/test.png' });
    expect(res.status).toBe(400);
  });

  it('should return 400 when image_url is missing', async () => {
    const res = await agent.post(`${KB}/images`).set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '图片' });
    expect(res.status).toBe(400);
  });

  it('should update image title and description only', async () => {
    const existing = { id: 1, projectId: 1, title: '旧标题', description: '旧描述', imageUrl: '/uploads/test.png', createdBy: 1, createdAt: new Date(), updatedAt: new Date() };
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      knowledgeImage: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue({ ...existing, title: '新标题', description: '新描述' }),
      },
    });

    const res = await agent.put(`${KB}/images/1`).set('Authorization', `Bearer ${sysadminToken()}`).send({ title: '新标题', description: '新描述' });
    expect(res.status).toBe(200);
    expect(res.body.data.title).toBe('新标题');
  });
});

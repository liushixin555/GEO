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
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
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

function viewToken() {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

const BASE = '/api/projects/1/articles';

describe('Article Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Helper: mock prisma with project access (operator check passes)
  function mockPrismaWithProjectAccess(articleMethods: any = {}) {
    const { getPrisma } = require('../../apis/utils/db.util');
    getPrisma.mockReturnValue({
      article: articleMethods,
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

  describe('Auth & Role checks', () => {
    it('should return 401 without token on list', async () => {
      const response = await agent.get(BASE);
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role on list', async () => {
      const response = await agent
        .get(BASE)
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 401 without token on create', async () => {
      const response = await agent.post(BASE).send({ title: 'Test' });
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role on create', async () => {
      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ title: 'Test' });
      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/projects/:projectId/articles', () => {
    it('should return articles list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        {
          id: 1, projectId: 1, title: 'Article 1', keywords: ['seo'], portrait: null,
          images: null, platforms: null, status: 'draft', createdBy: 2,
          createdAt: new Date(), updatedAt: new Date(),
        },
      ]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ article: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.list[0].title).toBe('Article 1');
    });

    it('should return 400 for invalid projectId', async () => {
      const response = await agent
        .get('/api/projects/abc/articles')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should support search and status filters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ article: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get(`${BASE}?search=test&status=draft`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            projectId: 1,
            title: { contains: 'test', mode: 'insensitive' },
            status: 'draft',
          }),
        })
      );
    });

    it('should return 403 when admin is not operator of project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {},
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 999, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Other' },
            operators: [{ userId: 5 }], // not user 2
            viewers: [],
          }),
        },
      });

      const response = await agent
        .get(BASE)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
    });
  });

  describe('GET /api/projects/:projectId/articles/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get(`${BASE}/abc`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({ article: { findFirst: jest.fn().mockResolvedValue(null) } });

      const response = await agent
        .get(`${BASE}/999`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return article detail', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, projectId: 1, title: 'Article 1', keywords: ['seo'], portrait: null,
            images: null, platforms: null, status: 'draft', createdBy: 2,
            createdAt: new Date(), updatedAt: new Date(),
          }),
        },
      });

      const response = await agent
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Article 1');
      expect(response.body.data.keywords).toEqual(['seo']);
    });

    it('should return 404 when article belongs to different project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, projectId: 999, title: 'Article 1', keywords: null, portrait: null,
            images: null, platforms: null, status: 'draft', createdBy: 2,
            createdAt: new Date(), updatedAt: new Date(),
          }),
        },
      });

      const response = await agent
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });
  });

  describe('POST /api/projects/:projectId/articles', () => {
    it('should return 400 when title is missing', async () => {
      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ keywords: ['test'] });
      expect(response.status).toBe(400);
    });

    it('should create article successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, projectId: 1, title: 'New Article', keywords: ['seo'], portrait: null,
        images: null, platforms: null, status: 'draft', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ article: { create: mockCreate } });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'New Article', keywords: ['seo'] });

      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('New Article');
      expect(response.body.data.status).toBe('draft');
    });

    it('should create article as admin operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        create: jest.fn().mockResolvedValue({
          id: 2, projectId: 1, title: 'Admin Article', keywords: null, portrait: null,
          images: null, platforms: null, status: 'draft', createdBy: 2,
          createdAt: new Date(), updatedAt: new Date(),
        }),
      });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ title: 'Admin Article' });

      expect(response.status).toBe(201);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {},
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 999, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Other' },
            operators: [{ userId: 5 }],
            viewers: [],
          }),
        },
      });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ title: 'Test' });

      expect(response.status).toBe(403);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id', () => {
    const existingDraft = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'draft', createdBy: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put(`${BASE}/abc`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });
      expect(response.status).toBe(400);
    });

    it('should update article as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({ ...existingDraft, title: 'Updated' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Updated');
    });

    it('should update article as creator (admin)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue(existingDraft),
        update: jest.fn().mockResolvedValue({ ...existingDraft, title: 'Updated' }),
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
    });

    it('should return 403 when non-creator admin tries to edit', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      // Admin userId=4 is an operator but not the creator (createdBy=2)
      const { getPrisma: _gp } = require('../../apis/utils/db.util');
      _gp.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
        },
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Company A' },
            operators: [{ userId: 4, user: { cnName: 'Admin4' } }], // userId=4 is operator
            viewers: [],
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(4, 2)}`) // userId=4 is not creator (createdBy=2)
        .send({ title: 'Updated' });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能修改自己创建的文章');
    });

    it('should return 400 when editing non-editable status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'published' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑');
    });

    it('should allow editing in generate_failed status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed' }),
          update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed', title: 'Updated' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
    });

    it('should allow editing in publish_failed status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed' }),
          update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed', title: 'Updated' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(200);
    });
  });

  describe('DELETE /api/projects/:projectId/articles/:id', () => {
    const existingDraft = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'draft', createdBy: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should delete draft article as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          delete: jest.fn().mockResolvedValue(existingDraft),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should delete draft article as creator admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue(existingDraft),
        delete: jest.fn().mockResolvedValue(existingDraft),
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
    });

    it('should return 403 when non-creator admin tries to delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue(existingDraft),
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(4, 2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 400 when deleting published article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'published' }),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('已发布的文章不能删除');
    });

    it('should delete non-published article (generating) as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generating' }),
          delete: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generating' }),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should delete non-published article (generate_failed) as creator admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed' }),
        delete: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed' }),
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
    });

    it('should delete non-published article (pending_review) as creator admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'pending_review' }),
        delete: jest.fn().mockResolvedValue({ ...existingDraft, status: 'pending_review' }),
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
    });

    it('should delete non-published article (publishing) as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publishing' }),
          delete: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publishing' }),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should delete non-published article (publish_failed) as creator admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed' }),
        delete: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed' }),
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/review', () => {
    const pendingArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'pending_review', createdBy: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should approve article review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          // Called twice: once by controller getById, once by service review
          findFirst: jest.fn().mockResolvedValue(pendingArticle),
          update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'publishing' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('publishing');
    });

    it('should reject article review (back to draft)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(pendingArticle),
          update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'draft' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: false });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('draft');
    });

    it('should return 400 when reviewing non-pending article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'draft' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('文章当前状态不支持审核操作');
    });

    it('should return 400 when approved field is missing', async () => {
      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
    });

    it('should allow admin operator to review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue(pendingArticle),
        update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'publishing' }),
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ approved: true });

      expect(response.status).toBe(200);
    });
  });
});

/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '500';

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
            keywords: { contains: 'test', mode: 'insensitive' },
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

    it('should return 500 on server error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findMany: jest.fn().mockRejectedValue(new Error('DB error')),
          count: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });

      const response = await agent
        .get(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
    });

    it('should return articles list for admin operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({
        article: { findMany: mockFindMany, count: mockCount },
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

      const response = await agent
        .get(BASE)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
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

    it('should return article detail for admin operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, projectId: 1, title: 'Article 1', keywords: ['seo'], portrait: null,
            images: null, platforms: null, status: 'draft', createdBy: 2,
            createdAt: new Date(), updatedAt: new Date(),
          }),
        },
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

      const response = await agent
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
      expect(response.body.data.title).toBe('Article 1');
    });

    it('should return 403 when admin is not operator on getArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
            images: null, platforms: null, status: 'draft', createdBy: 2,
            createdAt: new Date(), updatedAt: new Date(),
          }),
        },
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
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 500 on server error for getArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/projects/:projectId/articles', () => {
    it('should create article with empty title when not provided', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 5, projectId: 1, title: '', keywords: ['test'], portrait: null,
        images: null, platforms: null, status: 'draft', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ article: { create: mockCreate } });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ keywords: ['test'] });
      expect(response.status).toBe(201);
      expect(response.body.data.title).toBe('');
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

    it('should return 400 when editing in generate_failed status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑');
    });

    it('should return 400 when editing in publish_failed status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑');
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
          update: jest.fn().mockResolvedValue({ ...existingDraft, deletedAt: new Date() }),
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
        update: jest.fn().mockResolvedValue({ ...existingDraft, deletedAt: new Date() }),
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
          update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generating', deletedAt: new Date() }),
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
        update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generate_failed', deletedAt: new Date() }),
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
        update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'pending_review', deletedAt: new Date() }),
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
          update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publishing', deletedAt: new Date() }),
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
        update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'publish_failed', deletedAt: new Date() }),
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

    it('should allow admin operator to review (non-creator)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { mockPrismaWithProjectAccess: _mock } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(pendingArticle),
          update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'publishing' }),
        },
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Company A' },
            operators: [{ userId: 3, user: { cnName: '李四' } }],
            viewers: [],
          }),
        },
      });

      // admin operator userId=3, different from createdBy=2
      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${adminToken(3, 2)}`)
        .send({ approved: true });

      expect(response.status).toBe(200);
    });

    it('should reject creator reviewing own article (HIGH-2 SoD)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      mockPrismaWithProjectAccess({
        findFirst: jest.fn().mockResolvedValue(pendingArticle),
        update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'publishing' }),
      });

      // admin operator userId=2, same as createdBy=2
      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ approved: true });

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('不能审核自己创建的文章');
    });
  });

  // ============= Additional edge cases for existing endpoints =============

  describe('POST /api/projects/:projectId/articles - additional', () => {
    it('should return 400 for invalid initial status', async () => {
      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Test', status: 'published' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的初始状态');
    });

    it('should create article with manual_writing status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 3, projectId: 1, title: 'Manual', keywords: null, portrait: null,
        images: null, platforms: null, status: 'manual_writing', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ article: { create: mockCreate } });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Manual', status: 'manual_writing' });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('manual_writing');
    });

    it('should create article with generating status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 4, projectId: 1, title: 'Gen', keywords: null, portrait: null,
        images: null, platforms: null, status: 'generating', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ article: { create: mockCreate } });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Gen', status: 'generating' });

      expect(response.status).toBe(201);
      expect(response.body.data.status).toBe('generating');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { create: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Test' });

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id - additional', () => {
    const existingDraft = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'draft', createdBy: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should submit article for AI generation (status=generating)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({ ...existingDraft, status: 'generating' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'generating' });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('generating');
      expect(response.body.message).toBe('已提交AI生成');
    });

    it('should return 404 when article not found on update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put(`${BASE}/999`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
    });

    it('should return 400 for invalid projectId on update', async () => {
      const response = await agent
        .put('/api/projects/abc/articles/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });
      expect(response.status).toBe(400);
    });

    it('should return 403 when admin is not operator on update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...existingDraft, createdBy: 1 }) },
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
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(403);
    });

    it('should return 404 when article belongs to different project on update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            ...existingDraft, projectId: 999,
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('文章不存在');
    });

    it('should return 500 on server error during update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/projects/:projectId/articles/:id - additional', () => {
    it('should return 400 for invalid projectId on delete', async () => {
      const response = await agent
        .delete('/api/projects/abc/articles/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found on delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .delete(`${BASE}/999`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project on delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({
          id: 1, projectId: 999, title: 'A', keywords: null, portrait: null,
          images: null, platforms: null, status: 'draft', createdBy: 1,
          createdAt: new Date(), updatedAt: new Date(),
        }) },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator on delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({
          id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
          images: null, platforms: null, status: 'draft', createdBy: 2,
          createdAt: new Date(), updatedAt: new Date(),
        }) },
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
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
    });

    it('should return 403 when admin operator is not creator on delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({
          id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
          images: null, platforms: null, status: 'draft', createdBy: 2,
          createdAt: new Date(), updatedAt: new Date(),
        }) },
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Company A' },
            operators: [{ userId: 4, user: { cnName: 'Admin4' } }],
            viewers: [],
          }),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${adminToken(4, 2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能删除自己创建的文章');
    });

    it('should return 500 on server error during delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
            images: null, platforms: null, status: 'draft', createdBy: 1,
            createdAt: new Date(), updatedAt: new Date(),
          }),
          update: jest.fn().mockRejectedValue(new Error('DB error')),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/review - additional', () => {
    const pendingArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'pending_review', createdBy: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid projectId on review', async () => {
      const response = await agent
        .put('/api/projects/abc/articles/1/review')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found on review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put(`${BASE}/999/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });

      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project on review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...pendingArticle, projectId: 999 }) },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });

      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator on review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(pendingArticle) },
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
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ approved: true });

      expect(response.status).toBe(403);
    });

    it('should return 500 on server error during review', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });

      expect(response.status).toBe(500);
    });
  });

  // ============= New endpoint tests =============

  describe('PUT /api/projects/:projectId/articles/:id/content', () => {
    const existingArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'draft', createdBy: 1,
      content: 'old content', version: 1,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid projectId', async () => {
      const response = await agent
        .put('/api/projects/abc/articles/1/content')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put(`${BASE}/abc/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(400);
    });

    it('should return 400 when content is not string', async () => {
      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 123 });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('content参数无效');
    });

    it('should return 400 when content is missing', async () => {
      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put(`${BASE}/999/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...existingArticle, projectId: 999 }) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
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
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ content: 'new' });
      expect(response.status).toBe(403);
    });

    it('should return 403 when non-creator tries to edit content', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Company A' },
            operators: [{ userId: 4, user: { cnName: 'Admin4' } }],
            viewers: [],
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${adminToken(4, 2)}`)
        .send({ content: 'new' });
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能修改自己创建的文章');
    });

    it('should return 400 when status is not content-editable (published)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...existingArticle, status: 'published' }) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('当前文章状态不可编辑正文');
    });

    it('should return 400 when status is generating', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...existingArticle, status: 'generating' }) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(400);
    });

    it('should update content for draft article as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingArticle),
          update: jest.fn().mockResolvedValue({ ...existingArticle, content: 'new content', version: 2 }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(200);
      expect(response.body.data.content).toBe('new content');
    });

    it('should update content for manual_writing article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingArticle, status: 'manual_writing' }),
          update: jest.fn().mockResolvedValue({ ...existingArticle, status: 'manual_writing', content: 'new content', version: 2 }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(200);
    });

    it('should update content for generate_failed article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingArticle, status: 'generate_failed' }),
          update: jest.fn().mockResolvedValue({ ...existingArticle, status: 'generate_failed', content: 'new content', version: 2 }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(200);
    });

    it('should update content for publish_failed article', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...existingArticle, status: 'publish_failed' }),
          update: jest.fn().mockResolvedValue({ ...existingArticle, status: 'publish_failed', content: 'new content', version: 2 }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(200);
    });

    it('should update content as admin creator + operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const adminArticle = { ...existingArticle, createdBy: 2 };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(adminArticle),
          update: jest.fn().mockResolvedValue({ ...adminArticle, content: 'new content', version: 2 }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
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

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ content: 'new content' });
      expect(response.status).toBe(200);
    });

    it('should return 500 on server error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/regenerate', () => {
    const pendingArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'pending_review', createdBy: 2,
      content: 'content', version: 1,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid projectId', async () => {
      const response = await agent
        .put('/api/projects/abc/articles/1/regenerate')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put(`${BASE}/abc/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put(`${BASE}/999/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...pendingArticle, projectId: 999 }) },
      });

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(pendingArticle) },
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
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(403);
    });

    it('should regenerate successfully as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(pendingArticle),
          update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'generating' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('generating');
      expect(response.body.message).toBe('已重新提交AI生成');
    });

    it('should return 400 when article status does not support regeneration', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'draft' }),
          update: jest.fn().mockResolvedValue({}),
        },
      });

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('文章当前状态不支持重新生成');
    });

    it('should regenerate as admin operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(pendingArticle),
          update: jest.fn().mockResolvedValue({ ...pendingArticle, status: 'generating' }),
        },
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

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
    });

    it('should return 500 on server error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/submit-review', () => {
    const manualArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'manual_writing', createdBy: 1,
      content: 'manual content', version: 1,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid projectId', async () => {
      const response = await agent
        .put('/api/projects/abc/articles/1/submit-review')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put(`${BASE}/abc/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .put(`${BASE}/999/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...manualArticle, projectId: 999 }) },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(manualArticle) },
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
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 when non-creator tries to submit', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(manualArticle) },
        project: {
          findFirst: jest.fn().mockResolvedValue({
            id: 1, shortName: 'P1', fullName: 'Project 1', companyId: 2, status: true,
            createdAt: new Date(), updatedAt: new Date(),
            company: { shortName: 'Company A' },
            operators: [{ userId: 4, user: { cnName: 'Admin4' } }],
            viewers: [],
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${adminToken(4, 2)}`);
      expect(response.status).toBe(403);
      expect(response.body.message).toBe('只能操作自己创建的文章');
    });

    it('should return 400 when article is not in manual_writing status', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...manualArticle, status: 'draft' }) },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe('只有手工编写中的文章可以提交审核');
    });

    it('should submit for review successfully as sysadmin creator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(manualArticle),
          update: jest.fn().mockResolvedValue({ ...manualArticle, status: 'pending_review' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('pending_review');
      expect(response.body.message).toBe('已提交审核');
    });

    it('should submit for review as admin creator + operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const adminArticle = { ...manualArticle, createdBy: 2 };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(adminArticle),
          update: jest.fn().mockResolvedValue({ ...adminArticle, status: 'pending_review' }),
        },
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

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
    });

    it('should return 500 on server error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/projects/:projectId/articles/:id/versions', () => {
    const existingArticle = {
      id: 1, projectId: 1, title: 'Article 1', keywords: null, portrait: null,
      images: null, platforms: null, status: 'draft', createdBy: 1,
      content: 'content', version: 2,
      createdAt: new Date(), updatedAt: new Date(),
    };

    it('should return 400 for invalid projectId', async () => {
      const response = await agent
        .get('/api/projects/abc/articles/1/versions')
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get(`${BASE}/abc/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(400);
    });

    it('should return 404 when article not found', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(null) },
      });

      const response = await agent
        .get(`${BASE}/999/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 404 when article belongs to different project', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue({ ...existingArticle, projectId: 999 }) },
      });

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(404);
    });

    it('should return 403 when admin is not operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
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
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(403);
    });

    it('should return versions list as sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
        articleVersion: {
          findMany: jest.fn().mockResolvedValue([
            { id: 2, articleId: 1, version: 2, content: 'v2', createdBy: 1, createdAt: new Date(), deletedAt: null },
            { id: 1, articleId: 1, version: 1, content: 'v1', createdBy: 1, createdAt: new Date(), deletedAt: null },
          ]),
        },
      });

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].content).toBe('v2');
    });

    it('should return empty versions list', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
        articleVersion: {
          findMany: jest.fn().mockResolvedValue([]),
        },
      });

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return versions list as admin operator', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockResolvedValue(existingArticle) },
        articleVersion: {
          findMany: jest.fn().mockResolvedValue([]),
        },
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

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);
      expect(response.status).toBe(200);
    });

    it('should return 500 on server error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error('DB error')) },
      });

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
    });
  });

  // ============= Service layer coverage tests =============

  describe('POST /api/projects/:projectId/articles - with content (version snapshot)', () => {
    it('should create article with content and trigger version snapshot', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 10, projectId: 1, title: 'With Content', articleType: null, writeMode: null,
        keywords: null, portrait: null, images: null, platforms: null, skills: null,
        llmModelId: null, content: 'initial content', status: 'draft', version: 1,
        createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      });
      const mockVersionCreate = jest.fn().mockResolvedValue({});
      getPrisma.mockReturnValue({
        article: { create: mockCreate },
        articleVersion: { create: mockVersionCreate },
      });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'With Content', content: 'initial content' });

      expect(response.status).toBe(201);
      expect(response.body.data.content).toBe('initial content');
      // Version snapshot should be created
      expect(mockVersionCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            articleId: 10,
            version: 1,
            content: 'initial content',
            createdBy: 1,
          }),
        })
      );
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id - with scheduled_publish_at', () => {
    const existingDraft = {
      id: 1, projectId: 1, title: 'Article 1', articleType: null, writeMode: null,
      keywords: null, portrait: null, images: null, platforms: null, skills: null,
      llmModelId: null, content: 'content', status: 'draft', version: 1,
      createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('should update article with scheduled_publish_at', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({
            ...existingDraft,
            scheduledPublishAt: new Date('2026-06-01T10:00:00Z'),
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: '2026-06-01T10:00:00Z' });

      expect(response.status).toBe(200);
    });

    it('should clear scheduled_publish_at by sending null', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({
            ...existingDraft,
            scheduledPublishAt: null,
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ scheduled_publish_at: null });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/content - AI title extraction', () => {
    it('should extract title from content for AI-generated article with empty title', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existingArticle = {
        id: 1, projectId: 1, title: '', articleType: null, writeMode: 'ai',
        keywords: null, portrait: null, images: null, platforms: null, skills: null,
        llmModelId: null, content: 'old content', status: 'draft', version: 1,
        createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingArticle),
          update: jest.fn().mockResolvedValue({
            ...existingArticle,
            content: '# AI Generated Title\n\nSome content here',
            title: 'AI Generated Title',
            version: 2,
          }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: '# AI Generated Title\n\nSome content here' });

      expect(response.status).toBe(200);
    });

    it('should skip title extraction for manual writing articles', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existingArticle = {
        id: 1, projectId: 1, title: '', articleType: null, writeMode: 'manual',
        keywords: null, portrait: null, images: null, platforms: null, skills: null,
        llmModelId: null, content: 'old content', status: 'draft', version: 1,
        createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingArticle),
          update: jest.fn().mockResolvedValue({
            ...existingArticle,
            content: 'new content',
            title: '',
            version: 2,
          }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new content' });

      expect(response.status).toBe(200);
    });
  });

  describe('PUT /api/projects/:projectId/articles/:id/review - manual reject', () => {
    it('should reject manual article review (back to manual_writing)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const pendingManual = {
        id: 1, projectId: 1, title: 'Manual', keywords: null, portrait: null,
        images: null, platforms: null, status: 'pending_review', createdBy: 2,
        writeMode: 'manual',
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(pendingManual),
          update: jest.fn().mockResolvedValue({ ...pendingManual, status: 'manual_writing' }),
        },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: false });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe('manual_writing');
    });
  });

  describe('Error handling - fallback error messages', () => {
    it('should handle error without message in getArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .get(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取文章详情失败');
    });

    it('should handle error without message in createArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { create: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .post(BASE)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Test' });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建文章失败');
    });

    it('should handle error without message in updateArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
        images: null, platforms: null, status: 'draft', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ title: 'Updated' });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新文章失败');
    });

    it('should handle error without message in deleteArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
        images: null, platforms: null, status: 'draft', createdBy: 1,
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockRejectedValue(new Error()),
        },
      });

      const response = await agent
        .delete(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除文章失败');
    });

    it('should handle error without message in updateArticleContent', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, projectId: 1, title: 'A', keywords: null, portrait: null,
        images: null, platforms: null, status: 'draft', createdBy: 1, content: 'old',
        createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'new' });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新文章失败');
    });

    it('should handle error without message in reviewArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .put(`${BASE}/1/review`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ approved: true });
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('审核操作失败');
    });

    it('should handle error without message in regenerateArticle', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .put(`${BASE}/1/regenerate`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('重新生成操作失败');
    });

    it('should handle error without message in submitForReview', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .put(`${BASE}/1/submit-review`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('提交审核失败');
    });

    it('should handle error without message in listArticleVersions', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: { findFirst: jest.fn().mockRejectedValue(new Error()) },
      });

      const response = await agent
        .get(`${BASE}/1/versions`)
        .set('Authorization', `Bearer ${sysadminToken()}`);
      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取版本历史失败');
    });
  });

  // ============= Service branch coverage: update with empty fields =============

  describe('PUT /api/projects/:projectId/articles/:id - empty field defaults', () => {
    const existingDraft = {
      id: 1, projectId: 1, title: 'Article 1', articleType: 'seo', writeMode: 'ai',
      keywords: 'kw', portrait: 'p', images: [], platforms: [], skills: 1,
      llmModelId: 1, content: 'old', status: 'draft', version: 1,
      createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
    };

    it('should set fields to null when empty strings provided', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({
            ...existingDraft,
            articleType: null, writeMode: null, keywords: null,
            portrait: null, images: null, platforms: null, skills: null, llmModelId: null,
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          article_type: '',
          write_mode: '',
          keywords: '',
          portrait: '',
          images: null,
          platforms: null,
          skills: 0,
          llm_model_id: 0,
        });

      expect(response.status).toBe(200);
    });

    it('should update article with all fields set', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existingDraft),
          update: jest.fn().mockResolvedValue({
            ...existingDraft,
            title: 'New Title', articleType: 'blog', writeMode: 'manual',
            keywords: 'new kw', portrait: 'new p', images: ['img1'], platforms: ['p1'],
            skills: 2, llmModelId: 3, status: 'draft',
          }),
        },
      });

      const response = await agent
        .put(`${BASE}/1`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({
          title: 'New Title',
          article_type: 'blog',
          write_mode: 'manual',
          keywords: 'new kw',
          portrait: 'new p',
          images: ['img1'],
          platforms: ['p1'],
          skills: 2,
          llm_model_id: 3,
        });

      expect(response.status).toBe(200);
    });
  });

  // ============= Service branch: content same as existing =============

  describe('PUT /api/projects/:projectId/articles/:id/content - same content', () => {
    it('should not bump version when content is the same', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, projectId: 1, title: 'A', articleType: null, writeMode: null,
        keywords: null, portrait: null, images: null, platforms: null, skills: null,
        llmModelId: null, content: 'same content', status: 'draft', version: 1,
        createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue(existing),
        },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: 'same content' });

      expect(response.status).toBe(200);
    });
  });

  // ============= Service branch: AI title with no extractable title =============

  describe('PUT /api/projects/:projectId/articles/:id/content - AI no title from content', () => {
    it('should skip title when content has no non-empty lines', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, projectId: 1, title: '', articleType: null, writeMode: 'ai',
        keywords: null, portrait: null, images: null, platforms: null, skills: null,
        llmModelId: null, content: 'old', status: 'draft', version: 1,
        createdBy: 1, createdAt: new Date(), updatedAt: new Date(),
      };
      getPrisma.mockReturnValue({
        article: {
          findFirst: jest.fn().mockResolvedValue(existing),
          update: jest.fn().mockResolvedValue({
            ...existing, content: '   \n  \n  ', title: '', version: 2,
          }),
        },
        articleVersion: { create: jest.fn().mockResolvedValue({}) },
      });

      const response = await agent
        .put(`${BASE}/1/content`)
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ content: '   \n  \n  ' });

      expect(response.status).toBe(200);
    });
  });
});

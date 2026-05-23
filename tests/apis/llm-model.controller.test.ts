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

function adminToken() {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId: 2 },
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

describe('LLM Model Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/llm-models', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/llm-models');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return models list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(response.body.data[0].provider).toBe('OpenAI');
    });

    it('should return empty list when no models', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/llm-models/enabled', () => {
    it('should return enabled models for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', modelName: 'gpt-4o' },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data).toHaveLength(1);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { status: true },
        })
      );
    });

    it('should return enabled models for admin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/llm-models/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return model detail for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.provider).toBe('OpenAI');
      expect(response.body.data.model_name).toBe('gpt-4o');
    });

    it('should return 404 for non-existent model', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/llm-models', () => {
    it('should return 400 when required fields are missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when base_url is missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when api_key is missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when model_name is missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test' });

      expect(response.status).toBe(400);
    });

    it('should create model successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('OpenAI');
    });

    it('should return 500 on database error during create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(500);
    });
  });

  describe('PUT /api/llm-models/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should update model successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(200);
      expect(response.body.data.provider).toBe('Anthropic');
    });

    it('should return 404 for non-existent model', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should update status successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: false });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: false });

      expect(response.status).toBe(200);
    });

    it('should update multiple fields', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic', modelName: 'claude-3' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic', model_name: 'claude-3' });

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/llm-models/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 404 for non-existent model', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should delete model successfully', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toContain('删除LLM模型成功');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });
});

/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '200';

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

  // ========== GET /api/llm-models ==========
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
      expect(response.body.message).toBe('获取LLM模型列表失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型列表失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型列表失败');
    });

    it('should return multiple models', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test1', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, provider: 'Anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-test2', modelName: 'claude-3', status: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
    });

    it('should handle model with all status values', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, provider: 'Anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-test', modelName: 'claude-3', status: false, createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].status).toBe(true);
      expect(response.body.data[1].status).toBe(false);
    });
  });

  // ========== GET /api/llm-models/enabled ==========
  describe('GET /api/llm-models/enabled', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/llm-models/enabled');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

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
      expect(response.body.message).toBe('获取启用的LLM模型列表失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取启用的LLM模型列表失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取启用的LLM模型列表失败');
    });

    it('should return multiple enabled models', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', modelName: 'gpt-4o' },
        { id: 2, provider: 'Anthropic', modelName: 'claude-3' },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(2);
      expect(response.body.data[0].model_name).toBe('gpt-4o');
    });

    it('should return empty list when no enabled models', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should only select id, provider, model_name fields', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', modelName: 'gpt-4o' },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      await agent
        .get('/api/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          select: { id: true, provider: true, modelName: true },
        })
      );
    });
  });

  // ========== GET /api/llm-models/:id ==========
  describe('GET /api/llm-models/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/llm-models/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .get('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .get('/api/llm-models/@#$')
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
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .get('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .get('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .get('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .get('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "Infinity"', async () => {
      const response = await agent
        .get('/api/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" string', async () => {
      const response = await agent
        .get('/api/llm-models/NaN')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });
  });

  // ========== POST /api/llm-models ==========
  describe('POST /api/llm-models', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/llm-models')
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(403);
    });

    it('should return 400 when all required fields are missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when provider is missing', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

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
      expect(response.body.code).toBe(0);
      expect(response.body.message).toBe('创建LLM模型成功');
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
      expect(response.body.message).toBe('创建LLM模型失败');
    });

    it('should return default error message when err.message is empty during create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建LLM模型失败');
    });

    it('should return default error message when error has no message property during create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建LLM模型失败');
    });

    it('should return 400 when provider is empty string', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when base_url has invalid protocol (ftp://)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'ftp://example.com', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should return 400 when base_url is malformed', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'not-a-url', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Base URL');
    });

    it('should pass full body to service create', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'Anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant', modelName: 'claude-3', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const body = { provider: 'Anthropic', base_url: 'https://api.anthropic.com', api_key: 'sk-ant', model_name: 'claude-3' };
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('Anthropic');
      expect(response.body.data.model_name).toBe('claude-3');
    });

    it('should return 400 when base_url is empty string', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: '', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when api_key is empty string', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: '', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when model_name is empty string', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: '' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should accept http:// protocol with public address', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'CustomAI', baseUrl: 'http://llm.example.com/v1', apiKey: 'local-key', modelName: 'custom-model', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'CustomAI', base_url: 'http://llm.example.com/v1', api_key: 'local-key', model_name: 'custom-model' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('CustomAI');
    });

    it('should reject javascript: protocol in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'javascript:alert(1)', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject data: protocol in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'data:text/html,<h1>test</h1>', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject file: protocol in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'file:///etc/passwd', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject base_url with spaces', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'not a url', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Base URL');
    });

    it('should create model with unicode characters in model_name', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: '国产模型', baseUrl: 'https://api.example.com', apiKey: 'sk-test', modelName: '通义千问-Max', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '国产模型', base_url: 'https://api.example.com', api_key: 'sk-test', model_name: '通义千问-Max' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('国产模型');
      expect(response.body.data.model_name).toBe('通义千问-Max');
    });

    it('should ignore extra fields in request body', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o', extra_field: 'should be ignored', malicious: '<script>alert(1)</script>' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('OpenAI');
    });

    // === SSRF 防护测试 ===
    it('should reject localhost in base_url (SSRF)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://localhost:8080/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('localhost');
    });

    it('should reject 127.x.x.x in base_url (SSRF)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://127.0.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 169.254.x.x (AWS metadata) in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://169.254.169.254/latest/meta-data/', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 10.x.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://10.0.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 192.168.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://192.168.1.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    // === 输入验证测试 ===
    it('should reject non-string provider', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 123, base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject whitespace-only provider', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '   ', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject too-long provider', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(101), base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject too-long base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/' + 'a'.repeat(2100), api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject too-long api_key', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-' + 'x'.repeat(510), model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject too-long model_name', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-' + 'x'.repeat(200) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject non-string base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 12345, api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject non-string api_key', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: true, model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject non-string model_name', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: ['array'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject null provider', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: null, base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: null, api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null api_key', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: null, model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null model_name', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: null });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    // === SSRF 防护补全测试 ===
    it('should reject 172.16.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://172.16.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 172.31.x.x in base_url (RFC 1918 upper bound)', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://172.31.255.255/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 0.x.x.x in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://0.0.0.0/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 ::1 (localhost) in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fe80: (link-local) in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[fe80::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fc00: (unique local) in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[fc00::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fd prefix (unique local) in base_url', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[fd00::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should accept valid public https URL through SSRF check', async () => {
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
    });

    it('should reject whitespace-only api_key', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: '   ', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject whitespace-only model_name', async () => {
      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });
  });

  // ========== PUT /api/llm-models/:id ==========
  describe('PUT /api/llm-models/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .put('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .put('/api/llm-models/!@#')
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
      expect(response.body.data.status).toBe(false);
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

    it('should return 500 on generic database error (not "LLM模型不存在")', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新LLM模型失败');
    });

    it('should return default error message when err.message is empty during update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新LLM模型失败');
    });

    it('should return default error message when error has no message property during update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('更新LLM模型失败');
    });

    it('should return success message after update', async () => {
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
      expect(response.body.message).toBe('更新LLM模型成功');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .put('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .put('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .put('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for empty body', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('至少提供一个更新字段');
    });

    it('should update all fields at once', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant', modelName: 'claude-3', status: false });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic', base_url: 'https://api.anthropic.com', api_key: 'sk-ant', model_name: 'claude-3', status: false });

      expect(response.status).toBe(200);
      expect(response.body.data.provider).toBe('Anthropic');
      expect(response.body.data.status).toBe(false);
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .put('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    // === Update SSRF 防护测试 ===
    it('should reject localhost in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://localhost:8080/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('localhost');
    });

    it('should reject 169.254.x.x in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://169.254.169.254/latest/meta-data/' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    // === Update 输入验证测试 ===
    it('should reject non-string provider during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 123 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject empty string provider during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject non-boolean status during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('布尔值');
    });

    it('should reject too-long model_name during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: 'A'.repeat(201) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject malformed base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Base URL');
    });

    // === Update 额外输入验证测试 ===
    it('should reject too-long provider during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject too-long api_key during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: 'sk-' + 'x'.repeat(510) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject too-long base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.example.com/' + 'a'.repeat(2100) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('长度不能超过');
    });

    it('should reject non-string base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject non-string api_key during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject non-string model_name during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: 42 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('字符串');
    });

    it('should reject empty string api_key during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject empty string model_name during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject empty string base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject ftp:// protocol in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'ftp://example.com/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should accept boolean true status during update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: false, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: true });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(true);
    });

    it('should reject numeric status during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('布尔值');
    });

    // === Update SSRF 补全测试 ===
    it('should reject 172.16.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://172.16.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 10.x.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://10.0.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 192.168.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://192.168.1.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 127.x.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://127.0.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 0.x.x.x in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://0.0.0.0/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 ::1 in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fe80: in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fe80::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fc00: in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fc00::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fd prefix in base_url during update', async () => {
      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fd00::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should return 400 for id = "Infinity" during update', async () => {
      const response = await agent
        .put('/api/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" during update', async () => {
      const response = await agent
        .put('/api/llm-models/NaN')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should update base_url with valid public https URL', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, baseUrl: 'https://api.anthropic.com' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.anthropic.com' });

      expect(response.status).toBe(200);
    });
  });

  // ========== DELETE /api/llm-models/:id ==========
  describe('DELETE /api/llm-models/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.delete('/api/llm-models/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .delete('/api/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .delete('/api/llm-models/!@#')
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
      expect(response.body.message).toBe('LLM模型不存在');
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
      expect(response.body.data).toBeNull();
    });

    it('should return 500 on generic database error (not "LLM模型不存在")', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return default error message when err.message is empty during delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return default error message when error has no message property during delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .delete('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .delete('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .delete('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .delete('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return null data after successful delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('删除LLM模型成功');
    });

    it('should return 400 for id = "Infinity" during delete', async () => {
      const response = await agent
        .delete('/api/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" during delete', async () => {
      const response = await agent
        .delete('/api/llm-models/NaN')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });
  });
});

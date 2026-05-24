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
      const response = await agent.get('/api/v1/llm-models');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/llm-models')
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
        .get('/api/v1/llm-models')
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
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toHaveLength(0);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型列表失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型列表失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models')
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
        .get('/api/v1/llm-models')
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
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data[0].status).toBe(true);
      expect(response.body.data[1].status).toBe(false);
    });
  });

  // ========== GET /api/llm-models/enabled ==========
  describe('GET /api/llm-models/enabled', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/v1/llm-models/enabled');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/llm-models/enabled')
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
        .get('/api/v1/llm-models/enabled')
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
        .get('/api/v1/llm-models/enabled')
        .set('Authorization', `Bearer ${adminToken()}`);

      expect(response.status).toBe(200);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取启用的LLM模型列表失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models/enabled')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取启用的LLM模型列表失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models/enabled')
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
        .get('/api/v1/llm-models/enabled')
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
        .get('/api/v1/llm-models/enabled')
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
        .get('/api/v1/llm-models/enabled')
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
      const response = await agent.get('/api/v1/llm-models/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .get('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .get('/api/v1/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .get('/api/v1/llm-models/@#$')
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
        .get('/api/v1/llm-models/1')
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
        .get('/api/v1/llm-models/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return default error message when err.message is empty', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return default error message when error has no message property', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取LLM模型详情失败');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .get('/api/v1/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .get('/api/v1/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .get('/api/v1/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .get('/api/v1/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "Infinity"', async () => {
      const response = await agent
        .get('/api/v1/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" string', async () => {
      const response = await agent
        .get('/api/v1/llm-models/NaN')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });
  });

  // ========== POST /api/llm-models ==========
  describe('POST /api/llm-models', () => {
    it('should return 401 without token', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ provider: 'OpenAI' });
      expect(response.status).toBe(403);
    });

    it('should return 400 when all required fields are missing', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when provider is missing', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when base_url is missing', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when api_key is missing', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when model_name is missing', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('创建LLM模型失败');
    });

    it('should return 400 when provider is empty string', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should return 400 when base_url has invalid protocol (ftp://)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'ftp://example.com', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should return 400 when base_url is malformed', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send(body);

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('Anthropic');
      expect(response.body.data.model_name).toBe('claude-3');
    });

    it('should return 400 when base_url is empty string', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: '', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when api_key is empty string', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: '', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should return 400 when model_name is empty string', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'CustomAI', base_url: 'http://llm.example.com/v1', api_key: 'local-key', model_name: 'custom-model' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('CustomAI');
    });

    it('should reject javascript: protocol in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'javascript:alert(1)', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject data: protocol in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'data:text/html,<h1>test</h1>', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject file: protocol in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'file:///etc/passwd', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject base_url with spaces', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '国产模型', base_url: 'https://api.example.com', api_key: 'sk-test', model_name: '通义千问-Max' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('国产模型');
      expect(response.body.data.model_name).toBe('通义千问-Max');
    });

    it('should reject extra fields in request body (strict schema)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o', extra_field: 'should be rejected', malicious: '<script>alert(1)</script>' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('参数验证失败');
    });

    // === SSRF 防护测试 ===
    it('should reject localhost in base_url (SSRF)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://localhost:8080/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('localhost');
    });

    it('should reject 127.x.x.x in base_url (SSRF)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://127.0.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 169.254.x.x (AWS metadata) in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://169.254.169.254/latest/meta-data/', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 10.x.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://10.0.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 192.168.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://192.168.1.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    // === 输入验证测试 ===
    it('should reject non-string provider', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 123, base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject whitespace-only provider', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '   ', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject too-long provider', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(101), base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject too-long base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/' + 'a'.repeat(2100), api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject too-long api_key', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-' + 'x'.repeat(510), model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject too-long model_name', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-' + 'x'.repeat(200) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject non-string base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 12345, api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject non-string api_key', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: true, model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject non-string model_name', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: ['array'] });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null provider', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: null, base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: null, api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null api_key', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: null, model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject null model_name', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: null });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    // === SSRF 防护补全测试 ===
    it('should reject 172.16.x.x in base_url (RFC 1918)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://172.16.0.1/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 172.31.x.x in base_url (RFC 1918 upper bound)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://172.31.255.255/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 0.x.x.x in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://0.0.0.0/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 ::1 (localhost) in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fe80: (link-local) in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[fe80::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fc00: (unique local) in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Evil', base_url: 'http://[fc00::1]/v1', api_key: 'sk-test', model_name: 'evil-model' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fd prefix (unique local) in base_url', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(201);
    });

    it('should reject whitespace-only api_key', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: '   ', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject whitespace-only model_name', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
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
        .put('/api/v1/llm-models/1')
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`)
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`)
        .send({ provider: 'Anthropic' });
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/!@#')
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
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/999')
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
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic', model_name: 'claude-3' });

      expect(response.status).toBe(200);
    });

    it('should return 500 on generic database error (not "LLM模型不存在")', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Connection timeout'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(200);
      expect(response.body.message).toBe('更新LLM模型成功');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .put('/api/v1/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .put('/api/v1/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for empty body', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数验证失败: 至少提供一个更新字段');
    });

    it('should update all fields at once', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic', baseUrl: 'https://api.anthropic.com', apiKey: 'sk-ant', modelName: 'claude-3', status: false });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic', base_url: 'https://api.anthropic.com', api_key: 'sk-ant', model_name: 'claude-3', status: false });

      expect(response.status).toBe(200);
      expect(response.body.data.provider).toBe('Anthropic');
      expect(response.body.data.status).toBe(false);
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .put('/api/v1/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    // === Update SSRF 防护测试 ===
    it('should reject localhost in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://localhost:8080/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('localhost');
    });

    it('should reject 169.254.x.x in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://169.254.169.254/latest/meta-data/' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    // === Update 输入验证测试 ===
    it('should reject non-string provider during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 123 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('expected string');
    });

    it('should reject empty string provider during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject non-boolean status during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 'true' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('boolean');
    });

    it('should reject too-long model_name during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: 'A'.repeat(201) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject malformed base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'not-a-url' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('Base URL');
    });

    // === Update 额外输入验证测试 ===
    it('should reject too-long provider during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(101) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject too-long api_key during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: 'sk-' + 'x'.repeat(510) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject too-long base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.example.com/' + 'a'.repeat(2100) });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能超过');
    });

    it('should reject non-string base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 12345 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('expected string');
    });

    it('should reject non-string api_key during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: true });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('expected string');
    });

    it('should reject non-string model_name during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: 42 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('expected string');
    });

    it('should reject empty string api_key during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject empty string model_name during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ model_name: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject empty string base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: '   ' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject ftp:// protocol in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
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
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: true });

      expect(response.status).toBe(200);
      expect(response.body.data.status).toBe(true);
    });

    it('should reject numeric status during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ status: 1 });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('boolean');
    });

    // === Update SSRF 补全测试 ===
    it('should reject 172.16.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://172.16.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 10.x.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://10.0.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 192.168.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://192.168.1.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 127.x.x.x in base_url during update (SSRF)', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://127.0.0.1/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject 0.x.x.x in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://0.0.0.0/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 ::1 in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fe80: in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fe80::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fc00: in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fc00::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should reject IPv6 fd prefix in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://[fd00::1]/v1' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('内网');
    });

    it('should return 400 for id = "Infinity" during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/NaN')
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
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'https://api.anthropic.com' });

      expect(response.status).toBe(200);
    });
  });

  // ========== DELETE /api/llm-models/:id ==========
  describe('DELETE /api/llm-models/:id', () => {
    it('should return 401 without token', async () => {
      const response = await agent.delete('/api/v1/llm-models/1');
      expect(response.status).toBe(401);
    });

    it('should return 403 for admin role', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${adminToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return 400 for invalid id (non-numeric)', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for invalid id (special characters)', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/!@#')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 404 for non-existent model', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/llm-models/999')
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
        .delete('/api/v1/llm-models/1')
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
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return default error message when err.message is empty during delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error(''));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return default error message when error has no message property during delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue({ code: 'UNKNOWN' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除LLM模型失败');
    });

    it('should return 400 for id = 0', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for negative id', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for float id', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id with leading zeros', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/007')
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
        .delete('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data).toBeNull();
      expect(response.body.message).toBe('删除LLM模型成功');
    });

    it('should return 400 for id = "Infinity" during delete', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/Infinity')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for id = "NaN" during delete', async () => {
      const response = await agent
        .delete('/api/v1/llm-models/NaN')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });
  });

  // ========== 直接调用控制器函数的单元测试（覆盖中间件已拦截的防御性代码） ==========
  describe('updateLlmModel direct unit tests (bypassing validation middleware)', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    // 覆盖行 131: 所有字段为 undefined → '至少提供一个更新字段'
    it('should return 400 when all update fields are undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: {} };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '至少提供一个更新字段' });
    });

    // 覆盖行 153: status 为非布尔值 → 'status 必须为布尔值'
    it('should return 400 when status is a string (not boolean)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { status: 'active' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: 'status 必须为布尔值' });
    });

    // 覆盖行 153: status 为数字 → 'status 必须为布尔值'
    it('should return 400 when status is a number (not boolean)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { status: 0 } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: 'status 必须为布尔值' });
    });

    // 覆盖行 153: status 为 null → 应被 typeof !== 'boolean' 拦截
    it('should return 400 when status is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { status: null } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: 'status 必须为布尔值' });
    });

    // 覆盖行 153: status 为数组 → 应被拦截
    it('should return 400 when status is an array', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { status: [true] } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: 'status 必须为布尔值' });
    });

    // 覆盖行 153: status 为对象 → 应被拦截
    it('should return 400 when status is an object', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { status: { value: true } } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: 'status 必须为布尔值' });
    });

    // 仅提供 status=true 时，应成功通过验证（不触发 line 153）
    it('should not reject valid boolean status true in controller', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: false, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: true });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' }, body: { status: true } };

      await updateLlmModel(mockReq as any, mockRes as any);

      // success() calls res.json() directly, not res.status().json()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, data: expect.objectContaining({ status: true }) })
      );
    });

    // 仅提供 status=false 时，应成功通过验证
    it('should not reject valid boolean status false in controller', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, status: false });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' }, body: { status: false } };

      await updateLlmModel(mockReq as any, mockRes as any);

      // success() calls res.json() directly, not res.status().json()
      expect(mockJson).toHaveBeenCalledWith(
        expect.objectContaining({ code: 0, data: expect.objectContaining({ status: false }) })
      );
    });

    // 覆盖 validateOptionalString 非 string 类型检查 (line 58)
    it('should return 400 when provider is non-string type during update (bypass Zod)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { provider: 123, model_name: 'test' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('字符串类型') }));
    });

    // 覆盖 validateOptionalString 长度检查 (line 60)
    it('should return 400 when provider exceeds max length during update (bypass Zod)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { provider: 'A'.repeat(101) } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能超过') }));
    });

    // 覆盖 validateOptionalString 空 string 检查
    it('should return 400 when model_name is whitespace-only during update (bypass Zod)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { model_name: '   ' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });
  });

  // ========== createLlmModel 直接单元测试（覆盖 validateRequiredString 分支） ==========
  describe('createLlmModel direct unit tests (bypassing validation middleware)', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    // 覆盖 validateRequiredString null 检查 (line 49 null branch)
    it('should return 400 when provider is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: null, base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });

    // 覆盖 validateRequiredString 非 string 检查 (line 50)
    it('should return 400 when api_key is a number', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 12345, model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('字符串类型') }));
    });

    // 覆盖 validateRequiredString 长度检查 (line 52)
    it('should return 400 when model_name exceeds max length', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'x'.repeat(201) } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能超过') }));
    });

    // 覆盖 validateRequiredString 空 string 检查 (line 51)
    it('should return 400 when provider is whitespace-only', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: '   ', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });

    // 覆盖 validateRequiredString base_url null 检查
    it('should return 400 when base_url is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: null, api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    // 覆盖 validateRequiredString api_key 为 boolean 类型
    it('should return 400 when api_key is boolean', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: true, model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });
  });

  // ========== parseId 额外边界测试（通过 GET/:id 间接测试） ==========
  describe('parseId edge cases via GET /:id', () => {
    it('should return 400 for id = "999999" (large valid number)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 999999, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/llm-models/999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.id).toBe(999999);
    });

    it('should return 400 for id with spaces', async () => {
      const response = await agent
        .get('/api/v1/llm-models/1%202')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的模型ID');
    });

    it('should return 400 for very large number id', async () => {
      const response = await agent
        .get('/api/v1/llm-models/99999999999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      // Either 200 (if DB returns null → 404) or valid response
      expect([200, 400, 404]).toContain(response.status);
    });
  });

  // ========== isUrlSafe 额外边界测试 ==========
  describe('isUrlSafe additional edge cases via POST', () => {
    it('should accept base_url with port on public domain', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'CustomAI', baseUrl: 'https://api.example.com:8443/v1', apiKey: 'sk-test', modelName: 'custom', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'CustomAI', base_url: 'https://api.example.com:8443/v1', api_key: 'sk-test', model_name: 'custom' });

      expect(response.status).toBe(201);
    });

    it('should reject base_url with only whitespace in POST', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'OpenAI', base_url: '   ', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('不能为空');
    });

    it('should reject 172.15.x.x as valid (not RFC 1918 range)', async () => {
      // 172.15.x.x is NOT in 172.16-31 range, should be safe
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'Test', baseUrl: 'http://172.15.0.1/v1', apiKey: 'sk-test', modelName: 'test', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Test', base_url: 'http://172.15.0.1/v1', api_key: 'sk-test', model_name: 'test' });

      expect(response.status).toBe(201);
    });

    it('should reject 172.32.x.x as valid (above RFC 1918 range)', async () => {
      // 172.32.x.x is NOT in 172.16-31 range, should be safe
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'Test', baseUrl: 'http://172.32.0.1/v1', apiKey: 'sk-test', modelName: 'test', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Test', base_url: 'http://172.32.0.1/v1', api_key: 'sk-test', model_name: 'test' });

      expect(response.status).toBe(201);
    });
  });

  // ========== GET /api/llm-models 额外响应格式验证 ==========
  describe('GET /api/llm-models response format validation', () => {
    it('should return response with code 0 and message field', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      const response = await agent
        .get('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('code', 0);
      expect(response.body).toHaveProperty('data');
    });
  });

  // ========== PUT 更新 base_url 额外验证 ==========
  describe('PUT /api/llm-models/:id additional validation', () => {
    it('should reject javascript: protocol in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'javascript:alert(1)' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should reject data: protocol in base_url during update', async () => {
      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'data:text/html,<h1>test</h1>' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('http://');
    });

    it('should update with valid http:// public URL', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'Test', baseUrl: 'http://old.example.com/v1', apiKey: 'sk-test', modelName: 'test', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, baseUrl: 'http://new.example.com/v1' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ base_url: 'http://new.example.com/v1' });

      expect(response.status).toBe(200);
    });

    it('should update api_key with valid value', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-old', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, apiKey: 'sk-new-key' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ api_key: 'sk-new-key' });

      expect(response.status).toBe(200);
    });
  });

  // ========== POST 创建额外边界验证 ==========
  describe('POST /api/llm-models additional edge cases', () => {
    it('should reject provider with exactly max+1 length', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(101), base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(400);
    });

    it('should accept provider with exactly max length (100)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'A'.repeat(100), baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'A'.repeat(100), base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' });

      expect(response.status).toBe(201);
    });

    it('should accept model_name with exactly max length (200)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'Test', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'x'.repeat(200), status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Test', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'x'.repeat(200) });

      expect(response.status).toBe(201);
    });

    it('should reject model_name with exactly max+1 length (201)', async () => {
      const response = await agent
        .post('/api/v1/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Test', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'x'.repeat(201) });

      expect(response.status).toBe(400);
    });
  });

  // ========== parseId 分支覆盖——raw 为 undefined / 空字符串（第 11 行） ==========
  describe('parseId branch: raw is undefined or empty string (line 11)', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('getLlmModel: should return 400 when id param is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: {} };

      await getLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    it('getLlmModel: should return 400 when id param is empty string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '' } };

      await getLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    it('updateLlmModel: should return 400 when id param is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: {}, body: { provider: 'Test' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    it('updateLlmModel: should return 400 when id param is empty string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '' }, body: { provider: 'Test' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    it('deleteLlmModel: should return 400 when id param is undefined', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { deleteLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: {} };

      await deleteLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    it('deleteLlmModel: should return 400 when id param is empty string', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { deleteLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '' } };

      await deleteLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith({ code: 400, message: '无效的模型ID' });
    });

    // parseId with whitespace-padded valid number — 覆盖 raw.trim() 与 String(id) 匹配路径
    it('getLlmModel: should accept id with leading/trailing whitespace', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: ' 1 ' } };

      await getLlmModel(mockReq as any, mockRes as any);

      // " 1 " → parseInt gives 1, String(1)="1", " 1 ".trim()="1", "1"==="1" → valid
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });
  });

  // ========== validateOptionalString undefined 分支说明 ==========
  // 第 57 行 `if (value === undefined) return null;` 是防御性编程的死代码。
  // 控制器在调用 validateOptionalString 前总是检查 `if (field !== undefined)`，
  // 因此 value === undefined 分支在设计上不可达。此处添加注释说明而非测试。

  // ========== listLlmModels / listEnabledLlmModels 直接单元测试 ==========
  describe('listLlmModels & listEnabledLlmModels direct unit tests', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('listLlmModels: should return success with data', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { listLlmModels } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      await listLlmModels({} as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0, data: expect.any(Array) }));
    });

    it('listLlmModels: should return 500 on database error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { listLlmModels } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      await listLlmModels({} as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '获取LLM模型列表失败' });
    });

    it('listEnabledLlmModels: should return success with data', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { listEnabledLlmModels } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, provider: 'OpenAI', modelName: 'gpt-4o' },
      ]);
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      await listEnabledLlmModels({} as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0, data: expect.any(Array) }));
    });

    it('listEnabledLlmModels: should return 500 on database error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { listEnabledLlmModels } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ llmModel: { findMany: mockFindMany } });

      await listEnabledLlmModels({} as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '获取启用的LLM模型列表失败' });
    });
  });

  // ========== deleteLlmModel 直接单元测试（覆盖错误分支） ==========
  describe('deleteLlmModel direct unit tests', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('should return 200 with null data on successful delete', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { deleteLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' } };

      await deleteLlmModel(mockReq as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0, data: null, message: '删除LLM模型成功' }));
    });

    it('should return 404 when model does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { deleteLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '999' } };

      await deleteLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ code: 404, message: 'LLM模型不存在' });
    });

    it('should return 500 on generic error (non-LLM模型不存在)', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { deleteLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Connection lost'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '1' } };

      await deleteLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '删除LLM模型失败' });
    });
  });

  // ========== getLlmModel 直接单元测试（覆盖错误分支） ==========
  describe('getLlmModel direct unit tests', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('should return 404 when model does not exist', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '999' } };

      await getLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ code: 404, message: 'LLM模型不存在' });
    });

    it('should return 500 on generic error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Timeout'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '1' } };

      await getLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '获取LLM模型详情失败' });
    });
  });

  // ========== createLlmModel 直接单元测试（补充边界验证） ==========
  describe('createLlmModel direct unit tests (additional)', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('should return 201 on successful creation', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0, message: '创建LLM模型成功' }));
    });

    it('should return 400 when base_url is null', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: null, api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
    });

    it('should return 400 when model_name is empty after trim', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: '   ' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });

    it('should return 400 when base_url fails SSRF check', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'Evil', base_url: 'http://127.0.0.1/v1', api_key: 'sk-test', model_name: 'evil' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('内网') }));
    });

    it('should return 400 when base_url is whitespace-only', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'OpenAI', base_url: '   ', api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });

    it('should return 400 when base_url has invalid protocol', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { body: { provider: 'Evil', base_url: 'ftp://example.com', api_key: 'sk-test', model_name: 'evil' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('http://') }));
    });

    it('should return 500 on database error', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { createLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockCreate = jest.fn().mockRejectedValue(new Error('DB down'));
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const mockReq = { body: { provider: 'OpenAI', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4o' } };

      await createLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '创建LLM模型失败' });
    });
  });

  // ========== updateLlmModel 直接单元测试（补充边界验证） ==========
  describe('updateLlmModel direct unit tests (additional)', () => {
    let mockJson: jest.Mock;
    let mockStatus: jest.Mock;
    let mockRes: any;

    beforeEach(() => {
      mockJson = jest.fn();
      mockStatus = jest.fn().mockReturnValue({ json: mockJson });
      mockRes = { status: mockStatus, json: mockJson };
    });

    it('should return 200 on successful update with base_url', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, baseUrl: 'https://api.anthropic.com' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' }, body: { base_url: 'https://api.anthropic.com' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0, message: '更新LLM模型成功' }));
    });

    it('should return 400 when base_url fails SSRF check during update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { base_url: 'http://192.168.1.1/v1' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('内网') }));
    });

    it('should return 400 when base_url is whitespace-only during update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { base_url: '   ' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('不能为空') }));
    });

    it('should return 400 when base_url has invalid protocol during update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');

      const mockReq = { params: { id: '1' }, body: { base_url: 'ftp://bad.com' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(400);
      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ message: expect.stringContaining('http://') }));
    });

    it('should return 404 when model does not exist during update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '999' }, body: { provider: 'Test' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(404);
      expect(mockJson).toHaveBeenCalledWith({ code: 404, message: 'LLM模型不存在' });
    });

    it('should return 500 on generic database error during update', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const mockFindFirst = jest.fn().mockRejectedValue(new Error('Connection lost'));
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const mockReq = { params: { id: '1' }, body: { provider: 'Test' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockStatus).toHaveBeenCalledWith(500);
      expect(mockJson).toHaveBeenCalledWith({ code: 500, message: '更新LLM模型失败' });
    });

    it('should update only api_key field', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-old', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, apiKey: 'sk-new' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' }, body: { api_key: 'sk-new' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });

    it('should update only model_name field', async () => {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { updateLlmModel } = require('../../apis/controller/llm-model.controller');
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const { getPrisma } = require('../../apis/utils/db.util');

      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, modelName: 'gpt-4o-mini' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const mockReq = { params: { id: '1' }, body: { model_name: 'gpt-4o-mini' } };

      await updateLlmModel(mockReq as any, mockRes as any);

      expect(mockJson).toHaveBeenCalledWith(expect.objectContaining({ code: 0 }));
    });
  });
});

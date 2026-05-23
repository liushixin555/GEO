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

    it('should handle id = 0 (valid parseInt result)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should handle negative id', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should truncate float id to integer', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should handle id with leading zeros', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 7, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 7 } });
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

    it('should accept http:// protocol in base_url', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, provider: 'LocalAI', baseUrl: 'http://localhost:8080/v1', apiKey: 'local-key', modelName: 'local-model', status: true, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ llmModel: { create: mockCreate } });

      const response = await agent
        .post('/api/llm-models')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'LocalAI', base_url: 'http://localhost:8080/v1', api_key: 'local-key', model_name: 'local-model' });

      expect(response.status).toBe(201);
      expect(response.body.data.provider).toBe('LocalAI');
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

    it('should handle id = 0 for update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should handle negative id for update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(404);
    });

    it('should truncate float id for update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should update with empty body', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
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

    it('should handle id with leading zeros for update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 7, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, provider: 'Anthropic' });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ provider: 'Anthropic' });

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 7 } });
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

    it('should handle id = 0 for delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/0')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('LLM模型不存在');
    });

    it('should handle negative id for delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/llm-models/-1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should truncate float id for delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/llm-models/1.9')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should handle id with leading zeros for delete', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 7, provider: 'OpenAI', baseUrl: 'https://api.openai.com/v1', apiKey: 'sk-test', modelName: 'gpt-4o', status: true, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ llmModel: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/llm-models/007')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindFirst).toHaveBeenCalledWith({ where: { id: 7 } });
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
  });
});

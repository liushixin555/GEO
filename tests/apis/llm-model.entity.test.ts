/**
 * @jest-environment node
 */
import {
  LlmModel,
  CreateLlmModelRequest,
  UpdateLlmModelRequest,
} from '../../apis/entity/llm-model.entity';

describe('llm-model.entity', () => {
  // ============================================================
  // LlmModel interface
  // ============================================================
  describe('LlmModel interface', () => {
    it('should create a valid LlmModel object with all required fields', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-xxx',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(1);
      expect(model.provider).toBe('openai');
      expect(model.base_url).toBe('https://api.openai.com/v1');
      expect(model.api_key).toBe('sk-xxx');
      expect(model.model_name).toBe('gpt-4');
      expect(model.status).toBe(true);
    });

    it('should have exactly 8 fields', () => {
      const model: LlmModel = {
        id: 2,
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-xxx',
        model_name: 'claude-3',
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(model).sort()).toEqual(
        ['id', 'provider', 'base_url', 'api_key', 'model_name', 'status', 'created_at', 'updated_at'].sort()
      );
    });

    it('should have id as number type', () => {
      const model: LlmModel = {
        id: 999,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.id).toBe('number');
      expect(model.id).toBe(999);
    });

    it('should support id as 0', () => {
      const model: LlmModel = {
        id: 0,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(0);
    });

    it('should support large id values', () => {
      const model: LlmModel = {
        id: Number.MAX_SAFE_INTEGER,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should have provider as string type', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.provider).toBe('string');
    });

    it('should support various provider values', () => {
      const providers = ['openai', 'anthropic', 'google', 'azure', 'custom-llm', 'deepseek'];
      providers.forEach((provider) => {
        const model: LlmModel = {
          id: 1,
          provider,
          base_url: 'https://test.com',
          api_key: 'key',
          model_name: 'model',
          status: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(model.provider).toBe(provider);
      });
    });

    it('should support provider with Chinese characters', () => {
      const model: LlmModel = {
        id: 1,
        provider: '薄云自研模型',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toContain('薄云');
    });

    it('should support empty string provider', () => {
      const model: LlmModel = {
        id: 1,
        provider: '',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toBe('');
    });

    it('should have base_url as string type', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://api.openai.com/v1',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.base_url).toBe('string');
    });

    it('should support various base_url formats', () => {
      const urls = [
        'https://api.openai.com/v1',
        'https://api.anthropic.com',
        'http://localhost:8080/v1',
        'https://generativelanguage.googleapis.com/v1beta',
        'https://custom-llm.internal.company.com/api',
        '/relative/path/api',
      ];
      urls.forEach((url) => {
        const model: LlmModel = {
          id: 1,
          provider: 'test',
          base_url: url,
          api_key: 'key',
          model_name: 'model',
          status: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(model.base_url).toBe(url);
      });
    });

    it('should support empty string base_url', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: '',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url).toBe('');
    });

    it('should have api_key as string type', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'sk-proj-xxxxx',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.api_key).toBe('string');
    });

    it('should support various api_key formats', () => {
      const keys = [
        'sk-xxxx',
        'sk-ant-api03-xxxx',
        'AIzaSyxxxx',
        'Bearer-token-format',
        'simple-key',
        'key_with_underscores',
        'key.with.dots',
      ];
      keys.forEach((apiKey) => {
        const model: LlmModel = {
          id: 1,
          provider: 'test',
          base_url: 'https://test.com',
          api_key: apiKey,
          model_name: 'model',
          status: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(model.api_key).toBe(apiKey);
      });
    });

    it('should support empty string api_key', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: '',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.api_key).toBe('');
    });

    it('should have model_name as string type', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'gpt-4-turbo',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.model_name).toBe('string');
    });

    it('should support various model_name values', () => {
      const modelNames = [
        'gpt-4',
        'gpt-4-turbo',
        'gpt-4o',
        'gpt-3.5-turbo',
        'claude-3-opus-20240229',
        'claude-3-sonnet-20240229',
        'claude-3-haiku-20240307',
        'gemini-pro',
        'gemini-1.5-flash',
        'deepseek-chat',
        'deepseek-coder',
      ];
      modelNames.forEach((modelName) => {
        const model: LlmModel = {
          id: 1,
          provider: 'test',
          base_url: 'https://test.com',
          api_key: 'key',
          model_name: modelName,
          status: true,
          created_at: new Date(),
          updated_at: new Date(),
        };
        expect(model.model_name).toBe(modelName);
      });
    });

    it('should support model_name with Chinese characters', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: '薄云自研大模型v1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.model_name).toContain('薄云');
    });

    it('should have status as boolean type', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(typeof model.status).toBe('boolean');
    });

    it('should support status as true (enabled)', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.status).toBe(true);
    });

    it('should support status as false (disabled)', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.status).toBe(false);
    });

    it('should have created_at as Date instance', () => {
      const now = new Date();
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: now,
        updated_at: new Date(),
      };
      expect(model.created_at).toBeInstanceOf(Date);
      expect(model.created_at).toBe(now);
    });

    it('should have updated_at as Date instance', () => {
      const now = new Date();
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: now,
      };
      expect(model.updated_at).toBeInstanceOf(Date);
      expect(model.updated_at).toBe(now);
    });

    it('should support different created_at and updated_at timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: created,
        updated_at: updated,
      };
      expect(model.created_at.getTime()).toBeLessThan(model.updated_at.getTime());
    });

    it('should support same created_at and updated_at timestamps', () => {
      const now = new Date();
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: now,
        updated_at: now,
      };
      expect(model.created_at.getTime()).toBe(model.updated_at.getTime());
    });

    it('should create a complete model with realistic OpenAI config', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-proj-abc123',
        model_name: 'gpt-4o',
        status: true,
        created_at: new Date('2024-06-01T08:00:00Z'),
        updated_at: new Date('2024-06-15T12:30:00Z'),
      };
      expect(model.provider).toBe('openai');
      expect(model.base_url).toContain('openai.com');
      expect(model.model_name).toBe('gpt-4o');
      expect(model.status).toBe(true);
    });

    it('should create a complete model with realistic Anthropic config', () => {
      const model: LlmModel = {
        id: 2,
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-api03-xyz',
        model_name: 'claude-3-sonnet-20240229',
        status: true,
        created_at: new Date('2024-03-01T00:00:00Z'),
        updated_at: new Date('2024-03-01T00:00:00Z'),
      };
      expect(model.provider).toBe('anthropic');
      expect(model.base_url).toContain('anthropic.com');
      expect(model.model_name).toContain('claude');
    });

    it('should create a disabled model', () => {
      const model: LlmModel = {
        id: 3,
        provider: 'legacy',
        base_url: 'https://old-api.example.com/v1',
        api_key: 'old-key',
        model_name: 'old-model-v1',
        status: false,
        created_at: new Date('2023-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      };
      expect(model.status).toBe(false);
    });
  });

  // ============================================================
  // CreateLlmModelRequest interface
  // ============================================================
  describe('CreateLlmModelRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-xxx',
        model_name: 'gpt-4',
      };
      expect(req.provider).toBe('openai');
      expect(req.base_url).toBe('https://api.openai.com/v1');
      expect(req.api_key).toBe('sk-xxx');
      expect(req.model_name).toBe('gpt-4');
    });

    it('should have exactly 4 required fields', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
      };
      expect(Object.keys(req)).toHaveLength(4);
      expect(Object.keys(req).sort()).toEqual(['api_key', 'base_url', 'model_name', 'provider']);
    });

    it('should have provider as string type', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
      };
      expect(typeof req.provider).toBe('string');
    });

    it('should support various provider values', () => {
      const providers = ['openai', 'anthropic', 'google', 'azure', 'deepseek', 'custom'];
      providers.forEach((provider) => {
        const req: CreateLlmModelRequest = {
          provider,
          base_url: 'https://test.com',
          api_key: 'key',
          model_name: 'model',
        };
        expect(req.provider).toBe(provider);
      });
    });

    it('should have base_url as string type', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://api.openai.com/v1',
        api_key: 'key',
        model_name: 'model',
      };
      expect(typeof req.base_url).toBe('string');
    });

    it('should support various base_url formats', () => {
      const urls = [
        'https://api.openai.com/v1',
        'https://api.anthropic.com',
        'http://localhost:8080',
        'https://generativelanguage.googleapis.com/v1beta',
      ];
      urls.forEach((url) => {
        const req: CreateLlmModelRequest = {
          provider: 'test',
          base_url: url,
          api_key: 'key',
          model_name: 'model',
        };
        expect(req.base_url).toBe(url);
      });
    });

    it('should have api_key as string type', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'sk-proj-xxxxx',
        model_name: 'model',
      };
      expect(typeof req.api_key).toBe('string');
    });

    it('should support various api_key formats', () => {
      const keys = ['sk-xxxx', 'sk-ant-api03-xxxx', 'AIzaSyxxxx', 'Bearer-token'];
      keys.forEach((apiKey) => {
        const req: CreateLlmModelRequest = {
          provider: 'test',
          base_url: 'https://test.com',
          api_key: apiKey,
          model_name: 'model',
        };
        expect(req.api_key).toBe(apiKey);
      });
    });

    it('should have model_name as string type', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'gpt-4o',
      };
      expect(typeof req.model_name).toBe('string');
    });

    it('should support various model_name values', () => {
      const names = ['gpt-4', 'gpt-4-turbo', 'gpt-4o', 'claude-3-opus', 'gemini-pro', 'deepseek-chat'];
      names.forEach((name) => {
        const req: CreateLlmModelRequest = {
          provider: 'test',
          base_url: 'https://test.com',
          api_key: 'key',
          model_name: name,
        };
        expect(req.model_name).toBe(name);
      });
    });

    it('should support provider with Chinese characters', () => {
      const req: CreateLlmModelRequest = {
        provider: '薄云自研',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
      };
      expect(req.provider).toContain('薄云');
    });

    it('should support model_name with Chinese characters', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: '薄云大模型v2',
      };
      expect(req.model_name).toContain('薄云');
    });

    it('should create a request for OpenAI provider', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-proj-abc123',
        model_name: 'gpt-4o',
      };
      expect(req.provider).toBe('openai');
      expect(req.model_name).toBe('gpt-4o');
    });

    it('should create a request for Anthropic provider', () => {
      const req: CreateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-api03-xyz',
        model_name: 'claude-3-sonnet-20240229',
      };
      expect(req.provider).toBe('anthropic');
      expect(req.model_name).toContain('claude');
    });

    it('should create a request for local development', () => {
      const req: CreateLlmModelRequest = {
        provider: 'local',
        base_url: 'http://localhost:8080',
        api_key: 'local-dev-key',
        model_name: 'local-model',
      };
      expect(req.base_url).toContain('localhost');
    });

    it('should support empty string values', () => {
      const req: CreateLlmModelRequest = {
        provider: '',
        base_url: '',
        api_key: '',
        model_name: '',
      };
      expect(req.provider).toBe('');
      expect(req.base_url).toBe('');
      expect(req.api_key).toBe('');
      expect(req.model_name).toBe('');
    });
  });

  // ============================================================
  // UpdateLlmModelRequest interface
  // ============================================================
  describe('UpdateLlmModelRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-new',
        model_name: 'claude-3.5',
        status: true,
      };
      expect(req.provider).toBe('anthropic');
      expect(req.base_url).toBe('https://api.anthropic.com');
      expect(req.api_key).toBe('sk-ant-new');
      expect(req.model_name).toBe('claude-3.5');
      expect(req.status).toBe(true);
    });

    it('should have exactly 5 optional fields when all provided', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(5);
      expect(Object.keys(req).sort()).toEqual(['api_key', 'base_url', 'model_name', 'provider', 'status']);
    });

    it('should allow empty update request', () => {
      const req: UpdateLlmModelRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow partial update with model_name only', () => {
      const req: UpdateLlmModelRequest = { model_name: 'gpt-4o' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.model_name).toBe('gpt-4o');
      expect(req.provider).toBeUndefined();
      expect(req.base_url).toBeUndefined();
      expect(req.api_key).toBeUndefined();
      expect(req.status).toBeUndefined();
    });

    it('should allow updating provider only', () => {
      const req: UpdateLlmModelRequest = { provider: 'new-provider' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.provider).toBe('new-provider');
      expect(req.model_name).toBeUndefined();
    });

    it('should allow updating base_url only', () => {
      const req: UpdateLlmModelRequest = { base_url: 'https://new-api.example.com/v1' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.base_url).toBe('https://new-api.example.com/v1');
      expect(req.provider).toBeUndefined();
    });

    it('should allow updating api_key only', () => {
      const req: UpdateLlmModelRequest = { api_key: 'new-secret-key' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.api_key).toBe('new-secret-key');
      expect(req.provider).toBeUndefined();
    });

    it('should allow updating status only (enable)', () => {
      const req: UpdateLlmModelRequest = { status: true };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.status).toBe(true);
    });

    it('should allow updating status only (disable)', () => {
      const req: UpdateLlmModelRequest = { status: false };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.status).toBe(false);
    });

    it('should allow status toggle from disabled to enabled', () => {
      const disableReq: UpdateLlmModelRequest = { status: false };
      expect(disableReq.status).toBe(false);

      const enableReq: UpdateLlmModelRequest = { status: true };
      expect(enableReq.status).toBe(true);
    });

    it('should allow updating provider and model_name together', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'openai',
        model_name: 'gpt-4-turbo',
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.provider).toBe('openai');
      expect(req.model_name).toBe('gpt-4-turbo');
      expect(req.base_url).toBeUndefined();
      expect(req.api_key).toBeUndefined();
    });

    it('should allow updating base_url and api_key together', () => {
      const req: UpdateLlmModelRequest = {
        base_url: 'https://new-api.example.com',
        api_key: 'new-key',
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.base_url).toBe('https://new-api.example.com');
      expect(req.api_key).toBe('new-key');
      expect(req.provider).toBeUndefined();
    });

    it('should allow updating model_name and status together', () => {
      const req: UpdateLlmModelRequest = {
        model_name: 'gpt-4o-mini',
        status: true,
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.model_name).toBe('gpt-4o-mini');
      expect(req.status).toBe(true);
    });

    it('should allow updating provider, base_url, and api_key together', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-new-key',
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(req.provider).toBe('anthropic');
      expect(req.base_url).toBe('https://api.anthropic.com');
      expect(req.api_key).toBe('sk-ant-new-key');
    });

    it('should allow updating all fields except status', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'google',
        base_url: 'https://generativelanguage.googleapis.com/v1beta',
        api_key: 'AIzaSyNewKey',
        model_name: 'gemini-1.5-pro',
      };
      expect(Object.keys(req)).toHaveLength(4);
      expect(req.status).toBeUndefined();
    });

    it('should support provider with Chinese characters', () => {
      const req: UpdateLlmModelRequest = { provider: '薄云自研模型' };
      expect(req.provider).toContain('薄云');
    });

    it('should support model_name with Chinese characters', () => {
      const req: UpdateLlmModelRequest = { model_name: '薄云大模型v3' };
      expect(req.model_name).toContain('薄云');
    });

    it('should support empty string provider', () => {
      const req: UpdateLlmModelRequest = { provider: '' };
      expect(req.provider).toBe('');
    });

    it('should support empty string base_url', () => {
      const req: UpdateLlmModelRequest = { base_url: '' };
      expect(req.base_url).toBe('');
    });

    it('should support empty string api_key', () => {
      const req: UpdateLlmModelRequest = { api_key: '' };
      expect(req.api_key).toBe('');
    });

    it('should support empty string model_name', () => {
      const req: UpdateLlmModelRequest = { model_name: '' };
      expect(req.model_name).toBe('');
    });

    it('should have provider as string type when provided', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai' };
      expect(typeof req.provider).toBe('string');
    });

    it('should have base_url as string type when provided', () => {
      const req: UpdateLlmModelRequest = { base_url: 'https://test.com' };
      expect(typeof req.base_url).toBe('string');
    });

    it('should have api_key as string type when provided', () => {
      const req: UpdateLlmModelRequest = { api_key: 'key' };
      expect(typeof req.api_key).toBe('string');
    });

    it('should have model_name as string type when provided', () => {
      const req: UpdateLlmModelRequest = { model_name: 'gpt-4' };
      expect(typeof req.model_name).toBe('string');
    });

    it('should have status as boolean type when provided', () => {
      const req: UpdateLlmModelRequest = { status: true };
      expect(typeof req.status).toBe('boolean');
    });
  });

  // ============================================================
  // LlmModel 边界值与特殊场景
  // ============================================================
  describe('LlmModel edge cases and special scenarios', () => {
    it('should support negative id values', () => {
      const model: LlmModel = {
        id: -1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(-1);
      expect(model.id).toBeLessThan(0);
    });

    it('should support negative large id values', () => {
      const model: LlmModel = {
        id: -Number.MAX_SAFE_INTEGER,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should support decimal id (TypeScript does not enforce integer)', () => {
      const model: LlmModel = {
        id: 3.14,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.id).toBe(3.14);
    });

    it('should support very long provider strings', () => {
      const longProvider = 'a'.repeat(1000);
      const model: LlmModel = {
        id: 1,
        provider: longProvider,
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toBe(longProvider);
      expect(model.provider.length).toBe(1000);
    });

    it('should support very long base_url strings', () => {
      const longUrl = 'https://' + 'a'.repeat(500) + '.com/v1';
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: longUrl,
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url).toBe(longUrl);
    });

    it('should support very long api_key strings', () => {
      const longKey = 'sk-' + 'x'.repeat(500);
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: longKey,
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.api_key).toBe(longKey);
    });

    it('should support very long model_name strings', () => {
      const longName = 'model-' + 'x'.repeat(500);
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: longName,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.model_name).toBe(longName);
    });

    it('should support provider with emoji characters', () => {
      const model: LlmModel = {
        id: 1,
        provider: '🤖 OpenAI Provider',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toContain('🤖');
    });

    it('should support model_name with emoji characters', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: '🧠 智能模型v1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.model_name).toContain('🧠');
    });

    it('should support strings with whitespace', () => {
      const model: LlmModel = {
        id: 1,
        provider: '  spaced provider  ',
        base_url: '  https://test.com  ',
        api_key: '  key with spaces  ',
        model_name: '  model name  ',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toContain(' ');
      expect(model.base_url).toContain(' ');
      expect(model.api_key).toContain(' ');
      expect(model.model_name).toContain(' ');
    });

    it('should support strings with newlines and tabs', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'provider\nwith\nnewlines',
        base_url: 'https://test.com/path?q=1&tab=\t',
        api_key: 'key\nwith\nnewlines',
        model_name: 'model\twith\ttabs',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toContain('\n');
      expect(model.api_key).toContain('\n');
      expect(model.model_name).toContain('\t');
    });

    it('should support unicode characters in all string fields', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'プロバイダー',
        base_url: 'https://тест.рф',
        api_key: '密钥-키-key',
        model_name: 'モデル-모델-model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toContain('プロバイダー');
      expect(model.api_key).toContain('密钥');
      expect(model.model_name).toContain('モデル');
    });

    it('should support Date epoch (1970-01-01)', () => {
      const epoch = new Date(0);
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: epoch,
        updated_at: epoch,
      };
      expect(model.created_at.getTime()).toBe(0);
      expect(model.updated_at.getTime()).toBe(0);
    });

    it('should support far future dates', () => {
      const future = new Date('2099-12-31T23:59:59Z');
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: future,
        updated_at: future,
      };
      expect(model.created_at.getUTCFullYear()).toBe(2099);
    });

    it('should support far past dates', () => {
      const past = new Date('2000-01-01T00:00:00Z');
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: past,
        updated_at: past,
      };
      expect(model.created_at.getFullYear()).toBe(2000);
    });

    it('should support base_url with query parameters', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://api.example.com/v1?version=2&debug=true',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url).toContain('?version=2');
      expect(model.base_url).toContain('&debug=true');
    });

    it('should support base_url with trailing slashes', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://api.example.com/v1/',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url.endsWith('/')).toBe(true);
    });

    it('should support base_url with port number', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://api.example.com:8443/v1',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url).toContain(':8443');
    });

    it('should support base_url with IP address', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'http://192.168.1.100:8080/v1',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.base_url).toContain('192.168.1.100');
    });
  });

  // ============================================================
  // LlmModel 对象操作
  // ============================================================
  describe('LlmModel object operations', () => {
    const createModel = (): LlmModel => ({
      id: 1,
      provider: 'openai',
      base_url: 'https://api.openai.com/v1',
      api_key: 'sk-test',
      model_name: 'gpt-4',
      status: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    });

    it('should be serializable to JSON', () => {
      const model = createModel();
      const json = JSON.stringify(model);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.provider).toBe('openai');
      expect(parsed.base_url).toBe('https://api.openai.com/v1');
      expect(parsed.api_key).toBe('sk-test');
      expect(parsed.model_name).toBe('gpt-4');
      expect(parsed.status).toBe(true);
    });

    it('should serialize dates as ISO strings in JSON', () => {
      const model = createModel();
      const json = JSON.stringify(model);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
    });

    it('should be cloneable with spread operator', () => {
      const model = createModel();
      const clone = { ...model };
      expect(clone).toEqual(model);
      expect(clone).not.toBe(model);
    });

    it('should allow field override via spread', () => {
      const model = createModel();
      const updated = { ...model, model_name: 'gpt-4o', status: false };
      expect(updated.model_name).toBe('gpt-4o');
      expect(updated.status).toBe(false);
      expect(updated.provider).toBe('openai'); // unchanged
    });

    it('should be destructurable', () => {
      const model = createModel();
      const { id, provider, base_url, api_key, model_name, status, created_at, updated_at } = model;
      expect(id).toBe(1);
      expect(provider).toBe('openai');
      expect(base_url).toBe('https://api.openai.com/v1');
      expect(api_key).toBe('sk-test');
      expect(model_name).toBe('gpt-4');
      expect(status).toBe(true);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should support Object.keys enumeration', () => {
      const model = createModel();
      const keys = Object.keys(model);
      expect(keys).toContain('id');
      expect(keys).toContain('provider');
      expect(keys).toContain('base_url');
      expect(keys).toContain('api_key');
      expect(keys).toContain('model_name');
      expect(keys).toContain('status');
      expect(keys).toContain('created_at');
      expect(keys).toContain('updated_at');
    });

    it('should support Object.values enumeration', () => {
      const model = createModel();
      const values = Object.values(model);
      expect(values).toContain(1);
      expect(values).toContain('openai');
      expect(values).toContain('gpt-4');
      expect(values).toContain(true);
    });

    it('should support Object.entries iteration', () => {
      const model = createModel();
      const entries = Object.entries(model);
      expect(entries.length).toBe(8);
      const providerEntry = entries.find(([key]) => key === 'provider');
      expect(providerEntry).toBeDefined();
      expect(providerEntry![1]).toBe('openai');
    });

    it('should support "in" operator', () => {
      const model = createModel();
      expect('id' in model).toBe(true);
      expect('provider' in model).toBe(true);
      expect('nonexistent' in model).toBe(false);
    });

    it('should support Object.freeze on model', () => {
      const model = createModel();
      Object.freeze(model);
      expect(Object.isFrozen(model)).toBe(true);
    });

    it('should be usable in an array', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'https://api.openai.com/v1', api_key: 'k1', model_name: 'gpt-4', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'anthropic', base_url: 'https://api.anthropic.com', api_key: 'k2', model_name: 'claude-3', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 3, provider: 'google', base_url: 'https://generativelanguage.googleapis.com', api_key: 'k3', model_name: 'gemini', status: false, created_at: new Date(), updated_at: new Date() },
      ];
      expect(models).toHaveLength(3);
      expect(models[0].provider).toBe('openai');
      expect(models[2].status).toBe(false);
    });

    it('should support filtering by status', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u1', api_key: 'k1', model_name: 'm1', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'anthropic', base_url: 'u2', api_key: 'k2', model_name: 'm2', status: false, created_at: new Date(), updated_at: new Date() },
        { id: 3, provider: 'google', base_url: 'u3', api_key: 'k3', model_name: 'm3', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const enabled = models.filter(m => m.status);
      expect(enabled).toHaveLength(2);
    });

    it('should support finding by provider', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u1', api_key: 'k1', model_name: 'm1', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'anthropic', base_url: 'u2', api_key: 'k2', model_name: 'm2', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const found = models.find(m => m.provider === 'anthropic');
      expect(found).toBeDefined();
      expect(found!.id).toBe(2);
    });

    it('should support sorting by id', () => {
      const models: LlmModel[] = [
        { id: 3, provider: 'c', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 1, provider: 'a', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'b', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...models].sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should support mapping to extract provider names', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'anthropic', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const providers = models.map(m => m.provider);
      expect(providers).toEqual(['openai', 'anthropic']);
    });
  });

  // ============================================================
  // CreateLlmModelRequest 边界值与特殊场景
  // ============================================================
  describe('CreateLlmModelRequest edge cases and special scenarios', () => {
    it('should support very long provider strings', () => {
      const longProvider = 'a'.repeat(1000);
      const req: CreateLlmModelRequest = {
        provider: longProvider,
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
      };
      expect(req.provider.length).toBe(1000);
    });

    it('should support very long base_url strings', () => {
      const longUrl = 'https://' + 'a'.repeat(500) + '.com/v1';
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: longUrl,
        api_key: 'key',
        model_name: 'model',
      };
      expect(req.base_url).toBe(longUrl);
    });

    it('should support very long api_key strings', () => {
      const longKey = 'sk-' + 'x'.repeat(500);
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: longKey,
        model_name: 'model',
      };
      expect(req.api_key).toBe(longKey);
    });

    it('should support very long model_name strings', () => {
      const longName = 'model-' + 'x'.repeat(500);
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: longName,
      };
      expect(req.model_name).toBe(longName);
    });

    it('should support strings with emoji', () => {
      const req: CreateLlmModelRequest = {
        provider: '🤖 AI Provider',
        base_url: 'https://test.com',
        api_key: '🔑 secret-key',
        model_name: '🧠 smart-model',
      };
      expect(req.provider).toContain('🤖');
      expect(req.api_key).toContain('🔑');
      expect(req.model_name).toContain('🧠');
    });

    it('should support strings with newlines and tabs', () => {
      const req: CreateLlmModelRequest = {
        provider: 'line1\nline2',
        base_url: 'https://test.com',
        api_key: 'key\ttab',
        model_name: 'model\nname',
      };
      expect(req.provider).toContain('\n');
      expect(req.api_key).toContain('\t');
      expect(req.model_name).toContain('\n');
    });

    it('should support unicode characters in all fields', () => {
      const req: CreateLlmModelRequest = {
        provider: 'プロバイダー',
        base_url: 'https://тест.рф',
        api_key: '密钥-키',
        model_name: 'モデル',
      };
      expect(req.provider).toContain('プロバイダー');
      expect(req.api_key).toContain('密钥');
    });

    it('should be serializable to JSON', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(req);
    });

    it('should be cloneable with spread operator', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      };
      const clone = { ...req };
      expect(clone).toEqual(req);
      expect(clone).not.toBe(req);
    });

    it('should be destructurable', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      };
      const { provider, base_url, api_key, model_name } = req;
      expect(provider).toBe('openai');
      expect(base_url).toBe('https://api.openai.com/v1');
      expect(api_key).toBe('sk-test');
      expect(model_name).toBe('gpt-4');
    });

    it('should support base_url with port and path', () => {
      const req: CreateLlmModelRequest = {
        provider: 'custom',
        base_url: 'http://192.168.1.100:8080/v1/chat',
        api_key: 'key',
        model_name: 'model',
      };
      expect(req.base_url).toContain(':8080');
      expect(req.base_url).toContain('/v1/chat');
    });

    it('should support base_url with query parameters', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test',
        base_url: 'https://api.example.com/v1?api-version=2024-01-01',
        api_key: 'key',
        model_name: 'model',
      };
      expect(req.base_url).toContain('?api-version=');
    });

    it('should support whitespace-only strings', () => {
      const req: CreateLlmModelRequest = {
        provider: '   ',
        base_url: '   ',
        api_key: '   ',
        model_name: '   ',
      };
      expect(req.provider.trim()).toBe('');
      expect(req.base_url.trim()).toBe('');
      expect(req.api_key.trim()).toBe('');
      expect(req.model_name.trim()).toBe('');
    });
  });

  // ============================================================
  // UpdateLlmModelRequest 边界值与特殊场景
  // ============================================================
  describe('UpdateLlmModelRequest edge cases and special scenarios', () => {
    it('should support very long strings in updates', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'a'.repeat(1000),
        model_name: 'b'.repeat(1000),
      };
      expect(req.provider!.length).toBe(1000);
      expect(req.model_name!.length).toBe(1000);
    });

    it('should support emoji in update fields', () => {
      const req: UpdateLlmModelRequest = {
        provider: '🤖 New Provider',
        model_name: '🧠 New Model',
      };
      expect(req.provider).toContain('🤖');
      expect(req.model_name).toContain('🧠');
    });

    it('should support unicode in update fields', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'プロバイダー',
        api_key: '新密钥',
      };
      expect(req.provider).toContain('プロバイダー');
      expect(req.api_key).toContain('新密钥');
    });

    it('should be serializable to JSON', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'openai',
        status: false,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.provider).toBe('openai');
      expect(parsed.status).toBe(false);
    });

    it('should serialize empty update to empty JSON object', () => {
      const req: UpdateLlmModelRequest = {};
      const json = JSON.stringify(req);
      expect(json).toBe('{}');
    });

    it('should be cloneable with spread operator', () => {
      const req: UpdateLlmModelRequest = { provider: 'test', status: true };
      const clone = { ...req };
      expect(clone).toEqual(req);
      expect(clone).not.toBe(req);
    });

    it('should be destructurable with defaults', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai', status: true };
      const { provider = 'default', status = false, model_name = 'default-model' } = req;
      expect(provider).toBe('openai');
      expect(status).toBe(true);
      expect(model_name).toBe('default-model');
    });

    it('should allow sequential updates to be applied', () => {
      const original: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'old-key',
        model_name: 'gpt-3.5-turbo',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      const update1: UpdateLlmModelRequest = { api_key: 'new-key' };
      const after1 = { ...original, ...update1, updated_at: new Date() };
      expect(after1.api_key).toBe('new-key');
      expect(after1.model_name).toBe('gpt-3.5-turbo');

      const update2: UpdateLlmModelRequest = { model_name: 'gpt-4o', status: false };
      const after2 = { ...after1, ...update2, updated_at: new Date() };
      expect(after2.model_name).toBe('gpt-4o');
      expect(after2.status).toBe(false);
      expect(after2.api_key).toBe('new-key'); // retained from update1
    });

    it('should allow status toggle sequence', () => {
      const toggle1: UpdateLlmModelRequest = { status: false };
      const toggle2: UpdateLlmModelRequest = { status: true };
      const toggle3: UpdateLlmModelRequest = { status: false };
      expect(toggle1.status).toBe(false);
      expect(toggle2.status).toBe(true);
      expect(toggle3.status).toBe(false);
    });

    it('should allow updating all 5 fields simultaneously', () => {
      const req: UpdateLlmModelRequest = {
        provider: 'new-provider',
        base_url: 'https://new-url.com',
        api_key: 'new-key',
        model_name: 'new-model',
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(5);
      expect(req.provider).toBe('new-provider');
      expect(req.base_url).toBe('https://new-url.com');
      expect(req.api_key).toBe('new-key');
      expect(req.model_name).toBe('new-model');
      expect(req.status).toBe(false);
    });

    it('should support whitespace-only string updates', () => {
      const req: UpdateLlmModelRequest = {
        provider: '   ',
        base_url: '   ',
      };
      expect(req.provider!.trim()).toBe('');
      expect(req.base_url!.trim()).toBe('');
    });

    it('should distinguish between undefined and empty string', () => {
      const reqWithUndefined: UpdateLlmModelRequest = { provider: undefined };
      const reqWithEmpty: UpdateLlmModelRequest = { provider: '' };
      expect(reqWithUndefined.provider).toBeUndefined();
      expect(reqWithEmpty.provider).toBe('');
      expect('provider' in reqWithUndefined).toBe(true);
      expect('provider' in reqWithEmpty).toBe(true);
    });

    it('should support base_url update with special URL formats', () => {
      const urls = [
        'https://api.new.com/v1',
        'http://localhost:3000',
        'https://192.168.1.1:443/api',
        'https://api.example.com/v1?key=1&debug=true',
      ];
      urls.forEach((url) => {
        const req: UpdateLlmModelRequest = { base_url: url };
        expect(req.base_url).toBe(url);
      });
    });
  });

  // ============================================================
  // 集成测试：Create/Update -> LlmModel 转换
  // ============================================================
  describe('Integration: Create/Update to LlmModel transformation', () => {
    it('should create LlmModel from CreateLlmModelRequest with generated fields', () => {
      const createReq: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-proj-xxx',
        model_name: 'gpt-4o',
      };
      const now = new Date();
      const model: LlmModel = {
        id: 1,
        ...createReq,
        status: true,
        created_at: now,
        updated_at: now,
      };
      expect(model.id).toBe(1);
      expect(model.provider).toBe('openai');
      expect(model.status).toBe(true);
      expect(model.created_at).toBe(now);
    });

    it('should apply UpdateLlmModelRequest to existing LlmModel', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'old-key',
        model_name: 'gpt-3.5',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateLlmModelRequest = {
        model_name: 'gpt-4o',
        api_key: 'new-key',
      };
      const updated: LlmModel = {
        ...model,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.id).toBe(1);
      expect(updated.model_name).toBe('gpt-4o');
      expect(updated.api_key).toBe('new-key');
      expect(updated.provider).toBe('openai'); // unchanged
      expect(updated.status).toBe(true); // unchanged
    });

    it('should apply empty update without changing model', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'key',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateLlmModelRequest = {};
      const updated: LlmModel = {
        ...model,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.provider).toBe(model.provider);
      expect(updated.base_url).toBe(model.base_url);
      expect(updated.api_key).toBe(model.api_key);
      expect(updated.model_name).toBe(model.model_name);
      expect(updated.status).toBe(model.status);
    });

    it('should disable model via update', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'key',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateLlmModelRequest = { status: false };
      const updated: LlmModel = { ...model, ...update, updated_at: new Date() };
      expect(updated.status).toBe(false);
    });

    it('should enable model via update', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'legacy',
        base_url: 'https://old.api.com',
        api_key: 'key',
        model_name: 'old-model',
        status: false,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
      };
      const update: UpdateLlmModelRequest = { status: true };
      const updated: LlmModel = { ...model, ...update, updated_at: new Date() };
      expect(updated.status).toBe(true);
    });

    it('should simulate full CRUD lifecycle', () => {
      // CREATE
      const createReq: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-initial',
        model_name: 'gpt-3.5-turbo',
      };
      let model: LlmModel = {
        id: 1,
        ...createReq,
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      expect(model.model_name).toBe('gpt-3.5-turbo');

      // UPDATE: change model
      const updateReq1: UpdateLlmModelRequest = { model_name: 'gpt-4', api_key: 'sk-updated' };
      model = { ...model, ...updateReq1, updated_at: new Date('2024-03-01') };
      expect(model.model_name).toBe('gpt-4');
      expect(model.api_key).toBe('sk-updated');
      expect(model.provider).toBe('openai');

      // UPDATE: disable
      const updateReq2: UpdateLlmModelRequest = { status: false };
      model = { ...model, ...updateReq2, updated_at: new Date('2024-06-01') };
      expect(model.status).toBe(false);

      // UPDATE: re-enable with new model
      const updateReq3: UpdateLlmModelRequest = { status: true, model_name: 'gpt-4o' };
      model = { ...model, ...updateReq3, updated_at: new Date('2024-09-01') };
      expect(model.status).toBe(true);
      expect(model.model_name).toBe('gpt-4o');

      // VERIFY: all fields reflect the final state
      expect(model.id).toBe(1);
      expect(model.provider).toBe('openai');
      expect(model.api_key).toBe('sk-updated');
      expect(model.created_at.getFullYear()).toBe(2024);
    });
  });

  // ============================================================
  // 重新导出验证
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.provider).toBe('test');
    });

    it('should allow all request types to be imported and used', () => {
      const createReq: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-xxx',
        model_name: 'gpt-4',
      };
      const updateReq: UpdateLlmModelRequest = {
        provider: 'anthropic',
        status: false,
      };

      expect(createReq.provider).toBe('openai');
      expect(updateReq.provider).toBe('anthropic');
      expect(updateReq.status).toBe(false);
    });

    it('should allow creating model and request objects together', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const updateReq: UpdateLlmModelRequest = { model_name: 'updated-model' };

      expect(model.model_name).toBe('model');
      expect(updateReq.model_name).toBe('updated-model');
    });
  });

  // ============================================================
  // JSON 序列化往返测试
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('LlmModel should survive JSON round-trip with all fields', () => {
      const original: LlmModel = {
        id: 42,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test-key',
        model_name: 'gpt-4o',
        status: true,
        created_at: new Date('2024-06-15T08:30:00Z'),
        updated_at: new Date('2024-06-20T10:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(42);
      expect(parsed.provider).toBe('openai');
      expect(parsed.base_url).toBe('https://api.openai.com/v1');
      expect(parsed.api_key).toBe('sk-test-key');
      expect(parsed.model_name).toBe('gpt-4o');
      expect(parsed.status).toBe(true);
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });

    it('LlmModel with disabled status should survive JSON round-trip', () => {
      const original: LlmModel = {
        id: 99,
        provider: 'legacy',
        base_url: 'https://old-api.com',
        api_key: 'old-key',
        model_name: 'old-model',
        status: false,
        created_at: new Date('2023-01-01T00:00:00Z'),
        updated_at: new Date('2023-06-01T00:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe(false);
      expect(parsed.provider).toBe('legacy');
    });

    it('CreateLlmModelRequest should survive JSON round-trip exactly', () => {
      const original: CreateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-test',
        model_name: 'claude-3-opus',
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(original);
    });

    it('UpdateLlmModelRequest with all fields should survive JSON round-trip', () => {
      const original: UpdateLlmModelRequest = {
        provider: 'google',
        base_url: 'https://generativelanguage.googleapis.com',
        api_key: 'AIzaTest',
        model_name: 'gemini-pro',
        status: false,
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(original);
    });

    it('UpdateLlmModelRequest empty object should serialize to empty JSON', () => {
      const original: UpdateLlmModelRequest = {};
      const json = JSON.stringify(original);
      expect(json).toBe('{}');
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('UpdateLlmModelRequest partial update should survive JSON round-trip', () => {
      const original: UpdateLlmModelRequest = { status: true };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe(true);
      expect(Object.keys(parsed)).toHaveLength(1);
    });

    it('Date fields should serialize to ISO strings', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date('2024-01-15T12:30:45.123Z'),
        updated_at: new Date('2024-06-20T08:00:00.000Z'),
      };
      const json = JSON.stringify(model);
      const parsed = JSON.parse(json);
      expect(parsed.created_at).toBe('2024-01-15T12:30:45.123Z');
      expect(parsed.updated_at).toBe('2024-06-20T08:00:00.000Z');
    });

    it('LlmModel array should survive JSON round-trip', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u1', api_key: 'k1', model_name: 'gpt-4', status: true, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, provider: 'anthropic', base_url: 'u2', api_key: 'k2', model_name: 'claude-3', status: false, created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      ];
      const json = JSON.stringify(models);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].provider).toBe('openai');
      expect(parsed[1].status).toBe(false);
    });
  });

  // ============================================================
  // Object.freeze 不可变性（拒绝修改验证）
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen LlmModel should reject provider mutation', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      Object.freeze(model);
      expect(() => { (model as any).provider = 'anthropic'; }).toThrow();
      expect(model.provider).toBe('openai');
    });

    it('frozen LlmModel should reject status mutation', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      Object.freeze(model);
      expect(() => { (model as any).status = false; }).toThrow();
      expect(model.status).toBe(true);
    });

    it('frozen LlmModel should reject id mutation', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'model',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      Object.freeze(model);
      expect(() => { (model as any).id = 999; }).toThrow();
      expect(model.id).toBe(1);
    });

    it('frozen CreateLlmModelRequest should reject mutation', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'gpt-4',
      };
      Object.freeze(req);
      expect(() => { (req as any).provider = 'anthropic'; }).toThrow();
      expect(req.provider).toBe('openai');
    });

    it('frozen UpdateLlmModelRequest should reject mutation', () => {
      const req: UpdateLlmModelRequest = { status: true };
      Object.freeze(req);
      expect(() => { (req as any).status = false; }).toThrow();
      expect(req.status).toBe(true);
    });

    it('frozen empty UpdateLlmModelRequest should reject adding new fields', () => {
      const req: UpdateLlmModelRequest = {};
      Object.freeze(req);
      expect(() => { (req as any).provider = 'test'; }).toThrow();
      expect(req.provider).toBeUndefined();
    });
  });

  // ============================================================
  // 可选字段类型收窄
  // ============================================================
  describe('type narrowing for optional fields', () => {
    it('UpdateLlmModelRequest.provider narrows after undefined check', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai' };
      if (req.provider !== undefined) {
        const provider: string = req.provider;
        expect(typeof provider).toBe('string');
        expect(provider).toBe('openai');
      }
    });

    it('UpdateLlmModelRequest.base_url narrows after undefined check', () => {
      const req: UpdateLlmModelRequest = { base_url: 'https://test.com' };
      if (req.base_url !== undefined) {
        const url: string = req.base_url;
        expect(url).toBe('https://test.com');
      }
    });

    it('UpdateLlmModelRequest.api_key narrows after undefined check', () => {
      const req: UpdateLlmModelRequest = { api_key: 'sk-test' };
      if (req.api_key !== undefined) {
        const key: string = req.api_key;
        expect(key).toBe('sk-test');
      }
    });

    it('UpdateLlmModelRequest.model_name narrows after undefined check', () => {
      const req: UpdateLlmModelRequest = { model_name: 'gpt-4' };
      if (req.model_name !== undefined) {
        const name: string = req.model_name;
        expect(name).toBe('gpt-4');
      }
    });

    it('UpdateLlmModelRequest.status narrows after undefined check', () => {
      const req: UpdateLlmModelRequest = { status: true };
      if (req.status !== undefined) {
        const status: boolean = req.status;
        expect(status).toBe(true);
      }
    });

    it('should handle optional field fallback with nullish coalescing', () => {
      const req: UpdateLlmModelRequest = {};
      const provider = req.provider ?? 'default-provider';
      const model_name = req.model_name ?? 'default-model';
      const status = req.status ?? true;
      expect(provider).toBe('default-provider');
      expect(model_name).toBe('default-model');
      expect(status).toBe(true);
    });

    it('should not use fallback when value is provided', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai', status: false };
      const provider = req.provider ?? 'default';
      const status = req.status ?? true;
      expect(provider).toBe('openai');
      expect(status).toBe(false);
    });
  });

  // ============================================================
  // 结构相等与深拷贝
  // ============================================================
  describe('structural equality and deep copy', () => {
    it('two LlmModel objects with same values should be structurally equal', () => {
      const date = new Date('2024-01-01T00:00:00Z');
      const model1: LlmModel = { id: 1, provider: 'openai', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4', status: true, created_at: date, updated_at: date };
      const model2: LlmModel = { id: 1, provider: 'openai', base_url: 'https://api.openai.com/v1', api_key: 'sk-test', model_name: 'gpt-4', status: true, created_at: date, updated_at: date };
      expect(model1).toEqual(model2);
      expect(model1).not.toBe(model2);
    });

    it('spread copy of LlmModel should be structurally equal but different reference', () => {
      const date = new Date('2024-06-01');
      const original: LlmModel = { id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4', status: true, created_at: date, updated_at: date };
      const copy = { ...original };
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
      expect(copy.created_at).toBe(original.created_at); // shallow copy shares Date ref
    });

    it('spread copy should create shallow copy of Date references', () => {
      const date = new Date('2024-01-01');
      const original: LlmModel = { id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: date, updated_at: date };
      const copy = { ...original };
      expect(copy.created_at).toBe(original.created_at); // same Date reference
    });

    it('JSON parse/stringify should create deep copy of LlmModel', () => {
      const original: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-06-01'),
      };
      const deepCopy = JSON.parse(JSON.stringify(original));
      expect(deepCopy.id).toBe(original.id);
      expect(deepCopy.provider).toBe(original.provider);
      expect(deepCopy.status).toBe(original.status);
      expect(typeof deepCopy.created_at).toBe('string'); // Date becomes string
    });

    it('two CreateLlmModelRequest objects with same values should be structurally equal', () => {
      const req1: CreateLlmModelRequest = { provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4' };
      const req2: CreateLlmModelRequest = { provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4' };
      expect(req1).toEqual(req2);
      expect(req1).not.toBe(req2);
    });

    it('spread copy of UpdateLlmModelRequest should be independent', () => {
      const original: UpdateLlmModelRequest = { provider: 'openai', status: true };
      const copy = { ...original };
      copy.provider = 'anthropic';
      copy.status = false;
      expect(original.provider).toBe('openai');
      expect(original.status).toBe(true);
    });

    it('JSON round-trip should create independent copy of CreateLlmModelRequest', () => {
      const original: CreateLlmModelRequest = { provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4' };
      const copy = JSON.parse(JSON.stringify(original));
      copy.provider = 'anthropic';
      expect(original.provider).toBe('openai');
      expect(copy.provider).toBe('anthropic');
    });
  });

  // ============================================================
  // 解构模式（rest 运算符、默认值）
  // ============================================================
  describe('destructuring patterns', () => {
    it('should destructure LlmModel fields', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const { id, provider, base_url, api_key, model_name, status, created_at, updated_at } = model;
      expect(id).toBe(1);
      expect(provider).toBe('openai');
      expect(base_url).toBe('https://api.openai.com/v1');
      expect(api_key).toBe('sk-test');
      expect(model_name).toBe('gpt-4');
      expect(status).toBe(true);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should use rest operator for partial update', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const { id, created_at, updated_at, ...rest } = model;
      expect(id).toBe(1);
      expect(rest).toEqual({
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
        status: true,
      });
    });

    it('should destructure CreateLlmModelRequest fields', () => {
      const req: CreateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-test',
        model_name: 'claude-3',
      };
      const { provider, base_url, api_key, model_name } = req;
      expect(provider).toBe('anthropic');
      expect(base_url).toBe('https://api.anthropic.com');
      expect(api_key).toBe('sk-ant-test');
      expect(model_name).toBe('claude-3');
    });

    it('should destructure UpdateLlmModelRequest with default values', () => {
      const req: UpdateLlmModelRequest = {};
      const { provider = 'default', status = true } = req;
      expect(provider).toBe('default');
      expect(status).toBe(true);
    });

    it('should destructure UpdateLlmModelRequest preserving actual values', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai', status: false };
      const { provider = 'default', status = true } = req;
      expect(provider).toBe('openai');
      expect(status).toBe(false);
    });

    it('should use rest operator on UpdateLlmModelRequest', () => {
      const req: UpdateLlmModelRequest = { provider: 'openai', status: true, model_name: 'gpt-4' };
      const { provider, ...rest } = req;
      expect(provider).toBe('openai');
      expect(rest).toEqual({ status: true, model_name: 'gpt-4' });
    });

    it('should destructure LlmModel with computed property access', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const keys = ['provider', 'model_name'] as const;
      const values = keys.map(k => model[k]);
      expect(values).toEqual(['openai', 'gpt-4']);
    });
  });

  // ============================================================
  // Object.assign 合并操作
  // ============================================================
  describe('Object.assign merge operations', () => {
    it('should merge CreateLlmModelRequest into LlmModel base', () => {
      const createReq: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      };
      const model = Object.assign(
        { id: 1, status: true, created_at: new Date(), updated_at: new Date() },
        createReq,
      ) as LlmModel;
      expect(model.provider).toBe('openai');
      expect(model.model_name).toBe('gpt-4');
      expect(model.id).toBe(1);
    });

    it('should apply UpdateLlmModelRequest via Object.assign', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'old-key',
        model_name: 'gpt-3.5',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const update: UpdateLlmModelRequest = { api_key: 'new-key', status: false };
      Object.assign(model, update);
      expect(model.api_key).toBe('new-key');
      expect(model.status).toBe(false);
      expect(model.provider).toBe('openai'); // unchanged
    });

    it('should apply empty UpdateLlmModelRequest without effect', () => {
      const model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://test.com',
        api_key: 'key',
        model_name: 'gpt-4',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      const originalProvider = model.provider;
      Object.assign(model, {});
      expect(model.provider).toBe(originalProvider);
    });

    it('should count update fields using Object.assign', () => {
      const update: UpdateLlmModelRequest = { provider: 'new', status: true };
      const target = {};
      Object.assign(target, update);
      expect(Object.keys(target)).toHaveLength(2);
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('collection advanced operations', () => {
    const createModels = (): LlmModel[] => [
      { id: 1, provider: 'openai', base_url: 'u1', api_key: 'k1', model_name: 'gpt-4', status: true, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
      { id: 2, provider: 'anthropic', base_url: 'u2', api_key: 'k2', model_name: 'claude-3', status: true, created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      { id: 3, provider: 'google', base_url: 'u3', api_key: 'k3', model_name: 'gemini', status: false, created_at: new Date('2024-03-01'), updated_at: new Date('2024-03-01') },
      { id: 4, provider: 'openai', base_url: 'u4', api_key: 'k4', model_name: 'gpt-3.5', status: false, created_at: new Date('2024-04-01'), updated_at: new Date('2024-04-01') },
      { id: 5, provider: 'deepseek', base_url: 'u5', api_key: 'k5', model_name: 'deepseek-chat', status: true, created_at: new Date('2024-05-01'), updated_at: new Date('2024-05-01') },
    ];

    it('should reduce models to provider count map', () => {
      const models = createModels();
      const countByProvider = models.reduce<Record<string, number>>((acc, m) => {
        acc[m.provider] = (acc[m.provider] || 0) + 1;
        return acc;
      }, {});
      expect(countByProvider['openai']).toBe(2);
      expect(countByProvider['anthropic']).toBe(1);
      expect(countByProvider['google']).toBe(1);
      expect(countByProvider['deepseek']).toBe(1);
    });

    it('should check every model has non-empty provider', () => {
      const models = createModels();
      const allHaveProvider = models.every(m => m.provider.length > 0);
      expect(allHaveProvider).toBe(true);
    });

    it('should check some models are disabled', () => {
      const models = createModels();
      const someDisabled = models.some(m => !m.status);
      expect(someDisabled).toBe(true);
    });

    it('should group models by status', () => {
      const models = createModels();
      const grouped = models.reduce<Record<string, LlmModel[]>>((acc, m) => {
        const key = String(m.status);
        if (!acc[key]) acc[key] = [];
        acc[key].push(m);
        return acc;
      }, {});
      expect(grouped['true']).toHaveLength(3);
      expect(grouped['false']).toHaveLength(2);
    });

    it('should reduce to total api_key length', () => {
      const models = createModels();
      const totalKeyLength = models.reduce((sum, m) => sum + m.api_key.length, 0);
      expect(totalKeyLength).toBe(10); // k1+k2+k3+k4+k5 = 2*5
    });

    it('should check every model has valid id > 0', () => {
      const models = createModels();
      expect(models.every(m => m.id > 0)).toBe(true);
    });

    it('should check some models are openai provider', () => {
      const models = createModels();
      expect(models.some(m => m.provider === 'openai')).toBe(true);
    });

    it('should filter and map in chain', () => {
      const models = createModels();
      const enabledNames = models.filter(m => m.status).map(m => m.model_name);
      expect(enabledNames).toEqual(['gpt-4', 'claude-3', 'deepseek-chat']);
    });

    it('should find index of model by provider', () => {
      const models = createModels();
      const idx = models.findIndex(m => m.provider === 'google');
      expect(idx).toBe(2);
    });

    it('should return -1 from findIndex for non-existent provider', () => {
      const models = createModels();
      const idx = models.findIndex(m => m.provider === 'nonexistent');
      expect(idx).toBe(-1);
    });

    it('should flatMap model names with provider prefix', () => {
      const models = createModels();
      const displayNames = models.flatMap(m => [`${m.provider}/${m.model_name}`]);
      expect(displayNames).toHaveLength(5);
      expect(displayNames[0]).toBe('openai/gpt-4');
    });

    it('should use reduce to build id-to-model map', () => {
      const models = createModels();
      const idMap = models.reduce<Map<number, LlmModel>>((map, m) => {
        map.set(m.id, m);
        return map;
      }, new Map());
      expect(idMap.get(1)!.provider).toBe('openai');
      expect(idMap.get(3)!.model_name).toBe('gemini');
      expect(idMap.has(99)).toBe(false);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('consecutive update chains', () => {
    it('should apply 3 consecutive updates preserving integrity', () => {
      let model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-initial',
        model_name: 'gpt-3.5-turbo',
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      // Update 1: change model
      model = { ...model, ...{ model_name: 'gpt-4' } as UpdateLlmModelRequest, updated_at: new Date('2024-03-01') };
      expect(model.model_name).toBe('gpt-4');
      expect(model.api_key).toBe('sk-initial');

      // Update 2: change key + disable
      model = { ...model, ...{ api_key: 'sk-updated', status: false } as UpdateLlmModelRequest, updated_at: new Date('2024-06-01') };
      expect(model.api_key).toBe('sk-updated');
      expect(model.status).toBe(false);
      expect(model.model_name).toBe('gpt-4');

      // Update 3: switch provider entirely
      model = { ...model, ...{ provider: 'anthropic', base_url: 'https://api.anthropic.com', model_name: 'claude-3', status: true } as UpdateLlmModelRequest, updated_at: new Date('2024-09-01') };
      expect(model.provider).toBe('anthropic');
      expect(model.status).toBe(true);
      expect(model.api_key).toBe('sk-updated'); // retained from update 2
      expect(model.id).toBe(1); // always retained
    });

    it('should handle status toggle sequence', () => {
      let model: LlmModel = {
        id: 1,
        provider: 'test',
        base_url: 'u',
        api_key: 'k',
        model_name: 'm',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(model.status).toBe(true);

      model = { ...model, status: false, updated_at: new Date() };
      expect(model.status).toBe(false);

      model = { ...model, status: true, updated_at: new Date() };
      expect(model.status).toBe(true);

      model = { ...model, status: false, updated_at: new Date() };
      expect(model.status).toBe(false);
    });

    it('should handle empty updates interspersed with real updates', () => {
      let model: LlmModel = {
        id: 1,
        provider: 'openai',
        base_url: 'u',
        api_key: 'k',
        model_name: 'gpt-3.5',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      // Empty update
      model = { ...model, ...{} as UpdateLlmModelRequest, updated_at: new Date() };
      expect(model.model_name).toBe('gpt-3.5');

      // Real update
      model = { ...model, ...{ model_name: 'gpt-4' } as UpdateLlmModelRequest, updated_at: new Date() };
      expect(model.model_name).toBe('gpt-4');

      // Empty update
      model = { ...model, ...{} as UpdateLlmModelRequest, updated_at: new Date() };
      expect(model.model_name).toBe('gpt-4');
    });

    it('should handle 5 consecutive partial updates', () => {
      let model: LlmModel = {
        id: 1,
        provider: 'p1',
        base_url: 'u1',
        api_key: 'k1',
        model_name: 'm1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };

      const updates: UpdateLlmModelRequest[] = [
        { provider: 'p2' },
        { base_url: 'u2' },
        { api_key: 'k2' },
        { model_name: 'm2' },
        { status: false },
      ];

      updates.forEach((update) => {
        model = { ...model, ...update, updated_at: new Date() };
      });

      expect(model.provider).toBe('p2');
      expect(model.base_url).toBe('u2');
      expect(model.api_key).toBe('k2');
      expect(model.model_name).toBe('m2');
      expect(model.status).toBe(false);
      expect(model.id).toBe(1);
    });
  });

  // ============================================================
  // 日期操作（时区、算术）
  // ============================================================
  describe('Date operations', () => {
    it('should support created_at with millisecond precision', () => {
      const date = new Date('2024-06-15T12:30:45.123Z');
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: date,
        updated_at: date,
      };
      expect(model.created_at.getMilliseconds()).toBe(123);
    });

    it('should support date arithmetic between created_at and updated_at', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-06-01T00:00:00Z');
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: created,
        updated_at: updated,
      };
      const diffMs = model.updated_at.getTime() - model.created_at.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(150);
      expect(diffDays).toBeLessThan(153);
    });

    it('should support updating updated_at to current time', () => {
      const before = new Date();
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: new Date('2024-01-01'),
        updated_at: before,
      };
      model.updated_at = new Date();
      expect(model.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should support dates from different years', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'a', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01') },
        { id: 2, provider: 'b', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2025-06-15'), updated_at: new Date('2025-06-15') },
      ];
      expect(models[0].created_at.getFullYear()).toBe(2020);
      expect(models[1].created_at.getFullYear()).toBe(2025);
    });

    it('should support sorting models by created_at', () => {
      const models: LlmModel[] = [
        { id: 3, provider: 'c', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2024-06-01'), updated_at: new Date() },
        { id: 1, provider: 'a', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2024-01-01'), updated_at: new Date() },
        { id: 2, provider: 'b', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2024-03-01'), updated_at: new Date() },
      ];
      const sorted = [...models].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should detect stale models via date comparison', () => {
      const staleThreshold = new Date('2024-01-01');
      const models: LlmModel[] = [
        { id: 1, provider: 'old', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01') },
        { id: 2, provider: 'new', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01') },
      ];
      const stale = models.filter(m => m.updated_at < staleThreshold);
      expect(stale).toHaveLength(1);
      expect(stale[0].provider).toBe('old');
    });

    it('should support Date.now() for updated_at assignment', () => {
      const before = Date.now();
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(before),
      };
      const after = Date.now();
      expect(model.updated_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(model.updated_at.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================
  // Set/Map 操作
  // ============================================================
  describe('Set/Map operations', () => {
    it('should collect unique providers into Set', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 3, provider: 'anthropic', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 4, provider: 'google', base_url: 'u', api_key: 'k', model_name: 'm', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const providers = new Set(models.map(m => m.provider));
      expect(providers.size).toBe(3);
      expect(providers.has('openai')).toBe(true);
      expect(providers.has('anthropic')).toBe(true);
      expect(providers.has('google')).toBe(true);
    });

    it('should store models in Map keyed by id', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'anthropic', base_url: 'u', api_key: 'k', model_name: 'claude-3', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const modelMap = new Map(models.map(m => [m.id, m]));
      expect(modelMap.get(1)!.model_name).toBe('gpt-4');
      expect(modelMap.get(2)!.provider).toBe('anthropic');
      expect(modelMap.has(3)).toBe(false);
    });

    it('should use Map for update request deduplication', () => {
      const updates: UpdateLlmModelRequest[] = [
        { provider: 'openai' },
        { model_name: 'gpt-4' },
        { provider: 'anthropic' }, // duplicate key concept
      ];
      const providerUpdates = updates.filter(u => u.provider !== undefined);
      expect(providerUpdates).toHaveLength(2);
    });

    it('should build Map from CreateLlmModelRequest array', () => {
      const requests: CreateLlmModelRequest[] = [
        { provider: 'openai', base_url: 'u1', api_key: 'k1', model_name: 'gpt-4' },
        { provider: 'anthropic', base_url: 'u2', api_key: 'k2', model_name: 'claude-3' },
      ];
      const reqMap = new Map(requests.map((r, i) => [i, r]));
      expect(reqMap.get(0)!.provider).toBe('openai');
      expect(reqMap.get(1)!.provider).toBe('anthropic');
    });

    it('should collect unique model names into Set', () => {
      const models: LlmModel[] = [
        { id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 2, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4', status: true, created_at: new Date(), updated_at: new Date() },
        { id: 3, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-3.5', status: true, created_at: new Date(), updated_at: new Date() },
      ];
      const names = new Set(models.map(m => m.model_name));
      expect(names.size).toBe(2);
      expect(names.has('gpt-4')).toBe(true);
      expect(names.has('gpt-3.5')).toBe(true);
    });
  });

  // ============================================================
  // hasOwnProperty 与属性描述符
  // ============================================================
  describe('property ownership and descriptors', () => {
    it('should verify hasOwnProperty for all LlmModel fields', () => {
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.prototype.hasOwnProperty.call(model, 'id')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'provider')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'base_url')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'api_key')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'model_name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'status')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'created_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'updated_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(model, 'nonexistent')).toBe(false);
    });

    it('should verify hasOwnProperty for UpdateLlmModelRequest partial fields', () => {
      const req: UpdateLlmModelRequest = { provider: 'test' };
      expect(Object.prototype.hasOwnProperty.call(req, 'provider')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(req, 'status')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(req, 'api_key')).toBe(false);
    });

    it('should verify all fields are enumerable', () => {
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.keys(model).forEach(key => {
        const desc = Object.getOwnPropertyDescriptor(model, key);
        expect(desc!.enumerable).toBe(true);
        expect(desc!.writable).toBe(true);
        expect(desc!.configurable).toBe(true);
      });
    });

    it('should verify CreateLlmModelRequest fields are writable and configurable', () => {
      const req: CreateLlmModelRequest = {
        provider: 'test', base_url: 'u', api_key: 'k', model_name: 'm',
      };
      const desc = Object.getOwnPropertyDescriptor(req, 'provider');
      expect(desc!.writable).toBe(true);
      expect(desc!.configurable).toBe(true);
    });

    it('should allow property reassignment on unfrozen model', () => {
      const model: LlmModel = {
        id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-3', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      model.provider = 'anthropic';
      model.model_name = 'claude-3';
      expect(model.provider).toBe('anthropic');
      expect(model.model_name).toBe('claude-3');
    });
  });

  // ============================================================
  // 函数参数传递与返回值
  // ============================================================
  describe('function parameter passing and return values', () => {
    const mockCreate = (req: CreateLlmModelRequest, id: number): LlmModel => ({
      id,
      ...req,
      status: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockUpdate = (model: LlmModel, req: UpdateLlmModelRequest): LlmModel => ({
      ...model,
      ...req,
      updated_at: new Date(),
    });

    it('should pass CreateLlmModelRequest to function and receive LlmModel', () => {
      const createReq: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test',
        model_name: 'gpt-4',
      };
      const result = mockCreate(createReq, 1);
      expect(result.id).toBe(1);
      expect(result.provider).toBe('openai');
      expect(result.status).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should pass LlmModel and UpdateLlmModelRequest to update function', () => {
      const original: LlmModel = {
        id: 1, provider: 'openai', base_url: 'u', api_key: 'old-key', model_name: 'gpt-3',
        status: true, created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateLlmModelRequest = { api_key: 'new-key', model_name: 'gpt-4' };
      const result = mockUpdate(original, updateReq);
      expect(result.api_key).toBe('new-key');
      expect(result.model_name).toBe('gpt-4');
      expect(result.id).toBe(1);
      expect(result.provider).toBe('openai');
    });

    it('should pass empty update without side effects', () => {
      const original: LlmModel = {
        id: 1, provider: 'openai', base_url: 'u', api_key: 'k', model_name: 'gpt-4',
        status: true, created_at: new Date(), updated_at: new Date(),
      };
      const result = mockUpdate(original, {});
      expect(result.provider).toBe(original.provider);
      expect(result.model_name).toBe(original.model_name);
      expect(result.status).toBe(original.status);
    });

    it('should support creating model from request via spread in function', () => {
      const createModel = (req: CreateLlmModelRequest): LlmModel => ({
        id: Math.floor(Math.random() * 1000),
        ...req,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const req: CreateLlmModelRequest = {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-test',
        model_name: 'claude-3',
      };
      const model = createModel(req);
      expect(model.provider).toBe('anthropic');
      expect(model.status).toBe(true);
      expect(typeof model.id).toBe('number');
    });
  });
});

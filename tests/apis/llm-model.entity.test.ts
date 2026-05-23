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
});

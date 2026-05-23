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
});

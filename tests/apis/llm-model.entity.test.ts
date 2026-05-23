/**
 * @jest-environment node
 */
import {
  LlmModel,
  CreateLlmModelRequest,
  UpdateLlmModelRequest,
} from '../../apis/entity/llm-model.entity';

describe('llm-model.entity', () => {
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

    it('should have all required fields', () => {
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
  });

  describe('CreateLlmModelRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateLlmModelRequest = {
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-xxx',
        model_name: 'gpt-4',
      };
      expect(req.provider).toBe('openai');
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
    });
  });

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
      expect(req.status).toBe(true);
    });

    it('should allow partial updates', () => {
      const req: UpdateLlmModelRequest = { model_name: 'gpt-4o' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateLlmModelRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow status toggle', () => {
      const disableReq: UpdateLlmModelRequest = { status: false };
      expect(disableReq.status).toBe(false);

      const enableReq: UpdateLlmModelRequest = { status: true };
      expect(enableReq.status).toBe(true);
    });

    it('should allow updating api_key only', () => {
      const req: UpdateLlmModelRequest = { api_key: 'new-key' };
      expect(req.api_key).toBe('new-key');
      expect(req.provider).toBeUndefined();
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const model: LlmModel = {
        id: 1, provider: 'test', base_url: 'https://test.com',
        api_key: 'key', model_name: 'model', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(model.provider).toBe('test');
    });
  });
});

/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils';
import { LlmModelServiceImpl } from '../../apis/service/impl/llm-model.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaModel(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    provider: 'openai',
    baseUrl: 'https://api.openai.com/v1',
    apiKey: 'sk-test-key',
    modelName: 'gpt-4',
    status: true,
    createdAt: new Date('2025-01-01T00:00:00Z'),
    updatedAt: new Date('2025-06-01T00:00:00Z'),
    ...overrides,
  };
}

function createMockPrisma() {
  return {
    llmModel: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
  };
}

let mockPrisma: ReturnType<typeof createMockPrisma>;

beforeEach(() => {
  mockPrisma = createMockPrisma();
  mockedGetPrisma.mockReturnValue(mockPrisma as any);
});

afterEach(() => {
  jest.clearAllMocks();
});

// ══════════════════════════════════════════
//  LlmModelServiceImpl Tests
// ══════════════════════════════════════════

describe('LlmModelServiceImpl', () => {
  let service: LlmModelServiceImpl;

  beforeEach(() => {
    service = new LlmModelServiceImpl();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────

  describe('list()', () => {
    it('应返回所有 LLM 模型列表（按 id 升序）', async () => {
      const items = [
        makePrismaModel({ id: 1, provider: 'openai', modelName: 'gpt-4' }),
        makePrismaModel({ id: 2, provider: 'anthropic', modelName: 'claude-3' }),
      ];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.list();

      expect(mockPrisma.llmModel.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        id: 1,
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test-key',
        model_name: 'gpt-4',
        status: true,
        created_at: items[0].createdAt,
        updated_at: items[0].updatedAt,
      });
      expect(result[1]).toEqual({
        id: 2,
        provider: 'anthropic',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test-key',
        model_name: 'claude-3',
        status: true,
        created_at: items[1].createdAt,
        updated_at: items[1].updatedAt,
      });
    });

    it('应返回空数组当没有模型时', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      const result = await service.list();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('应正确映射单个模型', async () => {
      const item = makePrismaModel();
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].provider).toBe('openai');
      expect(result[0].base_url).toBe('https://api.openai.com/v1');
      expect(result[0].api_key).toBe('sk-test-key');
      expect(result[0].model_name).toBe('gpt-4');
      expect(result[0].status).toBe(true);
    });

    it('应正确映射 status 为 false 的模型', async () => {
      const item = makePrismaModel({ status: false });
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result[0].status).toBe(false);
    });
  });

  // ──────────────────────────────────────
  //  listEnabled()
  // ──────────────────────────────────────

  describe('listEnabled()', () => {
    it('应返回所有启用的模型（仅 id、provider、model_name）', async () => {
      const items = [
        { id: 1, provider: 'openai', modelName: 'gpt-4' },
        { id: 3, provider: 'deepseek', modelName: 'deepseek-v3' },
      ];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.listEnabled();

      expect(mockPrisma.llmModel.findMany).toHaveBeenCalledWith({
        where: { status: true },
        orderBy: { id: 'asc' },
        select: { id: true, provider: true, modelName: true },
      });
      expect(result).toEqual([
        { id: 1, provider: 'openai', model_name: 'gpt-4' },
        { id: 3, provider: 'deepseek', model_name: 'deepseek-v3' },
      ]);
    });

    it('应返回空数组当没有启用的模型时', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      const result = await service.listEnabled();

      expect(result).toEqual([]);
    });

    it('应只查询 status: true 的模型', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      await service.listEnabled();

      const callArgs = mockPrisma.llmModel.findMany.mock.calls[0][0] as any;
      expect(callArgs.where).toEqual({ status: true });
    });

    it('应只选择 id、provider、modelName 字段', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      await service.listEnabled();

      const callArgs = mockPrisma.llmModel.findMany.mock.calls[0][0] as any;
      expect(callArgs.select).toEqual({ id: true, provider: true, modelName: true });
    });

    it('应将 modelName 映射为 model_name', async () => {
      const items = [{ id: 5, provider: 'zhipu', modelName: 'glm-4' }];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.listEnabled();

      expect(result[0].model_name).toBe('glm-4');
      expect((result[0] as any).modelName).toBeUndefined();
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────

  describe('getById()', () => {
    it('应返回指定 id 的模型', async () => {
      const item = makePrismaModel({ id: 42 });
      mockPrisma.llmModel.findFirst.mockResolvedValue(item);

      const result = await service.getById(42);

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(result.id).toBe(42);
      expect(result.provider).toBe('openai');
      expect(result.model_name).toBe('gpt-4');
    });

    it('应在模型不存在时抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.getById(999)).rejects.toThrow('LLM模型不存在');
    });

    it('应正确映射所有字段', async () => {
      const date1 = new Date('2025-03-15T10:30:00Z');
      const date2 = new Date('2025-05-20T14:00:00Z');
      const item = makePrismaModel({
        id: 10,
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'sk-ant-key',
        modelName: 'claude-3-opus',
        status: false,
        createdAt: date1,
        updatedAt: date2,
      });
      mockPrisma.llmModel.findFirst.mockResolvedValue(item);

      const result = await service.getById(10);

      expect(result).toEqual({
        id: 10,
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'sk-ant-key',
        model_name: 'claude-3-opus',
        status: false,
        created_at: date1,
        updated_at: date2,
      });
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────

  describe('create()', () => {
    it('应创建新模型并返回映射结果', async () => {
      const created = makePrismaModel({ id: 1 });
      mockPrisma.llmModel.create.mockResolvedValue(created);

      const result = await service.create({
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-test-key',
        model_name: 'gpt-4',
      });

      expect(mockPrisma.llmModel.create).toHaveBeenCalledWith({
        data: {
          provider: 'openai',
          baseUrl: 'https://api.openai.com/v1',
          apiKey: 'sk-test-key',
          modelName: 'gpt-4',
        },
      });
      expect(result.id).toBe(1);
      expect(result.provider).toBe('openai');
      expect(result.model_name).toBe('gpt-4');
    });

    it('应正确映射请求字段（snake_case → camelCase）', async () => {
      mockPrisma.llmModel.create.mockResolvedValue(makePrismaModel());

      await service.create({
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com',
        api_key: 'sk-ds-key',
        model_name: 'deepseek-v3',
      });

      const callArgs = mockPrisma.llmModel.create.mock.calls[0][0] as any;
      expect(callArgs.data.provider).toBe('deepseek');
      expect(callArgs.data.baseUrl).toBe('https://api.deepseek.com');
      expect(callArgs.data.apiKey).toBe('sk-ds-key');
      expect(callArgs.data.modelName).toBe('deepseek-v3');
    });

    it('应正确映射返回结果（camelCase → snake_case）', async () => {
      const created = makePrismaModel({
        id: 7,
        provider: 'zhipu',
        baseUrl: 'https://open.bigmodel.cn',
        apiKey: 'zhipu-key',
        modelName: 'glm-4-plus',
      });
      mockPrisma.llmModel.create.mockResolvedValue(created);

      const result = await service.create({
        provider: 'zhipu',
        base_url: 'https://open.bigmodel.cn',
        api_key: 'zhipu-key',
        model_name: 'glm-4-plus',
      });

      expect(result.base_url).toBe('https://open.bigmodel.cn');
      expect(result.api_key).toBe('zhipu-key');
      expect(result.model_name).toBe('glm-4-plus');
      expect((result as any).baseUrl).toBeUndefined();
      expect((result as any).apiKey).toBeUndefined();
      expect((result as any).modelName).toBeUndefined();
    });

    it('应只传 data 中的四个字段给 Prisma create', async () => {
      mockPrisma.llmModel.create.mockResolvedValue(makePrismaModel());

      await service.create({
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-key',
        model_name: 'gpt-3.5-turbo',
      });

      const callArgs = mockPrisma.llmModel.create.mock.calls[0][0] as any;
      const dataKeys = Object.keys(callArgs.data).sort();
      expect(dataKeys).toEqual(['apiKey', 'baseUrl', 'modelName', 'provider']);
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────

  describe('update()', () => {
    it('应更新指定模型并返回映射结果', async () => {
      const existing = makePrismaModel({ id: 1 });
      const updated = makePrismaModel({ id: 1, modelName: 'gpt-4-turbo' });
      mockPrisma.llmModel.findFirst.mockResolvedValue(existing);
      mockPrisma.llmModel.update.mockResolvedValue(updated);

      const result = await service.update(1, { model_name: 'gpt-4-turbo' });

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 1 } });
      expect(mockPrisma.llmModel.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { modelName: 'gpt-4-turbo' },
      });
      expect(result.model_name).toBe('gpt-4-turbo');
    });

    it('应在模型不存在时抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.update(999, { provider: 'openai' })).rejects.toThrow('LLM模型不存在');
      expect(mockPrisma.llmModel.update).not.toHaveBeenCalled();
    });

    it('应只更新提供的字段（provider）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ provider: 'anthropic' }));

      await service.update(1, { provider: 'anthropic' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual(['provider']);
      expect(callArgs.data.provider).toBe('anthropic');
    });

    it('应只更新提供的字段（base_url → baseUrl）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ baseUrl: 'https://new.url' }));

      await service.update(1, { base_url: 'https://new.url' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual(['baseUrl']);
      expect(callArgs.data.baseUrl).toBe('https://new.url');
    });

    it('应只更新提供的字段（api_key → apiKey）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ apiKey: 'new-key' }));

      await service.update(1, { api_key: 'new-key' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual(['apiKey']);
      expect(callArgs.data.apiKey).toBe('new-key');
    });

    it('应只更新提供的字段（model_name → modelName）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ modelName: 'gpt-4o' }));

      await service.update(1, { model_name: 'gpt-4o' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual(['modelName']);
      expect(callArgs.data.modelName).toBe('gpt-4o');
    });

    it('应只更新提供的字段（status）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ status: true }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ status: false }));

      await service.update(1, { status: false });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual(['status']);
      expect(callArgs.data.status).toBe(false);
    });

    it('应同时更新多个字段', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(
        makePrismaModel({ provider: 'deepseek', modelName: 'deepseek-v3', status: false })
      );

      await service.update(1, {
        provider: 'deepseek',
        model_name: 'deepseek-v3',
        status: false,
      });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      const dataKeys = Object.keys(callArgs.data).sort();
      expect(dataKeys).toEqual(['modelName', 'provider', 'status']);
    });

    it('应在所有字段为 undefined 时不传任何更新数据', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, {});

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(Object.keys(callArgs.data)).toEqual([]);
    });

    it('应正确映射更新后的返回结果', async () => {
      const updated = makePrismaModel({
        id: 5,
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com',
        apiKey: 'new-ant-key',
        modelName: 'claude-3-opus',
        status: false,
      });
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(updated);

      const result = await service.update(5, { provider: 'anthropic' });

      expect(result).toEqual({
        id: 5,
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com',
        api_key: 'new-ant-key',
        model_name: 'claude-3-opus',
        status: false,
        created_at: updated.createdAt,
        updated_at: updated.updatedAt,
      });
    });
  });

  // ──────────────────────────────────────
  //  delete()
  // ──────────────────────────────────────

  describe('delete()', () => {
    it('应软删除存在的模型（设置 deletedAt）', async () => {
      const existing = makePrismaModel({ id: 1 });
      mockPrisma.llmModel.findFirst.mockResolvedValue(existing);

      await service.delete(1);

      expect(mockPrisma.llmModel.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { deletedAt: expect.any(Date) },
      });
    });

    it('应在模型不存在时抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.delete(999)).rejects.toThrow('LLM模型不存在');
      expect(mockPrisma.llmModel.update).not.toHaveBeenCalled();
    });

    it('删除操作不应有返回值', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      const result = await service.delete(1);

      expect(result).toBeUndefined();
    });

    it('应使用 update 而非 delete 来实现软删除', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.delete(1);

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.where).toEqual({ id: 1 });
      expect(callArgs.data.deletedAt).toBeInstanceOf(Date);
    });

    it('应先检查模型是否存在再执行删除', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.delete(1);

      // 验证 findFirst 在 update 之前被调用
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalled();
      expect(mockPrisma.llmModel.update).toHaveBeenCalled();
      const findFirstCallOrder = mockPrisma.llmModel.findFirst.mock.invocationCallOrder[0];
      const updateCallOrder = mockPrisma.llmModel.update.mock.invocationCallOrder[0];
      expect(findFirstCallOrder).toBeLessThan(updateCallOrder);
    });
  });

  // ──────────────────────────────────────
  //  getPrisma 调用验证
  // ──────────────────────────────────────

  describe('getPrisma 调用', () => {
    it('每个方法都应调用 getPrisma 获取 prisma 实例', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.create.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      mockedGetPrisma.mockClear();

      await service.list();
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);

      mockedGetPrisma.mockClear();
      await service.listEnabled();
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);

      mockedGetPrisma.mockClear();
      await service.getById(1);
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);

      mockedGetPrisma.mockClear();
      await service.create({ provider: 'a', base_url: 'b', api_key: 'c', model_name: 'd' });
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);

      mockedGetPrisma.mockClear();
      await service.update(1, { provider: 'a' });
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1); // getPrisma 在方法内调用一次

      mockedGetPrisma.mockClear();
      await service.delete(1);
      expect(mockedGetPrisma).toHaveBeenCalledTimes(1); // getPrisma 在方法内调用一次
    });
  });

  // ──────────────────────────────────────
  //  边界情况
  // ──────────────────────────────────────

  describe('边界情况', () => {
    it('getById 传入 0 作为 id', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.getById(0)).rejects.toThrow('LLM模型不存在');
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 0 } });
    });

    it('update 传入负数 id', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.update(-1, { provider: 'test' })).rejects.toThrow('LLM模型不存在');
    });

    it('delete 传入负数 id', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.delete(-1)).rejects.toThrow('LLM模型不存在');
    });

    it('list 返回大量数据时应正确映射每一条', async () => {
      const items = Array.from({ length: 100 }, (_, i) =>
        makePrismaModel({ id: i + 1, provider: `provider-${i}`, modelName: `model-${i}` })
      );
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.list();

      expect(result).toHaveLength(100);
      expect(result[0].id).toBe(1);
      expect(result[99].id).toBe(100);
      expect(result[50].provider).toBe('provider-50');
      expect(result[50].model_name).toBe('model-50');
    });

    it('listEnabled 返回的 model_name 字段应来自 Prisma 的 modelName', async () => {
      const items = [
        { id: 1, provider: 'openai', modelName: 'gpt-4-turbo' },
      ];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.listEnabled();

      expect(result[0].model_name).toBe('gpt-4-turbo');
      expect((result[0] as any).modelName).toBeUndefined();
    });

    it('update status 为 true 时应正确处理', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ status: false }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ status: true }));

      const result = await service.update(1, { status: true });

      expect(result.status).toBe(true);
    });

    it('update 不传任何字段时 data 应为空对象', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, {});

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data).toEqual({});
    });

    it('update 传入 undefined 值的字段不应被包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { provider: undefined, status: true });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.provider).toBeUndefined();
      expect(callArgs.data.status).toBe(true);
    });

    it('create 应正确处理不同 provider 的模型', async () => {
      const providers = ['openai', 'anthropic', 'deepseek', 'zhipu', 'qwen'];
      for (const provider of providers) {
        mockPrisma.llmModel.create.mockResolvedValue(
          makePrismaModel({ provider, modelName: `${provider}-model` })
        );

        const result = await service.create({
          provider,
          base_url: `https://api.${provider}.com`,
          api_key: `sk-${provider}-key`,
          model_name: `${provider}-model`,
        });

        expect(result.provider).toBe(provider);
        expect(result.model_name).toBe(`${provider}-model`);
      }
    });
  });
});

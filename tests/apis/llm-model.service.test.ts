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
        api_key: 'sk-t****-key',
        model_name: 'gpt-4',
        status: true,
        created_at: items[0].createdAt,
        updated_at: items[0].updatedAt,
      });
      expect(result[1]).toEqual({
        id: 2,
        provider: 'anthropic',
        base_url: 'https://api.openai.com/v1',
        api_key: 'sk-t****-key',
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
      expect(result[0].api_key).toBe('sk-t****-key');
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
        api_key: 'sk-a****-key',
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
      expect(result.api_key).toBe('zhip****-key');
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
        api_key: 'new-****-key',
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

  // ──────────────────────────────────────
  //  Prisma 异常传播
  // ──────────────────────────────────────

  describe('Prisma 异常传播', () => {
    it('list 应传播 Prisma 数据库错误', async () => {
      const dbError = new Error('数据库连接失败');
      mockPrisma.llmModel.findMany.mockRejectedValue(dbError);

      await expect(service.list()).rejects.toThrow('数据库连接失败');
    });

    it('listEnabled 应传播 Prisma 数据库错误', async () => {
      const dbError = new Error('Connection timeout');
      mockPrisma.llmModel.findMany.mockRejectedValue(dbError);

      await expect(service.listEnabled()).rejects.toThrow('Connection timeout');
    });

    it('getById 应传播 Prisma 数据库错误', async () => {
      const dbError = new Error('Prisma client error');
      mockPrisma.llmModel.findFirst.mockRejectedValue(dbError);

      await expect(service.getById(1)).rejects.toThrow('Prisma client error');
    });

    it('create 应传播 Prisma 唯一约束错误', async () => {
      const uniqueError = new Error('Unique constraint failed');
      mockPrisma.llmModel.create.mockRejectedValue(uniqueError);

      await expect(
        service.create({ provider: 'a', base_url: 'b', api_key: 'c', model_name: 'd' })
      ).rejects.toThrow('Unique constraint failed');
    });

    it('update 应传播 Prisma update 错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const updateError = new Error('Update failed');
      mockPrisma.llmModel.update.mockRejectedValue(updateError);

      await expect(service.update(1, { provider: 'new' })).rejects.toThrow('Update failed');
    });

    it('delete 应传播 Prisma update 错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const deleteError = new Error('Delete transaction failed');
      mockPrisma.llmModel.update.mockRejectedValue(deleteError);

      await expect(service.delete(1)).rejects.toThrow('Delete transaction failed');
    });
  });

  // ──────────────────────────────────────
  //  update 全字段更新
  // ──────────────────────────────────────

  describe('update 全字段更新', () => {
    it('应同时更新所有5个字段', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(
        makePrismaModel({
          provider: 'anthropic',
          baseUrl: 'https://api.anthropic.com/v2',
          apiKey: 'sk-ant-new',
          modelName: 'claude-3.5-sonnet',
          status: false,
        })
      );

      const result = await service.update(1, {
        provider: 'anthropic',
        base_url: 'https://api.anthropic.com/v2',
        api_key: 'sk-ant-new',
        model_name: 'claude-3.5-sonnet',
        status: false,
      });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data).toEqual({
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v2',
        apiKey: 'sk-ant-new',
        modelName: 'claude-3.5-sonnet',
        status: false,
      });
      expect(result.provider).toBe('anthropic');
      expect(result.model_name).toBe('claude-3.5-sonnet');
      expect(result.status).toBe(false);
    });

    it('应将 false 值的 status 正确包含在 data 中（不是 undefined）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ status: true }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ status: false }));

      await service.update(1, { status: false });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.status).toBe(false);
      expect(Object.keys(callArgs.data)).toContain('status');
    });
  });

  // ──────────────────────────────────────
  //  delete 详细验证
  // ──────────────────────────────────────

  describe('delete 详细验证', () => {
    it('deletedAt 时间应接近当前时间', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      const before = new Date();
      await service.delete(1);
      const after = new Date();

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      const deletedAt = callArgs.data.deletedAt as Date;
      expect(deletedAt.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(deletedAt.getTime()).toBeLessThanOrEqual(after.getTime());
    });

    it('应对不同 id 的模型执行软删除', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ id: 42 }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ id: 42 }));

      await service.delete(42);

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 42 } });
      expect(mockPrisma.llmModel.update).toHaveBeenCalledWith({
        where: { id: 42 },
        data: { deletedAt: expect.any(Date) },
      });
    });
  });

  // ──────────────────────────────────────
  //  list 混合状态
  // ──────────────────────────────────────

  describe('list 混合状态', () => {
    it('应正确返回混合启用/禁用状态的模型', async () => {
      const items = [
        makePrismaModel({ id: 1, status: true, modelName: 'gpt-4' }),
        makePrismaModel({ id: 2, status: false, modelName: 'gpt-3.5' }),
        makePrismaModel({ id: 3, status: true, modelName: 'claude-3' }),
      ];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.list();

      expect(result[0].status).toBe(true);
      expect(result[1].status).toBe(false);
      expect(result[2].status).toBe(true);
    });

    it('应正确映射所有字段（多个模型逐一验证）', async () => {
      const items = [
        makePrismaModel({
          id: 10,
          provider: 'deepseek',
          baseUrl: 'https://api.deepseek.com',
          apiKey: 'sk-ds',
          modelName: 'deepseek-v3',
          status: true,
          createdAt: new Date('2025-01-01'),
          updatedAt: new Date('2025-06-01'),
        }),
        makePrismaModel({
          id: 20,
          provider: 'zhipu',
          baseUrl: 'https://open.bigmodel.cn',
          apiKey: 'sk-zp',
          modelName: 'glm-4',
          status: false,
          createdAt: new Date('2025-02-01'),
          updatedAt: new Date('2025-07-01'),
        }),
      ];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.list();

      expect(result[0]).toEqual({
        id: 10,
        provider: 'deepseek',
        base_url: 'https://api.deepseek.com',
        api_key: 'sk-d****k-ds',
        model_name: 'deepseek-v3',
        status: true,
        created_at: new Date('2025-01-01'),
        updated_at: new Date('2025-06-01'),
      });
      expect(result[1]).toEqual({
        id: 20,
        provider: 'zhipu',
        base_url: 'https://open.bigmodel.cn',
        api_key: 'sk-z****k-zp',
        model_name: 'glm-4',
        status: false,
        created_at: new Date('2025-02-01'),
        updated_at: new Date('2025-07-01'),
      });
    });
  });

  // ──────────────────────────────────────
  //  listEnabled 单条结果
  // ──────────────────────────────────────

  describe('listEnabled 单条结果', () => {
    it('应正确返回单条启用的模型', async () => {
      const items = [{ id: 7, provider: 'qwen', modelName: 'qwen-max' }];
      mockPrisma.llmModel.findMany.mockResolvedValue(items);

      const result = await service.listEnabled();

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({ id: 7, provider: 'qwen', model_name: 'qwen-max' });
    });
  });

  // ──────────────────────────────────────
  //  create 特殊字符
  // ──────────────────────────────────────

  describe('create 特殊字符', () => {
    it('应正确处理包含特殊字符的 API key', async () => {
      const specialKey = 'sk-proj-abc123+XYZ/456=789-foo_bar';
      mockPrisma.llmModel.create.mockResolvedValue(
        makePrismaModel({ apiKey: specialKey })
      );

      const result = await service.create({
        provider: 'openai',
        base_url: 'https://api.openai.com/v1',
        api_key: specialKey,
        model_name: 'gpt-4',
      });

      expect(result.api_key).toBe('sk-p****_bar');
      const callArgs = mockPrisma.llmModel.create.mock.calls[0][0] as any;
      expect(callArgs.data.apiKey).toBe(specialKey);
    });

    it('应正确处理包含中文的 base_url', async () => {
      const chineseUrl = 'https://api.测试.com/v1';
      mockPrisma.llmModel.create.mockResolvedValue(
        makePrismaModel({ baseUrl: chineseUrl })
      );

      const result = await service.create({
        provider: 'test',
        base_url: chineseUrl,
        api_key: 'sk-test',
        model_name: 'test-model',
      });

      expect(result.base_url).toBe(chineseUrl);
    });
  });

  // ──────────────────────────────────────
  //  服务实例复用
  // ──────────────────────────────────────

  describe('服务实例复用', () => {
    it('同一服务实例应可连续调用多个方法', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.create.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.list();
      await service.listEnabled();
      await service.getById(1);
      await service.create({ provider: 'a', base_url: 'b', api_key: 'c', model_name: 'd' });
      await service.update(1, { provider: 'new' });
      await service.delete(1);

      expect(mockPrisma.llmModel.findMany).toHaveBeenCalledTimes(2);
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledTimes(3);
      expect(mockPrisma.llmModel.create).toHaveBeenCalledTimes(1);
      expect(mockPrisma.llmModel.update).toHaveBeenCalledTimes(2);
    });
  });

  // ──────────────────────────────────────
  //  NotFoundError 类型验证
  // ──────────────────────────────────────

  describe('NotFoundError 类型验证', () => {
    it('getById 不存在时应抛出 NotFoundError 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      try {
        await service.getById(999);
        fail('应抛出错误');
      } catch (error: any) {
        expect(error.name).toBe('NotFoundError');
        expect(error.statusCode).toBe(404);
        expect(error.message).toBe('LLM模型不存在');
      }
    });

    it('update 不存在时应抛出 NotFoundError 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      try {
        await service.update(999, { provider: 'test' });
        fail('应抛出错误');
      } catch (error: any) {
        expect(error.name).toBe('NotFoundError');
        expect(error.statusCode).toBe(404);
      }
    });

    it('delete 不存在时应抛出 NotFoundError 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      try {
        await service.delete(999);
        fail('应抛出错误');
      } catch (error: any) {
        expect(error.name).toBe('NotFoundError');
        expect(error.statusCode).toBe(404);
      }
    });
  });

  // ──────────────────────────────────────
  //  findFirst 抛异常（非返回 null）
  // ──────────────────────────────────────

  describe('findFirst 抛异常', () => {
    it('getById 应传播 findFirst 数据库异常', async () => {
      const dbError = new Error('Connection refused');
      mockPrisma.llmModel.findFirst.mockRejectedValue(dbError);

      await expect(service.getById(1)).rejects.toThrow('Connection refused');
    });

    it('update 应传播 findFirst 数据库异常（不调用 update）', async () => {
      const dbError = new Error('Prisma findFirst error');
      mockPrisma.llmModel.findFirst.mockRejectedValue(dbError);

      await expect(service.update(1, { provider: 'x' })).rejects.toThrow('Prisma findFirst error');
      expect(mockPrisma.llmModel.update).not.toHaveBeenCalled();
    });

    it('delete 应传播 findFirst 数据库异常（不调用 update）', async () => {
      const dbError = new Error('Prisma findFirst timeout');
      mockPrisma.llmModel.findFirst.mockRejectedValue(dbError);

      await expect(service.delete(1)).rejects.toThrow('Prisma findFirst timeout');
      expect(mockPrisma.llmModel.update).not.toHaveBeenCalled();
    });
  });

  // ──────────────────────────────────────
  //  mapLlmModel falsy apiKey 分支
  // ──────────────────────────────────────

  describe('mapLlmModel falsy apiKey', () => {
    it('list 应将空字符串 apiKey 映射为空字符串', async () => {
      const item = makePrismaModel({ apiKey: '' });
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result[0].api_key).toBe('');
    });

    it('getById 应将 null apiKey 映射为空字符串', async () => {
      const item = makePrismaModel({ apiKey: null });
      mockPrisma.llmModel.findFirst.mockResolvedValue(item);

      const result = await service.getById(1);

      expect(result.api_key).toBe('');
    });

    it('create 应将 null apiKey 映射为空字符串', async () => {
      const item = makePrismaModel({ apiKey: null });
      mockPrisma.llmModel.create.mockResolvedValue(item);

      const result = await service.create({
        provider: 'test',
        base_url: 'https://test.com',
        api_key: '',
        model_name: 'test-model',
      });

      expect(result.api_key).toBe('');
    });

    it('update 应将 null apiKey 映射为空字符串', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const updated = makePrismaModel({ apiKey: null });
      mockPrisma.llmModel.update.mockResolvedValue(updated);

      const result = await service.update(1, { api_key: '' });

      expect(result.api_key).toBe('');
    });
  });

  // ──────────────────────────────────────
  //  API key 掩码边界值
  // ──────────────────────────────────────

  describe('API key 掩码边界值', () => {
    it('极短 apiKey（5字符）应正确掩码', async () => {
      const item = makePrismaModel({ apiKey: 'abcde' });
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result[0].api_key).toBe('abcd****bcde');
    });

    it('刚好4字符 apiKey 应正确掩码', async () => {
      const item = makePrismaModel({ apiKey: 'abcd' });
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result[0].api_key).toBe('abcd****abcd');
    });

    it('超长 apiKey 应正确掩码', async () => {
      const longKey = 'sk-proj-abcdefghijklmnop-1234567890-XYZ';
      const item = makePrismaModel({ apiKey: longKey });
      mockPrisma.llmModel.findMany.mockResolvedValue([item]);

      const result = await service.list();

      expect(result[0].api_key).toBe('sk-p****-XYZ');
      expect(result[0].api_key).toContain('****');
    });
  });

  // ──────────────────────────────────────
  //  listEnabled orderBy 验证
  // ──────────────────────────────────────

  describe('listEnabled orderBy 验证', () => {
    it('应按 id 升序排列', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      await service.listEnabled();

      const callArgs = mockPrisma.llmModel.findMany.mock.calls[0][0] as any;
      expect(callArgs.orderBy).toEqual({ id: 'asc' });
    });
  });

  // ──────────────────────────────────────
  //  update 空字符串 vs undefined
  // ──────────────────────────────────────

  describe('update 空字符串 vs undefined', () => {
    it('空字符串 provider 应被包含在 data 中（非 undefined）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { provider: '' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.provider).toBe('');
      expect(Object.keys(callArgs.data)).toContain('provider');
    });

    it('空字符串 base_url 应被包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { base_url: '' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.baseUrl).toBe('');
    });

    it('空字符串 api_key 应被包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { api_key: '' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.apiKey).toBe('');
    });

    it('空字符串 model_name 应被包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { model_name: '' });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.modelName).toBe('');
    });
  });

  // ──────────────────────────────────────
  //  update findFirst 参数验证
  // ──────────────────────────────────────

  describe('update findFirst 参数验证', () => {
    it('findFirst 应传入正确的 where 条件', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(42, { provider: 'test' });

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 42 } });
    });

    it('findFirst 应在 update 之前被调用', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.update(1, { provider: 'x' });

      const findFirstOrder = mockPrisma.llmModel.findFirst.mock.invocationCallOrder[0];
      const updateOrder = mockPrisma.llmModel.update.mock.invocationCallOrder[0];
      expect(findFirstOrder).toBeLessThan(updateOrder);
    });
  });

  // ──────────────────────────────────────
  //  delete findFirst 参数验证
  // ──────────────────────────────────────

  describe('delete findFirst 参数验证', () => {
    it('findFirst 应传入正确的 where 条件', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel());

      await service.delete(42);

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({ where: { id: 42 } });
    });
  });

  // ──────────────────────────────────────
  //  update 传入 true 值的 status
  // ──────────────────────────────────────

  describe('update status 布尔值', () => {
    it('应将 status=true 正确包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ status: false }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ status: true }));

      await service.update(1, { status: true });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.status).toBe(true);
    });

    it('应将 status=false 正确包含在 data 中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel({ status: true }));
      mockPrisma.llmModel.update.mockResolvedValue(makePrismaModel({ status: false }));

      await service.update(1, { status: false });

      const callArgs = mockPrisma.llmModel.update.mock.calls[0][0] as any;
      expect(callArgs.data.status).toBe(false);
    });
  });

  // ──────────────────────────────────────
  //  list orderBy 验证
  // ──────────────────────────────────────

  describe('list orderBy 验证', () => {
    it('应传递 orderBy: { id: asc } 给 Prisma', async () => {
      mockPrisma.llmModel.findMany.mockResolvedValue([]);

      await service.list();

      expect(mockPrisma.llmModel.findMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    });
  });
});

import axios from 'axios';
import {
  collectCitationSourcesForModel,
  extractCitationSourcesForTest,
  loadEnabledCitationModels,
  normalizeChatCompletionsUrl,
} from '../../apis/utils/citation-collector.util';

jest.mock('axios');
jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
}));
jest.mock('../../apis/utils/encryption.util', () => ({
  isEncrypted: jest.fn((value: string) => value.startsWith('encrypted:')),
  decryptApiKey: jest.fn((value: string) => value.replace(/^encrypted:/, '')),
}));

const mockedAxios = axios as jest.Mocked<typeof axios>;
const { getPrisma } = jest.requireMock('../../apis/utils/db.util') as { getPrisma: jest.Mock };

const modelRows = [
  {
    id: 1,
    provider: 'Deepseek',
    modelName: 'deepseek-v4-pro',
    baseUrl: 'https://api.deepseek.com',
    apiKey: 'encrypted:deepseek-key',
    status: true,
    deletedAt: null,
  },
  {
    id: 2,
    provider: '清华智谱',
    modelName: 'glm-5.1',
    baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
    apiKey: 'encrypted:glm-key',
    status: false,
    deletedAt: null,
  },
  {
    id: 3,
    provider: '豆包',
    modelName: 'doubao-seed-1-6-251015',
    baseUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions',
    apiKey: 'encrypted:doubao-key',
    status: true,
    deletedAt: null,
  },
  {
    id: 4,
    provider: '千问',
    modelName: 'qwen3.5-plus',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: 'encrypted:qwen-key',
    status: true,
    deletedAt: null,
  },
  {
    id: 5,
    provider: 'Deepseek2',
    modelName: 'deepseek-v4-flash',
    baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
    apiKey: 'encrypted:deepseek2-key',
    status: true,
    deletedAt: null,
  },
  {
    id: 6,
    provider: '元宝',
    modelName: 'hunyuan-pro',
    baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
    apiKey: 'encrypted:hunyuan-key',
    status: true,
    deletedAt: null,
  },
  {
    id: 7,
    provider: 'Kimi',
    modelName: 'moonshot-v1-8k',
    baseUrl: 'https://api.moonshot.ai/v1',
    apiKey: '',
    status: true,
    deletedAt: null,
  },
];

describe('citation collector model loading', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    getPrisma.mockReturnValue({
      llmModel: {
        findMany: jest.fn().mockResolvedValue(modelRows),
      },
    });
  });

  it('normalizes OpenAI-compatible base URLs to chat completions endpoints', () => {
    expect(normalizeChatCompletionsUrl('https://api.deepseek.com')).toBe('https://api.deepseek.com/chat/completions');
    expect(normalizeChatCompletionsUrl('https://api.hunyuan.cloud.tencent.com/v1')).toBe('https://api.hunyuan.cloud.tencent.com/v1/chat/completions');
    expect(normalizeChatCompletionsUrl('https://api.hunyuan.cloud.tencent.com/v1/chat/completions')).toBe('https://api.hunyuan.cloud.tencent.com/v1/chat/completions');
    expect(normalizeChatCompletionsUrl('https://api.deepseek.com/')).toBe('https://api.deepseek.com/chat/completions');
  });

  it('loads every enabled model with complete credentials by default', async () => {
    const models = await loadEnabledCitationModels();

    expect(models.map((model) => model.key)).toEqual([
      'Deepseek:deepseek-v4-pro',
      '豆包:doubao-seed-1-6-251015',
      '千问:qwen3.5-plus',
      'Deepseek2:deepseek-v4-flash',
      '元宝:hunyuan-pro',
    ]);
    expect(models.some((model) => model.provider === '清华智谱')).toBe(false);
    expect(models.some((model) => model.provider === 'Kimi')).toBe(false);
  });

  it('filters enabled models by provider, model name, or combined key', async () => {
    await expect(loadEnabledCitationModels(['Deepseek:deepseek-v4-pro'])).resolves.toMatchObject([
      { key: 'Deepseek:deepseek-v4-pro' },
    ]);
    await expect(loadEnabledCitationModels(['qwen3.5-plus'])).resolves.toMatchObject([
      { key: '千问:qwen3.5-plus' },
    ]);
    await expect(loadEnabledCitationModels(['元宝'])).resolves.toMatchObject([
      { key: '元宝:hunyuan-pro' },
    ]);
    await expect(loadEnabledCitationModels(['Kimi'])).resolves.toEqual([]);
  });
});

describe('citation collector model calls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('posts to the normalized chat completions URL and parses URL sources from successful answers', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [
          {
            message: {
              content: '参考来源：https://example.com/a',
            },
          },
        ],
      },
    });

    const result = await collectCitationSourcesForModel(
      {
        id: 1,
        provider: 'Deepseek',
        modelName: 'deepseek-v4-pro',
        baseUrl: 'https://api.deepseek.com',
        apiKey: 'deepseek-key',
        key: 'Deepseek:deepseek-v4-pro',
      },
      '请回答',
    );

    expect(mockedAxios.post).toHaveBeenCalledWith(
      'https://api.deepseek.com/chat/completions',
      expect.objectContaining({
        model: 'deepseek-v4-pro',
        messages: expect.any(Array),
      }),
      expect.objectContaining({
        headers: expect.objectContaining({ Authorization: 'Bearer deepseek-key' }),
      }),
    );
    expect(result).toMatchObject({
      model_name: 'Deepseek:deepseek-v4-pro',
      status: 'success',
      answer: '参考来源：https://example.com/a',
    });
    expect(result.sources).toEqual([
      expect.objectContaining({ url: 'https://example.com/a' }),
    ]);
  });

  it('uses a portable chat completions body for providers that reject non-standard search fields', async () => {
    mockedAxios.post.mockResolvedValue({
      data: {
        choices: [{ message: { content: '参考来源：https://example.com/b' } }],
      },
    });

    await collectCitationSourcesForModel(
      {
        id: 6,
        provider: '元宝',
        modelName: 'hunyuan-pro',
        baseUrl: 'https://api.hunyuan.cloud.tencent.com/v1/chat/completions',
        apiKey: 'hunyuan-key',
        key: '元宝:hunyuan-pro',
      },
      '请回答',
    );

    const body = mockedAxios.post.mock.calls[0][1] as Record<string, unknown>;
    expect(body).toMatchObject({
      model: 'hunyuan-pro',
      messages: expect.any(Array),
      stream: false,
    });
    expect(body).not.toHaveProperty('enable_search');
    expect(body).not.toHaveProperty('search_options');
    expect(body).not.toHaveProperty('enable_enhancement');
    expect(body).not.toHaveProperty('force_search_enhancement');
    expect(body).not.toHaveProperty('search_info');
    expect(body).not.toHaveProperty('tools');
    expect(body).not.toHaveProperty('thinking');
  });

  it('keeps provider error response details for HTTP 400 diagnosis', async () => {
    mockedAxios.post.mockRejectedValue({
      response: {
        status: 400,
        data: {
          error: {
            message: 'unsupported field enable_search',
          },
        },
      },
    });

    const result = await collectCitationSourcesForModel(
      {
        id: 4,
        provider: '千问',
        modelName: 'qwen3.5-plus',
        baseUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions',
        apiKey: 'qwen-key',
        key: '千问:qwen3.5-plus',
      },
      '请回答',
    );

    expect(result.status).toBe('error');
    expect(result.error).toContain('HTTP 400');
    expect(result.error).toContain('unsupported field enable_search');
  });
});

describe('citation collector source extraction', () => {
  it('keeps public page sources and drops internal backend or image CDN URLs', () => {
    const sources = extractCitationSourcesForTest(
      {
        citations: [
          { url: 'https://www.example.com/articles/1', title: 'Public article' },
          { url: 'https://i.ruan.net/manuscripts/', title: 'Internal backend' },
          { url: 'https://p11-volcsearch-sign.byteimg.com/tos-cn-i-test/image.jpeg', title: 'Image asset' },
        ],
      },
      'Answer references https://www.example.com/articles/1 and https://i.ruan.net/manuscripts/',
    );

    expect(sources.map((source) => source.url)).toEqual(['https://www.example.com/articles/1']);
  });
});

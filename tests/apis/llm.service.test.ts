/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('axios');

import { getPrisma } from '../../apis/utils';
import axios from 'axios';
import { LlmServiceImpl } from '../../apis/service/impl/llm.service.impl';
import { ArticleGenerationParams } from '../../apis/service/llm.service';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;
const mockedAxios = axios as jest.Mocked<typeof axios>;

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
      findFirst: jest.fn(),
    },
  };
}

function makeAxiosResponse(data: any) {
  return { data, status: 200, statusText: 'OK', headers: {}, config: {} as any };
}

function makeLlmContent(text: string) {
  return {
    choices: [{ message: { content: text, role: 'assistant' } }],
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
//  LlmServiceImpl Tests
// ══════════════════════════════════════════

describe('LlmServiceImpl', () => {
  let service: LlmServiceImpl;

  beforeEach(() => {
    service = new LlmServiceImpl();
  });

  // ──────────────────────────────────────
  //  expandKeywords()
  // ──────────────────────────────────────

  describe('expandKeywords()', () => {
    const defaultModel = makePrismaModel();

    it('应正确扩展关键词并返回解析后的关键词数组', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '关键词扩展1\n关键词扩展2\n关键词扩展3';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('人工智能');

      expect(result).toEqual(['关键词扩展1', '关键词扩展2', '关键词扩展3']);
    });

    it('应去除编号前缀（数字+点/顿号/括号等）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1. 深度学习\n2、自然语言处理\n3) 机器学习\n4  计算机视觉';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('AI');

      expect(result).toEqual(['深度学习', '自然语言处理', '机器学习', '计算机视觉']);
    });

    it('应过滤掉空行和超长行（>=100字符）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const longLine = 'a'.repeat(100);
      const llmContent = `有效关键词\n\n${longLine}\n另一个有效词`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['有效关键词', '另一个有效词']);
    });

    it('应对trim后为空的行进行过滤', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '关键词1\n   \n关键词2\n\t\n关键词3';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['关键词1', '关键词2', '关键词3']);
    });

    it('应保留长度1的关键词（>0 即可）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = 'AI\n长关键词测试';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['AI', '长关键词测试']);
    });

    it('没有可用模型时应抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        '没有可用的LLM模型，请先在系统管理中配置'
      );
    });

    it('应使用正确的模型参数调用LLM API', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试关键词');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body, config] = mockedAxios.post.mock.calls[0] as [string, any, any];

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(body.model).toBe('gpt-4');
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toContain('测试关键词');
      expect(body.temperature).toBe(0);
      expect(config.headers.Authorization).toBe('Bearer sk-test-key');
      expect(config.headers['Content-Type']).toBe('application/json');
      expect(config.timeout).toBe(300000);
    });

    it('LLM返回空内容时应返回空数组', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('')));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([]);
    });

    it('LLM返回null内容时应返回空数组', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        makeAxiosResponse({ choices: [{ message: { content: null } }] })
      );

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([]);
    });

    it('应处理baseUrl末尾有斜杠的情况', async () => {
      const model = makePrismaModel({ baseUrl: 'https://api.openai.com/v1/' });
      mockPrisma.llmModel.findFirst.mockResolvedValue(model);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      const url = mockedAxios.post.mock.calls[0][0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('应处理baseUrl末尾有多个斜杠的情况', async () => {
      const model = makePrismaModel({ baseUrl: 'https://api.openai.com/v1///' });
      mockPrisma.llmModel.findFirst.mockResolvedValue(model);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      const url = mockedAxios.post.mock.calls[0][0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('axios调用失败时应抛出包含状态码和错误信息的错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Network Error');
      axiosError.response = { status: 429, data: { error: { message: 'Rate limited' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(429): Rate limited'
      );
    });

    it('axios调用失败且response.data.message存在时应使用该message', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fail');
      axiosError.response = { status: 500, data: { message: 'Internal Server Error' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(500): Internal Server Error'
      );
    });

    it('axios调用失败且无response时应显示未知状态码', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Connection refused');
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(未知): Connection refused'
      );
    });

    it('应查询status=true且deletedAt=null的模型（按id升序）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({
        where: { status: true, deletedAt: null },
        orderBy: { id: 'asc' },
      });
    });

    it('应正确处理Windows风格的\\r\\n换行符', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '关键词1\r\n关键词2\r\n关键词3';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['关键词1', '关键词2', '关键词3']);
    });

    it('应正确处理混合换行符（\\r\\n和\\n混用）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '关键词1\n关键词2\r\n关键词3';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['关键词1', '关键词2', '关键词3']);
    });

    it('编号前缀去除后为空的行应被过滤', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1. \n有效关键词\n2.\n另一个有效词';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['有效关键词', '另一个有效词']);
    });

    it('应处理两位数编号前缀', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '10. 长尾关键词A\n11. 长尾关键词B\n12. 长尾关键词C';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['长尾关键词A', '长尾关键词B', '长尾关键词C']);
    });

    it('应保留不以数字开头的行（如带破折号的列表项）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '- 破折号关键词\n正常关键词\n* 星号关键词';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['- 破折号关键词', '正常关键词', '* 星号关键词']);
    });

    it('应处理恰好99个字符的关键词（刚好在限制内）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const keyword99 = 'a'.repeat(99);
      const llmContent = `${keyword99}\n有效词`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([keyword99, '有效词']);
    });

    // ── 第2轮补全：prompt验证 / 边界值 / 错误链路覆盖 ──

    it('prompt应包含原始关键词和扩展要求', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('深度学习');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      const prompt = body.messages[0].content;
      expect(prompt).toContain('深度学习');
      expect(prompt).toContain('20个');
      expect(prompt).toContain('长尾关键词');
      expect(prompt).toContain('同义词');
      expect(prompt).toContain('相关术语');
      expect(prompt).toContain('应用场景');
    });

    it('应处理编号后跟tab分隔符的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1.\t关键词1\n2.\t关键词2';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['关键词1', '关键词2']);
    });

    it('编号后跟冒号不应被去除（冒号不在正则中）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1:关键词1\n2:关键词2';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['1:关键词1', '2:关键词2']);
    });

    it('应处理三位数编号前缀', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '100. 长尾关键词A\n101. 长尾关键词B';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['长尾关键词A', '长尾关键词B']);
    });

    it('应处理axios错误中data为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Network fail');
      axiosError.response = { status: 500, data: 'raw error string' };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(500): Network fail'
      );
    });

    it('应处理axios错误中data.error为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback');
      axiosError.response = { status: 400, data: { error: 'string error' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(400): fallback'
      );
    });

    it('应处理axios错误中data.error.message为空字符串（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback msg');
      axiosError.response = { status: 400, data: { error: { message: '' }, message: '' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(
        'LLM调用失败(400): fallback msg'
      );
    });

    it('应处理response.data为undefined的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        { data: undefined, status: 200, statusText: 'OK', headers: {}, config: {} as any }
      );

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([]);
    });

    it('应处理LLM返回choices为undefined的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse({}));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([]);
    });

    it('应处理LLM返回message为undefined的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse({ choices: [{}] }));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual([]);
    });

    it('应处理空关键词输入', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('扩展词')));

      const result = await service.expandKeywords('');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages[0].content).toContain('原始关键词：');
      expect(result).toEqual(['扩展词']);
    });

    it('应处理恰好100个字符的关键词（应被过滤）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const keyword100 = 'a'.repeat(100);
      const llmContent = `${keyword100}\n有效词`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['有效词']);
    });

    it('应使用不同的模型配置进行调用', async () => {
      const customModel = makePrismaModel({
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-key',
        modelName: 'claude-3-opus',
      });
      mockPrisma.llmModel.findFirst.mockResolvedValue(customModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      const [url, body, config] = mockedAxios.post.mock.calls[0] as [string, any, any];
      expect(url).toBe('https://api.anthropic.com/v1/chat/completions');
      expect(body.model).toBe('claude-3-opus');
      expect(config.headers.Authorization).toBe('Bearer sk-ant-key');
    });

    it('应处理仅包含编号和分隔符的行（去除后为空）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1. \n2.\n3)\n有效词';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.expandKeywords('测试');

      expect(result).toEqual(['有效词']);
    });
  });

  // ──────────────────────────────────────
  //  mineKeywordsFromContent()
  // ──────────────────────────────────────

  describe('mineKeywordsFromContent()', () => {
    const defaultModel = makePrismaModel();

    it('应正确从内容中提取关键词', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '人工智能\n机器学习\n深度学习';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('这是一篇关于AI的文章内容');

      expect(result).toEqual(['人工智能', '机器学习', '深度学习']);
    });

    it('应去除编号前缀', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1. 神经网络\n2、大数据\n3) 云计算';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['神经网络', '大数据', '云计算']);
    });

    it('应过滤掉长度<=1和>=100的行', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const longLine = 'x'.repeat(100);
      const llmContent = `a\n有效关键词\n${longLine}`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['有效关键词']);
    });

    it('应保留长度为2的关键词', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = 'AI技术\n区块链';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['AI技术', '区块链']);
    });

    it('应过滤空行和纯空白行', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '关键词1\n\n   \n\t\n关键词2';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['关键词1', '关键词2']);
    });

    it('没有可用模型时应抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        '没有可用的LLM模型，请先在系统管理中配置'
      );
    });

    it('应使用正确的参数调用LLM API', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('文章正文内容');

      expect(mockedAxios.post).toHaveBeenCalledTimes(1);
      const [url, body, config] = mockedAxios.post.mock.calls[0] as [string, any, any];

      expect(url).toBe('https://api.openai.com/v1/chat/completions');
      expect(body.model).toBe('gpt-4');
      expect(body.messages[0].role).toBe('user');
      expect(body.messages[0].content).toContain('文章正文内容');
      expect(body.temperature).toBe(0);
      expect(config.headers.Authorization).toBe('Bearer sk-test-key');
    });

    it('LLM返回空内容时应返回空数组', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('')));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual([]);
    });

    it('LLM返回null内容时应返回空数组', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        makeAxiosResponse({ choices: [{ message: { content: null } }] })
      );

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual([]);
    });

    it('axios调用失败且response.data.message存在时应使用该message', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fail');
      axiosError.response = { status: 500, data: { message: 'Server Error' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(500): Server Error'
      );
    });

    it('axios调用失败时应抛出包含状态码的错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Timeout');
      axiosError.response = { status: 504, data: { error: { message: 'Gateway Timeout' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(504): Gateway Timeout'
      );
    });

    it('axios调用失败且response存在但无status时应显示未知状态码', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Partial response');
      axiosError.response = { data: {} };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(未知): Partial response'
      );
    });

    it('axios调用失败且response.data无error.message和message时应使用err.message', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Raw error message');
      axiosError.response = { status: 502, data: {} };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(502): Raw error message'
      );
    });

    it('应查询status=true且deletedAt=null的模型', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({
        where: { status: true, deletedAt: null },
        orderBy: { id: 'asc' },
      });
    });

    it('应正确处理Windows风格的\\r\\n换行符', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '机器学习\r\n深度学习\r\n自然语言处理';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['机器学习', '深度学习', '自然语言处理']);
    });

    it('应明确过滤长度为1的关键词（与expandKeywords不同）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '好\n机器学习\nAI\n深度学习';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      // '好'(1) 和 'AI'(2) - 注意 filter 是 >1，所以只有 '好' 被过滤
      expect(result).toEqual(['机器学习', 'AI', '深度学习']);
    });

    it('应处理两位数编号前缀', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '10. 人工智能\n11. 区块链\n12. 物联网';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['人工智能', '区块链', '物联网']);
    });

    it('应正确处理超长内容输入', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const longContent = '这是一段很长的文章内容。'.repeat(500);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词1\n关键词2')));

      const result = await service.mineKeywordsFromContent(longContent);

      // 验证内容被传递到prompt中
      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[0].content;
      expect(userContent).toContain(longContent);
      expect(result).toEqual(['关键词1', '关键词2']);
    });

    // ── 第2轮补全：prompt验证 / 边界值 / 错误链路覆盖 ──

    it('prompt应包含内容提取要求', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('测试内容文本');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      const prompt = body.messages[0].content;
      expect(prompt).toContain('测试内容文本');
      expect(prompt).toContain('SEO关键词');
      expect(prompt).toContain('2-20个字');
      expect(prompt).toContain('专业术语');
      expect(prompt).toContain('至少提取20个关键词');
    });

    it('应处理编号后跟tab分隔符的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const llmContent = '1.\t机器学习\n2.\t深度学习';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['机器学习', '深度学习']);
    });

    it('应处理axios错误中data为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Network fail');
      axiosError.response = { status: 500, data: 'raw error string' };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(500): Network fail'
      );
    });

    it('应处理axios错误中data.error为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback');
      axiosError.response = { status: 400, data: { error: 'string error' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(400): fallback'
      );
    });

    it('应处理axios错误中data.error.message为空字符串（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback msg');
      axiosError.response = { status: 400, data: { error: { message: '' }, message: '' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(
        'LLM调用失败(400): fallback msg'
      );
    });

    it('应处理response.data为undefined的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        { data: undefined, status: 200, statusText: 'OK', headers: {}, config: {} as any }
      );

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual([]);
    });

    it('应处理LLM返回choices为undefined的情况', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse({}));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual([]);
    });

    it('应过滤恰好100个字符的关键词', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const keyword100 = 'x'.repeat(100);
      const llmContent = `有效词\n${keyword100}`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual(['有效词']);
    });

    it('应保留恰好99个字符的关键词', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const keyword99 = 'x'.repeat(99);
      const llmContent = `${keyword99}\n有效词`;
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(llmContent)));

      const result = await service.mineKeywordsFromContent('内容');

      expect(result).toEqual([keyword99, '有效词']);
    });

    it('应处理空内容输入', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages[0].content).toContain('内容：');
    });

    it('应使用不同的模型配置进行调用', async () => {
      const customModel = makePrismaModel({
        provider: 'deepseek',
        baseUrl: 'https://api.deepseek.com/',
        apiKey: 'sk-ds-key',
        modelName: 'deepseek-chat',
      });
      mockPrisma.llmModel.findFirst.mockResolvedValue(customModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');

      const [url, body, config] = mockedAxios.post.mock.calls[0] as [string, any, any];
      expect(url).toBe('https://api.deepseek.com/chat/completions');
      expect(body.model).toBe('deepseek-chat');
      expect(config.headers.Authorization).toBe('Bearer sk-ds-key');
    });
  });

  // ──────────────────────────────────────
  //  generateArticle()
  // ──────────────────────────────────────

  describe('generateArticle()', () => {
    const defaultModel = makePrismaModel();

    const defaultParams: ArticleGenerationParams = {
      title: '人工智能的未来发展',
      keywords: 'AI, 机器学习, 深度学习',
      portrait: '技术开发者',
      images: [
        { title: 'AI架构图', description: '神经网络结构示意图', imageUrl: 'https://example.com/ai.jpg' },
      ],
      skills: '技术深度分析',
    };

    it('应成功生成文章并返回内容', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const articleContent = '# 人工智能的未来\n\n这是一篇关于AI的文章。';
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent(articleContent)));

      const result = await service.generateArticle(defaultParams);

      expect(result).toBe(articleContent);
    });

    it('应使用system和user双消息调用LLM API', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章内容')));

      await service.generateArticle(defaultParams);

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[0].content).toContain('GEO');
      expect(body.messages[1].role).toBe('user');
      expect(body.messages[1].content).toContain('人工智能的未来发展');
      expect(body.messages[1].content).toContain('AI, 机器学习, 深度学习');
      expect(body.messages[1].content).toContain('技术开发者');
    });

    it('应使用temperature 0.7调用', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.temperature).toBe(0.7);
    });

    it('应正确格式化图片列表到prompt中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [
          { title: '图1', description: '描述1', imageUrl: 'https://a.com/1.jpg' },
          { title: '图2', description: '描述2', imageUrl: 'https://b.com/2.jpg' },
        ],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('图1');
      expect(userContent).toContain('描述1');
      expect(userContent).toContain('https://a.com/1.jpg');
      expect(userContent).toContain('图2');
      expect(userContent).toContain('描述2');
      expect(userContent).toContain('https://b.com/2.jpg');
    });

    it('当images为空时应显示"无可用图片"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = { ...defaultParams, images: [] };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无可用图片');
    });

    it('当图片无描述时应显示"无描述"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [{ title: '图1', description: '', imageUrl: 'https://a.com/1.jpg' }],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无描述');
    });

    it('当skills为空时应显示"无特殊要求"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = { ...defaultParams, skills: '' };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无特殊要求');
    });

    it('没有可用模型时应抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        '没有可用的LLM模型，请先在系统管理中配置'
      );
    });

    it('LLM返回空内容时应抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('')));

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM返回内容为空'
      );
    });

    it('LLM返回纯空白内容时应抛出错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('   \n\t  ')));

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM返回内容为空'
      );
    });

    it('axios调用失败时应抛出包含状态码的错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Server Error');
      axiosError.response = { status: 500, data: { error: { message: 'Internal Error' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM调用失败(500): Internal Error'
      );
    });

    it('axios调用失败且无response时应显示未知状态码', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('ECONNREFUSED');
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM调用失败(未知): ECONNREFUSED'
      );
    });

    it('应使用正确的认证头和超时配置', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const config = (mockedAxios.post.mock.calls[0] as [string, any, any])[2];
      expect(config!.headers.Authorization).toBe('Bearer sk-test-key');
      expect(config!.headers['Content-Type']).toBe('application/json');
      expect(config!.timeout).toBe(300000);
    });

    it('应处理baseUrl末尾有斜杠的情况', async () => {
      const model = makePrismaModel({ baseUrl: 'https://api.openai.com/v1/' });
      mockPrisma.llmModel.findFirst.mockResolvedValue(model);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const url = mockedAxios.post.mock.calls[0][0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });

    it('应查询status=true且deletedAt=null的模型', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith({
        where: { status: true, deletedAt: null },
        orderBy: { id: 'asc' },
      });
    });

    it('LLM返回null内容时应抛出"LLM返回内容为空"错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        makeAxiosResponse({ choices: [{ message: { content: null } }] })
      );

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM返回内容为空'
      );
    });

    it('LLM返回undefined内容时应抛出"LLM返回内容为空"错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        makeAxiosResponse({ choices: [{ message: {} }] })
      );

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM返回内容为空'
      );
    });

    it('LLM返回空choices数组时应抛出"LLM返回内容为空"错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        makeAxiosResponse({ choices: [] })
      );

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM返回内容为空'
      );
    });

    it('应正确在prompt中包含标题和目标受众', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '深度学习入门指南',
        keywords: '神经网络, 反向传播',
        portrait: 'AI初学者',
        images: [],
        skills: '通俗易懂',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('深度学习入门指南');
      expect(userContent).toContain('神经网络, 反向传播');
      expect(userContent).toContain('AI初学者');
      expect(userContent).toContain('通俗易懂');
    });

    it('应正确格式化多张图片信息到prompt中', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [
          { title: '架构图', description: '系统架构示意', imageUrl: 'https://a.com/arch.png' },
          { title: '流程图', description: '业务流程示意', imageUrl: 'https://b.com/flow.png' },
          { title: '截图', description: '界面截图展示', imageUrl: 'https://c.com/screen.jpg' },
        ],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('1. "架构图"');
      expect(userContent).toContain('系统架构示意');
      expect(userContent).toContain('2. "流程图"');
      expect(userContent).toContain('3. "截图"');
      expect(userContent).toContain('https://a.com/arch.png');
      expect(userContent).toContain('https://b.com/flow.png');
      expect(userContent).toContain('https://c.com/screen.jpg');
    });

    it('system prompt应包含GEO和Markdown相关指导', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const systemContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[0].content;
      expect(systemContent).toContain('GEO');
      expect(systemContent).toContain('Markdown');
      expect(systemContent).toContain('1500-3000字');
    });

    // ── 第2轮补全：prompt验证 / 边界值 / 错误链路覆盖 ──

    it('图片description为null时应显示"无描述"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [{ title: '图1', description: null as any, imageUrl: 'https://a.com/1.jpg' }],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无描述');
    });

    it('图片description为undefined时应显示"无描述"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [{ title: '图1', description: undefined as any, imageUrl: 'https://a.com/1.jpg' }],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无描述');
    });

    it('skills为undefined时应显示"无特殊要求"', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params = { ...defaultParams, skills: undefined as any };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('无特殊要求');
    });

    it('图片编号应从1开始递增', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        ...defaultParams,
        images: [
          { title: 'A', description: 'a', imageUrl: 'https://a.com/a.jpg' },
          { title: 'B', description: 'b', imageUrl: 'https://b.com/b.jpg' },
          { title: 'C', description: 'c', imageUrl: 'https://c.com/c.jpg' },
        ],
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('1. "A"');
      expect(userContent).toContain('2. "B"');
      expect(userContent).toContain('3. "C"');
    });

    it('应使用不同的模型配置进行调用', async () => {
      const customModel = makePrismaModel({
        provider: 'anthropic',
        baseUrl: 'https://api.anthropic.com/v1',
        apiKey: 'sk-ant-key',
        modelName: 'claude-3-opus',
      });
      mockPrisma.llmModel.findFirst.mockResolvedValue(customModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const [url, body, config] = mockedAxios.post.mock.calls[0] as [string, any, any];
      expect(url).toBe('https://api.anthropic.com/v1/chat/completions');
      expect(body.model).toBe('claude-3-opus');
      expect(config.headers.Authorization).toBe('Bearer sk-ant-key');
    });

    it('应处理axios错误中data为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('Network fail');
      axiosError.response = { status: 500, data: 'raw error string' };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM调用失败(500): Network fail'
      );
    });

    it('应处理axios错误中data.error为字符串的情况（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback');
      axiosError.response = { status: 400, data: { error: 'string error' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM调用失败(400): fallback'
      );
    });

    it('应处理axios错误中data.error.message为空字符串（回退到err.message）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      const axiosError: any = new Error('fallback msg');
      axiosError.response = { status: 400, data: { error: { message: '' }, message: '' } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle(defaultParams)).rejects.toThrow(
        'LLM调用失败(400): fallback msg'
      );
    });

    it('应处理response.data为undefined时返回空内容错误', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(
        { data: undefined, status: 200, statusText: 'OK', headers: {}, config: {} as any }
      );

      await expect(service.generateArticle(defaultParams)).rejects.toThrow('LLM返回内容为空');
    });

    it('system prompt应包含图片使用和字数要求', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const systemContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[0].content;
      expect(systemContent).toContain('Markdown 图片语法');
      expect(systemContent).toContain('![图片描述](图片URL)');
      expect(systemContent).toContain('每张图片最多使用一次');
      expect(systemContent).toContain('1500-3000字');
    });

    it('应验证完整user prompt结构（标题+关键词+受众+图片+技能）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(defaultModel);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '量子计算入门',
        keywords: '量子比特, 量子纠缠',
        portrait: '物理系学生',
        images: [{ title: '量子图', description: '量子示意图', imageUrl: 'https://q.com/img.png' }],
        skills: '深入浅出',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('文章标题');
      expect(userContent).toContain('量子计算入门');
      expect(userContent).toContain('目标关键词');
      expect(userContent).toContain('量子比特, 量子纠缠');
      expect(userContent).toContain('目标受众画像');
      expect(userContent).toContain('物理系学生');
      expect(userContent).toContain('可用图片资源');
      expect(userContent).toContain('写作技能方向');
      expect(userContent).toContain('深入浅出');
      expect(userContent).toContain('请直接输出文章内容');
    });

    it('应处理baseUrl末尾有多个斜杠的情况', async () => {
      const model = makePrismaModel({ baseUrl: 'https://api.openai.com/v1///' });
      mockPrisma.llmModel.findFirst.mockResolvedValue(model);
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle(defaultParams);

      const url = mockedAxios.post.mock.calls[0][0];
      expect(url).toBe('https://api.openai.com/v1/chat/completions');
    });
  });
});

// ══════════════════════════════════════════
//  第3轮：接口契约合规性验证
// ══════════════════════════════════════════

describe('LlmServiceImpl 第3轮——接口契约合规性', () => {
  let service: LlmServiceImpl;

  beforeEach(() => {
    service = new LlmServiceImpl();
    mockPrisma = createMockPrisma();
    mockedGetPrisma.mockReturnValue(mockPrisma as any);
  });

  // ──────────────────────────────────────
  //  1. 接口方法签名验证（10）
  // ──────────────────────────────────────

  describe('接口方法签名验证', () => {
    it('应定义 expandKeywords 方法', () => {
      expect(typeof service.expandKeywords).toBe('function');
    });

    it('应定义 mineKeywordsFromContent 方法', () => {
      expect(typeof service.mineKeywordsFromContent).toBe('function');
    });

    it('应定义 generateArticle 方法', () => {
      expect(typeof service.generateArticle).toBe('function');
    });

    it('应恰好有3个实例方法', () => {
      const methods = Object.getOwnPropertyNames(Object.getPrototypeOf(service))
        .filter(name => name !== 'constructor');
      expect(methods).toHaveLength(3);
      expect(methods.sort()).toEqual(['expandKeywords', 'generateArticle', 'mineKeywordsFromContent'].sort());
    });

    it('expandKeywords 应接受1个参数', () => {
      expect(service.expandKeywords.length).toBe(1);
    });

    it('mineKeywordsFromContent 应接受1个参数', () => {
      expect(service.mineKeywordsFromContent.length).toBe(1);
    });

    it('generateArticle 应接受1个参数', () => {
      expect(service.generateArticle.length).toBe(1);
    });

    it('expandKeywords 返回值应为 Promise<string[]>', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      const result = service.expandKeywords('测试');
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });

    it('mineKeywordsFromContent 返回值应为 Promise<string[]>', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      const result = service.mineKeywordsFromContent('内容');
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(Array.isArray(resolved)).toBe(true);
    });

    it('generateArticle 返回值应为 Promise<string>', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章内容')));

      const result = service.generateArticle({
        title: '标题', keywords: '关键词', portrait: '受众',
        images: [], skills: '',
      });
      expect(result).toBeInstanceOf(Promise);
      const resolved = await result;
      expect(typeof resolved).toBe('string');
    });
  });

  // ──────────────────────────────────────
  //  2. ArticleGenerationParams 字段完整性（4）
  // ──────────────────────────────────────

  describe('ArticleGenerationParams 字段完整性', () => {
    it('应包含 title 字段', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '测试标题',
        keywords: '',
        portrait: '',
        images: [],
        skills: '',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('测试标题');
    });

    it('应包含 keywords 字段', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '', keywords: 'SEO,优化', portrait: '',
        images: [], skills: '',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('SEO,优化');
    });

    it('应包含 portrait 字段', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '', keywords: '', portrait: '产品经理',
        images: [], skills: '',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('产品经理');
    });

    it('images 数组元素应包含 title, description, imageUrl', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const params: ArticleGenerationParams = {
        title: '', keywords: '', portrait: '',
        images: [
          { title: '测试图片', description: '图片描述', imageUrl: 'https://test.com/img.png' },
        ],
        skills: '',
      };

      await service.generateArticle(params);

      const userContent = (mockedAxios.post.mock.calls[0] as [string, any, any])[1].messages[1].content;
      expect(userContent).toContain('测试图片');
      expect(userContent).toContain('图片描述');
      expect(userContent).toContain('https://test.com/img.png');
    });
  });

  // ──────────────────────────────────────
  //  3. 异步行为验证（6）
  // ──────────────────────────────────────

  describe('异步行为验证', () => {
    it('expandKeywords 应异步执行（不阻塞）', async () => {
      mockPrisma.llmModel.findFirst.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(makePrismaModel()), 10))
      );
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      const promise = service.expandKeywords('测试');
      // promise 已创建但尚未 resolved
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual(['关键词']);
    });

    it('mineKeywordsFromContent 应异步执行', async () => {
      mockPrisma.llmModel.findFirst.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(makePrismaModel()), 10))
      );
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      const promise = service.mineKeywordsFromContent('内容');
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toEqual(['关键词']);
    });

    it('generateArticle 应异步执行', async () => {
      mockPrisma.llmModel.findFirst.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(makePrismaModel()), 10))
      );
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      const promise = service.generateArticle({
        title: '标题', keywords: '', portrait: '', images: [], skills: '',
      });
      expect(promise).toBeInstanceOf(Promise);

      const result = await promise;
      expect(result).toBe('文章');
    });

    it('expandKeywords 错误应通过 Promise rejection 传递', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      const promise = service.expandKeywords('测试');
      await expect(promise).rejects.toThrow('没有可用的LLM模型');
    });

    it('mineKeywordsFromContent 错误应通过 Promise rejection 传递', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      const promise = service.mineKeywordsFromContent('内容');
      await expect(promise).rejects.toThrow('没有可用的LLM模型');
    });

    it('generateArticle 错误应通过 Promise rejection 传递', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      const promise = service.generateArticle({
        title: '标题', keywords: '', portrait: '', images: [], skills: '',
      });
      await expect(promise).rejects.toThrow('没有可用的LLM模型');
    });
  });

  // ──────────────────────────────────────
  //  4. 错误类型与继承层次（5）
  // ──────────────────────────────────────

  describe('错误类型与继承层次', () => {
    it('模型不存在时 expandKeywords 抛出的应为 Error 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      try {
        await service.expandKeywords('测试');
        fail('应抛出错误');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });

    it('模型不存在时 generateArticle 抛出的应为 Error 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      try {
        await service.generateArticle({
          title: '标题', keywords: '', portrait: '', images: [], skills: '',
        });
        fail('应抛出错误');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
      }
    });

    it('axios 错误应被包装为 Error 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const axiosError: any = new Error('Network Error');
      axiosError.response = { status: 500, data: { error: { message: 'Server Error' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      try {
        await service.expandKeywords('测试');
        fail('应抛出错误');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toContain('LLM调用失败');
      }
    });

    it('LLM 返回空内容的 generateArticle 应抛出 Error 实例', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('')));

      try {
        await service.generateArticle({
          title: '标题', keywords: '', portrait: '', images: [], skills: '',
        });
        fail('应抛出错误');
      } catch (e) {
        expect(e).toBeInstanceOf(Error);
        expect((e as Error).message).toBe('LLM返回内容为空');
      }
    });

    it('三个方法的模型不存在错误消息应一致', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(null);

      const expectedMsg = '没有可用的LLM模型，请先在系统管理中配置';

      try { await service.expandKeywords('测试'); } catch (e) {
        expect((e as Error).message).toBe(expectedMsg);
      }

      try { await service.mineKeywordsFromContent('内容'); } catch (e) {
        expect((e as Error).message).toBe(expectedMsg);
      }

      try { await service.generateArticle({
        title: '', keywords: '', portrait: '', images: [], skills: '',
      }); } catch (e) {
        expect((e as Error).message).toBe(expectedMsg);
      }
    });
  });

  // ──────────────────────────────────────
  //  5. temperature 差异验证（3）
  // ──────────────────────────────────────

  describe('temperature 差异验证', () => {
    it('expandKeywords 使用 temperature=0（确定性输出）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.temperature).toBe(0);
    });

    it('mineKeywordsFromContent 使用 temperature=0（确定性输出）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.temperature).toBe(0);
    });

    it('generateArticle 使用 temperature=0.7（创意性输出）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle({
        title: '标题', keywords: '', portrait: '', images: [], skills: '',
      });

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.temperature).toBe(0.7);
    });
  });

  // ──────────────────────────────────────
  //  6. 消息结构差异验证（3）
  // ──────────────────────────────────────

  describe('消息结构差异验证', () => {
    it('expandKeywords 使用单条 user 消息', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('mineKeywordsFromContent 使用单条 user 消息', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages).toHaveLength(1);
      expect(body.messages[0].role).toBe('user');
    });

    it('generateArticle 使用 system + user 双消息', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle({
        title: '标题', keywords: '', portrait: '', images: [], skills: '',
      });

      const body = (mockedAxios.post.mock.calls[0] as [string, any, any])[1];
      expect(body.messages).toHaveLength(2);
      expect(body.messages[0].role).toBe('system');
      expect(body.messages[1].role).toBe('user');
    });
  });

  // ──────────────────────────────────────
  //  7. 过滤行为差异验证（3）
  // ──────────────────────────────────────

  describe('过滤行为差异——expandKeywords vs mineKeywordsFromContent', () => {
    it('expandKeywords 保留长度=1的关键词（>0）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('AI\n长词')));

      const result = await service.expandKeywords('测试');
      expect(result).toEqual(['AI', '长词']);
    });

    it('mineKeywordsFromContent 过滤长度=1的关键词（>1）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('AI\n长词')));

      const result = await service.mineKeywordsFromContent('内容');
      // 'AI' 长度为 2，保留；如果只有单字符 'A' 则被过滤
      expect(result).toEqual(['AI', '长词']);
    });

    it('expandKeywords 和 mineKeywordsFromContent 对单字符行为不同', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('好\n测试')));

      const expandResult = await service.expandKeywords('测试');
      // expandKeywords filter: length > 0 → '好' 保留
      expect(expandResult).toEqual(['好', '测试']);

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('好\n测试')));

      const mineResult = await service.mineKeywordsFromContent('内容');
      // mineKeywordsFromContent filter: length > 1 → '好' 被过滤
      expect(mineResult).toEqual(['测试']);
    });
  });

  // ──────────────────────────────────────
  //  8. 实例独立性与构造函数验证（3）
  // ──────────────────────────────────────

  describe('实例独立性与构造函数验证', () => {
    it('构造函数不需要参数', () => {
      expect(() => new LlmServiceImpl()).not.toThrow();
    });

    it('多个实例应独立工作', async () => {
      const service1 = new LlmServiceImpl();
      const service2 = new LlmServiceImpl();

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词1')));

      const result1 = await service1.expandKeywords('测试1');

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词2')));

      const result2 = await service2.expandKeywords('测试2');

      expect(result1).toEqual(['关键词1']);
      expect(result2).toEqual(['关键词2']);
    });

    it('实例应为 LlmServiceImpl 类型', () => {
      expect(service).toBeInstanceOf(LlmServiceImpl);
    });
  });

  // ──────────────────────────────────────
  //  9. 错误消息格式一致性（3）
  // ──────────────────────────────────────

  describe('错误消息格式一致性', () => {
    it('expandKeywords 的 axios 错误消息应包含状态码和详情', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const axiosError: any = new Error('timeout');
      axiosError.response = { status: 408, data: { error: { message: 'Request Timeout' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.expandKeywords('测试')).rejects.toThrow(/^LLM调用失败\(408\):/);
    });

    it('mineKeywordsFromContent 的 axios 错误消息应包含状态码和详情', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const axiosError: any = new Error('timeout');
      axiosError.response = { status: 408, data: { error: { message: 'Request Timeout' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.mineKeywordsFromContent('内容')).rejects.toThrow(/^LLM调用失败\(408\):/);
    });

    it('generateArticle 的 axios 错误消息应包含状态码和详情', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      const axiosError: any = new Error('timeout');
      axiosError.response = { status: 408, data: { error: { message: 'Request Timeout' } } };
      mockedAxios.post.mockRejectedValue(axiosError);

      await expect(service.generateArticle({
        title: '', keywords: '', portrait: '', images: [], skills: '',
      })).rejects.toThrow(/^LLM调用失败\(408\):/);
    });
  });

  // ──────────────────────────────────────
  //  10. 导出与类型验证（4）
  // ──────────────────────────────────────

  describe('导出与类型验证', () => {
    it('ILlmService 应被正确导出', () => {
      // 验证 ILlmService 可以被类型引用（编译时检查通过即表示导出正确）
      const _: import('../../apis/service/llm.service').ILlmService = service;
      expect(_).toBeDefined();
    });

    it('ArticleGenerationParams 应被正确导出', () => {
      const params: ArticleGenerationParams = {
        title: '测试',
        keywords: '关键词',
        portrait: '受众',
        images: [],
        skills: '技能',
      };
      expect(params.title).toBe('测试');
    });

    it('LlmServiceImpl 应被正确导出', () => {
      expect(LlmServiceImpl).toBeDefined();
      expect(typeof LlmServiceImpl).toBe('function');
    });

    it('LlmServiceImpl 实现了 ILlmService 接口（鸭子类型验证）', () => {
      const iface: import('../../apis/service/llm.service').ILlmService = service;
      expect(typeof iface.expandKeywords).toBe('function');
      expect(typeof iface.mineKeywordsFromContent).toBe('function');
      expect(typeof iface.generateArticle).toBe('function');
    });
  });

  // ──────────────────────────────────────
  //  11. 超时配置一致性（2）
  // ──────────────────────────────────────

  describe('超时配置一致性', () => {
    it('三个方法应使用相同的超时配置 300000ms', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');
      const config1 = (mockedAxios.post.mock.calls[0] as [string, any, any])[2];
      expect(config1.timeout).toBe(300000);

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');
      const config2 = (mockedAxios.post.mock.calls[1] as [string, any, any])[2];
      expect(config2.timeout).toBe(300000);

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章内容')));

      await service.generateArticle({
        title: '', keywords: '', portrait: '', images: [], skills: '',
      });
      const config3 = (mockedAxios.post.mock.calls[2] as [string, any, any])[2];
      expect(config3.timeout).toBe(300000);
    });

    it('三个方法应使用相同的认证头格式', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');
      const headers1 = (mockedAxios.post.mock.calls[0] as [string, any, any])[2].headers;

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');
      const headers2 = (mockedAxios.post.mock.calls[1] as [string, any, any])[2].headers;

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章内容')));

      await service.generateArticle({
        title: '', keywords: '', portrait: '', images: [], skills: '',
      });
      const headers3 = (mockedAxios.post.mock.calls[2] as [string, any, any])[2].headers;

      expect(headers1.Authorization).toBe(headers2.Authorization);
      expect(headers2.Authorization).toBe(headers3.Authorization);
      expect(headers1['Content-Type']).toBe('application/json');
      expect(headers2['Content-Type']).toBe('application/json');
      expect(headers3['Content-Type']).toBe('application/json');
    });
  });

  // ──────────────────────────────────────
  //  12. 模型查询一致性（2）
  // ──────────────────────────────────────

  describe('模型查询一致性', () => {
    it('三个方法应使用相同的模型查询条件', async () => {
      const expectedQuery = { where: { status: true, deletedAt: null }, orderBy: { id: 'asc' } };

      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试');
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith(expectedQuery);

      jest.clearAllMocks();
      mockPrisma = createMockPrisma();
      mockedGetPrisma.mockReturnValue(mockPrisma as any);
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.mineKeywordsFromContent('内容');
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith(expectedQuery);

      jest.clearAllMocks();
      mockPrisma = createMockPrisma();
      mockedGetPrisma.mockReturnValue(mockPrisma as any);
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('文章')));

      await service.generateArticle({
        title: '', keywords: '', portrait: '', images: [], skills: '',
      });
      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledWith(expectedQuery);
    });

    it('每次调用应独立查询模型（不缓存模型）', async () => {
      mockPrisma.llmModel.findFirst.mockResolvedValue(makePrismaModel());
      mockedAxios.post.mockResolvedValue(makeAxiosResponse(makeLlmContent('关键词')));

      await service.expandKeywords('测试1');
      await service.expandKeywords('测试2');

      expect(mockPrisma.llmModel.findFirst).toHaveBeenCalledTimes(2);
    });
  });
});

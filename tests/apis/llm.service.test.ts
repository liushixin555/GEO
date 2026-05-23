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
  });
});

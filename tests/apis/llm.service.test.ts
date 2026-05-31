import { LlmServiceImpl } from '../../apis/service/impl/llm.service.impl';
import { getPrisma } from '../../apis/utils';
import { AgentLoopUtil } from '../../apis/utils/llm.utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('../../apis/utils/encryption.util', () => ({
  decryptApiKey: jest.fn((value: string) => value),
  isEncrypted: jest.fn(() => false),
}));

jest.mock('../../apis/utils/llm.utils', () => ({
  AgentLoopUtil: {
    run: jest.fn(),
  },
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedRun = AgentLoopUtil.run as jest.Mock;

describe('LlmServiceImpl.generateArticle', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('includes company and project background in the prompt', async () => {
    const prisma = {
      llmModel: {
        findFirst: jest.fn().mockResolvedValue({
          baseUrl: 'https://llm.example.com/',
          apiKey: 'api-key',
          modelName: 'model-a',
        }),
      },
      skills: {
        findMany: jest.fn().mockResolvedValue([]),
      },
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedRun.mockResolvedValue({ content: '# Article' });

    await new LlmServiceImpl().generateArticle({
      title: 'Title',
      keywords: 'keyword',
      portrait: 'reader',
      images: [],
      skills: '',
      companyName: 'Acme Technology Co., Ltd.',
      companyShortName: 'Acme',
      projectName: 'Growth Platform',
      projectShortName: 'GP',
    });

    expect(mockedRun).toHaveBeenCalledWith(expect.objectContaining({
      prompt: expect.stringContaining('公司与项目背景'),
    }));
    const prompt = mockedRun.mock.calls[0][0].prompt;
    expect(prompt).toContain('Acme Technology Co., Ltd.');
    expect(prompt).toContain('Acme');
    expect(prompt).toContain('Growth Platform');
    expect(prompt).toContain('GP');
  });
});

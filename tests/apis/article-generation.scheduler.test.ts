import { getPrisma } from '../../apis/utils';
import { createLlmService } from '../../apis/service';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('../../apis/service', () => ({
  createLlmService: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedCreateLlmService = createLlmService as jest.Mock;

describe('article generation scheduler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('passes company and project context to article generation', async () => {
    const generateArticle = jest.fn().mockResolvedValue('# Generated article');
    mockedCreateLlmService.mockReturnValue({ generateArticle });

    const prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([
          {
            id: 1,
            projectId: 10,
            title: 'Article title',
            keywords: 'geo',
            portrait: 'B2B buyer',
            skills: null,
            version: 1,
          },
        ]),
        update: jest.fn().mockResolvedValue({}),
      },
      articleVersion: {
        findFirst: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue({}),
      },
      project: {
        findFirst: jest.fn().mockResolvedValue({
          fullName: 'Growth Platform',
          shortName: 'GP',
          company: {
            fullName: 'Acme Technology Co., Ltd.',
            shortName: 'Acme',
          },
        }),
      },
      knowledgeBase: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      knowledgeImage: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    mockedGetPrisma.mockReturnValue(prisma);

    const { processNextGeneratingArticle } = await import('../../apis/scheduler/article-generation.scheduler');
    await processNextGeneratingArticle();

    expect(prisma.project.findFirst).toHaveBeenCalledWith({
      where: { id: 10, deletedAt: null },
      select: {
        fullName: true,
        shortName: true,
        company: {
          select: {
            fullName: true,
            shortName: true,
          },
        },
      },
    });
    expect(generateArticle).toHaveBeenCalledWith(expect.objectContaining({
      companyName: 'Acme Technology Co., Ltd.',
      companyShortName: 'Acme',
      projectName: 'Growth Platform',
      projectShortName: 'GP',
    }));
  });
});

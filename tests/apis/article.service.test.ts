import { ArticleServiceImpl } from '../../apis/service/impl/article.service.impl';
import { getPrisma } from '../../apis/utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;

function makeArticle(overrides: Record<string, unknown> = {}) {
  const now = new Date('2026-05-28T10:00:00Z');
  return {
    id: 1,
    projectId: 10,
    title: 'Pending article',
    articleType: null,
    writeMode: 'manual',
    keywords: null,
    portrait: null,
    images: null,
    skills: null,
    llmModelId: null,
    content: 'Article content',
    version: 1,
    status: 'pending_review',
    createdBy: 7,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    _count: { schedules: 0 },
    ...overrides,
  };
}

describe('ArticleServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('excludes failed generation articles from list by default', async () => {
    const prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    mockedGetPrisma.mockReturnValue(prisma);

    await new ArticleServiceImpl().list(10, 1, 12, {
      userId: 7,
      role: 'sysadmin',
    });

    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        projectId: 10,
        deletedAt: null,
        status: { not: 'generate_failed' },
      }),
    }));
    expect(prisma.article.count).toHaveBeenCalledWith({
      where: expect.objectContaining({
        status: { not: 'generate_failed' },
      }),
    });
  });

  test('does not list failed generation articles even when requested explicitly', async () => {
    const prisma = {
      article: {
        findMany: jest.fn().mockResolvedValue([]),
        count: jest.fn().mockResolvedValue(0),
      },
    };
    mockedGetPrisma.mockReturnValue(prisma);

    await new ArticleServiceImpl().list(10, 1, 12, {
      userId: 7,
      role: 'sysadmin',
    }, undefined, 'generate_failed');

    expect(prisma.article.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        status: { not: 'generate_failed' },
      }),
    }));
  });

  test('allows an author to approve their own pending article', async () => {
    const existing = makeArticle();
    const updated = makeArticle({ status: 'approved' });
    const tx = {
      article: {
        findFirst: jest.fn().mockResolvedValue(existing),
        update: jest.fn().mockResolvedValue(updated),
      },
    };
    const prisma = {
      $transaction: jest.fn(async (callback) => callback(tx)),
    };
    mockedGetPrisma.mockReturnValue(prisma);

    const result = await new ArticleServiceImpl().review(10, 1, true, {
      userId: 7,
      role: 'admin',
    });

    expect(result.status).toBe('approved');
    expect(tx.article.update).toHaveBeenCalledWith({
      where: { id: 1 },
      data: { status: 'approved' },
      include: { _count: { select: { schedules: { where: { deletedAt: null } } } } },
    });
  });
});

import { CitationDiagnosisServiceImpl } from '../../apis/service/impl/citation-diagnosis.service.impl';
import { getPrisma } from '../../apis/utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;

describe('CitationDiagnosisServiceImpl.listLedger', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns detection attempt status even when no citation model has matched', async () => {
    const lastDetectionAt = new Date('2026-07-05T06:06:25.420Z');
    const queryRaw = jest
      .fn()
      .mockResolvedValueOnce([
        {
          publishedAt: new Date('2026-07-03T10:08:21.360Z'),
          publishPlatform: '51CTO',
          articleId: 75,
          articleTitle: 'Published article',
          topicWords: 'GEO服务商推荐',
          articleType: 'ranking',
          publishChannelType: '第三方自媒体/新闻',
          publishLink: 'https://www.51cto.com/article/848418.html',
          publisher: 'Admin',
          status: 'published',
          citationModels: '',
          citationMatchCount: 0,
          detectionRunCount: 10,
          citationRecordCount: 12,
          lastDetectionAt,
        },
      ])
      .mockResolvedValueOnce([{ count: BigInt(1) }]);

    mockedGetPrisma.mockReturnValue({
      article: {
        findMany: jest.fn().mockResolvedValue([{ id: 75 }]),
      },
      $queryRaw: queryRaw,
    });

    const service = new CitationDiagnosisServiceImpl();
    const result = await service.listLedger({ page: 1, pageSize: 8 }, { role: 'sysadmin', userId: 1 });

    expect(result.list[0]).toMatchObject({
      article_id: 75,
      citation_models: [],
      citation_match_count: 0,
      detection_run_count: 10,
      citation_record_count: 12,
      last_detection_at: lastDetectionAt,
    });
  });
});

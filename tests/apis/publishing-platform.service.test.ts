import { PublishingPlatformServiceImpl } from '../../apis/service/impl/publishing-platform.service.impl';
import { getPrisma } from '../../apis/utils';
import { getRmToken, getAllRmResources } from '../../apis/utils/rmapi.utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('../../apis/utils/rmapi.utils', () => ({
  getRmToken: jest.fn(),
  getAllRmResources: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedGetRmToken = getRmToken as jest.Mock;
const mockedGetAllRmResources = getAllRmResources as jest.Mock;

describe('PublishingPlatformServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('syncs with the raw Ruanmeng password from system config', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { id: 1, configKey: 'ruanmeng_username', configValue: '18800000000' },
          { id: 2, configKey: 'ruanmeng_password', configValue: 'real-password' },
        ]),
      },
      publishingPlatform: {
        findMany: jest.fn().mockResolvedValue([]),
      },
      $transaction: jest.fn().mockResolvedValue([]),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedGetAllRmResources.mockResolvedValue([]);

    await new PublishingPlatformServiceImpl().syncFromSystemConfig();

    expect(mockedGetRmToken).toHaveBeenCalledWith({
      mobile: '18800000000',
      password: 'real-password',
    });
  });
});

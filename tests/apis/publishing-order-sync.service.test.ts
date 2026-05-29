import { PublishingOrderSyncServiceImpl } from '../../apis/service/impl/publishing-order-sync.service.impl';
import { getPrisma } from '../../apis/utils';
import { getRmOrderById, getRmToken } from '../../apis/utils/rmapi.utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('../../apis/utils/rmapi.utils', () => ({
  getRmToken: jest.fn(),
  getRmOrderById: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedGetRmToken = getRmToken as jest.Mock;
const mockedGetRmOrderById = getRmOrderById as jest.Mock;

describe('PublishingOrderSyncServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('syncs a Ruanmeng order status into local order record', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 7, rmOrderId: '260508112353572610' }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedGetRmOrderById.mockResolvedValue({
      success: true,
      status: 200,
      message: 'ok',
      data: [{
        order_id: '260508112353572610',
        status: 1,
        response_message: 'https://example.com/article',
        resource_name: 'Portal A',
      }],
    });

    const result = await new PublishingOrderSyncServiceImpl().syncOrderByRmOrderId('260508112353572610');

    expect(result.synced).toBe(1);
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  test('syncs all local processing orders', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([
        { id: 1, rmOrderId: 'A' },
        { id: 2, rmOrderId: 'B' },
      ]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedGetRmOrderById
      .mockResolvedValueOnce({ success: true, status: 200, data: [{ order_id: 'A', status: 0 }] })
      .mockResolvedValueOnce({ success: true, status: 200, data: [{ order_id: 'B', status: 2, response_message: 'failed' }] });

    const result = await new PublishingOrderSyncServiceImpl().syncAllPendingOrders();

    expect(result).toEqual({ scanned: 2, synced: 2, failed: 0 });
  });
});

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

  test('keeps polling recent orders without a public published link after status changes', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);

    await new PublishingOrderSyncServiceImpl().syncAllPendingOrders();

    const query = prisma.$queryRaw.mock.calls[0][0] as any;
    const sqlText = String(query.strings?.join(' ') ?? query);
    expect(sqlText).toContain('WHERE ppo.rm_status = 0');
    expect(sqlText).toContain('ppo.created_at');
    expect(sqlText).toContain('NOT EXISTS');
  });

  test('saves a public published URL from a completed Ruanmeng order', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 9, rmOrderId: 'RM-9', scheduleId: 19, articleId: 29, platformName: 'Portal B' }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedGetRmOrderById.mockResolvedValue({
      success: true,
      status: 200,
      data: [{
        order_id: 'RM-9',
        status: 4,
        response_message: 'published: https://example.com/final-article',
        resource_name: 'Portal B',
      }],
    });

    const result = await new PublishingOrderSyncServiceImpl().syncOrderByRmOrderId('RM-9');

    expect(result.synced).toBe(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(3);
  });

  test('cleans internal Ruanmeng manuscript links even when no public URL is available yet', async () => {
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      $queryRaw: jest.fn().mockResolvedValue([{ id: 10, rmOrderId: 'RM-10', scheduleId: 20, articleId: 30, platformName: 'Portal C' }]),
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedGetRmOrderById.mockResolvedValue({
      success: true,
      status: 200,
      data: [{
        order_id: 'RM-10',
        status: 4,
        response_message: 'https://i.ruan.net/manuscripts/',
        resource_name: 'Portal C',
      }],
    });

    const result = await new PublishingOrderSyncServiceImpl().syncOrderByRmOrderId('RM-10');

    expect(result.synced).toBe(1);
    expect(prisma.$executeRaw).toHaveBeenCalledTimes(2);
  });
});

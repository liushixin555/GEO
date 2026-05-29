import { PublishingExecutionServiceImpl } from '../../apis/service/impl/publishing-execution.service.impl';
import { getPrisma } from '../../apis/utils';
import { getRmToken, submitRmOrder } from '../../apis/utils/rmapi.utils';

jest.mock('../../apis/utils', () => ({
  getPrisma: jest.fn(),
}));

jest.mock('../../apis/utils/rmapi.utils', () => ({
  getRmToken: jest.fn(),
  submitRmOrder: jest.fn(),
}));

const mockedGetPrisma = getPrisma as jest.Mock;
const mockedGetRmToken = getRmToken as jest.Mock;
const mockedSubmitRmOrder = submitRmOrder as jest.Mock;

describe('PublishingExecutionServiceImpl', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('submits due pending schedules to Ruanmeng and marks them published', async () => {
    const schedule = {
      id: 10,
      platforms: ['软媒平台A'],
      article: {
        title: '审核通过的文章',
          content: '正文内容',
      },
    };
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      publishingSchedule: {
        findMany: jest.fn().mockResolvedValue([schedule]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      publishingPlatform: {
        findFirst: jest.fn().mockResolvedValue({ id: 9, rmResourceId: 12345 }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedSubmitRmOrder.mockResolvedValue({ success: true, message: 'ok', data: { order_id: 'RM-1' }, status: 200 });

    const result = await new PublishingExecutionServiceImpl().processDueSchedules(new Date('2026-05-28T10:00:00Z'));

    expect(result).toEqual({ processed: 1, succeeded: 1, failed: 0 });
    expect(prisma.publishingSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 10, status: 'pending', deletedAt: null },
      data: { status: 'publishing' },
    });
    expect(prisma.publishingSchedule.update).toHaveBeenCalledWith({
      where: { id: 10 },
      data: { status: 'published', rejectReason: null },
    });
    expect(mockedSubmitRmOrder).toHaveBeenCalledWith({
      token: 'rm-token',
      title: '审核通过的文章',
      content: '<p style="color:#000;text-indent:2em;line-height:1.8;margin:0 0 12px;">正文内容</p>',
      resource_id: 12345,
    });
    expect(prisma.$executeRaw).toHaveBeenCalled();
  });

  test('marks a schedule failed when Ruanmeng rejects the order', async () => {
    const schedule = {
      id: 20,
      platforms: ['软媒平台B'],
      article: {
        title: '将失败的文章',
        content: '正文内容',
      },
    };
    const prisma = {
      systemConfig: {
        findMany: jest.fn().mockResolvedValue([
          { configKey: 'ruanmeng_username', configValue: 'user-a' },
          { configKey: 'ruanmeng_password', configValue: 'pass-a' },
        ]),
      },
      publishingSchedule: {
        findMany: jest.fn().mockResolvedValue([schedule]),
        updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        update: jest.fn().mockResolvedValue({}),
      },
      publishingPlatform: {
        findFirst: jest.fn().mockResolvedValue({ id: 10, rmResourceId: 67890 }),
      },
      $executeRaw: jest.fn().mockResolvedValue(1),
    };
    mockedGetPrisma.mockReturnValue(prisma);
    mockedGetRmToken.mockResolvedValue('rm-token');
    mockedSubmitRmOrder.mockResolvedValue({ success: false, message: '余额不足', data: {}, status: 400 });

    const result = await new PublishingExecutionServiceImpl().processDueSchedules(new Date('2026-05-28T10:00:00Z'));

    expect(result).toEqual({ processed: 1, succeeded: 0, failed: 1 });
    expect(prisma.publishingSchedule.update).toHaveBeenCalledWith({
      where: { id: 20 },
      data: { status: 'publish_failed', rejectReason: '余额不足' },
    });
  });
});

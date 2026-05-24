/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

jest.mock('../../apis/utils/rmapi.utils', () => ({
  getRmToken: jest.fn(),
  getAllRmResources: jest.fn(),
}));

jest.mock('../../apis/service/impl/system-config.service.impl', () => {
  const mockGetAll = jest.fn();
  const mockBatchUpdate = jest.fn();
  return {
    SystemConfigServiceImpl: jest.fn(() => ({
      getAll: mockGetAll,
      batchUpdate: mockBatchUpdate,
    })),
    __mockGetAll: mockGetAll,
    __mockBatchUpdate: mockBatchUpdate,
  };
});

import { getPrisma } from '../../apis/utils/db.util';
import { getRmToken, getAllRmResources } from '../../apis/utils/rmapi.utils';
import { PublishingPlatformServiceImpl } from '../../apis/service/impl/publishing-platform.service.impl';

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { __mockGetAll } = require('../../apis/service/impl/system-config.service.impl') as {
  __mockGetAll: jest.Mock;
};

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;
const mockedGetRmToken = getRmToken as jest.MockedFunction<typeof getRmToken>;
const mockedGetAllRmResources = getAllRmResources as jest.MockedFunction<typeof getAllRmResources>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaPlatform(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    rmResourceId: 100,
    name: '新浪',
    taxonomy: '门户',
    price: 500,
    remark: '优质媒体',
    includeRate: 0.95,
    publishRate: 0.9,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function makeRmResource(overrides: Record<string, any> = {}) {
  return {
    id: 100,
    taxonomy: '门户',
    title_limit: 30,
    name: '新浪',
    price: 500,
    in_level: 1,
    url_type: ['https'],
    baidu: 1,
    remark: '优质媒体',
    url: 'https://sina.com.cn',
    case_url: 'https://example.com',
    include_rate: 0.95,
    publish_rate: 0.9,
    publish_type_name: null,
    price_market: 600,
    price_agenta: 550,
    price_agentb: 520,
    price_agentc: 500,
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('PublishingPlatformServiceImpl', () => {
  let service: PublishingPlatformServiceImpl;

  beforeEach(() => {
    service = new PublishingPlatformServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  syncFromRm()
  // ──────────────────────────────────────
  describe('syncFromRm', () => {
    it('should authenticate, fetch resources, and return count', async () => {
      const resources = [
        makeRmResource({ id: 1, name: '新浪' }),
        makeRmResource({ id: 2, name: '网易' }),
      ];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([makePrismaPlatform(), makePrismaPlatform()]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: {
          findMany: mockFindMany,
          deleteMany: mockDeleteMany,
          upsert: mockUpsert,
        },
        $transaction: mockTransaction,
      } as any);

      const result = await service.syncFromRm('13800000000', 'password123');

      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: '13800000000', password: 'password123' });
      expect(mockedGetAllRmResources).toHaveBeenCalledWith('test-token');
      expect(result).toBe(2);
    });

    it('should deduplicate resources by id', async () => {
      const resources = [
        makeRmResource({ id: 1, name: '新浪' }),
        makeRmResource({ id: 1, name: '新浪-重复' }),
        makeRmResource({ id: 2, name: '网易' }),
      ];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.syncFromRm('13800000000', 'password123');

      expect(result).toBe(2);
    });

    it('should delete stale records not in remote data', async () => {
      const resources = [makeRmResource({ id: 1 })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([
        { rmResourceId: 1 },
        { rmResourceId: 2 },
        { rmResourceId: 3 },
      ]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 2 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { rmResourceId: { in: [2, 3] } },
      });
    });

    it('should not delete any records when all remote ids exist locally', async () => {
      const resources = [makeRmResource({ id: 1 }), makeRmResource({ id: 2 })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([
        { rmResourceId: 1 },
        { rmResourceId: 2 },
      ]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      expect(mockDeleteMany).not.toHaveBeenCalled();
    });

    it('should batch delete when stale records exceed 30000', async () => {
      const resources = [makeRmResource({ id: 1 })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const staleIds = Array.from({ length: 35000 }, (_, i) => i + 100);
      const mockFindMany = jest.fn().mockResolvedValue(
        staleIds.map((id) => ({ rmResourceId: id })),
      );
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      // 35000 / 30000 = 2 batches (30000 + 5000)
      expect(mockDeleteMany).toHaveBeenCalledTimes(2);
      expect(mockDeleteMany).toHaveBeenNthCalledWith(1, {
        where: { rmResourceId: { in: staleIds.slice(0, 30000) } },
      });
      expect(mockDeleteMany).toHaveBeenNthCalledWith(2, {
        where: { rmResourceId: { in: staleIds.slice(30000, 35000) } },
      });
    });

    it('should upsert resources in batches of 500', async () => {
      const resources = Array.from({ length: 12 }, (_, i) =>
        makeRmResource({ id: i + 1, name: `Platform ${i + 1}` }),
      );
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      // $transaction should be called for each batch of 500
      expect(mockTransaction).toHaveBeenCalledTimes(1);
      // The transaction callback receives an array of 12 upsert operations
      const upsertOps = mockTransaction.mock.calls[0][0];
      expect(upsertOps).toHaveLength(12);
    });

    it('should handle multiple upsert batches when resources exceed 500', async () => {
      const resources = Array.from({ length: 1200 }, (_, i) =>
        makeRmResource({ id: i + 1, name: `Platform ${i + 1}` }),
      );
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      // 1200 / 500 = 3 batches (500 + 500 + 200)
      expect(mockTransaction).toHaveBeenCalledTimes(3);
      expect(mockTransaction.mock.calls[0][0]).toHaveLength(500);
      expect(mockTransaction.mock.calls[1][0]).toHaveLength(500);
      expect(mockTransaction.mock.calls[2][0]).toHaveLength(200);
    });

    it('should handle null remark in resources', async () => {
      const resources = [makeRmResource({ id: 1, remark: '' })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) => Promise.resolve(ops));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      // Empty remark should be converted to null
      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.remark).toBeNull();
      expect(upsertCall.update.remark).toBeNull();
    });

    it('should handle null include_rate and publish_rate', async () => {
      const resources = [makeRmResource({ id: 1, include_rate: null, publish_rate: null })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) => Promise.resolve(ops));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.create.includeRate).toBe(0);
      expect(upsertCall.create.publishRate).toBe(0);
      expect(upsertCall.update.includeRate).toBe(0);
      expect(upsertCall.update.publishRate).toBe(0);
    });

    it('should map resource fields correctly in upsert', async () => {
      const resource = makeRmResource({ id: 42, name: '腾讯', taxonomy: '综合', price: 800, remark: '测试备注', include_rate: 0.8, publish_rate: 0.7 });
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue([resource]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) => Promise.resolve(ops));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.syncFromRm('user', 'pass');

      const upsertCall = mockUpsert.mock.calls[0][0];
      expect(upsertCall.where).toEqual({ rmResourceId: 42 });
      expect(upsertCall.create).toEqual({
        rmResourceId: 42,
        name: '腾讯',
        taxonomy: '综合',
        price: 800,
        remark: '测试备注',
        includeRate: 0.8,
        publishRate: 0.7,
      });
      expect(upsertCall.update).toEqual({
        name: '腾讯',
        taxonomy: '综合',
        price: 800,
        remark: '测试备注',
        includeRate: 0.8,
        publishRate: 0.7,
      });
    });

    it('should return 0 when no resources fetched', async () => {
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue([]);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany },
      } as any);

      const result = await service.syncFromRm('user', 'pass');

      expect(result).toBe(0);
      // findMany still called to check for stale records
      expect(mockFindMany).toHaveBeenCalledWith({ select: { rmResourceId: true } });
    });

    it('should propagate authentication error from getRmToken', async () => {
      mockedGetRmToken.mockRejectedValue(new Error('rmapi 认证失败: 密码错误'));

      await expect(service.syncFromRm('user', 'wrong')).rejects.toThrow('rmapi 认证失败: 密码错误');
      expect(mockedGetAllRmResources).not.toHaveBeenCalled();
    });

    it('should propagate error from getAllRmResources', async () => {
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockRejectedValue(new Error('网络超时'));

      await expect(service.syncFromRm('user', 'pass')).rejects.toThrow('网络超时');
    });
  });

  // ──────────────────────────────────────
  //  listAll()
  // ──────────────────────────────────────
  describe('listAll', () => {
    it('should return all platforms ordered by taxonomy asc, name asc', async () => {
      const rows = [
        makePrismaPlatform({ id: 1, taxonomy: '门户', name: '新浪' }),
        makePrismaPlatform({ id: 2, taxonomy: '综合', name: '腾讯' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result).toHaveLength(2);
      expect(mockFindMany).toHaveBeenCalledWith({
        orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
      });
    });

    it('should map results via mapPublishingPlatform', async () => {
      const row = makePrismaPlatform({ id: 5, rmResourceId: 100, name: '网易', taxonomy: '门户', price: 300, remark: '备注', includeRate: 0.8, publishRate: 0.7 });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result[0]).toEqual({
        id: 5,
        rm_resource_id: 100,
        name: '网易',
        taxonomy: '门户',
        price: 300,
        remark: '备注',
        include_rate: 0.8,
        publish_rate: 0.7,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should return empty array when no platforms exist', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result).toHaveLength(0);
      expect(result).toEqual([]);
    });

    it('should handle null remark field', async () => {
      const row = makePrismaPlatform({ remark: null });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result[0].remark).toBeNull();
    });
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return paginated list with default sorting', async () => {
      const rows = [makePrismaPlatform({ id: 1 }), makePrismaPlatform({ id: 2 })];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(2);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(2);
      expect(result.total).toBe(2);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
          orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
          skip: 0,
          take: 10,
        }),
      );
    });

    it('should calculate skip correctly for page 2', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(2, 5);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 5, take: 5 }),
      );
    });

    it('should calculate skip correctly for page 3 with pageSize 20', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(3, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 40, take: 20 }),
      );
    });

    it('should filter by search on name and taxonomy', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '新浪');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '新浪', mode: 'insensitive' } },
              { taxonomy: { contains: '新浪', mode: 'insensitive' } },
            ],
          },
        }),
      );
    });

    it('should filter by taxonomy', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, '门户');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { taxonomy: '门户' },
        }),
      );
    });

    it('should combine search and taxonomy filters', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '新浪', '门户');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '新浪', mode: 'insensitive' } },
              { taxonomy: { contains: '新浪', mode: 'insensitive' } },
            ],
            taxonomy: '门户',
          },
        }),
      );
    });

    it('should not add search filter when search is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should not add taxonomy filter when taxonomy is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('taxonomy');
    });

    it('should sort by name asc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'name', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }],
        }),
      );
    });

    it('should sort by taxonomy desc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'taxonomy', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ taxonomy: 'desc' }],
        }),
      );
    });

    it('should sort by price desc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'price', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ price: 'desc' }],
        }),
      );
    });

    it('should sort by include_rate asc (mapped to includeRate)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'include_rate', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ includeRate: 'asc' }],
        }),
      );
    });

    it('should sort by publish_rate desc (mapped to publishRate)', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'publish_rate', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ publishRate: 'desc' }],
        }),
      );
    });

    it('should default to asc when sortOrder is not desc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'name', 'invalid');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ name: 'asc' }],
        }),
      );
    });

    it('should fall back to default sorting when sortBy is unrecognized', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, 'unknown_field', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
        }),
      );
    });

    it('should fall back to default sorting when sortBy is undefined', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, undefined, undefined, 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
        }),
      );
    });

    it('should return mapped platforms via mapPublishingPlatform', async () => {
      const row = makePrismaPlatform({
        id: 3,
        rmResourceId: 200,
        name: '搜狐',
        taxonomy: '门户',
        price: 400,
        remark: null,
        includeRate: 0.6,
        publishRate: 0.5,
        createdAt: new Date('2025-03-01'),
        updatedAt: new Date('2025-06-15'),
      });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      const mockCount = jest.fn().mockResolvedValue(1);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list[0]).toEqual({
        id: 3,
        rm_resource_id: 200,
        name: '搜狐',
        taxonomy: '门户',
        price: 400,
        remark: null,
        include_rate: 0.6,
        publish_rate: 0.5,
        created_at: expect.any(Date),
        updated_at: expect.any(Date),
      });
    });

    it('should return empty list when no platforms found', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(0);
      expect(result.total).toBe(0);
    });

    it('should run findMany and count in parallel', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10);

      // Both should have been called
      expect(mockFindMany).toHaveBeenCalledTimes(1);
      expect(mockCount).toHaveBeenCalledTimes(1);
      // count should receive same where clause as findMany
      expect(mockCount).toHaveBeenCalledWith({ where: {} });
    });

    it('should pass search filter to count as well', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '测试');

      const expectedWhere = {
        OR: [
          { name: { contains: '测试', mode: 'insensitive' } },
          { taxonomy: { contains: '测试', mode: 'insensitive' } },
        ],
      };
      expect(mockCount).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('should pass combined search + taxonomy filter to count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, '新浪', '门户');

      const expectedWhere = {
        OR: [
          { name: { contains: '新浪', mode: 'insensitive' } },
          { taxonomy: { contains: '新浪', mode: 'insensitive' } },
        ],
        taxonomy: '门户',
      };
      expect(mockCount).toHaveBeenCalledWith({ where: expectedWhere });
    });

    it('should pass taxonomy-only filter to count', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(1, 10, undefined, '综合');

      expect(mockCount).toHaveBeenCalledWith({ where: { taxonomy: '综合' } });
    });

    it('should handle page 1 with pageSize 1', async () => {
      const row = makePrismaPlatform({ id: 1 });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      const mockCount = jest.fn().mockResolvedValue(50);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 1);

      expect(result.list).toHaveLength(1);
      expect(result.total).toBe(50);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 }),
      );
    });

    it('should handle large page number correctly', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(1000);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await service.list(100, 20);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 1980, take: 20 }),
      );
    });

    it('should map multiple results correctly', async () => {
      const rows = [
        makePrismaPlatform({ id: 1, rmResourceId: 10, name: '新浪', taxonomy: '门户', price: 500, includeRate: 0.9, publishRate: 0.8 }),
        makePrismaPlatform({ id: 2, rmResourceId: 20, name: '网易', taxonomy: '门户', price: 300, includeRate: 0.7, publishRate: 0.6 }),
        makePrismaPlatform({ id: 3, rmResourceId: 30, name: '腾讯', taxonomy: '综合', price: 800, remark: 'VIP', includeRate: 0.95, publishRate: 0.85 }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      const mockCount = jest.fn().mockResolvedValue(3);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      const result = await service.list(1, 10);

      expect(result.list).toHaveLength(3);
      expect(result.total).toBe(3);
      expect(result.list[0].name).toBe('新浪');
      expect(result.list[1].name).toBe('网易');
      expect(result.list[2].name).toBe('腾讯');
      expect(result.list[2].remark).toBe('VIP');
    });
  });

  // ──────────────────────────────────────
  //  syncFromSystemConfig()
  // ──────────────────────────────────────
  describe('syncFromSystemConfig', () => {
    function setupSyncFromRmMocks() {
      const resources = [makeRmResource({ id: 1, name: '新浪' })];
      mockedGetRmToken.mockResolvedValue('test-token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([makePrismaPlatform()]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);
    }

    it('should sync platforms using system config credentials', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '13800000000' },
        { config_key: 'ruanmeng_password', config_value: 'password123' },
      ]);
      setupSyncFromRmMocks();

      const result = await service.syncFromSystemConfig();

      expect(__mockGetAll).toHaveBeenCalledTimes(1);
      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: '13800000000', password: 'password123' });
      expect(result).toBe(1);
    });

    it('should throw error when username is not configured', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_password', config_value: 'password123' },
      ]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should throw error when password is not configured', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '13800000000' },
      ]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should throw error when both username and password are missing', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'other_config', config_value: 'some_value' },
      ]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should throw error when config list is empty', async () => {
      __mockGetAll.mockResolvedValue([]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should propagate error from systemConfigService.getAll', async () => {
      __mockGetAll.mockRejectedValue(new Error('数据库连接失败'));

      await expect(service.syncFromSystemConfig()).rejects.toThrow('数据库连接失败');
    });

    it('should propagate error from syncFromRm', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '13800000000' },
        { config_key: 'ruanmeng_password', config_value: 'password123' },
      ]);
      mockedGetRmToken.mockRejectedValue(new Error('rmapi 认证失败: 密码错误'));

      await expect(service.syncFromSystemConfig()).rejects.toThrow('rmapi 认证失败: 密码错误');
    });

    it('should handle config values that are empty strings', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '' },
        { config_key: 'ruanmeng_password', config_value: 'password123' },
      ]);

      // Empty string is falsy, so it should throw
      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should handle username with empty password', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '13800000000' },
        { config_key: 'ruanmeng_password', config_value: '' },
      ]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
      expect(mockedGetRmToken).not.toHaveBeenCalled();
    });

    it('should correctly build config map from multiple configs', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'user1' },
        { config_key: 'ruanmeng_password', config_value: 'pass1' },
        { config_key: 'other_key1', config_value: 'other_value1' },
        { config_key: 'other_key2', config_value: 'other_value2' },
      ]);
      setupSyncFromRmMocks();

      const result = await service.syncFromSystemConfig();

      // Should correctly extract username/password despite other configs being present
      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: 'user1', password: 'pass1' });
      expect(result).toBe(1);
    });

    it('should use last value when duplicate config keys exist', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'old_user' },
        { config_key: 'ruanmeng_username', config_value: 'new_user' },
        { config_key: 'ruanmeng_password', config_value: 'password123' },
      ]);
      setupSyncFromRmMocks();

      await service.syncFromSystemConfig();

      // Map constructor with duplicate keys uses last value
      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: 'new_user', password: 'password123' });
    });
  });

  // ──────────────────────────────────────
  //  Constructor
  // ──────────────────────────────────────
  describe('constructor', () => {
    it('should create an instance of PublishingPlatformServiceImpl', () => {
      const svc = new PublishingPlatformServiceImpl();
      expect(svc).toBeInstanceOf(PublishingPlatformServiceImpl);
    });

    it('should create SystemConfigServiceImpl dependency', () => {
      const svc = new PublishingPlatformServiceImpl();
      expect(svc).toBeDefined();
    });
  });

  // ══════════════════════════════════════════
  //  TDD 第2轮——边界值 / 错误传播 / 鲁棒性
  // ══════════════════════════════════════════

  // ──────────────────────────────────────
  //  syncFromRm() 第2轮
  // ──────────────────────────────────────
  describe('syncFromRm – round 2', () => {
    function setupMocks(opts: { resources?: any[]; existingIds?: number[] } = {}) {
      const resources = opts.resources ?? [makeRmResource({ id: 1 })];
      mockedGetRmToken.mockResolvedValue('token');
      mockedGetAllRmResources.mockResolvedValue(resources);
      const mockFindMany = jest.fn().mockResolvedValue(
        (opts.existingIds ?? []).map((id) => ({ rmResourceId: id })),
      );
      const mockDeleteMany = jest.fn().mockResolvedValue({ count: 0 });
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaPlatform());
      const mockTransaction = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);
      return { mockFindMany, mockDeleteMany, mockUpsert, mockTransaction };
    }

    it('should propagate error from prisma findMany (stale check)', async () => {
      mockedGetRmToken.mockResolvedValue('token');
      mockedGetAllRmResources.mockResolvedValue([makeRmResource()]);
      const mockFindMany = jest.fn().mockRejectedValue(new Error('PG连接中断'));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: jest.fn(), upsert: jest.fn() },
        $transaction: jest.fn(),
      } as any);

      await expect(service.syncFromRm('u', 'p')).rejects.toThrow('PG连接中断');
    });

    it('should propagate error from prisma deleteMany', async () => {
      mockedGetRmToken.mockResolvedValue('token');
      mockedGetAllRmResources.mockResolvedValue([makeRmResource({ id: 1 })]);
      const mockFindMany = jest.fn().mockResolvedValue([{ rmResourceId: 99 }]);
      const mockDeleteMany = jest.fn().mockRejectedValue(new Error('删除超时'));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, deleteMany: mockDeleteMany, upsert: jest.fn() },
        $transaction: jest.fn(),
      } as any);

      await expect(service.syncFromRm('u', 'p')).rejects.toThrow('删除超时');
    });

    it('should propagate error from prisma $transaction', async () => {
      const { mockTransaction } = setupMocks();
      mockTransaction.mockRejectedValue(new Error('事务超时'));

      await expect(service.syncFromRm('u', 'p')).rejects.toThrow('事务超时');
    });

    it('should handle resource with undefined remark', async () => {
      const resource = makeRmResource({ id: 1 });
      delete resource.remark;
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.remark).toBeNull();
      expect(call.update.remark).toBeNull();
    });

    it('should handle resource with undefined include_rate and publish_rate', async () => {
      const resource = makeRmResource({ id: 1 });
      delete resource.include_rate;
      delete resource.publish_rate;
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.includeRate).toBe(0);
      expect(call.create.publishRate).toBe(0);
      expect(call.update.includeRate).toBe(0);
      expect(call.update.publishRate).toBe(0);
    });

    it('should handle resource with 0 price', async () => {
      const { mockUpsert, mockTransaction } = setupMocks({
        resources: [makeRmResource({ id: 1, price: 0 })],
      });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.price).toBe(0);
      expect(call.update.price).toBe(0);
    });

    it('should handle resource with negative price', async () => {
      const { mockUpsert, mockTransaction } = setupMocks({
        resources: [makeRmResource({ id: 1, price: -100 })],
      });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.price).toBe(-100);
    });

    it('should handle delete batch at exactly 30000 stale records', async () => {
      const staleIds = Array.from({ length: 30000 }, (_, i) => i + 100);
      const { mockDeleteMany } = setupMocks({ existingIds: staleIds });

      await service.syncFromRm('u', 'p');

      expect(mockDeleteMany).toHaveBeenCalledTimes(1);
      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { rmResourceId: { in: staleIds } },
      });
    });

    it('should handle delete batch at exactly 30001 stale records', async () => {
      const staleIds = Array.from({ length: 30001 }, (_, i) => i + 100);
      const { mockDeleteMany } = setupMocks({ existingIds: staleIds });

      await service.syncFromRm('u', 'p');

      expect(mockDeleteMany).toHaveBeenCalledTimes(2);
      expect(mockDeleteMany).toHaveBeenNthCalledWith(1, {
        where: { rmResourceId: { in: staleIds.slice(0, 30000) } },
      });
      expect(mockDeleteMany).toHaveBeenNthCalledWith(2, {
        where: { rmResourceId: { in: staleIds.slice(30000) } },
      });
    });

    it('should handle upsert batch at exactly 500 resources', async () => {
      const resources = Array.from({ length: 500 }, (_, i) => makeRmResource({ id: i + 1 }));
      const { mockTransaction } = setupMocks({ resources });

      await service.syncFromRm('u', 'p');

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockTransaction.mock.calls[0][0]).toHaveLength(500);
    });

    it('should handle upsert batch at exactly 501 resources', async () => {
      const resources = Array.from({ length: 501 }, (_, i) => makeRmResource({ id: i + 1 }));
      const { mockTransaction } = setupMocks({ resources });

      await service.syncFromRm('u', 'p');

      expect(mockTransaction).toHaveBeenCalledTimes(2);
      expect(mockTransaction.mock.calls[0][0]).toHaveLength(500);
      expect(mockTransaction.mock.calls[1][0]).toHaveLength(1);
    });

    it('should handle dedup with id=0', async () => {
      const resources = [
        makeRmResource({ id: 0, name: 'A' }),
        makeRmResource({ id: 0, name: 'B' }),
      ];
      setupMocks({ resources });

      const result = await service.syncFromRm('u', 'p');

      expect(result).toBe(1);
    });

    it('should handle all-duplicate resources', async () => {
      const resources = Array.from({ length: 5 }, () => makeRmResource({ id: 7 }));
      setupMocks({ resources });

      const result = await service.syncFromRm('u', 'p');

      expect(result).toBe(1);
    });

    it('should handle special characters in name and taxonomy', async () => {
      const resource = makeRmResource({ id: 1, name: '<script>alert("xss")</script>', taxonomy: '分类/测试&特殊' });
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.name).toBe('<script>alert("xss")</script>');
      expect(call.create.taxonomy).toBe('分类/测试&特殊');
    });

    it('should handle remark with whitespace-only string', async () => {
      const resource = makeRmResource({ id: 1, remark: '   ' });
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.remark).toBe('   ');
    });

    it('should handle resource with non-zero include_rate and publish_rate', async () => {
      const resource = makeRmResource({ id: 1, include_rate: 1.0, publish_rate: 0.99 });
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      const call = mockUpsert.mock.calls[0][0];
      expect(call.create.includeRate).toBe(1.0);
      expect(call.create.publishRate).toBe(0.99);
    });

    it('should handle single resource with no existing records', async () => {
      const { mockDeleteMany, mockTransaction } = setupMocks({
        resources: [makeRmResource({ id: 1 })],
        existingIds: [],
      });

      const result = await service.syncFromRm('u', 'p');

      expect(result).toBe(1);
      expect(mockDeleteMany).not.toHaveBeenCalled();
      expect(mockTransaction).toHaveBeenCalledTimes(1);
    });

    it('should handle all existing records being stale (full replace)', async () => {
      const { mockDeleteMany } = setupMocks({
        resources: [makeRmResource({ id: 900 })],
        existingIds: [1, 2, 3, 4, 5],
      });

      await service.syncFromRm('u', 'p');

      expect(mockDeleteMany).toHaveBeenCalledWith({
        where: { rmResourceId: { in: [1, 2, 3, 4, 5] } },
      });
    });

    it('should handle mixed dedup with multiple duplicate groups', async () => {
      const resources = [
        makeRmResource({ id: 1, name: 'A' }),
        makeRmResource({ id: 1, name: 'A-dup' }),
        makeRmResource({ id: 2, name: 'B' }),
        makeRmResource({ id: 2, name: 'B-dup' }),
        makeRmResource({ id: 3, name: 'C' }),
      ];
      setupMocks({ resources });

      const result = await service.syncFromRm('u', 'p');

      expect(result).toBe(3);
    });

    it('should return correct count after dedup (not raw count)', async () => {
      const resources = [
        makeRmResource({ id: 1 }),
        makeRmResource({ id: 1 }),
        makeRmResource({ id: 2 }),
        makeRmResource({ id: 2 }),
        makeRmResource({ id: 2 }),
      ];
      setupMocks({ resources });

      const result = await service.syncFromRm('u', 'p');

      expect(result).toBe(2);
    });

    it('should call getRmToken with exact parameters', async () => {
      setupMocks();

      await service.syncFromRm('13812345678', 'myPassword!@#');

      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: '13812345678', password: 'myPassword!@#' });
      expect(mockedGetRmToken).toHaveBeenCalledTimes(1);
    });

    it('should call getAllRmResources with the returned token', async () => {
      mockedGetRmToken.mockResolvedValue('my-special-token-xyz');
      mockedGetAllRmResources.mockResolvedValue([makeRmResource()]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue(makePrismaPlatform()),
        },
        $transaction: jest.fn().mockResolvedValue([]),
      } as any);

      await service.syncFromRm('u', 'p');

      expect(mockedGetAllRmResources).toHaveBeenCalledWith('my-special-token-xyz');
    });

    it('should pass correct where clause to upsert', async () => {
      const resource = makeRmResource({ id: 42 });
      const { mockUpsert, mockTransaction } = setupMocks({ resources: [resource] });
      mockTransaction.mockImplementation((ops: any[]) => Promise.resolve(ops));

      await service.syncFromRm('u', 'p');

      expect(mockUpsert).toHaveBeenCalledWith(
        expect.objectContaining({ where: { rmResourceId: 42 } }),
      );
    });
  });

  // ──────────────────────────────────────
  //  syncFromSystemConfig() 第2轮
  // ──────────────────────────────────────
  describe('syncFromSystemConfig – round 2', () => {
    function setupSyncMocks() {
      mockedGetRmToken.mockResolvedValue('token');
      mockedGetAllRmResources.mockResolvedValue([makeRmResource({ id: 1 })]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue(makePrismaPlatform()),
        },
        $transaction: jest.fn().mockResolvedValue([makePrismaPlatform()]),
      } as any);
    }

    it('should handle username with whitespace-only value (truthy, passes check)', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: '   ' },
        { config_key: 'ruanmeng_password', config_value: 'pass' },
      ]);
      setupSyncMocks();

      // Whitespace-only string is truthy in JS, so it passes the || check
      const result = await service.syncFromSystemConfig();
      expect(result).toBe(1);
    });

    it('should handle password with whitespace-only value', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'user' },
        { config_key: 'ruanmeng_password', config_value: '   ' },
      ]);

      // Whitespace-only is truthy so it passes the check
      setupSyncMocks();
      const result = await service.syncFromSystemConfig();
      expect(result).toBe(1);
    });

    it('should handle only username configured (password null)', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'user' },
        { config_key: 'ruanmeng_password', config_value: null },
      ]);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('请先配置软盟账号和密码');
    });

    it('should not call getRmToken when credentials missing', async () => {
      __mockGetAll.mockResolvedValue([]);

      try { await service.syncFromSystemConfig(); } catch {}

      expect(mockedGetRmToken).not.toHaveBeenCalled();
      expect(mockedGetAllRmResources).not.toHaveBeenCalled();
    });

    it('should pass credentials correctly with special characters', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'user@domain.com' },
        { config_key: 'ruanmeng_password', config_value: 'p@ss!w0rd#$%' },
      ]);
      setupSyncMocks();

      await service.syncFromSystemConfig();

      expect(mockedGetRmToken).toHaveBeenCalledWith({ mobile: 'user@domain.com', password: 'p@ss!w0rd#$%' });
    });

    it('should propagate error from syncFromRm during upsert phase', async () => {
      __mockGetAll.mockResolvedValue([
        { config_key: 'ruanmeng_username', config_value: 'u' },
        { config_key: 'ruanmeng_password', config_value: 'p' },
      ]);
      mockedGetRmToken.mockResolvedValue('token');
      mockedGetAllRmResources.mockResolvedValue([makeRmResource()]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: {
          findMany: jest.fn().mockResolvedValue([]),
          deleteMany: jest.fn().mockResolvedValue({ count: 0 }),
          upsert: jest.fn().mockResolvedValue(makePrismaPlatform()),
        },
        $transaction: jest.fn().mockRejectedValue(new Error('upsert事务失败')),
      } as any);

      await expect(service.syncFromSystemConfig()).rejects.toThrow('upsert事务失败');
    });
  });

  // ──────────────────────────────────────
  //  listAll() 第2轮
  // ──────────────────────────────────────
  describe('listAll – round 2', () => {
    it('should propagate database error', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('PG连接超时'));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      await expect(service.listAll()).rejects.toThrow('PG连接超时');
    });

    it('should handle platform with all zero numeric fields', async () => {
      const row = makePrismaPlatform({ price: 0, includeRate: 0, publishRate: 0, remark: null });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result[0].price).toBe(0);
      expect(result[0].include_rate).toBe(0);
      expect(result[0].publish_rate).toBe(0);
      expect(result[0].remark).toBeNull();
    });

    it('should handle platform with special characters in name', async () => {
      const row = makePrismaPlatform({ name: '<b>测试&媒体</b>', taxonomy: '分类/子类' });
      const mockFindMany = jest.fn().mockResolvedValue([row]);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result[0].name).toBe('<b>测试&媒体</b>');
      expect(result[0].taxonomy).toBe('分类/子类');
    });

    it('should map multiple platforms preserving order', async () => {
      const rows = [
        makePrismaPlatform({ id: 3, name: 'C平台', taxonomy: '综合' }),
        makePrismaPlatform({ id: 1, name: 'A平台', taxonomy: '门户' }),
        makePrismaPlatform({ id: 2, name: 'B平台', taxonomy: '门户' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(rows);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany },
      } as any);

      const result = await service.listAll();

      expect(result.map((p) => p.name)).toEqual(['C平台', 'A平台', 'B平台']);
    });
  });

  // ──────────────────────────────────────
  //  list() 第2轮
  // ──────────────────────────────────────
  describe('list – round 2', () => {
    function setupListMocks() {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);
      return { mockFindMany, mockCount };
    }

    it('should not add search filter for empty string', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, '');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('OR');
    });

    it('should not add taxonomy filter for empty string', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, '');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).not.toHaveProperty('taxonomy');
    });

    it('should not add filters for both empty strings', async () => {
      const { mockFindMany, mockCount } = setupListMocks();

      await service.list(1, 10, '', '');

      const where = mockFindMany.mock.calls[0][0].where;
      expect(where).toEqual({});
      expect(mockCount).toHaveBeenCalledWith({ where: {} });
    });

    it('should propagate findMany error', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('查询超时'));
      const mockCount = jest.fn().mockResolvedValue(0);
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list(1, 10)).rejects.toThrow('查询超时');
    });

    it('should propagate count error', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockRejectedValue(new Error('count失败'));
      mockedGetPrisma.mockReturnValue({
        publishingPlatform: { findMany: mockFindMany, count: mockCount },
      } as any);

      await expect(service.list(1, 10)).rejects.toThrow('count失败');
    });

    it('should sort by name desc explicitly', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, undefined, 'name', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ name: 'desc' }] }),
      );
    });

    it('should sort by price asc', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, undefined, 'price', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ price: 'asc' }] }),
      );
    });

    it('should sort by include_rate desc', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, undefined, 'include_rate', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ includeRate: 'desc' }] }),
      );
    });

    it('should sort by publish_rate asc', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, undefined, 'publish_rate', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ orderBy: [{ publishRate: 'asc' }] }),
      );
    });

    it('should handle page 0 with skip calculation (edge)', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(0, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: -10, take: 10 }),
      );
    });

    it('should handle all filters combined with sorting', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(2, 5, '测试', '门户', 'price', 'desc');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: '测试', mode: 'insensitive' } },
            { taxonomy: { contains: '测试', mode: 'insensitive' } },
          ],
          taxonomy: '门户',
        },
        orderBy: [{ price: 'desc' }],
        skip: 5,
        take: 5,
      });
    });

    it('should handle Chinese search characters', async () => {
      const { mockFindMany, mockCount } = setupListMocks();

      await service.list(1, 10, '新媒体');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '新媒体', mode: 'insensitive' } },
              { taxonomy: { contains: '新媒体', mode: 'insensitive' } },
            ],
          },
        }),
      );
      expect(mockCount).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: '新媒体', mode: 'insensitive' } },
            { taxonomy: { contains: '新媒体', mode: 'insensitive' } },
          ],
        },
      });
    });

    it('should handle taxonomy-only filter with sorting', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, undefined, '门户', 'name', 'asc');

      expect(mockFindMany).toHaveBeenCalledWith({
        where: { taxonomy: '门户' },
        orderBy: [{ name: 'asc' }],
        skip: 0,
        take: 10,
      });
    });

    it('should handle search-only with default sort', async () => {
      const { mockFindMany } = setupListMocks();

      await service.list(1, 10, '新浪');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {
            OR: [
              { name: { contains: '新浪', mode: 'insensitive' } },
              { taxonomy: { contains: '新浪', mode: 'insensitive' } },
            ],
          },
          orderBy: [{ taxonomy: 'asc' }, { name: 'asc' }],
        }),
      );
    });
  });
});

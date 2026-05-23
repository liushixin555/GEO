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

import { getPrisma } from '../../apis/utils/db.util';
import { getRmToken, getAllRmResources } from '../../apis/utils/rmapi.utils';
import { PublishingPlatformServiceImpl } from '../../apis/service/impl/publishing-platform.service.impl';

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
  });
});

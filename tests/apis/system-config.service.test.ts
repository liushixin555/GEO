/**
 * @jest-environment node
 */
process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import { getPrisma } from '../../apis/utils/db.util';
import { SystemConfigServiceImpl } from '../../apis/service/impl/system-config.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaSystemConfig(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    configKey: 'site_name',
    configValue: '薄云商机倍增服务',
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function makeMappedSystemConfig(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    config_key: 'site_name',
    config_value: '薄云商机倍增服务',
    created_at: new Date('2025-01-01'),
    updated_at: new Date('2025-06-01'),
    ...overrides,
  };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('SystemConfigServiceImpl', () => {
  let service: SystemConfigServiceImpl;

  beforeEach(() => {
    service = new SystemConfigServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  getAll()
  // ──────────────────────────────────────
  describe('getAll', () => {
    it('应返回所有系统配置项', async () => {
      const prismaItems = [
        makePrismaSystemConfig({ id: 1, configKey: 'site_name', configValue: '薄云商机倍增服务' }),
        makePrismaSystemConfig({ id: 2, configKey: 'max_articles', configValue: '100' }),
      ];
      const mockFindMany = jest.fn().mockResolvedValue(prismaItems);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll();

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeMappedSystemConfig({ id: 1, config_key: 'site_name', config_value: '薄云商机倍增服务' }));
      expect(result[1]).toEqual(makeMappedSystemConfig({ id: 2, config_key: 'max_articles', config_value: '100' }));
    });

    it('应按 id 升序排列', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      await service.getAll();

      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    });

    it('无配置项时应返回空数组', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll();

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('应正确映射所有字段（camelCase → snake_case）', async () => {
      const prismaItem = makePrismaSystemConfig({
        id: 42,
        configKey: 'contact_email',
        configValue: 'admin@example.com',
        createdAt: new Date('2025-03-15'),
        updatedAt: new Date('2025-07-20'),
      });
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll();

      expect(result[0]).toEqual({
        id: 42,
        config_key: 'contact_email',
        config_value: 'admin@example.com',
        created_at: new Date('2025-03-15'),
        updated_at: new Date('2025-07-20'),
      });
    });

    it('单条配置项时应正确返回', async () => {
      const prismaItem = makePrismaSystemConfig();
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].config_key).toBe('site_name');
      expect(result[0].config_value).toBe('薄云商机倍增服务');
    });

    it('Prisma 抛出异常时应向上传播', async () => {
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB connection lost'));

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      await expect(service.getAll()).rejects.toThrow('DB connection lost');
    });

    it('应调用 getPrisma 获取实例', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      await service.getAll();

      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);
    });
  });

  // ──────────────────────────────────────
  //  batchUpdate()
  // ──────────────────────────────────────
  describe('batchUpdate', () => {
    it('应批量更新多条配置', async () => {
      const prismaResults = [
        makePrismaSystemConfig({ id: 1, configKey: 'site_name', configValue: '新名称' }),
        makePrismaSystemConfig({ id: 2, configKey: 'max_articles', configValue: '200' }),
      ];
      const mockUpsert = jest.fn()
        .mockResolvedValueOnce(prismaResults[0])
        .mockResolvedValueOnce(prismaResults[1]);
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({
        configs: [
          { config_key: 'site_name', config_value: '新名称' },
          { config_key: 'max_articles', config_value: '200' },
        ],
      });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeMappedSystemConfig({ config_key: 'site_name', config_value: '新名称' }));
      expect(result[1]).toEqual(makeMappedSystemConfig({ id: 2, config_key: 'max_articles', config_value: '200' }));
    });

    it('应在事务中执行所有 upsert 操作', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.batchUpdate({
        configs: [
          { config_key: 'key1', config_value: 'val1' },
          { config_key: 'key2', config_value: 'val2' },
          { config_key: 'key3', config_value: 'val3' },
        ],
      });

      expect(mockTransaction).toHaveBeenCalledTimes(1);
      expect(mockUpsert).toHaveBeenCalledTimes(3);
    });

    it('应传递正确的 upsert 参数（where/update/create）', async () => {
      const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await service.batchUpdate({
        configs: [{ config_key: 'site_name', config_value: '更新值' }],
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { configKey: 'site_name' },
        update: { configValue: '更新值' },
        create: { configKey: 'site_name', configValue: '更新值' },
      });
    });

    it('空配置数组时应返回空数组', async () => {
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: jest.fn() },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({ configs: [] });

      expect(result).toEqual([]);
      expect(result).toHaveLength(0);
    });

    it('应正确映射结果中的所有字段', async () => {
      const prismaResult = makePrismaSystemConfig({
        id: 99,
        configKey: 'theme_color',
        configValue: '#FF5733',
        createdAt: new Date('2025-02-10'),
        updatedAt: new Date('2025-08-15'),
      });
      const mockUpsert = jest.fn().mockResolvedValue(prismaResult);
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({
        configs: [{ config_key: 'theme_color', config_value: '#FF5733' }],
      });

      expect(result[0]).toEqual({
        id: 99,
        config_key: 'theme_color',
        config_value: '#FF5733',
        created_at: new Date('2025-02-10'),
        updated_at: new Date('2025-08-15'),
      });
    });

    it('新配置应通过 create 创建', async () => {
      const prismaResult = makePrismaSystemConfig({
        id: 10,
        configKey: 'new_setting',
        configValue: 'enabled',
      });
      const mockUpsert = jest.fn().mockResolvedValue(prismaResult);
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({
        configs: [{ config_key: 'new_setting', config_value: 'enabled' }],
      });

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { configKey: 'new_setting' },
        update: { configValue: 'enabled' },
        create: { configKey: 'new_setting', configValue: 'enabled' },
      });
      expect(result[0].config_key).toBe('new_setting');
      expect(result[0].config_value).toBe('enabled');
    });

    it('事务失败时应向上传播错误', async () => {
      const mockTransaction = jest.fn().mockRejectedValue(new Error('Transaction failed'));

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: jest.fn() },
        $transaction: mockTransaction,
      } as any);

      await expect(
        service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] })
      ).rejects.toThrow('Transaction failed');
    });

    it('upsert 失败时应向上传播错误', async () => {
      const mockUpsert = jest.fn().mockRejectedValue(new Error('Upsert error'));
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      await expect(
        service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] })
      ).rejects.toThrow('Upsert error');
    });

    it('应调用 getPrisma 获取实例', async () => {
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: jest.fn().mockResolvedValue(makePrismaSystemConfig()) },
        $transaction: mockTransaction,
      } as any);

      await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] });

      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);
    });

    it('应处理单条配置更新', async () => {
      const prismaResult = makePrismaSystemConfig({ configKey: 'site_name', configValue: '唯一值' });
      const mockUpsert = jest.fn().mockResolvedValue(prismaResult);
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({
        configs: [{ config_key: 'site_name', config_value: '唯一值' }],
      });

      expect(result).toHaveLength(1);
      expect(result[0].config_value).toBe('唯一值');
    });
  });
});

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

const AUTH = { userId: 1, role: 'sysadmin' } as const;

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

      const result = await service.getAll(AUTH);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(makeMappedSystemConfig({ id: 1, config_key: 'site_name', config_value: '薄云商机倍增服务' }));
      expect(result[1]).toEqual(makeMappedSystemConfig({ id: 2, config_key: 'max_articles', config_value: '100' }));
    });

    it('应按 id 升序排列', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      await service.getAll(AUTH);

      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    });

    it('无配置项时应返回空数组', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll(AUTH);

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

      const result = await service.getAll(AUTH);

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

      const result = await service.getAll(AUTH);

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

      await expect(service.getAll(AUTH)).rejects.toThrow('DB connection lost');
    });

    it('应调用 getPrisma 获取实例', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      await service.getAll(AUTH);

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
      }, AUTH);

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
      }, AUTH);

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
      }, AUTH);

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

      const result = await service.batchUpdate({ configs: [] }, AUTH);

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
      }, AUTH);

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
      }, AUTH);

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
        service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH)
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
        service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH)
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

      await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH);

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
      }, AUTH);

      expect(result).toHaveLength(1);
      expect(result[0].config_value).toBe('唯一值');
    });

    it('应处理包含特殊字符的配置值', async () => {
      const specialValue = '<script>alert("xss")</script>&"\'\\n\\t';
      const prismaResult = makePrismaSystemConfig({ configKey: 'footer_html', configValue: specialValue });
      const mockUpsert = jest.fn().mockResolvedValue(prismaResult);
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({
        configs: [{ config_key: 'footer_html', config_value: specialValue }],
      }, AUTH);

      expect(mockUpsert).toHaveBeenCalledWith({
        where: { configKey: 'footer_html' },
        update: { configValue: specialValue },
        create: { configKey: 'footer_html', configValue: specialValue },
      });
      expect(result[0].config_value).toBe(specialValue);
    });

    it('应处理批量更新中部分 upsert 失败', async () => {
      const mockUpsert = jest.fn()
        .mockResolvedValueOnce(makePrismaSystemConfig({ configKey: 'key1', configValue: 'val1' }))
        .mockRejectedValueOnce(new Error('Partial failure'));
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.allSettled(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const results = await service.batchUpdate({
        configs: [
          { config_key: 'key1', config_value: 'val1' },
          { config_key: 'key2', config_value: 'val2' },
        ],
      }, AUTH);

      expect(mockUpsert).toHaveBeenCalledTimes(2);
      expect(results).toHaveLength(2);
    });

    it('应处理大量配置批量更新', async () => {
      const configs = Array.from({ length: 50 }, (_, i) => ({
        config_key: `key_${i}`,
        config_value: `value_${i}`,
      }));
      const mockUpsert = jest.fn().mockImplementation((args: any) =>
        Promise.resolve(makePrismaSystemConfig({
          configKey: args.where.configKey,
          configValue: args.update.configValue,
        }))
      );
      const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
        Promise.all(ops.map((op: any) => op))
      );

      mockedGetPrisma.mockReturnValue({
        systemConfig: { upsert: mockUpsert },
        $transaction: mockTransaction,
      } as any);

      const result = await service.batchUpdate({ configs }, AUTH);

      expect(result).toHaveLength(50);
      expect(mockUpsert).toHaveBeenCalledTimes(50);
    });
  });

  // ──────────────────────────────────────
  //  getAll() - 边界场景
  // ──────────────────────────────────────
  describe('getAll - 边界场景', () => {
    it('应处理包含特殊字符的配置值', async () => {
      const specialValue = '{"nested":"value","emoji":"🎉"}';
      const prismaItem = makePrismaSystemConfig({
        configKey: 'json_config',
        configValue: specialValue,
      });
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll(AUTH);

      expect(result[0].config_value).toBe(specialValue);
    });

    it('应处理大量配置项返回', async () => {
      const prismaItems = Array.from({ length: 100 }, (_, i) =>
        makePrismaSystemConfig({ id: i + 1, configKey: `key_${i}`, configValue: `val_${i}` })
      );
      const mockFindMany = jest.fn().mockResolvedValue(prismaItems);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll(AUTH);

      expect(result).toHaveLength(100);
      expect(result[0].config_key).toBe('key_0');
      expect(result[99].config_key).toBe('key_99');
    });

    it('应处理配置值为空字符串的情况', async () => {
      const prismaItem = makePrismaSystemConfig({ configKey: 'empty_val', configValue: '' });
      const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);

      mockedGetPrisma.mockReturnValue({
        systemConfig: { findMany: mockFindMany },
      } as any);

      const result = await service.getAll(AUTH);

      expect(result[0].config_value).toBe('');
    });
  });

  // ──────────────────────────────────────
  //  第2轮补全——错误类型验证 + 数据一致性 + 字符串边界 + 接口一致性
  // ──────────────────────────────────────
  describe('第2轮补全——健壮性与边界', () => {
    // --- 错误类型验证 ---
    describe('错误类型验证', () => {
      it('getAll DB异常时应抛出 Error 实例', async () => {
        const mockFindMany = jest.fn().mockRejectedValue(new Error('Connection refused'));
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        try {
          await service.getAll(AUTH);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.message).toBe('Connection refused');
        }
      });

      it('batchUpdate 事务异常时应抛出 Error 实例', async () => {
        const mockTransaction = jest.fn().mockRejectedValue(new Error('Deadlock detected'));
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        } as any);

        try {
          await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.message).toBe('Deadlock detected');
        }
      });

      it('batchUpdate upsert 异常时应抛出 Error 实例', async () => {
        const mockUpsert = jest.fn().mockRejectedValue(new Error('Unique constraint failed'));
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        try {
          await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e).toBeInstanceOf(Error);
          expect(e.message).toBe('Unique constraint failed');
        }
      });
    });

    // --- 数据一致性验证 ---
    describe('数据一致性验证', () => {
      it('getAll 返回的数据与 Prisma 原始数据一一对应', async () => {
        const prismaItems = [
          makePrismaSystemConfig({ id: 1, configKey: 'a', configValue: '1', createdAt: new Date('2025-01-01'), updatedAt: new Date('2025-02-01') }),
          makePrismaSystemConfig({ id: 2, configKey: 'b', configValue: '2', createdAt: new Date('2025-03-01'), updatedAt: new Date('2025-04-01') }),
          makePrismaSystemConfig({ id: 3, configKey: 'c', configValue: '3', createdAt: new Date('2025-05-01'), updatedAt: new Date('2025-06-01') }),
        ];
        const mockFindMany = jest.fn().mockResolvedValue(prismaItems);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);

        expect(result).toHaveLength(3);
        for (let i = 0; i < prismaItems.length; i++) {
          expect(result[i].id).toBe(prismaItems[i].id);
          expect(result[i].config_key).toBe(prismaItems[i].configKey);
          expect(result[i].config_value).toBe(prismaItems[i].configValue);
          expect(result[i].created_at).toBe(prismaItems[i].createdAt);
          expect(result[i].updated_at).toBe(prismaItems[i].updatedAt);
        }
      });

      it('batchUpdate 返回顺序应与输入顺序一致', async () => {
        const configs = [
          { config_key: 'z_key', config_value: 'z_val' },
          { config_key: 'a_key', config_value: 'a_val' },
          { config_key: 'm_key', config_value: 'm_val' },
        ];
        const mockUpsert = jest.fn().mockImplementation((args: any) =>
          Promise.resolve(makePrismaSystemConfig({
            configKey: args.where.configKey,
            configValue: args.update.configValue,
          })),
        );
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        const result = await service.batchUpdate({ configs }, AUTH);

        expect(result).toHaveLength(3);
        expect(result[0].config_key).toBe('z_key');
        expect(result[1].config_key).toBe('a_key');
        expect(result[2].config_key).toBe('m_key');
      });

      it('batchUpdate 每条 upsert 的 where/update/create 应使用对应输入的值', async () => {
        const configs = [
          { config_key: 'k1', config_value: 'v1' },
          { config_key: 'k2', config_value: 'v2' },
        ];
        const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        await service.batchUpdate({ configs }, AUTH);

        expect(mockUpsert).toHaveBeenCalledTimes(2);
        expect(mockUpsert).toHaveBeenNthCalledWith(1, {
          where: { configKey: 'k1' },
          update: { configValue: 'v1' },
          create: { configKey: 'k1', configValue: 'v1' },
        });
        expect(mockUpsert).toHaveBeenNthCalledWith(2, {
          where: { configKey: 'k2' },
          update: { configValue: 'v2' },
          create: { configKey: 'k2', configValue: 'v2' },
        });
      });
    });

    // --- 字符串边界 ---
    describe('字符串边界', () => {
      it('config_value 包含纯空格时应保留原样', async () => {
        const prismaItem = makePrismaSystemConfig({ configKey: 'spaces', configValue: '   ' });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].config_value).toBe('   ');
      });

      it('config_key 包含前后空格时应保留原样', async () => {
        const prismaItem = makePrismaSystemConfig({ configKey: '  spaced_key  ', configValue: 'val' });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].config_key).toBe('  spaced_key  ');
      });

      it('config_value 包含 Unicode 和 emoji 应正确处理', async () => {
        const unicodeValue = '你好世界🎉🚀日本語हिन्दी';
        const prismaItem = makePrismaSystemConfig({ configKey: 'unicode', configValue: unicodeValue });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].config_value).toBe(unicodeValue);
      });

      it('config_value 包含换行符和制表符应保留', async () => {
        const multilineValue = '第一行\n第二行\r\n第三行\t缩进';
        const prismaItem = makePrismaSystemConfig({ configKey: 'multiline', configValue: multilineValue });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].config_value).toBe(multilineValue);
      });

      it('config_value 为超长字符串（10000字符）应正确处理', async () => {
        const longValue = 'A'.repeat(10000);
        const prismaItem = makePrismaSystemConfig({ configKey: 'long', configValue: longValue });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].config_value).toBe(longValue);
        expect(result[0].config_value.length).toBe(10000);
      });

      it('batchUpdate 中 config_value 包含 SQL 注入字符串应原样传递', async () => {
        const sqlInjection = "'; DROP TABLE system_configs; --";
        const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig({ configValue: sqlInjection }));
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        const result = await service.batchUpdate({
          configs: [{ config_key: 'test_sql', config_value: sqlInjection }],
        }, AUTH);

        expect(mockUpsert).toHaveBeenCalledWith({
          where: { configKey: 'test_sql' },
          update: { configValue: sqlInjection },
          create: { configKey: 'test_sql', configValue: sqlInjection },
        });
        expect(result[0].config_value).toBe(sqlInjection);
      });
    });

    // --- 数值边界 ---
    describe('数值边界', () => {
      it('id 为 0 的配置项应正确映射', async () => {
        const prismaItem = makePrismaSystemConfig({ id: 0, configKey: 'zero_id' });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].id).toBe(0);
        expect(result[0].config_key).toBe('zero_id');
      });

      it('id 为极大值（Number.MAX_SAFE_INTEGER）应正确映射', async () => {
        const prismaItem = makePrismaSystemConfig({ id: Number.MAX_SAFE_INTEGER });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);
        expect(result[0].id).toBe(Number.MAX_SAFE_INTEGER);
      });

      it('batchUpdate 中新配置 id 自增应正确返回', async () => {
        const created = makePrismaSystemConfig({ id: 999, configKey: 'brand_new', configValue: 'new' });
        const mockUpsert = jest.fn().mockResolvedValue(created);
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        const result = await service.batchUpdate({
          configs: [{ config_key: 'brand_new', config_value: 'new' }],
        }, AUTH);

        expect(result[0].id).toBe(999);
        expect(result[0].config_key).toBe('brand_new');
      });
    });

    // --- mapSystemConfig 综合映射 ---
    describe('mapSystemConfig 综合映射', () => {
      it('所有字段使用默认值时应正确映射', async () => {
        const now = new Date();
        const prismaItem = {
          id: 1,
          configKey: 'default_key',
          configValue: 'default_value',
          createdAt: now,
          updatedAt: now,
        };
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);

        expect(result[0]).toEqual({
          id: 1,
          config_key: 'default_key',
          config_value: 'default_value',
          created_at: now,
          updated_at: now,
        });
      });

      it('Prisma 结果包含额外字段（如 deletedAt）时映射应忽略多余字段', async () => {
        const prismaItem = {
          ...makePrismaSystemConfig(),
          deletedAt: null,
        };
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);

        expect(result[0]).toEqual(makeMappedSystemConfig());
        expect((result[0] as any).deletedAt).toBeUndefined();
        expect((result[0] as any).deleted_at).toBeUndefined();
      });

      it('created_at 和 updated_at 应精确映射到毫秒', async () => {
        const preciseDate = new Date('2025-06-15T14:30:45.123Z');
        const prismaItem = makePrismaSystemConfig({ createdAt: preciseDate, updatedAt: preciseDate });
        const mockFindMany = jest.fn().mockResolvedValue([prismaItem]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = await service.getAll(AUTH);

        expect(result[0].created_at).toBe(preciseDate);
        expect(result[0].updated_at).toBe(preciseDate);
        expect(result[0].created_at.getTime()).toBe(preciseDate.getTime());
      });
    });

    // --- 事务行为深度验证 ---
    describe('事务行为深度验证', () => {
      it('batchUpdate 同一个 key 多次出现时每个都应调用 upsert', async () => {
        const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        await service.batchUpdate({
          configs: [
            { config_key: 'dup_key', config_value: 'val1' },
            { config_key: 'dup_key', config_value: 'val2' },
          ],
        }, AUTH);

        expect(mockUpsert).toHaveBeenCalledTimes(2);
        expect(mockUpsert).toHaveBeenNthCalledWith(1, {
          where: { configKey: 'dup_key' },
          update: { configValue: 'val1' },
          create: { configKey: 'dup_key', configValue: 'val1' },
        });
        expect(mockUpsert).toHaveBeenNthCalledWith(2, {
          where: { configKey: 'dup_key' },
          update: { configValue: 'val2' },
          create: { configKey: 'dup_key', configValue: 'val2' },
        });
      });

      it('batchUpdate 事务应接收 Promise 数组', async () => {
        const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) => {
          expect(Array.isArray(ops)).toBe(true);
          expect(ops.length).toBe(2);
          return Promise.all(ops.map((op: any) => op));
        });
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        await service.batchUpdate({
          configs: [
            { config_key: 'k1', config_value: 'v1' },
            { config_key: 'k2', config_value: 'v2' },
          ],
        }, AUTH);

        expect(mockTransaction).toHaveBeenCalledTimes(1);
      });

      it('batchUpdate 空 configs 时 $transaction 应接收空数组', async () => {
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) => {
          expect(ops).toEqual([]);
          return Promise.all(ops);
        });
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        } as any);

        const result = await service.batchUpdate({ configs: [] }, AUTH);
        expect(result).toEqual([]);
      });

      it('batchUpdate 中 Prisma 内部错误（P2002 唯一约束）应向上传播', async () => {
        const prismaError = new Error('Unique constraint failed');
        (prismaError as any).code = 'P2002';
        const mockUpsert = jest.fn().mockRejectedValue(prismaError);
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        try {
          await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH);
          fail('应抛出错误');
        } catch (e: any) {
          expect(e.code).toBe('P2002');
          expect(e.message).toContain('Unique constraint');
        }
      });
    });

    // --- 连续调用与实例独立性 ---
    describe('连续调用与实例独立性', () => {
      it('连续调用 getAll 两次应各自调用 getPrisma', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        await service.getAll(AUTH);
        await service.getAll(AUTH);

        expect(mockedGetPrisma).toHaveBeenCalledTimes(2);
        expect(mockFindMany).toHaveBeenCalledTimes(2);
      });

      it('不同的 service 实例应各自独立工作', async () => {
        const service2 = new SystemConfigServiceImpl();
        const mockFindMany = jest.fn().mockResolvedValue([makePrismaSystemConfig()]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result1 = await service.getAll(AUTH);
        const result2 = await service2.getAll();

        expect(result1).toEqual(result2);
        expect(mockedGetPrisma).toHaveBeenCalledTimes(2);
      });

      it('先 getAll 再 batchUpdate 应各自独立调用 getPrisma', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        const mockUpsert = jest.fn().mockResolvedValue(makePrismaSystemConfig());
        const mockTransaction = jest.fn().mockImplementation((ops: any[]) =>
          Promise.all(ops.map((op: any) => op)),
        );

        mockedGetPrisma.mockReturnValue({
          systemConfig: { findMany: mockFindMany, upsert: mockUpsert },
          $transaction: mockTransaction,
        } as any);

        await service.getAll(AUTH);
        await service.batchUpdate({ configs: [{ config_key: 'k', config_value: 'v' }] }, AUTH);

        expect(mockedGetPrisma).toHaveBeenCalledTimes(2);
      });
    });

    // --- 接口一致性 ---
    describe('接口一致性', () => {
      it('SystemConfigServiceImpl 应实现 ISystemConfigService 的所有方法', () => {
        expect(typeof service.getAll).toBe('function');
        expect(typeof service.batchUpdate).toBe('function');
      });

      it('getAll 方法签名应接受 1 个参数 (auth)', () => {
        expect(service.getAll.length).toBe(1);
      });

      it('batchUpdate 方法签名应接受 2 个参数 (request, auth)', () => {
        expect(service.batchUpdate.length).toBe(2);
      });

      it('getAll 应返回 Promise<SystemConfig[]>', async () => {
        const mockFindMany = jest.fn().mockResolvedValue([]);
        mockedGetPrisma.mockReturnValue({ systemConfig: { findMany: mockFindMany } } as any);

        const result = service.getAll(AUTH);
        expect(result).toBeInstanceOf(Promise);
        const resolved = await result;
        expect(Array.isArray(resolved)).toBe(true);
      });

      it('batchUpdate 应返回 Promise<SystemConfig[]>', async () => {
        const mockTransaction = jest.fn().mockResolvedValue([]);
        mockedGetPrisma.mockReturnValue({
          systemConfig: { upsert: jest.fn() },
          $transaction: mockTransaction,
        } as any);

        const result = service.batchUpdate({ configs: [] }, AUTH);
        expect(result).toBeInstanceOf(Promise);
        const resolved = await result;
        expect(Array.isArray(resolved)).toBe(true);
      });
    });
  });
});

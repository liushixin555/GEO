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
import { CompanyServiceImpl } from '../../apis/service/impl/company.service.impl';

const mockedGetPrisma = getPrisma as jest.MockedFunction<typeof getPrisma>;

// ══════════════════════════════════════════
//  Helpers
// ══════════════════════════════════════════

function makePrismaCompany(overrides: Record<string, any> = {}) {
  return {
    id: 1,
    shortName: 'ACME',
    fullName: 'ACME Corp',
    address: 'Beijing',
    contactPerson: 'Zhang San',
    contactPhone: '13800138000',
    status: true,
    createdAt: new Date('2025-01-01'),
    updatedAt: new Date('2025-06-01'),
    ...overrides,
  };
}

function makePrismaUser(id: number, role: 'admin' | 'view', cnName: string, username: string) {
  return { id, role, cnName, username };
}

// ══════════════════════════════════════════
//  Tests
// ══════════════════════════════════════════

describe('CompanyServiceImpl', () => {
  let service: CompanyServiceImpl;

  beforeEach(() => {
    service = new CompanyServiceImpl();
    jest.clearAllMocks();
  });

  // ──────────────────────────────────────
  //  list()
  // ──────────────────────────────────────
  describe('list', () => {
    it('should return all companies ordered by id asc', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaCompany({ id: 1, shortName: 'DEFAULT' }),
        makePrismaCompany({ id: 2, shortName: 'ACME' }),
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result[0].short_name).toBe('DEFAULT');
      expect(result[1].short_name).toBe('ACME');
      expect(mockFindMany).toHaveBeenCalledWith({ orderBy: { id: 'asc' } });
    });

    it('should return empty array when no companies exist', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(0);
      expect(Array.isArray(result)).toBe(true);
    });

    it('should return single company', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaCompany({ id: 1, shortName: 'ONLY' }),
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(1);
      expect(result[0].short_name).toBe('ONLY');
    });

    it('should correctly map all company fields', async () => {
      const date = new Date('2025-03-15');
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaCompany({
          id: 5, shortName: 'TEST', fullName: 'Test Co',
          address: 'Shanghai', contactPerson: 'Li', contactPhone: '111',
          status: false, createdAt: date, updatedAt: date,
        }),
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result[0]).toEqual({
        id: 5,
        short_name: 'TEST',
        full_name: 'Test Co',
        address: 'Shanghai',
        contact_person: 'Li',
        contact_phone: '111',
        status: false,
        created_at: date,
        updated_at: date,
      });
    });
  });

  // ──────────────────────────────────────
  //  getById()
  // ──────────────────────────────────────
  describe('getById', () => {
    it('should return company detail with operators and viewers', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 2 }));
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(10, 'admin', '张三', 'zhangsan'),
        makePrismaUser(11, 'admin', '王五', 'wangwu'),
        makePrismaUser(20, 'view', '李四', 'lisi'),
        makePrismaUser(21, 'view', '赵六', 'zhaoliu'),
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(2);

      expect(result.id).toBe(2);
      expect(result.short_name).toBe('ACME');
      expect(result.operator_ids).toEqual([10, 11]);
      expect(result.operators).toEqual([
        { id: 10, cn_name: '张三', username: 'zhangsan' },
        { id: 11, cn_name: '王五', username: 'wangwu' },
      ]);
      expect(result.viewer_ids).toEqual([20, 21]);
      expect(result.viewers).toEqual([
        { id: 20, cn_name: '李四', username: 'lisi' },
        { id: 21, cn_name: '赵六', username: 'zhaoliu' },
      ]);

      // Verify findMany query
      expect(mockFindMany).toHaveBeenCalledWith({
        where: { companyId: 2, status: true, role: { in: ['admin', 'view'] } },
        select: { id: true, role: true, cnName: true, username: true },
      });
    });

    it('should throw error when company not found', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      await expect(service.getById(999)).rejects.toThrow('公司不存在');
    });

    it('should return detail with only operators (no viewers)', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 3 }));
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(10, 'admin', '张三', 'zhangsan'),
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(3);

      expect(result.operator_ids).toEqual([10]);
      expect(result.operators).toEqual([{ id: 10, cn_name: '张三', username: 'zhangsan' }]);
      expect(result.viewer_ids).toEqual([]);
      expect(result.viewers).toEqual([]);
    });

    it('should return detail with only viewers (no operators)', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 4 }));
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(20, 'view', '李四', 'lisi'),
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(4);

      expect(result.operator_ids).toEqual([]);
      expect(result.operators).toEqual([]);
      expect(result.viewer_ids).toEqual([20]);
      expect(result.viewers).toEqual([{ id: 20, cn_name: '李四', username: 'lisi' }]);
    });

    it('should return detail with no users at all', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 5 }));
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(5);

      expect(result.operator_ids).toEqual([]);
      expect(result.operators).toEqual([]);
      expect(result.viewer_ids).toEqual([]);
      expect(result.viewers).toEqual([]);
    });
  });

  // ──────────────────────────────────────
  //  create()
  // ──────────────────────────────────────
  describe('create', () => {
    it('should create company and link operators and viewers', async () => {
      const request = {
        short_name: 'NEWCO',
        full_name: 'New Company Ltd',
        address: 'Shanghai',
        contact_person: 'Li Si',
        contact_phone: '13900139000',
        operator_ids: [10, 11],
        viewer_ids: [20, 21],
      };

      const mockCompany = makePrismaCompany({ id: 3, shortName: 'NEWCO' });

      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.id).toBe(3);
      expect(result.short_name).toBe('NEWCO');
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);

      // company.create called with correct data
      expect(mockTx.company.create).toHaveBeenCalledWith({
        data: {
          shortName: 'NEWCO',
          fullName: 'New Company Ltd',
          address: 'Shanghai',
          contactPerson: 'Li Si',
          contactPhone: '13900139000',
        },
      });

      // user.update called for all operators + viewers (4 total)
      expect(mockTx.user.update).toHaveBeenCalledTimes(4);
    });

    it('should create company without viewer_ids', async () => {
      const request = {
        short_name: 'SOLO',
        full_name: 'Solo Company',
        contact_person: 'Wu',
        contact_phone: '111',
        operator_ids: [10],
      };

      const mockCompany = makePrismaCompany({ id: 4, shortName: 'SOLO' });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.short_name).toBe('SOLO');
      // Only operator_ids update, no viewer_ids
      expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    });

    it('should create company with empty viewer_ids array', async () => {
      const request = {
        short_name: 'EMPTY',
        full_name: 'Empty Viewers',
        contact_person: 'Test',
        contact_phone: '222',
        operator_ids: [10],
        viewer_ids: [],
      };

      const mockCompany = makePrismaCompany({ id: 5, shortName: 'EMPTY' });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.short_name).toBe('EMPTY');
      // Only 1 operator update, no viewer updates (empty array)
      expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    });

    it('should handle address as null when not provided', async () => {
      const request = {
        short_name: 'NOADDR',
        full_name: 'No Address Co',
        contact_person: 'A',
        contact_phone: '333',
        operator_ids: [1],
      };

      const mockCompany = makePrismaCompany({ id: 6, shortName: 'NOADDR', address: null });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.create(request);

      expect(mockTx.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ address: null }),
      });
    });

    it('should link each viewer to the new company', async () => {
      const request = {
        short_name: 'V',
        full_name: 'V Co',
        contact_person: 'A',
        contact_phone: '444',
        operator_ids: [],
        viewer_ids: [30, 31, 32],
      };

      const mockCompany = makePrismaCompany({ id: 7 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.create(request);

      // 0 operators + 3 viewers = 3 user.update calls
      expect(mockTx.user.update).toHaveBeenCalledTimes(3);
    });
  });

  // ──────────────────────────────────────
  //  update()
  // ──────────────────────────────────────
  describe('update', () => {
    it('should update company info and relink users', async () => {
      const request = {
        short_name: 'ACME-UPD',
        full_name: 'ACME Corp Updated',
        address: 'Shanghai',
        contact_person: 'Wang Wu',
        contact_phone: '13700137000',
        operator_ids: [11, 12],
        viewer_ids: [21, 22],
      };

      const updatedCompany = makePrismaCompany({
        id: 2, shortName: 'ACME-UPD', fullName: 'ACME Corp Updated',
      });

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(updatedCompany) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.update(2, request);

      expect(result.short_name).toBe('ACME-UPD');
      expect(result.full_name).toBe('ACME Corp Updated');
    });

    it('should unlink previous admin and view users before relinking', async () => {
      const request = {
        short_name: 'X',
        full_name: 'X Co',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [10],
        viewer_ids: [20],
      };

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // updateMany called twice: once for admin, once for view
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
      expect(mockTx.user.updateMany).toHaveBeenNthCalledWith(1, {
        where: { companyId: 1, role: 'admin' },
        data: { companyId: null },
      });
      expect(mockTx.user.updateMany).toHaveBeenNthCalledWith(2, {
        where: { companyId: 1, role: 'view' },
        data: { companyId: null },
      });
    });

    it('should update without viewer_ids', async () => {
      const request = {
        short_name: 'NOVIEW',
        full_name: 'No Viewers',
        contact_person: 'A',
        contact_phone: '222',
        operator_ids: [10],
      };

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1, shortName: 'NOVIEW' })) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.update(1, request);

      expect(result.short_name).toBe('NOVIEW');
      // 2 updateMany (unlink admin + view) + 1 user.update (link operator) = 3 calls to user.update
      // Actually updateMany is on user.updateMany, update is on user.update
      // So user.update is called only for operator_ids
      expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    });

    it('should update with empty viewer_ids array', async () => {
      const request = {
        short_name: 'EV',
        full_name: 'Empty View',
        contact_person: 'A',
        contact_phone: '333',
        operator_ids: [10],
        viewer_ids: [],
      };

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // Only operator linked, no viewers (empty array)
      expect(mockTx.user.update).toHaveBeenCalledTimes(1);
    });

    it('should call company.update with correct data including null address', async () => {
      const request = {
        short_name: 'UPD',
        full_name: 'Updated Co',
        contact_person: 'B',
        contact_phone: '444',
        operator_ids: [5],
      };

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      expect(mockTx.company.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: {
          shortName: 'UPD',
          fullName: 'Updated Co',
          address: null,
          contactPerson: 'B',
          contactPhone: '444',
        },
      });
    });

    it('should link each viewer to the updated company', async () => {
      const request = {
        short_name: 'V',
        full_name: 'V Co',
        contact_person: 'A',
        contact_phone: '555',
        operator_ids: [10],
        viewer_ids: [30, 31],
      };

      const mockTx = {
        company: { update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })) },
        user: {
          updateMany: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // 1 operator + 2 viewers = 3 user.update calls
      expect(mockTx.user.update).toHaveBeenCalledTimes(3);
      // Check viewer updates specifically
      expect(mockTx.user.update).toHaveBeenNthCalledWith(2, {
        where: { id: 30 },
        data: { companyId: 1 },
      });
      expect(mockTx.user.update).toHaveBeenNthCalledWith(3, {
        where: { id: 31 },
        data: { companyId: 1 },
      });
    });
  });

  // ──────────────────────────────────────
  //  toggleStatus()
  // ──────────────────────────────────────
  describe('toggleStatus', () => {
    it('should enable company (set status to true)', async () => {
      const existing = makePrismaCompany({ id: 1, status: false });
      const updated = makePrismaCompany({ id: 1, status: true });

      const mockFindUnique = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique, update: mockUpdate },
      } as any);

      const result = await service.toggleStatus(1, true);

      expect(result.status).toBe(true);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: true },
      });
    });

    it('should disable company (set status to false)', async () => {
      const existing = makePrismaCompany({ id: 2, status: true });
      const updated = makePrismaCompany({ id: 2, status: false });

      const mockFindUnique = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique, update: mockUpdate },
      } as any);

      const result = await service.toggleStatus(2, false);

      expect(result.status).toBe(false);
      expect(mockUpdate).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { status: false },
      });
    });

    it('should throw error when company not found', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
      } as any);

      await expect(service.toggleStatus(999, true)).rejects.toThrow('公司不存在');
    });

    it('should return mapped company after toggle', async () => {
      const updated = makePrismaCompany({
        id: 3, shortName: 'MAPPED', status: false,
      });

      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 3 }));
      const mockUpdate = jest.fn().mockResolvedValue(updated);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique, update: mockUpdate },
      } as any);

      const result = await service.toggleStatus(3, false);

      expect(result.id).toBe(3);
      expect(result.short_name).toBe('MAPPED');
      expect(result.status).toBe(false);
    });
  });
});

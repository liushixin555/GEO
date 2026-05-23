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
    deletedAt: null,
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
      expect(mockFindMany).toHaveBeenCalledWith({ where: { deletedAt: null }, orderBy: { id: 'asc' } });
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
        deleted_at: null,
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
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
            { id: 11, role: 'admin', status: true },
            { id: 20, role: 'view', status: true },
            { id: 21, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
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

      // validateUserIds calls user.findMany
      expect(mockTx.user.findMany).toHaveBeenCalledTimes(1);

      // user.updateMany called twice: once for operators, once for viewers
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
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
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.short_name).toBe('SOLO');
      // Only operator_ids updateMany, no viewer_ids
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(1);
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
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.short_name).toBe('EMPTY');
      // Only 1 operator updateMany, no viewer updateMany (empty array)
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(1);
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
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
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
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 30, role: 'view', status: true },
            { id: 31, role: 'view', status: true },
            { id: 32, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.create(request);

      // 2 updateMany calls: 1 for operators (empty array still triggers call) + 1 for viewers
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [30, 31, 32] } },
        data: { companyId: 7 },
      });
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 2 })),
          update: jest.fn().mockResolvedValue(updatedCompany),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 11, role: 'admin', status: true },
            { id: 12, role: 'admin', status: true },
            { id: 21, role: 'view', status: true },
            { id: 22, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
            { id: 20, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // First updateMany: unlink all admin+view users in one call
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { companyId: 1, role: { in: ['admin', 'view'] } },
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1, shortName: 'NOVIEW' })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.update(1, request);

      expect(result.short_name).toBe('NOVIEW');
      // updateMany: 1 unlink + 1 link operator = 2 total
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // updateMany: 1 unlink + 1 link operator = 2 total (no viewer link since empty array)
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 5, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
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
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 10, role: 'admin', status: true },
            { id: 30, role: 'view', status: true },
            { id: 31, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // updateMany: 1 unlink + 1 link operators + 1 link viewers = 3 total
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(3);
      // Check viewer batch update
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [30, 31] } },
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

    it('should call findUnique with correct where clause', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 5 }));
      const mockUpdate = jest.fn().mockResolvedValue(makePrismaCompany({ id: 5, status: false }));
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique, update: mockUpdate },
      } as any);

      await service.toggleStatus(5, false);

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 5 } });
    });
  });

  // ──────────────────────────────────────
  //  Edge cases & parameter validation
  // ──────────────────────────────────────
  describe('Edge cases', () => {
    it('create: should link operators with correct companyId', async () => {
      const request = {
        short_name: 'A',
        full_name: 'A Co',
        contact_person: 'X',
        contact_phone: '111',
        operator_ids: [100, 200],
      };

      const mockCompany = makePrismaCompany({ id: 99 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 100, role: 'admin', status: true },
            { id: 200, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.create(request);

      // Batch updateMany for operators
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [100, 200] } },
        data: { companyId: 99 },
      });
    });

    it('create: should work with empty operator_ids and no viewer_ids', async () => {
      const request = {
        short_name: 'B',
        full_name: 'B Co',
        contact_person: 'Y',
        contact_phone: '222',
        operator_ids: [],
      };

      const mockCompany = makePrismaCompany({ id: 50 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: {
          findMany: jest.fn().mockResolvedValue([]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.id).toBe(50);
      // operator_ids is [] but service still calls updateMany with empty array
      // viewer_ids is undefined so no second call
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(1);
    });

    it('create: should preserve address when provided', async () => {
      const request = {
        short_name: 'C',
        full_name: 'C Co',
        address: ' Guangzhou',
        contact_person: 'Z',
        contact_phone: '333',
        operator_ids: [1],
      };

      const mockCompany = makePrismaCompany({ id: 60 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.create(request);

      expect(mockTx.company.create).toHaveBeenCalledWith({
        data: expect.objectContaining({ address: ' Guangzhou' }),
      });
    });

    it('update: should link operators with correct companyId', async () => {
      const request = {
        short_name: 'D',
        full_name: 'D Co',
        contact_person: 'W',
        contact_phone: '444',
        operator_ids: [50, 60],
        viewer_ids: [70],
      };

      const mockTx = {
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 10 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 10 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 50, role: 'admin', status: true },
            { id: 60, role: 'admin', status: true },
            { id: 70, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(10, request);

      // Batch updateMany for operators
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [50, 60] } },
        data: { companyId: 10 },
      });
      // Batch updateMany for viewers
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [70] } },
        data: { companyId: 10 },
      });
    });

    it('update: should preserve address when provided', async () => {
      const request = {
        short_name: 'E',
        full_name: 'E Co',
        address: 'Shenzhen',
        contact_person: 'A',
        contact_phone: '555',
        operator_ids: [1],
      };

      const mockTx = {
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      expect(mockTx.company.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({ address: 'Shenzhen' }),
      });
    });

    it('getById: should call findUnique with correct where clause', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 42 }));
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      await service.getById(42);

      expect(mockFindUnique).toHaveBeenCalledWith({ where: { id: 42 } });
    });
  });

  // ──────────────────────────────────────
  //  Additional edge cases & robustness
  // ──────────────────────────────────────
  describe('Additional robustness', () => {
    // --- list ---
    it('list: should return many companies with correct mapping', async () => {
      const companies = Array.from({ length: 50 }, (_, i) =>
        makePrismaCompany({ id: i + 1, shortName: `C${i + 1}` })
      );
      const mockFindMany = jest.fn().mockResolvedValue(companies);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(50);
      expect(result[0].short_name).toBe('C1');
      expect(result[49].short_name).toBe('C50');
    });

    // --- getById ---
    it('getById: should return full CompanyDetail structure', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 }));
      const mockFindMany = jest.fn().mockResolvedValue([
        makePrismaUser(1, 'admin', '管理员', 'admin1'),
        makePrismaUser(2, 'view', '查看者', 'viewer1'),
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(1);

      // Verify all Company fields are present
      expect(result).toHaveProperty('id');
      expect(result).toHaveProperty('short_name');
      expect(result).toHaveProperty('full_name');
      expect(result).toHaveProperty('address');
      expect(result).toHaveProperty('contact_person');
      expect(result).toHaveProperty('contact_phone');
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('created_at');
      expect(result).toHaveProperty('updated_at');
      expect(result).toHaveProperty('deleted_at');
      // Verify CompanyDetail fields
      expect(result).toHaveProperty('operator_ids');
      expect(result).toHaveProperty('operators');
      expect(result).toHaveProperty('viewer_ids');
      expect(result).toHaveProperty('viewers');
    });

    it('getById: should handle company with address null', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(
        makePrismaCompany({ id: 1, address: null })
      );
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(1);

      expect(result.address).toBeNull();
    });

    // --- create ---
    it('create: should handle viewer_ids undefined explicitly', async () => {
      const request = {
        short_name: 'NOVIEW',
        full_name: 'No Viewer Company',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [1],
        viewer_ids: undefined,
      };

      const mockCompany = makePrismaCompany({ id: 10 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request as any);

      expect(result.id).toBe(10);
      // Only operator updateMany, no viewer updateMany
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(1);
    });

    it('create: should propagate transaction error', async () => {
      const request = {
        short_name: 'ERR',
        full_name: 'Error Co',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [1],
      };

      const mockPrisma = {
        $transaction: jest.fn().mockRejectedValue(new Error('DB connection lost')),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await expect(service.create(request)).rejects.toThrow('DB connection lost');
    });

    it('create: should handle single operator correctly', async () => {
      const request = {
        short_name: 'SOLO',
        full_name: 'Solo Op',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [5],
      };

      const mockCompany = makePrismaCompany({ id: 20 });
      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 5, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.id).toBe(20);
      // Batch updateMany for single operator
      expect(mockTx.user.updateMany).toHaveBeenCalledWith({
        where: { id: { in: [5] } },
        data: { companyId: 20 },
      });
    });

    // --- update ---
    it('update: should handle viewer_ids undefined explicitly', async () => {
      const request = {
        short_name: 'UV',
        full_name: 'Undefined View',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [1],
        viewer_ids: undefined,
      };

      const mockTx = {
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.update(1, request as any);

      expect(result).toBeDefined();
      // updateMany: 1 unlink + 1 link operator = 2 total (no viewer since undefined)
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(2);
    });

    it('update: should propagate transaction error', async () => {
      const request = {
        short_name: 'ERR',
        full_name: 'Error Co',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [1],
      };

      const mockPrisma = {
        $transaction: jest.fn().mockRejectedValue(new Error('Transaction failed')),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await expect(service.update(1, request)).rejects.toThrow('Transaction failed');
    });

    it('update: should handle many operators and viewers', async () => {
      const request = {
        short_name: 'BIG',
        full_name: 'Big Co',
        contact_person: 'A',
        contact_phone: '111',
        operator_ids: [1, 2, 3, 4, 5],
        viewer_ids: [10, 11, 12, 13, 14, 15],
      };

      const mockTx = {
        company: {
          findUnique: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
          update: jest.fn().mockResolvedValue(makePrismaCompany({ id: 1 })),
        },
        user: {
          findMany: jest.fn().mockResolvedValue([
            { id: 1, role: 'admin', status: true },
            { id: 2, role: 'admin', status: true },
            { id: 3, role: 'admin', status: true },
            { id: 4, role: 'admin', status: true },
            { id: 5, role: 'admin', status: true },
            { id: 10, role: 'view', status: true },
            { id: 11, role: 'view', status: true },
            { id: 12, role: 'view', status: true },
            { id: 13, role: 'view', status: true },
            { id: 14, role: 'view', status: true },
            { id: 15, role: 'view', status: true },
          ]),
          updateMany: jest.fn().mockResolvedValue({}),
        },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      await service.update(1, request);

      // updateMany: 1 unlink + 1 link operators + 1 link viewers = 3 total (batch)
      expect(mockTx.user.updateMany).toHaveBeenCalledTimes(3);
    });

    // --- toggleStatus ---
    it('toggleStatus: should toggle to same status (no-op semantically)', async () => {
      const existing = makePrismaCompany({ id: 1, status: true });
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

    it('toggleStatus: should handle prisma update error', async () => {
      const existing = makePrismaCompany({ id: 1 });
      const mockFindUnique = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new Error('Update failed'));
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique, update: mockUpdate },
      } as any);

      await expect(service.toggleStatus(1, false)).rejects.toThrow('Update failed');
    });

    // --- Concurrency / multiple calls ---
    it('list: should call getPrisma once per invocation', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      await service.list();

      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);
    });

    it('getById: should call getPrisma once', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(makePrismaCompany());
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      await service.getById(1);

      expect(mockedGetPrisma).toHaveBeenCalledTimes(1);
    });
  });
});

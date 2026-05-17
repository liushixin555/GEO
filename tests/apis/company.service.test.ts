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

describe('CompanyService', () => {
  let service: CompanyServiceImpl;

  beforeEach(() => {
    service = new CompanyServiceImpl();
    jest.clearAllMocks();
  });

  describe('list', () => {
    it('should return all companies', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, shortName: 'DEFAULT', fullName: 'Default Company', address: null, contactPerson: 'System', contactPhone: '0000000000', createdAt: new Date(), updatedAt: new Date() },
        { id: 2, shortName: 'ACME', fullName: 'ACME Corp', address: 'Beijing', contactPerson: 'Zhang San', contactPhone: '13800138000', createdAt: new Date(), updatedAt: new Date() },
      ]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(2);
      expect(result[0].short_name).toBe('DEFAULT');
      expect(result[1].short_name).toBe('ACME');
    });

    it('should return empty array when no companies', async () => {
      const mockFindMany = jest.fn().mockResolvedValue([]);
      mockedGetPrisma.mockReturnValue({ company: { findMany: mockFindMany } } as any);

      const result = await service.list();

      expect(result).toHaveLength(0);
    });
  });

  describe('getById', () => {
    it('should return company detail with operator_ids and viewer_ids', async () => {
      const companyData = {
        id: 2, shortName: 'ACME', fullName: 'ACME Corp', address: 'Beijing',
        contactPerson: 'Zhang San', contactPhone: '13800138000',
        createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindUnique = jest.fn().mockResolvedValue(companyData);
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 10, role: 'admin', cnName: '张三', username: 'zhangsan' },
        { id: 11, role: 'admin', cnName: '王五', username: 'wangwu' },
        { id: 20, role: 'view', cnName: '李四', username: 'lisi' },
        { id: 21, role: 'view', cnName: '赵六', username: 'zhaoliu' },
      ]);
      mockedGetPrisma.mockReturnValue({
        company: { findUnique: mockFindUnique },
        user: { findMany: mockFindMany },
      } as any);

      const result = await service.getById(2);

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
    });

    it('should throw error when company not found', async () => {
      const mockFindUnique = jest.fn().mockResolvedValue(null);
      mockedGetPrisma.mockReturnValue({ company: { findUnique: mockFindUnique } } as any);

      await expect(service.getById(999)).rejects.toThrow('公司不存在');
    });
  });

  describe('create', () => {
    it('should create company and link users', async () => {
      const request = {
        short_name: 'NEWCO',
        full_name: 'New Company Ltd',
        address: 'Shanghai',
        contact_person: 'Li Si',
        contact_phone: '13900139000',
        operator_ids: [10, 11],
        viewer_ids: [20, 21],
      };

      const mockCompany = {
        id: 3, shortName: 'NEWCO', fullName: 'New Company Ltd',
        address: 'Shanghai', contactPerson: 'Li Si', contactPhone: '13900139000',
        createdAt: new Date(), updatedAt: new Date(),
      };

      const mockTx = {
        company: { create: jest.fn().mockResolvedValue(mockCompany) },
        user: { update: jest.fn().mockResolvedValue({}) },
      };
      const mockPrisma = {
        $transaction: jest.fn().mockImplementation(async (cb: any) => cb(mockTx)),
      };
      mockedGetPrisma.mockReturnValue(mockPrisma as any);

      const result = await service.create(request);

      expect(result.short_name).toBe('NEWCO');
      expect(result.id).toBe(3);
      expect(mockPrisma.$transaction).toHaveBeenCalledTimes(1);
    });
  });

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

      const updatedCompany = {
        id: 2, shortName: 'ACME-UPD', fullName: 'ACME Corp Updated',
        address: 'Shanghai', contactPerson: 'Wang Wu', contactPhone: '13700137000',
        createdAt: new Date(), updatedAt: new Date(),
      };

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
    });
  });
});

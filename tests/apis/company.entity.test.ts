/**
 * @jest-environment node
 */
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyDetail,
} from '../../apis/entity/company.entity';

describe('company.entity', () => {
  describe('Company interface', () => {
    it('should create a valid Company object with all required fields', () => {
      const company: Company = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        address: '北京市朝阳区',
        contact_person: '张三',
        contact_phone: '13800138000',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.id).toBe(1);
      expect(company.short_name).toBe('ACME');
      expect(company.full_name).toBe('ACME Corporation');
      expect(company.status).toBe(true);
    });

    it('should allow address to be null', () => {
      const company: Company = {
        id: 2,
        short_name: 'TEST',
        full_name: 'Test Company',
        address: null,
        contact_person: '李四',
        contact_phone: '13900139000',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.address).toBeNull();
    });

    it('should have all required timestamp fields', () => {
      const company: Company = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.created_at).toBeInstanceOf(Date);
      expect(company.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('CreateCompanyRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Company',
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [1, 2],
      };
      expect(req.short_name).toBe('NEW');
      expect(req.operator_ids).toEqual([1, 2]);
    });

    it('should include optional address field', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Company',
        address: '上海市浦东新区',
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [1],
      };
      expect(req.address).toBe('上海市浦东新区');
    });

    it('should include optional viewer_ids field', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Company',
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [1],
        viewer_ids: [3, 4],
      };
      expect(req.viewer_ids).toEqual([3, 4]);
    });

    it('should allow empty operator_ids array', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Company',
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [],
      };
      expect(req.operator_ids).toEqual([]);
    });
  });

  describe('UpdateCompanyRequest interface', () => {
    it('should create a valid request with all fields', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'UPD',
        full_name: 'Updated Company',
        address: '新地址',
        contact_person: '赵六',
        contact_phone: '13600136000',
        operator_ids: [1, 2, 3],
        viewer_ids: [4],
      };
      expect(req.short_name).toBe('UPD');
      expect(req.operator_ids).toHaveLength(3);
    });

    it('should allow viewer_ids to be undefined', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'UPD',
        full_name: 'Updated Company',
        contact_person: '赵六',
        contact_phone: '13600136000',
        operator_ids: [1],
      };
      expect(req.viewer_ids).toBeUndefined();
    });
  });

  describe('CompanyDetail interface', () => {
    it('should extend Company with operator and viewer details', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        address: '北京',
        contact_person: '张三',
        contact_phone: '13800138000',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [1, 2],
        operators: [
          { id: 1, cn_name: '运营者1', username: 'op1' },
          { id: 2, cn_name: '运营者2', username: 'op2' },
        ],
        viewer_ids: [3],
        viewers: [
          { id: 3, cn_name: '查看者1', username: 'viewer1' },
        ],
      };
      expect(detail.operator_ids).toEqual([1, 2]);
      expect(detail.operators).toHaveLength(2);
      expect(detail.operators[0].cn_name).toBe('运营者1');
      expect(detail.viewer_ids).toEqual([3]);
      expect(detail.viewers).toHaveLength(1);
    });

    it('should inherit all Company fields', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        address: null,
        contact_person: '张三',
        contact_phone: '13800138000',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [],
        operators: [],
        viewer_ids: [],
        viewers: [],
      };
      // Company fields
      expect(detail.id).toBe(1);
      expect(detail.short_name).toBe('ACME');
      // Extended fields
      expect(detail.operator_ids).toEqual([]);
      expect(detail.operators).toEqual([]);
    });

    it('should have correct shape for operator objects', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '用户', username: 'user1' }],
        viewer_ids: [],
        viewers: [],
      };
      const operator = detail.operators[0];
      expect(operator).toHaveProperty('id');
      expect(operator).toHaveProperty('cn_name');
      expect(operator).toHaveProperty('username');
    });
  });

  describe('Company interface - additional edge cases', () => {
    it('should allow status to be false', () => {
      const company: Company = {
        id: 99,
        short_name: 'DISABLED',
        full_name: 'Disabled Company',
        address: null,
        contact_person: '张三',
        contact_phone: '13800138000',
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.status).toBe(false);
    });

    it('should preserve all numeric id types', () => {
      const company: Company = {
        id: Number.MAX_SAFE_INTEGER,
        short_name: 'BIG',
        full_name: 'Big ID Company',
        address: null,
        contact_person: 'A',
        contact_phone: '1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should preserve exact field values including special characters', () => {
      const company: Company = {
        id: 1,
        short_name: 'A&B<Co>',
        full_name: 'Company "引号" & <tags>',
        address: "O'Brien's Office, Floor 5",
        contact_person: '李明（经理）',
        contact_phone: '+86-138-0000-0000',
        status: true,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-12-31T23:59:59Z'),
        deleted_at: null,
      };
      expect(company.short_name).toBe('A&B<Co>');
      expect(company.full_name).toBe('Company "引号" & <tags>');
      expect(company.address).toBe("O'Brien's Office, Floor 5");
      expect(company.contact_phone).toBe('+86-138-0000-0000');
      expect(company.created_at.getFullYear()).toBe(2026);
    });

    it('should allow empty string contact fields', () => {
      const company: Company = {
        id: 1,
        short_name: '',
        full_name: '',
        address: '',
        contact_person: '',
        contact_phone: '',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.short_name).toBe('');
      expect(company.address).toBe('');
    });

    it('should allow deleted_at to be a Date (soft-deleted)', () => {
      const deletedDate = new Date('2026-05-20T10:00:00Z');
      const company: Company = {
        id: 5,
        short_name: 'DELETED',
        full_name: 'Deleted Company',
        address: null,
        contact_person: 'A',
        contact_phone: '1',
        status: false,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-05-20T10:00:00Z'),
        deleted_at: deletedDate,
      };
      expect(company.deleted_at).toBeInstanceOf(Date);
      expect(company.deleted_at!.getFullYear()).toBe(2026);
    });

    it('should have exactly 10 fields', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(company)).toHaveLength(10);
    });

    it('should have correct field names', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(company).sort()).toEqual([
        'address', 'contact_person', 'contact_phone', 'created_at',
        'deleted_at', 'full_name', 'id', 'short_name', 'status', 'updated_at',
      ]);
    });

    it('should support id = 0', () => {
      const company: Company = {
        id: 0, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.id).toBe(0);
    });

    it('should preserve timestamp precision', () => {
      const createdAt = new Date('2026-05-24T08:30:45.123Z');
      const updatedAt = new Date('2026-05-24T15:45:30.456Z');
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: createdAt, updated_at: updatedAt, deleted_at: null,
      };
      expect(company.created_at.getMilliseconds()).toBe(123);
      expect(company.updated_at.getMilliseconds()).toBe(456);
    });

    it('should allow created_at before updated_at', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
        deleted_at: null,
      };
      expect(company.created_at.getTime()).toBeLessThan(company.updated_at.getTime());
    });

    it('should support very long full_name', () => {
      const longName = '超长公司名称'.repeat(100);
      const company: Company = {
        id: 1, short_name: 'LN', full_name: longName, address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.full_name.length).toBeGreaterThan(500);
    });

    it('should support unicode in all string fields', () => {
      const company: Company = {
        id: 1,
        short_name: '薄云',
        full_name: '薄云商机倍增服务',
        address: '北京市朝阳区🎉',
        contact_person: '张三',
        contact_phone: '+86-138-0000-0000',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.short_name).toBe('薄云');
      expect(company.address).toContain('🎉');
    });
  });

  describe('CreateCompanyRequest - additional edge cases', () => {
    it('should allow single operator_id', () => {
      const req: CreateCompanyRequest = {
        short_name: 'SOLO',
        full_name: 'Solo Operator Company',
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [42],
      };
      expect(req.operator_ids).toHaveLength(1);
      expect(req.operator_ids[0]).toBe(42);
    });

    it('should allow many operator_ids', () => {
      const req: CreateCompanyRequest = {
        short_name: 'BIG',
        full_name: 'Big Team Company',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: Array.from({ length: 100 }, (_, i) => i + 1),
      };
      expect(req.operator_ids).toHaveLength(100);
    });

    it('should allow viewer_ids with single element', () => {
      const req: CreateCompanyRequest = {
        short_name: 'V',
        full_name: 'Viewer Company',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
        viewer_ids: [99],
      };
      expect(req.viewer_ids).toEqual([99]);
    });

    it('should allow undefined viewer_ids (omitted)', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NV',
        full_name: 'No Viewers',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.viewer_ids).toBeUndefined();
    });

    it('should allow undefined address (omitted)', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NA',
        full_name: 'No Address',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.address).toBeUndefined();
    });

    it('should allow empty string address', () => {
      const req: CreateCompanyRequest = {
        short_name: 'EA',
        full_name: 'Empty Address',
        address: '',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.address).toBe('');
    });

    it('should support Chinese characters in all string fields', () => {
      const req: CreateCompanyRequest = {
        short_name: '薄云科技',
        full_name: '薄云商机倍增服务有限公司',
        address: '北京市朝阳区建国路88号',
        contact_person: '张三（技术总监）',
        contact_phone: '13800138000',
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      expect(req.short_name).toBe('薄云科技');
      expect(req.full_name).toBe('薄云商机倍增服务有限公司');
      expect(req.contact_person).toContain('张三');
    });

    it('should have correct field names when all fields present', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(Object.keys(req).sort()).toEqual([
        'address', 'contact_person', 'contact_phone', 'full_name',
        'operator_ids', 'short_name', 'viewer_ids',
      ]);
    });

    it('should have correct field names with required only', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(Object.keys(req).sort()).toEqual([
        'contact_person', 'contact_phone', 'full_name',
        'operator_ids', 'short_name',
      ]);
    });

    it('should have exactly 7 fields when all present', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(Object.keys(req)).toHaveLength(7);
    });

    it('should have 5 required fields', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [],
      };
      expect(Object.keys(req)).toHaveLength(5);
    });

    it('should allow duplicate operator_ids', () => {
      const req: CreateCompanyRequest = {
        short_name: 'DUP', full_name: 'Duplicate Ops',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1, 1, 2, 2],
      };
      expect(req.operator_ids).toEqual([1, 1, 2, 2]);
      expect(req.operator_ids).toHaveLength(4);
    });

    it('should allow duplicate viewer_ids', () => {
      const req: CreateCompanyRequest = {
        short_name: 'DV', full_name: 'Duplicate Viewers',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1],
        viewer_ids: [3, 3, 4],
      };
      expect(req.viewer_ids).toEqual([3, 3, 4]);
    });

    it('should allow operator_ids with large numbers', () => {
      const req: CreateCompanyRequest = {
        short_name: 'BIG', full_name: 'Big IDs',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [Number.MAX_SAFE_INTEGER],
        viewer_ids: [Number.MAX_SAFE_INTEGER - 1],
      };
      expect(req.operator_ids[0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should allow operator_ids with 0', () => {
      const req: CreateCompanyRequest = {
        short_name: 'Z', full_name: 'Zero ID',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [0],
      };
      expect(req.operator_ids[0]).toBe(0);
    });

    it('should allow viewer_ids as empty array', () => {
      const req: CreateCompanyRequest = {
        short_name: 'EV', full_name: 'Empty Viewers',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1],
        viewer_ids: [],
      };
      expect(req.viewer_ids).toEqual([]);
    });

    it('should allow very long short_name', () => {
      const longShortName = 'X'.repeat(200);
      const req: CreateCompanyRequest = {
        short_name: longShortName,
        full_name: 'Long Short Name Company',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.short_name.length).toBe(200);
    });

    it('should allow address with special characters', () => {
      const req: CreateCompanyRequest = {
        short_name: 'SP', full_name: 'Special Address',
        address: 'Room 101, Floor 5&6, "Tower A" <Block B>',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.address).toContain('&');
      expect(req.address).toContain('"');
      expect(req.address).toContain('<');
    });
  });

  describe('UpdateCompanyRequest - additional edge cases', () => {
    it('should have same required fields as CreateCompanyRequest', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'UPD',
        full_name: 'Updated Company',
        contact_person: '赵六',
        contact_phone: '13600136000',
        operator_ids: [10, 20],
      };
      expect(req.short_name).toBe('UPD');
      expect(req.full_name).toBe('Updated Company');
      expect(req.contact_person).toBe('赵六');
      expect(req.contact_phone).toBe('13600136000');
      expect(req.operator_ids).toEqual([10, 20]);
    });

    it('should allow optional fields to be provided', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'U',
        full_name: 'U Corp',
        address: '深圳市南山区',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
        viewer_ids: [2, 3],
      };
      expect(req.address).toBe('深圳市南山区');
      expect(req.viewer_ids).toEqual([2, 3]);
    });

    it('should allow empty viewer_ids array', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'U',
        full_name: 'U Corp',
        contact_person: 'A',
        contact_phone: '1',
        operator_ids: [1],
        viewer_ids: [],
      };
      expect(req.viewer_ids).toEqual([]);
    });

    it('should allow replacing all fields simultaneously', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'Completely New Name',
        address: '广州市天河区',
        contact_person: '新接口人',
        contact_phone: '15900159000',
        operator_ids: [10, 20, 30],
        viewer_ids: [40, 50],
      };
      expect(req).toMatchObject({
        short_name: 'NEW',
        full_name: 'Completely New Name',
        address: '广州市天河区',
        contact_person: '新接口人',
        contact_phone: '15900159000',
      });
      expect(req.operator_ids).toHaveLength(3);
      expect(req.viewer_ids).toHaveLength(2);
    });

    it('should have exactly 7 fields when all present', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(Object.keys(req)).toHaveLength(7);
    });

    it('should have correct field names with required only', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(Object.keys(req).sort()).toEqual([
        'contact_person', 'contact_phone', 'full_name',
        'operator_ids', 'short_name',
      ]);
    });

    it('should allow empty operator_ids array (clear operators)', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'U', full_name: 'U Corp',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [],
      };
      expect(req.operator_ids).toEqual([]);
    });

    it('should allow undefined address (omitted)', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'U', full_name: 'U Corp',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.address).toBeUndefined();
    });

    it('should have same structure as CreateCompanyRequest', () => {
      const createReq: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      const updateReq: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(Object.keys(createReq).sort()).toEqual(Object.keys(updateReq).sort());
    });

    it('should allow duplicate operator_ids', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'D', full_name: 'Dup Ops',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1, 1, 2],
        viewer_ids: [3, 3],
      };
      expect(req.operator_ids).toEqual([1, 1, 2]);
      expect(req.viewer_ids).toEqual([3, 3]);
    });

    it('should allow operator_ids with large numbers', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'B', full_name: 'Big',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [Number.MAX_SAFE_INTEGER],
        viewer_ids: [Number.MAX_SAFE_INTEGER - 1],
      };
      expect(req.operator_ids[0]).toBe(Number.MAX_SAFE_INTEGER);
      expect(req.viewer_ids![0]).toBe(Number.MAX_SAFE_INTEGER - 1);
    });

    it('should support Chinese characters in all fields', () => {
      const req: UpdateCompanyRequest = {
        short_name: '薄云',
        full_name: '薄云商机倍增服务有限公司',
        address: '深圳市南山区科技园',
        contact_person: '李四（运营经理）',
        contact_phone: '+86-755-12345678',
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      expect(req.short_name).toBe('薄云');
      expect(req.full_name).toContain('薄云');
      expect(req.address).toContain('南山区');
    });
  });

  describe('CompanyDetail interface - additional edge cases', () => {
    it('should allow empty operators and viewers arrays', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'EMPTY',
        full_name: 'Empty Detail Company',
        address: null,
        contact_person: 'A',
        contact_phone: '1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [],
        operators: [],
        viewer_ids: [],
        viewers: [],
      };
      expect(detail.operator_ids).toHaveLength(0);
      expect(detail.operators).toHaveLength(0);
      expect(detail.viewer_ids).toHaveLength(0);
      expect(detail.viewers).toHaveLength(0);
    });

    it('should support many operators and viewers', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'BIG',
        full_name: 'Big Team',
        address: '北京',
        contact_person: 'A',
        contact_phone: '1',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [1, 2, 3, 4, 5],
        operators: [
          { id: 1, cn_name: '运营1', username: 'op1' },
          { id: 2, cn_name: '运营2', username: 'op2' },
          { id: 3, cn_name: '运营3', username: 'op3' },
          { id: 4, cn_name: '运营4', username: 'op4' },
          { id: 5, cn_name: '运营5', username: 'op5' },
        ],
        viewer_ids: [10, 11],
        viewers: [
          { id: 10, cn_name: '查看1', username: 'vw1' },
          { id: 11, cn_name: '查看2', username: 'vw2' },
        ],
      };
      expect(detail.operator_ids).toHaveLength(5);
      expect(detail.operators).toHaveLength(5);
      expect(detail.viewer_ids).toHaveLength(2);
      expect(detail.viewers).toHaveLength(2);
    });

    it('should preserve viewer object shape (id, cn_name, username)', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [],
        operators: [],
        viewer_ids: [100],
        viewers: [{ id: 100, cn_name: '查看者', username: 'viewer100' }],
      };
      const viewer = detail.viewers[0];
      expect(viewer).toHaveProperty('id', 100);
      expect(viewer).toHaveProperty('cn_name', '查看者');
      expect(viewer).toHaveProperty('username', 'viewer100');
    });

    it('should include address when not null', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: '上海市浦东新区陆家嘴',
        contact_person: 'C',
        contact_phone: 'D',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [],
        operators: [],
        viewer_ids: [],
        viewers: [],
      };
      expect(detail.address).toBe('上海市浦东新区陆家嘴');
    });

    it('should correctly extend Company with additional fields only', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: 'OP', username: 'op' }],
        viewer_ids: [2],
        viewers: [{ id: 2, cn_name: 'VW', username: 'vw' }],
      };
      // Verify all Company base fields exist
      const baseKeys = ['id', 'short_name', 'full_name', 'address', 'contact_person', 'contact_phone', 'status', 'created_at', 'updated_at', 'deleted_at'];
      for (const key of baseKeys) {
        expect(detail).toHaveProperty(key);
      }
      // Verify extended fields
      expect(detail).toHaveProperty('operator_ids');
      expect(detail).toHaveProperty('operators');
      expect(detail).toHaveProperty('viewer_ids');
      expect(detail).toHaveProperty('viewers');
    });

    it('should support operator_ids and viewer_ids containing same id', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '双角色', username: 'dual' }],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '双角色', username: 'dual' }],
      };
      expect(detail.operator_ids).toContain(1);
      expect(detail.viewer_ids).toContain(1);
    });

    it('should have exactly 14 fields (10 Company + 4 extended)', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect(Object.keys(detail)).toHaveLength(14);
    });

    it('should support deleted_at as Date in CompanyDetail', () => {
      const deletedDate = new Date('2026-05-20T10:00:00Z');
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: false,
        created_at: new Date(), updated_at: new Date(), deleted_at: deletedDate,
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect(detail.deleted_at).toBeInstanceOf(Date);
    });

    it('should support operators with special characters in cn_name', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '张三<经理>&"总监"', username: 'op1' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.operators[0].cn_name).toContain('<经理>');
      expect(detail.operators[0].cn_name).toContain('&');
    });

    it('should support operators with empty string cn_name and username', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '', username: '' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.operators[0].cn_name).toBe('');
      expect(detail.operators[0].username).toBe('');
    });

    it('should support viewer with unicode username', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
        operator_ids: [],
        operators: [],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '查看者🎉', username: 'viewer_测试' }],
      };
      expect(detail.viewers[0].cn_name).toContain('🎉');
      expect(detail.viewers[0].username).toContain('测试');
    });

    it('should support operator/viewer count mismatch (ids more than objects)', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
        operator_ids: [1, 2, 3],
        operators: [{ id: 1, cn_name: 'O1', username: 'op1' }],
        viewer_ids: [10, 11],
        viewers: [{ id: 10, cn_name: 'V1', username: 'vw1' }],
      };
      expect(detail.operator_ids).toHaveLength(3);
      expect(detail.operators).toHaveLength(1);
      expect(detail.viewer_ids).toHaveLength(2);
      expect(detail.viewers).toHaveLength(1);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe('A');
    });

    it('should re-export Company from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.Company).toBeUndefined(); // interface, not runtime value
    });

    it('should re-export CreateCompanyRequest from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.CreateCompanyRequest).toBeUndefined();
    });

    it('should re-export UpdateCompanyRequest from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.UpdateCompanyRequest).toBeUndefined();
    });

    it('should re-export CompanyDetail from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.CompanyDetail).toBeUndefined();
    });
  });

  describe('cross-interface integration', () => {
    it('CreateCompanyRequest fields can seed a Company', () => {
      const req: CreateCompanyRequest = {
        short_name: '薄云科技',
        full_name: '薄云商机倍增服务有限公司',
        address: '深圳市南山区',
        contact_person: '张三',
        contact_phone: '13800138000',
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      const company: Company = {
        id: 1,
        short_name: req.short_name,
        full_name: req.full_name,
        address: req.address ?? null,
        contact_person: req.contact_person,
        contact_phone: req.contact_phone,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.short_name).toBe(req.short_name);
      expect(company.full_name).toBe(req.full_name);
      expect(company.address).toBe('深圳市南山区');
    });

    it('CreateCompanyRequest with undefined address maps to null in Company', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [],
      };
      const company: Company = {
        id: 1, short_name: req.short_name, full_name: req.full_name,
        address: req.address ?? null,
        contact_person: req.contact_person,
        contact_phone: req.contact_phone,
        status: true, created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.address).toBeNull();
    });

    it('UpdateCompanyRequest fields can partially update a Company', () => {
      const original: Company = {
        id: 1, short_name: 'OLD', full_name: 'Old Name',
        address: '旧地址', contact_person: '旧联系人',
        contact_phone: '111', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const req: UpdateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Name',
        contact_person: '新联系人',
        contact_phone: '222',
        operator_ids: [1],
      };
      const updated: Company = {
        ...original,
        short_name: req.short_name,
        full_name: req.full_name,
        contact_person: req.contact_person,
        contact_phone: req.contact_phone,
        updated_at: new Date(),
      };
      expect(updated.short_name).toBe('NEW');
      expect(updated.full_name).toBe('New Name');
      expect(updated.id).toBe(1);
      expect(updated.address).toBe('旧地址');
    });

    it('CompanyDetail includes all Company fields plus extended fields', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: '北京',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const detail: CompanyDetail = {
        ...company,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '运营者', username: 'op1' }],
        viewer_ids: [2],
        viewers: [{ id: 2, cn_name: '查看者', username: 'vw1' }],
      };
      expect(detail.id).toBe(company.id);
      expect(detail.short_name).toBe(company.short_name);
      expect(detail.full_name).toBe(company.full_name);
      expect(detail.address).toBe(company.address);
      expect(detail.status).toBe(company.status);
      expect(detail.operator_ids).toHaveLength(1);
      expect(detail.viewer_ids).toHaveLength(1);
    });

    it('CreateCompanyRequest and UpdateCompanyRequest share same optional field behavior', () => {
      const createReq: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      const updateReq: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(createReq.address).toBeUndefined();
      expect(updateReq.address).toBeUndefined();
      expect(createReq.viewer_ids).toBeUndefined();
      expect(updateReq.viewer_ids).toBeUndefined();
    });

    it('full Company to CompanyDetail round-trip preserves data', () => {
      const detail: CompanyDetail = {
        id: 42,
        short_name: 'RT',
        full_name: 'Round Trip Corp',
        address: '上海市',
        contact_person: '王五',
        contact_phone: '13900139000',
        status: true,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
        deleted_at: null,
        operator_ids: [1, 2],
        operators: [
          { id: 1, cn_name: '运营1', username: 'op1' },
          { id: 2, cn_name: '运营2', username: 'op2' },
        ],
        viewer_ids: [3],
        viewers: [{ id: 3, cn_name: '查看1', username: 'vw1' }],
      };
      expect(detail.id).toBe(42);
      expect(detail.operators).toHaveLength(2);
      expect(detail.operators[0].cn_name).toBe('运营1');
      expect(detail.operators[1].username).toBe('op2');
      expect(detail.viewers[0].cn_name).toBe('查看1');
      expect(detail.created_at.getFullYear()).toBe(2026);
    });
  });
});

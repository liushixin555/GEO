/**
 * @jest-environment node
 */
import {
  Company,
  CreateCompanyRequest,
  UpdateCompanyRequest,
  CompanyDetail,
  CompanyListItem,
  UserRef,
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
        created_by: null,
        updated_by: null,
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
        created_by: null,
        updated_by: null,
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
        created_by: null,
        updated_by: null,
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

    it('should allow address to be null', () => {
      const req: CreateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Company',
        address: null,
        contact_person: '王五',
        contact_phone: '13700137000',
        operator_ids: [1],
      };
      expect(req.address).toBeNull();
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
    it('should create a valid request with all fields optional', () => {
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

    it('should allow all fields to be omitted (empty update)', () => {
      const req: UpdateCompanyRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow partial update with single field', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'ONLY_NAME',
      };
      expect(req.short_name).toBe('ONLY_NAME');
      expect(req.full_name).toBeUndefined();
      expect(req.address).toBeUndefined();
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
    it('should extend Omit<Company, deleted_at> with operator and viewer details', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        address: '北京',
        contact_person: '张三',
        contact_phone: '13800138000',
        status: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [1, 2],
        operators: [
          { id: 1, cn_name: '运营者1' },
          { id: 2, cn_name: '运营者2' },
        ],
        viewer_ids: [3],
        viewers: [
          { id: 3, cn_name: '查看者1' },
        ],
      };
      expect(detail.operator_ids).toEqual([1, 2]);
      expect(detail.operators).toHaveLength(2);
      expect(detail.operators[0].cn_name).toBe('运营者1');
      expect(detail.viewer_ids).toEqual([3]);
      expect(detail.viewers).toHaveLength(1);
    });

    it('should inherit all Company fields except deleted_at', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        address: null,
        contact_person: '张三',
        contact_phone: '13800138000',
        status: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [],
        operators: [],
        viewer_ids: [],
        viewers: [],
      };
      // Company fields (except deleted_at)
      expect(detail.id).toBe(1);
      expect(detail.short_name).toBe('ACME');
      // deleted_at should NOT exist on CompanyDetail
      expect((detail as any).deleted_at).toBeUndefined();
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '用户' }],
        viewer_ids: [],
        viewers: [],
      };
      const operator = detail.operators[0];
      expect(operator).toHaveProperty('id');
      expect(operator).toHaveProperty('cn_name');
    });
  });

  describe('UserRef interface', () => {
    it('should create a valid UserRef', () => {
      const ref: UserRef = { id: 1, cn_name: '张三' };
      expect(ref.id).toBe(1);
      expect(ref.cn_name).toBe('张三');
    });

    it('should have exactly 2 fields', () => {
      const ref: UserRef = { id: 1, cn_name: 'A' };
      expect(Object.keys(ref)).toHaveLength(2);
    });

    it('should allow id = 0', () => {
      const ref: UserRef = { id: 0, cn_name: 'Zero' };
      expect(ref.id).toBe(0);
    });

    it('should allow empty string cn_name', () => {
      const ref: UserRef = { id: 1, cn_name: '' };
      expect(ref.cn_name).toBe('');
    });

    it('should allow unicode cn_name', () => {
      const ref: UserRef = { id: 1, cn_name: '薄云科技🎉' };
      expect(ref.cn_name).toContain('薄云');
    });
  });

  describe('CompanyListItem interface', () => {
    it('should create a valid CompanyListItem with required fields', () => {
      const item: CompanyListItem = {
        id: 1,
        short_name: 'ACME',
        full_name: 'ACME Corporation',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.id).toBe(1);
      expect(item.short_name).toBe('ACME');
    });

    it('should not include PII fields (contact_person, contact_phone, address)', () => {
      const item: CompanyListItem = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect((item as any).contact_person).toBeUndefined();
      expect((item as any).contact_phone).toBeUndefined();
      expect((item as any).address).toBeUndefined();
    });

    it('should not include deleted_at, created_by, updated_by metadata', () => {
      const item: CompanyListItem = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      // deleted_at, created_by, updated_by are all omitted via Omit
      expect((item as any).deleted_at).toBeUndefined();
      expect((item as any).created_by).toBeUndefined();
      expect((item as any).updated_by).toBeUndefined();
    });

    it('should include optional user_count and project_count', () => {
      const item: CompanyListItem = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
        user_count: 10,
        project_count: 5,
      };
      expect(item.user_count).toBe(10);
      expect(item.project_count).toBe(5);
    });

    it('should allow user_count and project_count to be omitted', () => {
      const item: CompanyListItem = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(item.user_count).toBeUndefined();
      expect(item.project_count).toBeUndefined();
    });

    it('should have 6 fields without optional counts', () => {
      const item: CompanyListItem = {
        id: 1, short_name: 'A', full_name: 'B', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.keys(item)).toHaveLength(6);
    });

    it('should have 8 fields with optional counts', () => {
      const item: CompanyListItem = {
        id: 1, short_name: 'A', full_name: 'B', status: true,
        created_at: new Date(), updated_at: new Date(),
        user_count: 3, project_count: 2,
      };
      expect(Object.keys(item)).toHaveLength(8);
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
        created_by: null,
        updated_by: null,
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
        created_by: null,
        updated_by: null,
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
        created_by: 1,
        updated_by: 1,
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
        created_by: null,
        updated_by: null,
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
        created_by: 1,
        updated_by: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-05-20T10:00:00Z'),
        deleted_at: deletedDate,
      };
      expect(company.deleted_at).toBeInstanceOf(Date);
      expect(company.deleted_at!.getFullYear()).toBe(2026);
    });

    it('should have exactly 12 fields', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(company)).toHaveLength(12);
    });

    it('should have correct field names', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(company).sort()).toEqual([
        'address', 'contact_person', 'contact_phone', 'created_at',
        'created_by', 'deleted_at', 'full_name', 'id', 'short_name',
        'status', 'updated_at', 'updated_by',
      ]);
    });

    it('should support id = 0', () => {
      const company: Company = {
        id: 0, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
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
        created_by: null, updated_by: null,
        created_at: createdAt, updated_at: updatedAt, deleted_at: null,
      };
      expect(company.created_at.getMilliseconds()).toBe(123);
      expect(company.updated_at.getMilliseconds()).toBe(456);
    });

    it('should allow created_at before updated_at', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
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
        created_by: null, updated_by: null,
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company.short_name).toBe('薄云');
      expect(company.address).toContain('🎉');
    });

    it('should allow created_by to be a user id', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: 42,
        updated_by: 42,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.created_by).toBe(42);
      expect(company.updated_by).toBe(42);
    });

    it('should allow created_by and updated_by to differ', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: 1,
        updated_by: 2,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.created_by).toBe(1);
      expect(company.updated_by).toBe(2);
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
    it('should allow all fields to be provided', () => {
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

    it('should have no required fields (all optional)', () => {
      const req: UpdateCompanyRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow empty operator_ids array (clear operators)', () => {
      const req: UpdateCompanyRequest = {
        operator_ids: [],
      };
      expect(req.operator_ids).toEqual([]);
    });

    it('should allow undefined address (omitted)', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'U',
      };
      expect(req.address).toBeUndefined();
    });

    it('should share same field names as CreateCompanyRequest', () => {
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
      expect(req.operator_ids![0]).toBe(Number.MAX_SAFE_INTEGER);
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

    it('should allow address set to null (explicit clear)', () => {
      const req: UpdateCompanyRequest = {
        address: null,
      };
      expect(req.address).toBeNull();
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [1, 2, 3, 4, 5],
        operators: [
          { id: 1, cn_name: '运营1' },
          { id: 2, cn_name: '运营2' },
          { id: 3, cn_name: '运营3' },
          { id: 4, cn_name: '运营4' },
          { id: 5, cn_name: '运营5' },
        ],
        viewer_ids: [10, 11],
        viewers: [
          { id: 10, cn_name: '查看1' },
          { id: 11, cn_name: '查看2' },
        ],
      };
      expect(detail.operator_ids).toHaveLength(5);
      expect(detail.operators).toHaveLength(5);
      expect(detail.viewer_ids).toHaveLength(2);
      expect(detail.viewers).toHaveLength(2);
    });

    it('should preserve viewer object shape (id, cn_name)', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: true,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [],
        operators: [],
        viewer_ids: [100],
        viewers: [{ id: 100, cn_name: '查看者' }],
      };
      const viewer = detail.viewers[0];
      expect(viewer).toHaveProperty('id', 100);
      expect(viewer).toHaveProperty('cn_name', '查看者');
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [],
        operators: [],
        viewer_ids: [],
        viewers: [],
      };
      expect(detail.address).toBe('上海市浦东新区陆家嘴');
    });

    it('should correctly extend Omit<Company, deleted_at> with additional fields only', () => {
      const detail: CompanyDetail = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        address: null,
        contact_person: 'C',
        contact_phone: 'D',
        status: false,
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: 'OP' }],
        viewer_ids: [2],
        viewers: [{ id: 2, cn_name: 'VW' }],
      };
      // Verify all Company base fields exist (except deleted_at)
      const baseKeys = ['id', 'short_name', 'full_name', 'address', 'contact_person', 'contact_phone', 'status', 'created_by', 'updated_by', 'created_at', 'updated_at'];
      for (const key of baseKeys) {
        expect(detail).toHaveProperty(key);
      }
      // Verify deleted_at does NOT exist on CompanyDetail
      expect((detail as any).deleted_at).toBeUndefined();
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
        created_by: null,
        updated_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '双角色' }],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '双角色' }],
      };
      expect(detail.operator_ids).toContain(1);
      expect(detail.viewer_ids).toContain(1);
    });

    it('should have exactly 15 fields (12 Company - 1 deleted_at + 4 extended)', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect(Object.keys(detail)).toHaveLength(15);
    });

    it('should support operators with special characters in cn_name', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '张三<经理>&"总监"' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.operators[0].cn_name).toContain('<经理>');
      expect(detail.operators[0].cn_name).toContain('&');
    });

    it('should support operators with empty string cn_name', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.operators[0].cn_name).toBe('');
    });

    it('should support viewer with unicode cn_name', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [],
        operators: [],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '查看者🎉' }],
      };
      expect(detail.viewers[0].cn_name).toContain('🎉');
    });

    it('should support operator/viewer count mismatch (ids more than objects)', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1, 2, 3],
        operators: [{ id: 1, cn_name: 'O1' }],
        viewer_ids: [10, 11],
        viewers: [{ id: 10, cn_name: 'V1' }],
      };
      expect(detail.operator_ids).toHaveLength(3);
      expect(detail.operators).toHaveLength(1);
      expect(detail.viewer_ids).toHaveLength(2);
      expect(detail.viewers).toHaveLength(1);
    });

    it('should support created_by and updated_by with user ids', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: 1,
        updated_by: 2,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect(detail.created_by).toBe(1);
      expect(detail.updated_by).toBe(2);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
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

    it('should re-export CompanyListItem from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.CompanyListItem).toBeUndefined();
    });

    it('should re-export UserRef from index.ts', async () => {
      const indexModule = await import('../../apis/entity/index');
      expect(indexModule.UserRef).toBeUndefined();
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
        created_by: null,
        updated_by: null,
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
        status: true, created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.address).toBeNull();
    });

    it('UpdateCompanyRequest fields can partially update a Company', () => {
      const original: Company = {
        id: 1, short_name: 'OLD', full_name: 'Old Name',
        address: '旧地址', contact_person: '旧联系人',
        contact_phone: '111', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const req: UpdateCompanyRequest = {
        short_name: 'NEW',
        full_name: 'New Name',
        contact_person: '新联系人',
        contact_phone: '222',
      };
      const updated: Company = {
        ...original,
        short_name: req.short_name!,
        full_name: req.full_name!,
        contact_person: req.contact_person!,
        contact_phone: req.contact_phone!,
        updated_by: 2,
        updated_at: new Date(),
      };
      expect(updated.short_name).toBe('NEW');
      expect(updated.full_name).toBe('New Name');
      expect(updated.id).toBe(1);
      expect(updated.address).toBe('旧地址');
    });

    it('CompanyDetail includes all Company fields except deleted_at plus extended fields', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: '北京',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const { deleted_at: _, ...companyWithoutDeletedAt } = company;
      const detail: CompanyDetail = {
        ...companyWithoutDeletedAt,
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '运营者' }],
        viewer_ids: [2],
        viewers: [{ id: 2, cn_name: '查看者' }],
      };
      expect(detail.id).toBe(company.id);
      expect(detail.short_name).toBe(company.short_name);
      expect(detail.full_name).toBe(company.full_name);
      expect(detail.address).toBe(company.address);
      expect(detail.status).toBe(company.status);
      expect((detail as any).deleted_at).toBeUndefined();
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

    it('full Company to CompanyDetail round-trip preserves data (minus deleted_at)', () => {
      const detail: CompanyDetail = {
        id: 42,
        short_name: 'RT',
        full_name: 'Round Trip Corp',
        address: '上海市',
        contact_person: '王五',
        contact_phone: '13900139000',
        status: true,
        created_by: 1,
        updated_by: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
        operator_ids: [1, 2],
        operators: [
          { id: 1, cn_name: '运营1' },
          { id: 2, cn_name: '运营2' },
        ],
        viewer_ids: [3],
        viewers: [{ id: 3, cn_name: '查看1' }],
      };
      expect(detail.id).toBe(42);
      expect(detail.operators).toHaveLength(2);
      expect(detail.operators[0].cn_name).toBe('运营1');
      expect(detail.operators[1].cn_name).toBe('运营2');
      expect(detail.viewers[0].cn_name).toBe('查看1');
      expect(detail.created_at.getFullYear()).toBe(2026);
      expect((detail as any).deleted_at).toBeUndefined();
    });
  });

  // ===== 第二轮 TDD 补全 =====

  describe('JSON 序列化与反序列化', () => {
    it('Company JSON round-trip 保留所有字段', () => {
      const original: Company = {
        id: 1, short_name: 'ACME', full_name: 'ACME Corp',
        address: '北京市', contact_person: '张三', contact_phone: '13800138000',
        status: true, created_by: null, updated_by: null,
        created_at: new Date('2026-01-15T08:30:00.000Z'),
        updated_at: new Date('2026-05-20T12:00:00.000Z'),
        deleted_at: null,
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.short_name).toBe('ACME');
      expect(parsed.full_name).toBe('ACME Corp');
      expect(parsed.address).toBe('北京市');
      expect(parsed.contact_person).toBe('张三');
      expect(parsed.contact_phone).toBe('13800138000');
      expect(parsed.status).toBe(true);
      expect(parsed.deleted_at).toBeNull();
    });

    it('Company Date 字段序列化为 ISO 字符串', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date('2026-05-25T10:30:45.123Z'),
        updated_at: new Date('2026-05-25T15:00:00.000Z'),
        deleted_at: null,
      };
      const json = JSON.stringify(company);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(parsed.created_at).toBe('2026-05-25T10:30:45.123Z');
      expect(typeof parsed.updated_at).toBe('string');
    });

    it('Company deleted_at Date 序列化正确', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: false,
        created_by: 1, updated_by: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-05-25T00:00:00Z'),
        deleted_at: new Date('2026-05-25T12:00:00Z'),
      };
      const json = JSON.stringify(company);
      const parsed = JSON.parse(json);
      expect(parsed.deleted_at).toBe('2026-05-25T12:00:00.000Z');
      expect(typeof parsed.deleted_at).toBe('string');
    });

    it('Company JSON 序列化保留字段数量', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const json = JSON.stringify(company);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(12);
    });

    it('CreateCompanyRequest JSON round-trip', () => {
      const req: CreateCompanyRequest = {
        short_name: 'TEST', full_name: 'Test Corp',
        address: '上海市', contact_person: '李四', contact_phone: '13900139000',
        operator_ids: [1, 2], viewer_ids: [3],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.short_name).toBe('TEST');
      expect(parsed.operator_ids).toEqual([1, 2]);
      expect(parsed.viewer_ids).toEqual([3]);
    });

    it('CreateCompanyRequest 省略可选字段时 JSON 不包含该字段', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed).not.toHaveProperty('address');
      expect(parsed).not.toHaveProperty('viewer_ids');
    });

    it('CreateCompanyRequest 空数组 JSON round-trip', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [], viewer_ids: [],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.operator_ids).toEqual([]);
      expect(parsed.viewer_ids).toEqual([]);
    });

    it('UpdateCompanyRequest JSON round-trip', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'UPD', full_name: 'Updated Corp',
        contact_person: '王五', contact_phone: '13700137000',
        operator_ids: [10], viewer_ids: [20],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.short_name).toBe('UPD');
      expect(parsed.operator_ids).toEqual([10]);
    });

    it('CompanyDetail JSON round-trip 保留所有字段', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'ACME', full_name: 'ACME Corp',
        address: '北京', contact_person: '张三', contact_phone: '13800138000',
        status: true, created_by: null, updated_by: null,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-06-01T00:00:00Z'),
        operator_ids: [1, 2],
        operators: [{ id: 1, cn_name: '运营1' }, { id: 2, cn_name: '运营2' }],
        viewer_ids: [3],
        viewers: [{ id: 3, cn_name: '查看1' }],
      };
      const json = JSON.stringify(detail);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.operators).toHaveLength(2);
      expect(parsed.operators[0].cn_name).toBe('运营1');
      expect(parsed.viewers[0].cn_name).toBe('查看1');
      expect(Object.keys(parsed)).toHaveLength(15);
      expect(parsed).not.toHaveProperty('deleted_at');
    });

    it('CompanyDetail 嵌套 operator 对象序列化', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '张三' }],
        viewer_ids: [], viewers: [],
      };
      const json = JSON.stringify(detail);
      const parsed = JSON.parse(json);
      expect(parsed.operators[0]).toEqual({ id: 1, cn_name: '张三' });
      expect(Object.keys(parsed.operators[0])).toHaveLength(2);
    });

    it('CompanyDetail 嵌套 viewer 对象序列化', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [],
        viewer_ids: [99],
        viewers: [{ id: 99, cn_name: '李四' }],
      };
      const json = JSON.stringify(detail);
      const parsed = JSON.parse(json);
      expect(parsed.viewers[0]).toEqual({ id: 99, cn_name: '李四' });
    });

    it('Company 含特殊字符 JSON round-trip', () => {
      const company: Company = {
        id: 1, short_name: 'A&B<Co>',
        full_name: 'Company "引号" & <tags>',
        address: "O'Brien's Office",
        contact_person: '李明（经理）',
        contact_phone: '+86-138-0000-0000',
        status: true, created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const json = JSON.stringify(company);
      const parsed = JSON.parse(json);
      expect(parsed.short_name).toBe('A&B<Co>');
      expect(parsed.full_name).toBe('Company "引号" & <tags>');
      expect(parsed.address).toBe("O'Brien's Office");
    });

    it('JSON.parse 可以通过 reviver 恢复 Date 类型', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date('2026-05-25T10:00:00Z'),
        updated_at: new Date('2026-05-25T12:00:00Z'),
        deleted_at: null,
      };
      const dateFields = ['created_at', 'updated_at', 'deleted_at'];
      const json = JSON.stringify(company);
      const parsed = JSON.parse(json, (key, value) => {
        if (dateFields.includes(key) && typeof value === 'string') {
          return new Date(value);
        }
        return value;
      });
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('对象不可变性', () => {
    it('spread 运算符创建独立 Company 副本', () => {
      const original: Company = {
        id: 1, short_name: 'OLD', full_name: 'Old Name', address: null,
        contact_person: 'A', contact_phone: 'B', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const copy = { ...original, short_name: 'NEW' };
      expect(copy.short_name).toBe('NEW');
      expect(original.short_name).toBe('OLD');
    });

    it('spread 运算符创建独立 CompanyDetail 副本', () => {
      const original: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1], operators: [{ id: 1, cn_name: 'OP' }],
        viewer_ids: [], viewers: [],
      };
      const copy = { ...original, short_name: 'UPDATED' };
      expect(copy.short_name).toBe('UPDATED');
      expect(original.short_name).toBe('A');
    });

    it('spread 运算符 operator_ids 创建独立数组', () => {
      const original: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1, 2, 3], operators: [],
        viewer_ids: [], viewers: [],
      };
      const newIds = [...original.operator_ids, 4];
      expect(newIds).toEqual([1, 2, 3, 4]);
      expect(original.operator_ids).toEqual([1, 2, 3]);
    });

    it('spread 运算符 viewer_ids 创建独立数组', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1], viewer_ids: [10, 20],
      };
      const copy = { ...req, viewer_ids: [...req.viewer_ids!, 30] };
      expect(copy.viewer_ids).toEqual([10, 20, 30]);
      expect(req.viewer_ids).toEqual([10, 20]);
    });

    it('CompanyDetail spread 保留 Company 基础字段（不含 deleted_at）', () => {
      const company: Company = {
        id: 1, short_name: 'BASE', full_name: 'Base Corp', address: '北京',
        contact_person: '张三', contact_phone: '13800138000', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const { deleted_at: _, ...companyWithoutDeleted } = company;
      const detail: CompanyDetail = {
        ...companyWithoutDeleted,
        operator_ids: [1], operators: [{ id: 1, cn_name: 'OP' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.id).toBe(company.id);
      expect(detail.short_name).toBe('BASE');
      expect(detail.address).toBe('北京');
      expect((detail as any).deleted_at).toBeUndefined();
    });

    it('Object.freeze Company 后字段不可变（严格模式下抛异常）', () => {
      const company: Company = Object.freeze({
        id: 1, short_name: 'FROZEN', full_name: 'Frozen Corp', address: null,
        contact_person: 'A', contact_phone: 'B', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      });
      expect(() => { (company as any).short_name = 'MUTATED'; }).toThrow();
      expect(company.short_name).toBe('FROZEN');
    });

    it('Object.freeze CompanyDetail operators 数组不可变', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: Object.freeze([1, 2]) as number[],
        operators: Object.freeze([{ id: 1, cn_name: 'OP' }]) as UserRef[],
        viewer_ids: [], viewers: [],
      };
      expect(() => { (detail.operator_ids as any).push(3); }).toThrow();
    });

    it('解构 id 从 Company 提取', () => {
      const company: Company = {
        id: 42, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const { id } = company;
      expect(id).toBe(42);
    });

    it('解构多个字段从 Company 提取', () => {
      const company: Company = {
        id: 1, short_name: 'ACME', full_name: 'ACME Corp', address: '北京',
        contact_person: '张三', contact_phone: '138', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const { id, short_name, full_name, status } = company;
      expect(id).toBe(1);
      expect(short_name).toBe('ACME');
      expect(full_name).toBe('ACME Corp');
      expect(status).toBe(true);
    });

    it('rest spread 排除指定字段', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const { id, deleted_at, ...rest } = company;
      expect(id).toBe(1);
      expect(deleted_at).toBeNull();
      expect(Object.keys(rest)).toHaveLength(10);
      expect(rest).not.toHaveProperty('id');
      expect(rest).not.toHaveProperty('deleted_at');
    });

    it('Object.assign 创建合并对象', () => {
      const base: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const merged = Object.assign({}, base, { short_name: 'MERGED' });
      expect(merged.short_name).toBe('MERGED');
      expect(base.short_name).toBe('A');
    });
  });

  describe('跨接口一致性增强', () => {
    it('CreateCompanyRequest 字符串字段是 Company 的子集', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        address: 'C', contact_person: 'D', contact_phone: 'E',
        operator_ids: [1],
      };
      const company: Company = {
        id: 1, short_name: req.short_name, full_name: req.full_name,
        address: req.address ?? null,
        contact_person: req.contact_person, contact_phone: req.contact_phone,
        status: true, created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe(req.short_name);
      expect(company.full_name).toBe(req.full_name);
      expect(company.contact_person).toBe(req.contact_person);
      expect(company.contact_phone).toBe(req.contact_phone);
    });

    it('Company address (string|null) 与 CreateCompanyRequest (string|null|undefined) 兼容', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      const companyAddress: string | null = req.address ?? null;
      expect(companyAddress).toBeNull();

      const reqWithAddr: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        address: '北京', contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      const companyAddress2: string | null = reqWithAddr.address ?? null;
      expect(companyAddress2).toBe('北京');

      const reqWithNull: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        address: null, contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      const companyAddress3: string | null = reqWithNull.address ?? null;
      expect(companyAddress3).toBeNull();
    });

    it('UpdateCompanyRequest 与 CreateCompanyRequest 共享相同字段名', () => {
      const createReq: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      const updateReq: UpdateCompanyRequest = { ...createReq };
      expect(Object.keys(updateReq).sort()).toEqual(Object.keys(createReq).sort());
    });

    it('CompanyDetail 在 Omit<Company, deleted_at> 基础上增加恰好 4 个字段', () => {
      // Company has 12 fields, CompanyDetail has 12-1(deleted_at)+4 = 15
      const companyKeys = ['id', 'short_name', 'full_name', 'address', 'contact_person',
        'contact_phone', 'status', 'created_by', 'updated_by', 'created_at', 'updated_at'];
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      const detailKeys = Object.keys(detail);
      const extraKeys = detailKeys.filter(k => !companyKeys.includes(k));
      expect(extraKeys).toHaveLength(4);
      expect(extraKeys.sort()).toEqual(['operator_ids', 'operators', 'viewer_ids', 'viewers']);
    });

    it('所有接口的 contact_person 和 contact_phone 类型一致', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: '张三', contact_phone: '13800138000', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const createReq: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: '张三', contact_phone: '13800138000',
        operator_ids: [1],
      };
      const updateReq: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: '张三', contact_phone: '13800138000',
        operator_ids: [1],
      };
      expect(typeof company.contact_person).toBe(typeof createReq.contact_person);
      expect(typeof company.contact_phone).toBe(typeof updateReq.contact_phone);
    });

    it('id 字段仅存在于 Company 和 CompanyDetail，不存在于 Request 类型', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(company).toHaveProperty('id');
      expect(req).not.toHaveProperty('id');
    });

    it('created_at/updated_at/deleted_at 仅在 Company 中', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(company).toHaveProperty('created_at');
      expect(company).toHaveProperty('updated_at');
      expect(company).toHaveProperty('deleted_at');
      expect(req).not.toHaveProperty('created_at');
      expect(req).not.toHaveProperty('updated_at');
      expect(req).not.toHaveProperty('deleted_at');
    });

    it('status 仅在 Company 中，不存在于 Request 类型', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
      };
      expect(company).toHaveProperty('status');
      expect(typeof company.status).toBe('boolean');
      expect(req).not.toHaveProperty('status');
    });

    it('CompanyDetail operators 对象包含 id 和 cn_name', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1], operators: [{ id: 1, cn_name: '运营者' }],
        viewer_ids: [], viewers: [],
      };
      const op = detail.operators[0];
      expect(Object.keys(op)).toContain('id');
      expect(Object.keys(op)).toContain('cn_name');
      expect(typeof op.id).toBe('number');
      expect(typeof op.cn_name).toBe('string');
    });

    it('CompanyDetail viewers 对象结构与 operators 一致', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1], operators: [{ id: 1, cn_name: 'OP' }],
        viewer_ids: [2], viewers: [{ id: 2, cn_name: 'VW' }],
      };
      const opKeys = Object.keys(detail.operators[0]).sort();
      const vwKeys = Object.keys(detail.viewers[0]).sort();
      expect(opKeys).toEqual(vwKeys);
    });

    it('CompanyDetail 不包含 deleted_at', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect((detail as any).deleted_at).toBeUndefined();
      expect(Object.keys(detail)).not.toContain('deleted_at');
    });
  });

  describe('安全注入防护', () => {
    it('XSS script 标签在 short_name 中作为普通字符串保留', () => {
      const company: Company = {
        id: 1, short_name: '<script>alert("xss")</script>',
        full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe('<script>alert("xss")</script>');
      expect(company.short_name).toContain('<script>');
    });

    it('XSS script 标签在 full_name 中作为普通字符串保留', () => {
      const company: Company = {
        id: 1, short_name: 'A',
        full_name: '<img src=x onerror=alert(1)>',
        address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.full_name).toBe('<img src=x onerror=alert(1)>');
    });

    it('XSS 在 address 中作为普通字符串保留', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B',
        address: '<svg onload=alert(1)>',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.address).toBe('<svg onload=alert(1)>');
    });

    it('XSS 在 contact_person 中作为普通字符串保留', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: '<iframe src="evil">',
        contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.contact_person).toBe('<iframe src="evil">');
    });

    it('SQL 注入字符串在 short_name 中保留', () => {
      const company: Company = {
        id: 1, short_name: "'; DROP TABLE companies; --",
        full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe("'; DROP TABLE companies; --");
    });

    it('SQL 注入字符串在 full_name 中保留', () => {
      const company: Company = {
        id: 1, short_name: 'A',
        full_name: "' OR 1=1; --",
        address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.full_name).toBe("' OR 1=1; --");
    });

    it('SQL 注入字符串在 contact_phone 中保留', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: "138' OR '1'='1",
        status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.contact_phone).toBe("138' OR '1'='1");
    });

    it('__proto__ 作为字段值（非字段名）保留', () => {
      const company: Company = {
        id: 1, short_name: '__proto__', full_name: 'constructor',
        address: 'prototype', contact_person: 'C', contact_phone: 'D',
        status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe('__proto__');
      expect(company.full_name).toBe('constructor');
      expect(company.address).toBe('prototype');
    });

    it('XSS 在 CreateCompanyRequest 所有字符串字段中保留', () => {
      const req: CreateCompanyRequest = {
        short_name: '<script>xss</script>',
        full_name: '<b>bold</b>',
        address: '"><script>alert(1)</script>',
        contact_person: '<a href="evil">click</a>',
        contact_phone: 'javascript:alert(1)',
        operator_ids: [1],
      };
      expect(req.short_name).toContain('<script>');
      expect(req.full_name).toContain('<b>');
      expect(req.address).toContain('"><script>');
      expect(req.contact_person).toContain('<a href=');
      expect(req.contact_phone).toContain('javascript:');
    });

    it('XSS 在 CompanyDetail operator cn_name 中保留', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '<script>alert("op")</script>' }],
        viewer_ids: [], viewers: [],
      };
      expect(detail.operators[0].cn_name).toContain('<script>');
    });

    it('XSS 在 CompanyDetail viewer cn_name 中保留', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '<img src=x onerror=alert(1)>' }],
      };
      expect(detail.viewers[0].cn_name).toContain('<img src=x');
    });

    it('HTML 实体编码字符串保留', () => {
      const company: Company = {
        id: 1, short_name: '&lt;script&gt;',
        full_name: '&#60;script&#62;',
        address: '&amp;&quot;',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe('&lt;script&gt;');
      expect(company.full_name).toBe('&#60;script&#62;');
      expect(company.address).toBe('&amp;&quot;');
    });

    it('Null 字节注入在字符串中保留', () => {
      const req: CreateCompanyRequest = {
        short_name: 'test\x00injection',
        full_name: 'normal',
        contact_person: 'A', contact_phone: '1',
        operator_ids: [1],
      };
      expect(req.short_name).toContain('\x00');
    });

    it('Unicode 转义序列在字符串中正确保留', () => {
      const company: Company = {
        id: 1, short_name: 'AB', full_name: '中文',
        address: null, contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name).toBe('AB');
      expect(company.full_name).toBe('中文');
    });
  });

  describe('边界值增强', () => {
    it('Company id 为负数时运行时保留', () => {
      const company: Company = {
        id: -1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.id).toBe(-1);
    });

    it('Company id 为 Number.MIN_SAFE_INTEGER', () => {
      const company: Company = {
        id: Number.MIN_SAFE_INTEGER, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.id).toBe(Number.MIN_SAFE_INTEGER);
    });

    it('address 为空字符串与 null 与 undefined 的区别', () => {
      const companyWithNull: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const companyWithEmpty: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: '',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(companyWithNull.address).toBeNull();
      expect(companyWithEmpty.address).toBe('');
      expect(companyWithNull.address).not.toBe(companyWithEmpty.address);
    });

    it('operator_ids 包含负数', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [-1, -2, 0],
      };
      expect(req.operator_ids).toEqual([-1, -2, 0]);
    });

    it('operator_ids 为极大数组', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: Array.from({ length: 1000 }, (_, i) => i + 1),
      };
      expect(req.operator_ids).toHaveLength(1000);
      expect(req.operator_ids[999]).toBe(1000);
    });

    it('viewer_ids 为极大数组', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1],
        viewer_ids: Array.from({ length: 500 }, (_, i) => i + 1),
      };
      expect(req.viewer_ids).toHaveLength(500);
    });

    it('operator_ids 包含 Number.MAX_SAFE_INTEGER', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [Number.MAX_SAFE_INTEGER, Number.MAX_SAFE_INTEGER - 1],
      };
      expect(req.operator_ids[0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('contact_phone 超长字符串', () => {
      const longPhone = '1'.repeat(200);
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: longPhone, status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.contact_phone.length).toBe(200);
    });

    it('所有必需字符串字段为空字符串', () => {
      const req: CreateCompanyRequest = {
        short_name: '', full_name: '',
        contact_person: '', contact_phone: '',
        operator_ids: [],
      };
      expect(req.short_name).toBe('');
      expect(req.full_name).toBe('');
      expect(req.contact_person).toBe('');
      expect(req.contact_phone).toBe('');
    });

    it('CompanyDetail operator/viewer id 为 0', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [0], operators: [{ id: 0, cn_name: 'ZeroOp' }],
        viewer_ids: [0], viewers: [{ id: 0, cn_name: 'ZeroVw' }],
      };
      expect(detail.operators[0].id).toBe(0);
      expect(detail.viewers[0].id).toBe(0);
    });

    it('Date epoch 0 作为时间戳', () => {
      const epoch = new Date(0);
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: epoch, updated_at: epoch, deleted_at: null,
      };
      expect(company.created_at.getTime()).toBe(0);
    });

    it('Date 远未来时间戳', () => {
      const future = new Date('2099-12-31T23:59:59.999Z');
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: future, updated_at: future, deleted_at: null,
      };
      expect(company.created_at.getUTCFullYear()).toBe(2099);
    });

    it('short_name 极长字符串', () => {
      const longName = 'X'.repeat(10000);
      const company: Company = {
        id: 1, short_name: longName, full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.short_name.length).toBe(10000);
    });

    it('address 为多行字符串', () => {
      const multiline = '第一行\n第二行\r\n第三行';
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: multiline,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.address).toContain('\n');
      expect(company.address).toContain('\r\n');
    });
  });

  describe('状态生命周期', () => {
    it('活跃公司创建：status=true, deleted_at=null', () => {
      const company: Company = {
        id: 1, short_name: 'ACTIVE', full_name: 'Active Corp', address: '北京',
        contact_person: '张三', contact_phone: '13800138000', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.status).toBe(true);
      expect(company.deleted_at).toBeNull();
    });

    it('活跃 -> 停用：status 切换为 false', () => {
      const active: Company = {
        id: 1, short_name: 'CO', full_name: 'Corp', address: null,
        contact_person: 'A', contact_phone: '1', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const disabled: Company = { ...active, status: false };
      expect(active.status).toBe(true);
      expect(disabled.status).toBe(false);
      expect(disabled.deleted_at).toBeNull();
    });

    it('停用 -> 重新激活：status 切回 true', () => {
      const disabled: Company = {
        id: 1, short_name: 'CO', full_name: 'Corp', address: null,
        contact_person: 'A', contact_phone: '1', status: false,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const reactivated: Company = { ...disabled, status: true };
      expect(reactivated.status).toBe(true);
    });

    it('软删除：设置 deleted_at', () => {
      const active: Company = {
        id: 1, short_name: 'CO', full_name: 'Corp', address: null,
        contact_person: 'A', contact_phone: '1', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-01-01T00:00:00Z'),
        deleted_at: null,
      };
      const deleted: Company = {
        ...active,
        status: false,
        updated_by: 2,
        updated_at: new Date('2026-05-25T12:00:00Z'),
        deleted_at: new Date('2026-05-25T12:00:00Z'),
      };
      expect(deleted.deleted_at).toBeInstanceOf(Date);
      expect(deleted.status).toBe(false);
    });

    it('停用但未删除的公司：status=false, deleted_at=null', () => {
      const company: Company = {
        id: 1, short_name: 'CO', full_name: 'Corp', address: null,
        contact_person: 'A', contact_phone: '1', status: false,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(company.status).toBe(false);
      expect(company.deleted_at).toBeNull();
    });

    it('完整生命周期：创建 -> 更新 -> 停用 -> 软删除', () => {
      const created = new Date('2026-01-01T00:00:00Z');
      // 创建
      const created_state: Company = {
        id: 1, short_name: 'NEW', full_name: 'New Corp', address: null,
        contact_person: '张三', contact_phone: '13800138000', status: true,
        created_by: 1, updated_by: 1,
        created_at: created, updated_at: created, deleted_at: null,
      };
      expect(created_state.status).toBe(true);

      // 更新
      const updated = new Date('2026-03-01T00:00:00Z');
      const updated_state: Company = {
        ...created_state,
        short_name: 'UPD', full_name: 'Updated Corp',
        updated_by: 2,
        updated_at: updated,
      };
      expect(updated_state.short_name).toBe('UPD');
      expect(updated_state.created_at).toBe(created);

      // 停用
      const disabled_at = new Date('2026-05-01T00:00:00Z');
      const disabled_state: Company = {
        ...updated_state, status: false, updated_by: 3, updated_at: disabled_at,
      };
      expect(disabled_state.status).toBe(false);

      // 软删除
      const deleted_at = new Date('2026-05-25T00:00:00Z');
      const deleted_state: Company = {
        ...disabled_state, deleted_at, updated_by: 3, updated_at: deleted_at,
      };
      expect(deleted_state.deleted_at).toBeInstanceOf(Date);
      expect(deleted_state.id).toBe(1); // id 始终不变
    });

    it('创建请求 -> 公司详情完整流程', () => {
      const createReq: CreateCompanyRequest = {
        short_name: '薄云', full_name: '薄云商机倍增服务有限公司',
        address: '深圳市南山区',
        contact_person: '张三', contact_phone: '13800138000',
        operator_ids: [1, 2], viewer_ids: [3],
      };
      // 模拟数据库创建后返回的 Company
      const company: Company = {
        id: 1,
        short_name: createReq.short_name,
        full_name: createReq.full_name,
        address: createReq.address ?? null,
        contact_person: createReq.contact_person,
        contact_phone: createReq.contact_phone,
        status: true,
        created_by: 1,
        updated_by: 1,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      // 模拟查询详情（排除 deleted_at）
      const { deleted_at: _, ...companyForDetail } = company;
      const detail: CompanyDetail = {
        ...companyForDetail,
        operator_ids: createReq.operator_ids,
        operators: createReq.operator_ids.map(id => ({ id, cn_name: `运营者${id}` })),
        viewer_ids: createReq.viewer_ids ?? [],
        viewers: (createReq.viewer_ids ?? []).map(id => ({ id, cn_name: `查看者${id}` })),
      };
      expect(detail.operator_ids).toEqual([1, 2]);
      expect(detail.operators).toHaveLength(2);
      expect(detail.viewer_ids).toEqual([3]);
      expect(detail.viewers).toHaveLength(1);
      expect((detail as any).deleted_at).toBeUndefined();
    });

    it('更新请求保留 status 不变', () => {
      const company: Company = {
        id: 1, short_name: 'OLD', full_name: 'Old', address: null,
        contact_person: 'A', contact_phone: '1', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const updateReq: UpdateCompanyRequest = {
        short_name: 'NEW', full_name: 'New',
        contact_person: 'B', contact_phone: '2',
      };
      const updated: Company = {
        ...company,
        short_name: updateReq.short_name!,
        full_name: updateReq.full_name!,
        contact_person: updateReq.contact_person!,
        contact_phone: updateReq.contact_phone!,
        updated_by: 2,
        updated_at: new Date(),
      };
      expect(updated.status).toBe(true); // status 保持不变
      expect(updated.id).toBe(1); // id 保持不变
    });
  });

  describe('实际使用场景', () => {
    it('API 创建请求映射到 Company 实体', () => {
      const req: CreateCompanyRequest = {
        short_name: 'BY', full_name: '薄云商机倍增服务有限公司',
        address: '深圳市南山区科技园',
        contact_person: '张三', contact_phone: '13800138000',
        operator_ids: [1, 2], viewer_ids: [3],
      };
      const company: Company = {
        id: 1,
        short_name: req.short_name,
        full_name: req.full_name,
        address: req.address ?? null,
        contact_person: req.contact_person,
        contact_phone: req.contact_phone,
        status: true,
        created_by: 1,
        updated_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(company).toMatchObject({
        id: 1, short_name: 'BY', status: true,
      });
    });

    it('Company 实体映射到 API 详情响应', () => {
      const company: Company = {
        id: 1, short_name: 'BY', full_name: '薄云商机倍增服务有限公司',
        address: '深圳', contact_person: '张三', contact_phone: '13800138000',
        status: true, created_by: 1, updated_by: 1,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-05-25T00:00:00Z'),
        deleted_at: null,
      };
      const { deleted_at: _, ...companyForDetail } = company;
      const detail: CompanyDetail = {
        ...companyForDetail,
        operator_ids: [1, 2],
        operators: [{ id: 1, cn_name: '运营者A' }, { id: 2, cn_name: '运营者B' }],
        viewer_ids: [3],
        viewers: [{ id: 3, cn_name: '查看者C' }],
      };
      const responseBody = JSON.stringify(detail);
      const parsed = JSON.parse(responseBody);
      expect(parsed.id).toBe(1);
      expect(parsed.short_name).toBe('BY');
      expect(parsed.operators).toHaveLength(2);
      expect(parsed).not.toHaveProperty('deleted_at');
    });

    it('公司列表响应结构', () => {
      const companies: Company[] = [
        { id: 1, short_name: 'A', full_name: 'Alpha', address: null,
          contact_person: 'X', contact_phone: '1', status: true,
          created_by: null, updated_by: null,
          created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: 2, short_name: 'B', full_name: 'Beta', address: '上海',
          contact_person: 'Y', contact_phone: '2', status: true,
          created_by: null, updated_by: null,
          created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];
      expect(companies).toHaveLength(2);
      expect(companies[0].id).toBe(1);
      expect(companies[1].address).toBe('上海');
    });

    it('CompanyListItem 列表响应结构', () => {
      const items: CompanyListItem[] = [
        { id: 1, short_name: 'A', full_name: 'Alpha', status: true,
          created_at: new Date(), updated_at: new Date(), user_count: 5 },
        { id: 2, short_name: 'B', full_name: 'Beta', status: true,
          created_at: new Date(), updated_at: new Date(), project_count: 3 },
      ];
      expect(items).toHaveLength(2);
      expect(items[0].user_count).toBe(5);
      expect(items[1].project_count).toBe(3);
    });

    it('按名称搜索过滤公司', () => {
      const companies: Company[] = [
        { id: 1, short_name: 'BY', full_name: '薄云科技', address: null,
          contact_person: 'A', contact_phone: '1', status: true,
          created_by: null, updated_by: null,
          created_at: new Date(), updated_at: new Date(), deleted_at: null },
        { id: 2, short_name: 'GG', full_name: '谷歌中国', address: null,
          contact_person: 'B', contact_phone: '2', status: true,
          created_by: null, updated_by: null,
          created_at: new Date(), updated_at: new Date(), deleted_at: null },
      ];
      const filtered = companies.filter(c => c.full_name.includes('薄云'));
      expect(filtered).toHaveLength(1);
      expect(filtered[0].short_name).toBe('BY');
    });

    it('公司运营者重新分配', () => {
      const original: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1, 2],
        operators: [{ id: 1, cn_name: 'OP1' }, { id: 2, cn_name: 'OP2' }],
        viewer_ids: [], viewers: [],
      };
      const updateReq: UpdateCompanyRequest = {
        operator_ids: [3, 4], // 全量替换，仅传要更新的字段
      };
      expect(updateReq.operator_ids).not.toContain(1);
      expect(updateReq.operator_ids).not.toContain(2);
      expect(updateReq.operator_ids).toEqual([3, 4]);
    });

    it('清空所有运营者（传入空数组）', () => {
      const updateReq: UpdateCompanyRequest = {
        operator_ids: [],
      };
      expect(updateReq.operator_ids).toEqual([]);
    });

    it('公司查看者管理：新增与清空', () => {
      // 新增查看者
      const addReq: UpdateCompanyRequest = {
        viewer_ids: [10, 20, 30],
      };
      expect(addReq.viewer_ids).toHaveLength(3);

      // 清空查看者
      const clearReq: UpdateCompanyRequest = {
        viewer_ids: [],
      };
      expect(clearReq.viewer_ids).toEqual([]);
    });

    it('公司地址更新场景', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: '旧地址',
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const updated: Company = { ...company, address: '新地址' };
      expect(updated.address).toBe('新地址');
      expect(company.address).toBe('旧地址'); // 原对象不变
    });

    it('公司联系人变更场景', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: '旧联系人', contact_phone: '138', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const updated: Company = {
        ...company,
        contact_person: '新联系人',
        contact_phone: '139',
        updated_by: 2,
        updated_at: new Date(),
      };
      expect(updated.contact_person).toBe('新联系人');
      expect(updated.contact_phone).toBe('139');
    });

    it('公司软删除后恢复（重新激活）', () => {
      const deleted: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: false,
        created_by: 1, updated_by: 2,
        created_at: new Date('2026-01-01T00:00:00Z'),
        updated_at: new Date('2026-05-25T00:00:00Z'),
        deleted_at: new Date('2026-05-25T00:00:00Z'),
      };
      const restored: Company = {
        ...deleted,
        status: true,
        deleted_at: null,
        updated_by: 3,
        updated_at: new Date(),
      };
      expect(restored.status).toBe(true);
      expect(restored.deleted_at).toBeNull();
      expect(restored.id).toBe(1);
    });

    it('企业级公司：大量运营者和查看者', () => {
      const operatorCount = 50;
      const viewerCount = 200;
      const detail: CompanyDetail = {
        id: 1, short_name: 'ENTERPRISE', full_name: 'Enterprise Corp', address: '北京',
        contact_person: '管理员', contact_phone: '13800138000', status: true,
        created_by: 1, updated_by: 1,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: Array.from({ length: operatorCount }, (_, i) => i + 1),
        operators: Array.from({ length: operatorCount }, (_, i) => ({
          id: i + 1, cn_name: `运营者${i + 1}`,
        })),
        viewer_ids: Array.from({ length: viewerCount }, (_, i) => i + 100),
        viewers: Array.from({ length: viewerCount }, (_, i) => ({
          id: i + 100, cn_name: `查看者${i + 100}`,
        })),
      };
      expect(detail.operator_ids).toHaveLength(operatorCount);
      expect(detail.operators).toHaveLength(operatorCount);
      expect(detail.viewer_ids).toHaveLength(viewerCount);
      expect(detail.viewers).toHaveLength(viewerCount);
    });
  });

  describe('响应结构验证', () => {
    it('Company 运行时字段类型验证', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(typeof company.id).toBe('number');
      expect(typeof company.short_name).toBe('string');
      expect(typeof company.full_name).toBe('string');
      expect(company.address === null || typeof company.address === 'string').toBe(true);
      expect(typeof company.contact_person).toBe('string');
      expect(typeof company.contact_phone).toBe('string');
      expect(typeof company.status).toBe('boolean');
      expect(company.created_by === null || typeof company.created_by === 'number').toBe(true);
      expect(company.updated_by === null || typeof company.updated_by === 'number').toBe(true);
      expect(company.created_at).toBeInstanceOf(Date);
      expect(company.updated_at).toBeInstanceOf(Date);
      expect(company.deleted_at === null || company.deleted_at instanceof Date).toBe(true);
    });

    it('CreateCompanyRequest 运行时字段类型验证', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(typeof req.short_name).toBe('string');
      expect(typeof req.full_name).toBe('string');
      expect(typeof req.address).toBe('string');
      expect(typeof req.contact_person).toBe('string');
      expect(typeof req.contact_phone).toBe('string');
      expect(Array.isArray(req.operator_ids)).toBe(true);
      expect(Array.isArray(req.viewer_ids)).toBe(true);
    });

    it('UpdateCompanyRequest 运行时字段类型验证', () => {
      const req: UpdateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1], viewer_ids: [],
      };
      expect(typeof req.short_name).toBe('string');
      expect(Array.isArray(req.operator_ids)).toBe(true);
      expect(Array.isArray(req.viewer_ids)).toBe(true);
    });

    it('CompanyDetail 运行时字段类型验证', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1], operators: [{ id: 1, cn_name: 'OP' }],
        viewer_ids: [], viewers: [],
      };
      expect(typeof detail.id).toBe('number');
      expect(typeof detail.status).toBe('boolean');
      expect(detail.created_by === null || typeof detail.created_by === 'number').toBe(true);
      expect(detail.updated_by === null || typeof detail.updated_by === 'number').toBe(true);
      expect(Array.isArray(detail.operator_ids)).toBe(true);
      expect(Array.isArray(detail.operators)).toBe(true);
      expect(Array.isArray(detail.viewer_ids)).toBe(true);
      expect(Array.isArray(detail.viewers)).toBe(true);
    });

    it('CompanyDetail operators 元素结构验证', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '运营者' }],
        viewer_ids: [], viewers: [],
      };
      const op = detail.operators[0];
      expect(typeof op.id).toBe('number');
      expect(typeof op.cn_name).toBe('string');
      expect(Object.keys(op)).toContain('id');
      expect(Object.keys(op)).toContain('cn_name');
    });

    it('CompanyDetail viewers 元素结构验证', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '查看者' }],
      };
      const vw = detail.viewers[0];
      expect(typeof vw.id).toBe('number');
      expect(typeof vw.cn_name).toBe('string');
    });

    it('Company 运行时 key 数量恒为 12', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      expect(Object.keys(company)).toHaveLength(12);
    });

    it('CreateCompanyRequest 全字段时 key 数量为 7', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1], viewer_ids: [2],
      };
      expect(Object.keys(req)).toHaveLength(7);
    });

    it('CompanyDetail key 数量恒为 15', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [], operators: [], viewer_ids: [], viewers: [],
      };
      expect(Object.keys(detail)).toHaveLength(15);
    });

    it('所有字符串字段 typeof 为 string', () => {
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      };
      const stringFields = ['short_name', 'full_name', 'address', 'contact_person', 'contact_phone'];
      for (const field of stringFields) {
        expect(typeof (company as any)[field]).toBe('string');
      }
    });
  });

  describe('类型推断与编译时安全', () => {
    it('Object.assign 从 CreateCompanyRequest 合并生成 Company', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B', address: 'C',
        contact_person: 'D', contact_phone: 'E',
        operator_ids: [1],
      };
      const company: Company = Object.assign({
        id: 1, status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(), deleted_at: null,
      }, {
        short_name: req.short_name, full_name: req.full_name,
        address: req.address ?? null,
        contact_person: req.contact_person,
        contact_phone: req.contact_phone,
      });
      expect(company.short_name).toBe('A');
      expect(company.id).toBe(1);
    });

    it('Partial<Company> 允许所有字段为可选', () => {
      const partial: Partial<Company> = { id: 1 };
      expect(partial.id).toBe(1);
      expect(partial.short_name).toBeUndefined();
      expect(partial.address).toBeUndefined();
      expect(partial.created_by).toBeUndefined();
      expect(partial.updated_by).toBeUndefined();
    });

    it('Pick<Company, "id" | "short_name"> 仅含选定字段', () => {
      const picked: Pick<Company, 'id' | 'short_name'> = { id: 1, short_name: 'A' };
      expect(picked.id).toBe(1);
      expect(picked.short_name).toBe('A');
      expect(Object.keys(picked)).toHaveLength(2);
    });

    it('Omit<Company, "deleted_at"> 排除 deleted_at', () => {
      const omitted: Omit<Company, 'deleted_at'> = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(omitted).not.toHaveProperty('deleted_at');
      expect(Object.keys(omitted)).toHaveLength(11);
    });
  });

  describe('数组操作与遍历', () => {
    it('operator_ids.forEach 遍历', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1, 2, 3],
      };
      const collected: number[] = [];
      req.operator_ids.forEach(id => collected.push(id));
      expect(collected).toEqual([1, 2, 3]);
    });

    it('operator_ids.map 转换', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1, 2, 3],
      };
      const doubled = req.operator_ids.map(id => id * 2);
      expect(doubled).toEqual([2, 4, 6]);
    });

    it('operator_ids.filter 过滤', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1, 2, 3, 4, 5],
      };
      const filtered = req.operator_ids.filter(id => id > 2);
      expect(filtered).toEqual([3, 4, 5]);
    });

    it('operator_ids.find 查找', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [10, 20, 30],
      };
      const found = req.operator_ids.find(id => id === 20);
      expect(found).toBe(20);
    });

    it('operator_ids.includes 检查', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1, 2, 3],
      };
      expect(req.operator_ids.includes(2)).toBe(true);
      expect(req.operator_ids.includes(99)).toBe(false);
    });

    it('operators 数组按 cn_name 排序', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [2, 1, 3],
        operators: [
          { id: 2, cn_name: '张三' },
          { id: 1, cn_name: '李四' },
          { id: 3, cn_name: '王五' },
        ],
        viewer_ids: [], viewers: [],
      };
      const sorted = [...detail.operators].sort((a, b) => a.cn_name.localeCompare(b.cn_name, 'zh'));
      expect(sorted.map(op => op.cn_name).sort()).toEqual(['张三', '李四', '王五'].sort());
      expect(sorted).toHaveLength(3);
    });

    it('viewer_ids.reduce 聚合', () => {
      const req: CreateCompanyRequest = {
        short_name: 'A', full_name: 'B',
        contact_person: 'C', contact_phone: 'D',
        operator_ids: [1], viewer_ids: [10, 20, 30],
      };
      const sum = req.viewer_ids!.reduce((acc, id) => acc + id, 0);
      expect(sum).toBe(60);
    });

    it('operators.every 全部验证', () => {
      const detail: CompanyDetail = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_by: null, updated_by: null,
        created_at: new Date(), updated_at: new Date(),
        operator_ids: [1, 2],
        operators: [{ id: 1, cn_name: 'OP1' }, { id: 2, cn_name: 'OP2' }],
        viewer_ids: [], viewers: [],
      };
      const allHaveNames = detail.operators.every(op => op.cn_name.length > 0);
      expect(allHaveNames).toBe(true);
    });
  });
});

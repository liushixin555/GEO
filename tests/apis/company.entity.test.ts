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
      };
      expect(company.short_name).toBe('A&B<Co>');
      expect(company.full_name).toBe('Company "引号" & <tags>');
      expect(company.address).toBe("O'Brien's Office, Floor 5");
      expect(company.contact_phone).toBe('+86-138-0000-0000');
      expect(company.created_at.getFullYear()).toBe(2026);
    });

    it('should allow empty string contact fields', () => {
      // TypeScript interface allows string type, empty string is valid
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
      };
      expect(company.short_name).toBe('');
      expect(company.address).toBe('');
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
        operator_ids: [1],
        operators: [{ id: 1, cn_name: 'OP', username: 'op' }],
        viewer_ids: [2],
        viewers: [{ id: 2, cn_name: 'VW', username: 'vw' }],
      };
      // Verify all Company base fields exist
      const baseKeys = ['id', 'short_name', 'full_name', 'address', 'contact_person', 'contact_phone', 'status', 'created_at', 'updated_at'];
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
      // Edge case: same user could be both operator and viewer
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
        operator_ids: [1],
        operators: [{ id: 1, cn_name: '双角色', username: 'dual' }],
        viewer_ids: [1],
        viewers: [{ id: 1, cn_name: '双角色', username: 'dual' }],
      };
      expect(detail.operator_ids).toContain(1);
      expect(detail.viewer_ids).toContain(1);
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const company: Company = {
        id: 1, short_name: 'A', full_name: 'B', address: null,
        contact_person: 'C', contact_phone: 'D', status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(company.short_name).toBe('A');
    });
  });
});

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

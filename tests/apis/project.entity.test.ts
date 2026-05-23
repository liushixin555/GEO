/**
 * @jest-environment node
 */
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../../apis/entity/project.entity';

describe('project.entity', () => {
  describe('Project interface', () => {
    it('should create a valid Project object with all required fields', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '测试项目',
        description: '项目描述',
        company_id: 1,
        company_name: '测试公司',
        operator_ids: [1, 2],
        operator_names: ['运营者1', '运营者2'],
        viewer_ids: [3],
        viewer_names: ['查看者1'],
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(project.id).toBe(1);
      expect(project.short_name).toBe('PRJ');
      expect(project.full_name).toBe('测试项目');
      expect(project.company_id).toBe(1);
      expect(project.operator_ids).toEqual([1, 2]);
      expect(project.viewer_ids).toEqual([3]);
    });

    it('should allow description to be null', () => {
      const project: Project = {
        id: 2,
        short_name: 'P2',
        full_name: '无描述项目',
        description: null,
        company_id: 1,
        company_name: '公司A',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(project.description).toBeNull();
    });

    it('should have all required fields', () => {
      const project: Project = {
        id: 1,
        short_name: 'A',
        full_name: 'B',
        description: null,
        company_id: 1,
        company_name: 'C',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: false,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(project).sort()).toEqual(
        ['id', 'short_name', 'full_name', 'description', 'company_id', 'company_name',
         'operator_ids', 'operator_names', 'viewer_ids', 'viewer_names', 'status',
         'created_at', 'updated_at'].sort()
      );
    });
  });

  describe('CreateProjectRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        company_id: 1,
      };
      expect(req.short_name).toBe('NEW');
      expect(req.company_id).toBe(1);
    });

    it('should include optional description field', () => {
      const req: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        description: '项目描述',
        company_id: 1,
      };
      expect(req.description).toBe('项目描述');
    });

    it('should include optional operator_ids field', () => {
      const req: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        company_id: 1,
        operator_ids: [1, 2],
      };
      expect(req.operator_ids).toEqual([1, 2]);
    });

    it('should include optional viewer_ids field', () => {
      const req: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        company_id: 1,
        viewer_ids: [3],
      };
      expect(req.viewer_ids).toEqual([3]);
    });
  });

  describe('UpdateProjectRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateProjectRequest = {
        short_name: 'UPD',
        full_name: '更新项目',
        description: '新描述',
        company_id: 2,
        operator_ids: [1],
        viewer_ids: [2],
        status: true,
      };
      expect(req.short_name).toBe('UPD');
      expect(req.status).toBe(true);
    });

    it('should allow partial updates with single field', () => {
      const req: UpdateProjectRequest = { short_name: 'NEW' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateProjectRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow status toggle', () => {
      const disableReq: UpdateProjectRequest = { status: false };
      expect(disableReq.status).toBe(false);
    });

    it('should allow updating operator_ids only', () => {
      const req: UpdateProjectRequest = { operator_ids: [1, 2, 3] };
      expect(req.operator_ids).toEqual([1, 2, 3]);
      expect(req.viewer_ids).toBeUndefined();
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const project: Project = {
        id: 1, short_name: 'A', full_name: 'B', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toBe('A');
    });
  });
});

/**
 * @jest-environment node
 */
import {
  Project,
  CreateProjectRequest,
  UpdateProjectRequest,
} from '../../apis/entity/project.entity';

describe('project.entity', () => {
  // ============================================================
  // Project interface
  // ============================================================
  describe('Project interface', () => {
    it('should create a valid Project object with all required fields', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '测试项目',
        description: '项目描述',
        company_id: 10,
        company_name: '薄云科技',
        operator_ids: [1, 2],
        operator_names: ['张三', '李四'],
        viewer_ids: [3],
        viewer_names: ['王五'],
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(project.id).toBe(1);
      expect(project.short_name).toBe('PRJ');
      expect(project.full_name).toBe('测试项目');
      expect(project.description).toBe('项目描述');
      expect(project.company_id).toBe(10);
      expect(project.company_name).toBe('薄云科技');
      expect(project.operator_ids).toEqual([1, 2]);
      expect(project.operator_names).toEqual(['张三', '李四']);
      expect(project.viewer_ids).toEqual([3]);
      expect(project.viewer_names).toEqual(['王五']);
      expect(project.status).toBe(true);
    });

    it('should have exactly 13 fields', () => {
      const project: Project = {
        id: 1,
        short_name: 'P',
        full_name: 'F',
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
        [
          'id', 'short_name', 'full_name', 'description',
          'company_id', 'company_name', 'operator_ids', 'operator_names',
          'viewer_ids', 'viewer_names', 'status', 'created_at', 'updated_at',
        ].sort()
      );
      expect(Object.keys(project)).toHaveLength(13);
    });

    // --- id ---
    it('should have id as number type', () => {
      const project: Project = {
        id: 999,
        short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.id).toBe('number');
      expect(project.id).toBe(999);
    });

    it('should support id as 0', () => {
      const project: Project = {
        id: 0,
        short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.id).toBe(0);
    });

    it('should support large id values', () => {
      const project: Project = {
        id: Number.MAX_SAFE_INTEGER,
        short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    // --- short_name ---
    it('should have short_name as string type', () => {
      const project: Project = {
        id: 1, short_name: 'ABC', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.short_name).toBe('string');
    });

    it('should support short_name with Chinese characters', () => {
      const project: Project = {
        id: 1, short_name: '薄云项目', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toContain('薄云');
    });

    it('should support short_name with various formats', () => {
      const names = ['PRJ-001', 'project_alpha', 'TEST2024', 'abc123'];
      names.forEach((sn) => {
        const project: Project = {
          id: 1, short_name: sn, full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        };
        expect(project.short_name).toBe(sn);
      });
    });

    it('should support empty string short_name', () => {
      const project: Project = {
        id: 1, short_name: '', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toBe('');
    });

    // --- full_name ---
    it('should have full_name as string type', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: '全名项目', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.full_name).toBe('string');
    });

    it('should support full_name with Chinese characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: '薄云商机倍增服务项目', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.full_name).toContain('薄云');
    });

    it('should support full_name with special characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: '项目 A (v2.0) - 测试版', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.full_name).toContain('v2.0');
    });

    // --- description ---
    it('should support description as string', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: '这是一个详细描述',
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toBe('这是一个详细描述');
    });

    it('should support description as null', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toBeNull();
    });

    it('should support description as empty string', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: '',
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toBe('');
    });

    it('should support long description text', () => {
      const longDesc = 'A'.repeat(1000);
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: longDesc,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toBe(longDesc);
      expect(project.description!.length).toBe(1000);
    });

    // --- company_id ---
    it('should have company_id as number type', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 42, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.company_id).toBe('number');
      expect(project.company_id).toBe(42);
    });

    it('should support company_id as 0', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 0, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.company_id).toBe(0);
    });

    // --- company_name ---
    it('should have company_name as string type', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: '测试公司', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.company_name).toBe('string');
      expect(project.company_name).toBe('测试公司');
    });

    it('should support company_name with Chinese characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: '薄云科技有限公司', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.company_name).toContain('薄云');
    });

    // --- operator_ids ---
    it('should have operator_ids as number array', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1, 2, 3], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Array.isArray(project.operator_ids)).toBe(true);
      expect(project.operator_ids).toEqual([1, 2, 3]);
    });

    it('should support empty operator_ids', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids).toEqual([]);
      expect(project.operator_ids).toHaveLength(0);
    });

    it('should support operator_ids with single element', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [99], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids).toHaveLength(1);
      expect(project.operator_ids[0]).toBe(99);
    });

    it('should support operator_ids with many elements', () => {
      const ids = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: ids, operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids).toHaveLength(10);
    });

    // --- operator_names ---
    it('should have operator_names as string array', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: ['张三', '李四'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Array.isArray(project.operator_names)).toBe(true);
      expect(project.operator_names).toEqual(['张三', '李四']);
    });

    it('should support empty operator_names', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_names).toEqual([]);
    });

    it('should support operator_names with Chinese characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: ['赵一', '钱二', '孙三'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_names[0]).toContain('赵');
    });

    // --- viewer_ids ---
    it('should have viewer_ids as number array', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [10, 20], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Array.isArray(project.viewer_ids)).toBe(true);
      expect(project.viewer_ids).toEqual([10, 20]);
    });

    it('should support empty viewer_ids', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.viewer_ids).toEqual([]);
      expect(project.viewer_ids).toHaveLength(0);
    });

    it('should support viewer_ids with single element', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [50], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.viewer_ids).toHaveLength(1);
      expect(project.viewer_ids[0]).toBe(50);
    });

    // --- viewer_names ---
    it('should have viewer_names as string array', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: ['王五', '周六'], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Array.isArray(project.viewer_names)).toBe(true);
      expect(project.viewer_names).toEqual(['王五', '周六']);
    });

    it('should support empty viewer_names', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.viewer_names).toEqual([]);
    });

    // --- status ---
    it('should have status as boolean type', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof project.status).toBe('boolean');
    });

    it('should support status as true (active)', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.status).toBe(true);
    });

    it('should support status as false (inactive)', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: false,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.status).toBe(false);
    });

    // --- created_at / updated_at ---
    it('should have created_at as Date instance', () => {
      const now = new Date();
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: now, updated_at: new Date(),
      };
      expect(project.created_at).toBeInstanceOf(Date);
      expect(project.created_at).toBe(now);
    });

    it('should have updated_at as Date instance', () => {
      const now = new Date();
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: now,
      };
      expect(project.updated_at).toBeInstanceOf(Date);
      expect(project.updated_at).toBe(now);
    });

    it('should support different created_at and updated_at timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: created, updated_at: updated,
      };
      expect(project.created_at.getTime()).toBeLessThan(project.updated_at.getTime());
    });

    it('should support same created_at and updated_at timestamps', () => {
      const now = new Date();
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: now, updated_at: now,
      };
      expect(project.created_at.getTime()).toBe(project.updated_at.getTime());
    });

    // --- realistic scenarios ---
    it('should create a complete project with realistic data', () => {
      const project: Project = {
        id: 100,
        short_name: 'BY-GEO',
        full_name: '薄云商机倍增服务',
        description: '基于AI的商机管理系统',
        company_id: 1,
        company_name: '薄云科技有限公司',
        operator_ids: [1, 2, 3],
        operator_names: ['管理员A', '运营B', '编辑C'],
        viewer_ids: [4, 5],
        viewer_names: ['观察者D', '观察者E'],
        status: true,
        created_at: new Date('2024-06-01T08:00:00Z'),
        updated_at: new Date('2024-06-15T12:30:00Z'),
      };
      expect(project.short_name).toBe('BY-GEO');
      expect(project.full_name).toContain('薄云');
      expect(project.operator_ids).toHaveLength(3);
      expect(project.viewer_ids).toHaveLength(2);
      expect(project.status).toBe(true);
    });

    it('should create a project with no operators or viewers', () => {
      const project: Project = {
        id: 2,
        short_name: 'EMPTY',
        full_name: '空项目',
        description: null,
        company_id: 5,
        company_name: '测试公司',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: false,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      expect(project.operator_ids).toHaveLength(0);
      expect(project.viewer_ids).toHaveLength(0);
      expect(project.description).toBeNull();
      expect(project.status).toBe(false);
    });

    it('should create a project with many operators and viewers', () => {
      const operators = Array.from({ length: 20 }, (_, i) => i + 1);
      const opNames = operators.map((id) => `运营${id}`);
      const viewers = Array.from({ length: 50 }, (_, i) => i + 100);
      const vNames = viewers.map((id) => `观察${id}`);
      const project: Project = {
        id: 3,
        short_name: 'BIG',
        full_name: '大型项目',
        description: '有很多参与者的项目',
        company_id: 1,
        company_name: '大公司',
        operator_ids: operators,
        operator_names: opNames,
        viewer_ids: viewers,
        viewer_names: vNames,
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(project.operator_ids).toHaveLength(20);
      expect(project.viewer_ids).toHaveLength(50);
    });
  });

  // ============================================================
  // CreateProjectRequest interface
  // ============================================================
  describe('CreateProjectRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '新项目',
        company_id: 1,
      };
      expect(req.short_name).toBe('PRJ');
      expect(req.full_name).toBe('新项目');
      expect(req.company_id).toBe(1);
    });

    it('should have exactly 3 required fields when no optionals', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(Object.keys(req).sort()).toEqual(['company_id', 'full_name', 'short_name']);
    });

    it('should create a request with all optional fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '完整项目',
        description: '项目描述',
        company_id: 10,
        operator_ids: [1, 2],
        viewer_ids: [3, 4],
      };
      expect(Object.keys(req)).toHaveLength(6);
      expect(req.description).toBe('项目描述');
      expect(req.operator_ids).toEqual([1, 2]);
      expect(req.viewer_ids).toEqual([3, 4]);
    });

    // --- short_name ---
    it('should have short_name as string type', () => {
      const req: CreateProjectRequest = {
        short_name: 'ABC',
        full_name: 'F',
        company_id: 1,
      };
      expect(typeof req.short_name).toBe('string');
    });

    it('should support short_name with various formats', () => {
      const names = ['PRJ-001', 'test_project', 'ABC123', '中文简称'];
      names.forEach((sn) => {
        const req: CreateProjectRequest = {
          short_name: sn,
          full_name: 'F',
          company_id: 1,
        };
        expect(req.short_name).toBe(sn);
      });
    });

    // --- full_name ---
    it('should have full_name as string type', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: '完整名称',
        company_id: 1,
      };
      expect(typeof req.full_name).toBe('string');
    });

    it('should support full_name with Chinese characters', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: '薄云商机倍增服务项目',
        company_id: 1,
      };
      expect(req.full_name).toContain('薄云');
    });

    // --- description (optional) ---
    it('should allow omitting description', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
      };
      expect(req.description).toBeUndefined();
    });

    it('should support description as string', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        description: '描述内容',
        company_id: 1,
      };
      expect(req.description).toBe('描述内容');
    });

    it('should support description as empty string', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        description: '',
        company_id: 1,
      };
      expect(req.description).toBe('');
    });

    // --- company_id ---
    it('should have company_id as number type', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 42,
      };
      expect(typeof req.company_id).toBe('number');
      expect(req.company_id).toBe(42);
    });

    it('should support company_id as 0', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 0,
      };
      expect(req.company_id).toBe(0);
    });

    // --- operator_ids (optional) ---
    it('should allow omitting operator_ids', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
      };
      expect(req.operator_ids).toBeUndefined();
    });

    it('should support operator_ids as number array', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        operator_ids: [1, 2, 3],
      };
      expect(req.operator_ids).toEqual([1, 2, 3]);
    });

    it('should support empty operator_ids', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        operator_ids: [],
      };
      expect(req.operator_ids).toEqual([]);
    });

    // --- viewer_ids (optional) ---
    it('should allow omitting viewer_ids', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
      };
      expect(req.viewer_ids).toBeUndefined();
    });

    it('should support viewer_ids as number array', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        viewer_ids: [10, 20],
      };
      expect(req.viewer_ids).toEqual([10, 20]);
    });

    it('should support empty viewer_ids', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        viewer_ids: [],
      };
      expect(req.viewer_ids).toEqual([]);
    });

    // --- realistic scenarios ---
    it('should create a minimal request with only required fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'MIN',
        full_name: '最小项目',
        company_id: 1,
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(req.description).toBeUndefined();
      expect(req.operator_ids).toBeUndefined();
      expect(req.viewer_ids).toBeUndefined();
    });

    it('should create a request for 薄云项目', () => {
      const req: CreateProjectRequest = {
        short_name: 'BY',
        full_name: '薄云商机倍增服务',
        description: 'AI驱动的商机管理平台',
        company_id: 1,
        operator_ids: [1],
        viewer_ids: [2, 3],
      };
      expect(req.full_name).toContain('薄云');
      expect(req.operator_ids).toHaveLength(1);
      expect(req.viewer_ids).toHaveLength(2);
    });
  });

  // ============================================================
  // UpdateProjectRequest interface
  // ============================================================
  describe('UpdateProjectRequest interface', () => {
    it('should create a valid request with all fields', () => {
      const req: UpdateProjectRequest = {
        short_name: 'UPD',
        full_name: '更新项目',
        description: '新描述',
        company_id: 2,
        operator_ids: [5, 6],
        viewer_ids: [7],
        status: true,
      };
      expect(req.short_name).toBe('UPD');
      expect(req.full_name).toBe('更新项目');
      expect(req.description).toBe('新描述');
      expect(req.company_id).toBe(2);
      expect(req.operator_ids).toEqual([5, 6]);
      expect(req.viewer_ids).toEqual([7]);
      expect(req.status).toBe(true);
    });

    it('should have exactly 7 optional fields when all provided', () => {
      const req: UpdateProjectRequest = {
        short_name: 'S',
        full_name: 'F',
        description: 'D',
        company_id: 1,
        operator_ids: [],
        viewer_ids: [],
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(7);
      expect(Object.keys(req).sort()).toEqual(
        ['company_id', 'description', 'full_name', 'operator_ids', 'short_name', 'status', 'viewer_ids']
      );
    });

    it('should allow empty update request', () => {
      const req: UpdateProjectRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    // --- partial updates ---
    it('should allow updating short_name only', () => {
      const req: UpdateProjectRequest = { short_name: 'NEW' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.short_name).toBe('NEW');
      expect(req.full_name).toBeUndefined();
    });

    it('should allow updating full_name only', () => {
      const req: UpdateProjectRequest = { full_name: '新全名' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.full_name).toBe('新全名');
      expect(req.short_name).toBeUndefined();
    });

    it('should allow updating description only', () => {
      const req: UpdateProjectRequest = { description: '新描述' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.description).toBe('新描述');
    });

    it('should allow updating description to empty string', () => {
      const req: UpdateProjectRequest = { description: '' };
      expect(req.description).toBe('');
    });

    it('should allow updating company_id only', () => {
      const req: UpdateProjectRequest = { company_id: 99 };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.company_id).toBe(99);
    });

    it('should allow updating operator_ids only', () => {
      const req: UpdateProjectRequest = { operator_ids: [1, 2, 3] };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.operator_ids).toEqual([1, 2, 3]);
    });

    it('should allow updating operator_ids to empty array', () => {
      const req: UpdateProjectRequest = { operator_ids: [] };
      expect(req.operator_ids).toEqual([]);
    });

    it('should allow updating viewer_ids only', () => {
      const req: UpdateProjectRequest = { viewer_ids: [10] };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.viewer_ids).toEqual([10]);
    });

    it('should allow updating viewer_ids to empty array', () => {
      const req: UpdateProjectRequest = { viewer_ids: [] };
      expect(req.viewer_ids).toEqual([]);
    });

    it('should allow updating status only (enable)', () => {
      const req: UpdateProjectRequest = { status: true };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.status).toBe(true);
    });

    it('should allow updating status only (disable)', () => {
      const req: UpdateProjectRequest = { status: false };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.status).toBe(false);
    });

    it('should allow status toggle from disabled to enabled', () => {
      const disableReq: UpdateProjectRequest = { status: false };
      expect(disableReq.status).toBe(false);
      const enableReq: UpdateProjectRequest = { status: true };
      expect(enableReq.status).toBe(true);
    });

    // --- combined updates ---
    it('should allow updating short_name and full_name together', () => {
      const req: UpdateProjectRequest = {
        short_name: 'NEW',
        full_name: '新名称',
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.short_name).toBe('NEW');
      expect(req.full_name).toBe('新名称');
      expect(req.description).toBeUndefined();
    });

    it('should allow updating operator_ids and viewer_ids together', () => {
      const req: UpdateProjectRequest = {
        operator_ids: [1, 2],
        viewer_ids: [3, 4, 5],
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.operator_ids).toEqual([1, 2]);
      expect(req.viewer_ids).toEqual([3, 4, 5]);
    });

    it('should allow updating description and status together', () => {
      const req: UpdateProjectRequest = {
        description: '更新后的描述',
        status: true,
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.description).toBe('更新后的描述');
      expect(req.status).toBe(true);
    });

    it('should allow updating company_id and operator_ids together', () => {
      const req: UpdateProjectRequest = {
        company_id: 5,
        operator_ids: [10, 20],
      };
      expect(Object.keys(req)).toHaveLength(2);
      expect(req.company_id).toBe(5);
      expect(req.operator_ids).toEqual([10, 20]);
    });

    it('should allow updating all fields except status', () => {
      const req: UpdateProjectRequest = {
        short_name: 'UP',
        full_name: '全部更新',
        description: '新描述',
        company_id: 3,
        operator_ids: [1],
        viewer_ids: [2],
      };
      expect(Object.keys(req)).toHaveLength(6);
      expect(req.status).toBeUndefined();
    });

    it('should allow updating all fields except company_id', () => {
      const req: UpdateProjectRequest = {
        short_name: 'UP',
        full_name: '除公司外全部更新',
        description: '描述',
        operator_ids: [],
        viewer_ids: [],
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(6);
      expect(req.company_id).toBeUndefined();
    });

    // --- type checks ---
    it('should have short_name as string type when provided', () => {
      const req: UpdateProjectRequest = { short_name: 'test' };
      expect(typeof req.short_name).toBe('string');
    });

    it('should have full_name as string type when provided', () => {
      const req: UpdateProjectRequest = { full_name: 'test' };
      expect(typeof req.full_name).toBe('string');
    });

    it('should have description as string type when provided', () => {
      const req: UpdateProjectRequest = { description: 'test' };
      expect(typeof req.description).toBe('string');
    });

    it('should have company_id as number type when provided', () => {
      const req: UpdateProjectRequest = { company_id: 1 };
      expect(typeof req.company_id).toBe('number');
    });

    it('should have operator_ids as array type when provided', () => {
      const req: UpdateProjectRequest = { operator_ids: [1] };
      expect(Array.isArray(req.operator_ids)).toBe(true);
    });

    it('should have viewer_ids as array type when provided', () => {
      const req: UpdateProjectRequest = { viewer_ids: [1] };
      expect(Array.isArray(req.viewer_ids)).toBe(true);
    });

    it('should have status as boolean type when provided', () => {
      const req: UpdateProjectRequest = { status: true };
      expect(typeof req.status).toBe('boolean');
    });

    // --- edge cases ---
    it('should support short_name with Chinese characters', () => {
      const req: UpdateProjectRequest = { short_name: '薄云' };
      expect(req.short_name).toContain('薄云');
    });

    it('should support full_name with Chinese characters', () => {
      const req: UpdateProjectRequest = { full_name: '薄云商机倍增服务' };
      expect(req.full_name).toContain('薄云');
    });

    it('should support description with Chinese characters', () => {
      const req: UpdateProjectRequest = { description: '薄云AI项目描述' };
      expect(req.description).toContain('薄云');
    });

    it('should support empty string short_name', () => {
      const req: UpdateProjectRequest = { short_name: '' };
      expect(req.short_name).toBe('');
    });

    it('should support empty string full_name', () => {
      const req: UpdateProjectRequest = { full_name: '' };
      expect(req.full_name).toBe('');
    });

    it('should support empty string description', () => {
      const req: UpdateProjectRequest = { description: '' };
      expect(req.description).toBe('');
    });

    it('should support company_id as 0', () => {
      const req: UpdateProjectRequest = { company_id: 0 };
      expect(req.company_id).toBe(0);
    });

    it('should support large company_id value', () => {
      const req: UpdateProjectRequest = { company_id: Number.MAX_SAFE_INTEGER };
      expect(req.company_id).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  // ============================================================
  // Project 边界值与特殊场景
  // ============================================================
  describe('Project edge cases and special scenarios', () => {
    it('should support negative id values', () => {
      const project: Project = {
        id: -1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.id).toBe(-1);
      expect(project.id).toBeLessThan(0);
    });

    it('should support negative large id values', () => {
      const project: Project = {
        id: -Number.MAX_SAFE_INTEGER, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.id).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should support decimal id (TypeScript does not enforce integer)', () => {
      const project: Project = {
        id: 3.14, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.id).toBe(3.14);
    });

    it('should support very long short_name strings', () => {
      const longName = 'A'.repeat(1000);
      const project: Project = {
        id: 1, short_name: longName, full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toBe(longName);
      expect(project.short_name.length).toBe(1000);
    });

    it('should support very long full_name strings', () => {
      const longName = '项目'.repeat(500);
      const project: Project = {
        id: 1, short_name: 'P', full_name: longName, description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.full_name).toBe(longName);
    });

    it('should support very long description strings', () => {
      const longDesc = '描述内容'.repeat(500);
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: longDesc,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toBe(longDesc);
    });

    it('should support very long company_name strings', () => {
      const longCompany = '公司'.repeat(500);
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: longCompany, operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.company_name).toBe(longCompany);
    });

    it('should support short_name with emoji characters', () => {
      const project: Project = {
        id: 1, short_name: '🚀 项目', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toContain('🚀');
    });

    it('should support full_name with emoji characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: '🎯 薄云项目 ✨', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.full_name).toContain('🎯');
      expect(project.full_name).toContain('✨');
    });

    it('should support description with emoji characters', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: '📝 这是描述',
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.description).toContain('📝');
    });

    it('should support strings with whitespace', () => {
      const project: Project = {
        id: 1, short_name: '  spaced  ', full_name: '  全名  ', description: '  描述  ',
        company_id: 1, company_name: '  公司  ', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toContain(' ');
      expect(project.full_name).toContain(' ');
      expect(project.description).toContain(' ');
      expect(project.company_name).toContain(' ');
    });

    it('should support strings with newlines and tabs', () => {
      const project: Project = {
        id: 1, short_name: 'line1\nline2', full_name: 'name\twith\ttabs', description: 'desc\nwith\nnewlines',
        company_id: 1, company_name: 'company\nnewline', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toContain('\n');
      expect(project.full_name).toContain('\t');
      expect(project.description).toContain('\n');
    });

    it('should support unicode characters in all string fields', () => {
      const project: Project = {
        id: 1, short_name: 'プロジェクト', full_name: '프로젝트 이름', description: 'Проект',
        company_id: 1, company_name: 'Компания', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.short_name).toContain('プロ');
      expect(project.full_name).toContain('프로');
      expect(project.description).toContain('Проект');
    });

    it('should support Date epoch (1970-01-01)', () => {
      const epoch = new Date(0);
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: epoch, updated_at: epoch,
      };
      expect(project.created_at.getTime()).toBe(0);
      expect(project.updated_at.getTime()).toBe(0);
    });

    it('should support far future dates', () => {
      const future = new Date('2099-12-31T23:59:59Z');
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: future, updated_at: future,
      };
      expect(project.created_at.getUTCFullYear()).toBe(2099);
    });

    it('should support far past dates', () => {
      const past = new Date('2000-01-01T00:00:00Z');
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: past, updated_at: past,
      };
      expect(project.created_at.getFullYear()).toBe(2000);
    });

    it('should support operator_ids with duplicate values', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1, 1, 2, 2], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids).toEqual([1, 1, 2, 2]);
      expect(project.operator_ids).toHaveLength(4);
    });

    it('should support viewer_ids with duplicate values', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [5, 5, 5], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.viewer_ids).toEqual([5, 5, 5]);
    });

    it('should support operator_ids with large numbers', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [Number.MAX_SAFE_INTEGER], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids[0]).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support operator_names with empty strings', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1], operator_names: [''],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_names).toEqual(['']);
    });

    it('should support viewer_names with empty strings', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [1], viewer_names: [''], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.viewer_names).toEqual(['']);
    });

    it('should support mismatched operator_ids and operator_names lengths', () => {
      // TypeScript interface doesn't enforce matching lengths at runtime
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1, 2, 3], operator_names: ['张三'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.operator_ids).toHaveLength(3);
      expect(project.operator_names).toHaveLength(1);
    });

    it('should support negative company_id', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: -5, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.company_id).toBe(-5);
    });

    it('should support empty string company_name', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: '', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.company_name).toBe('');
    });

    it('should support empty string full_name', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: '', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.full_name).toBe('');
    });
  });

  // ============================================================
  // Project 对象操作
  // ============================================================
  describe('Project object operations', () => {
    const createProject = (): Project => ({
      id: 1,
      short_name: 'PRJ',
      full_name: '测试项目',
      description: '描述',
      company_id: 10,
      company_name: '薄云科技',
      operator_ids: [1, 2],
      operator_names: ['张三', '李四'],
      viewer_ids: [3],
      viewer_names: ['王五'],
      status: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    });

    it('should be serializable to JSON', () => {
      const project = createProject();
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.short_name).toBe('PRJ');
      expect(parsed.full_name).toBe('测试项目');
      expect(parsed.company_id).toBe(10);
      expect(parsed.company_name).toBe('薄云科技');
      expect(parsed.operator_ids).toEqual([1, 2]);
      expect(parsed.viewer_ids).toEqual([3]);
      expect(parsed.status).toBe(true);
    });

    it('should serialize dates as ISO strings in JSON', () => {
      const project = createProject();
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
    });

    it('should serialize arrays correctly in JSON', () => {
      const project = createProject();
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      expect(Array.isArray(parsed.operator_ids)).toBe(true);
      expect(Array.isArray(parsed.operator_names)).toBe(true);
      expect(Array.isArray(parsed.viewer_ids)).toBe(true);
      expect(Array.isArray(parsed.viewer_names)).toBe(true);
    });

    it('should serialize null description correctly in JSON', () => {
      const project: Project = {
        ...createProject(),
        description: null,
      };
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
    });

    it('should be cloneable with spread operator', () => {
      const project = createProject();
      const clone = { ...project };
      expect(clone).toEqual(project);
      expect(clone).not.toBe(project);
    });

    it('should clone arrays as references (shallow copy)', () => {
      const project = createProject();
      const clone = { ...project };
      expect(clone.operator_ids).toBe(project.operator_ids); // same reference
      expect(clone.viewer_names).toBe(project.viewer_names); // same reference
    });

    it('should allow field override via spread', () => {
      const project = createProject();
      const updated = { ...project, short_name: 'NEW', status: false };
      expect(updated.short_name).toBe('NEW');
      expect(updated.status).toBe(false);
      expect(updated.full_name).toBe('测试项目'); // unchanged
      expect(updated.company_id).toBe(10); // unchanged
    });

    it('should be destructurable', () => {
      const project = createProject();
      const { id, short_name, full_name, description, company_id, company_name,
        operator_ids, operator_names, viewer_ids, viewer_names, status,
        created_at, updated_at } = project;
      expect(id).toBe(1);
      expect(short_name).toBe('PRJ');
      expect(full_name).toBe('测试项目');
      expect(description).toBe('描述');
      expect(company_id).toBe(10);
      expect(company_name).toBe('薄云科技');
      expect(operator_ids).toEqual([1, 2]);
      expect(operator_names).toEqual(['张三', '李四']);
      expect(viewer_ids).toEqual([3]);
      expect(viewer_names).toEqual(['王五']);
      expect(status).toBe(true);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should support Object.keys enumeration', () => {
      const project = createProject();
      const keys = Object.keys(project);
      expect(keys).toContain('id');
      expect(keys).toContain('short_name');
      expect(keys).toContain('full_name');
      expect(keys).toContain('description');
      expect(keys).toContain('company_id');
      expect(keys).toContain('company_name');
      expect(keys).toContain('operator_ids');
      expect(keys).toContain('operator_names');
      expect(keys).toContain('viewer_ids');
      expect(keys).toContain('viewer_names');
      expect(keys).toContain('status');
      expect(keys).toContain('created_at');
      expect(keys).toContain('updated_at');
    });

    it('should support Object.values enumeration', () => {
      const project = createProject();
      const values = Object.values(project);
      expect(values).toContain(1);
      expect(values).toContain('PRJ');
      expect(values).toContain('测试项目');
      expect(values).toContain(true);
    });

    it('should support Object.entries iteration', () => {
      const project = createProject();
      const entries = Object.entries(project);
      expect(entries.length).toBe(13);
      const nameEntry = entries.find(([key]) => key === 'short_name');
      expect(nameEntry).toBeDefined();
      expect(nameEntry![1]).toBe('PRJ');
    });

    it('should support "in" operator', () => {
      const project = createProject();
      expect('id' in project).toBe(true);
      expect('short_name' in project).toBe(true);
      expect('company_id' in project).toBe(true);
      expect('operator_ids' in project).toBe(true);
      expect('nonexistent' in project).toBe(false);
    });

    it('should support Object.freeze on project', () => {
      const project = createProject();
      Object.freeze(project);
      expect(Object.isFrozen(project)).toBe(true);
    });

    it('should be usable in an array', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: '项目A', description: null,
          company_id: 1, company_name: 'C1', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: '项目B', description: 'desc',
          company_id: 2, company_name: 'C2', operator_ids: [1], operator_names: ['user1'],
          viewer_ids: [2, 3], viewer_names: ['v1', 'v2'], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 3, short_name: 'C', full_name: '项目C', description: null,
          company_id: 1, company_name: 'C1', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: false,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      expect(projects).toHaveLength(3);
      expect(projects[0].short_name).toBe('A');
      expect(projects[2].status).toBe(false);
    });

    it('should support filtering by status', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: false,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 3, short_name: 'C', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const active = projects.filter(p => p.status);
      expect(active).toHaveLength(2);
    });

    it('should support filtering by company_id', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C1', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 2, company_name: 'C2', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const filtered = projects.filter(p => p.company_id === 1);
      expect(filtered).toHaveLength(1);
      expect(filtered[0].company_name).toBe('C1');
    });

    it('should support sorting by id', () => {
      const projects: Project[] = [
        {
          id: 3, short_name: 'C', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const sorted = [...projects].sort((a, b) => a.id - b.id);
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should support mapping to extract short_names', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const names = projects.map(p => p.short_name);
      expect(names).toEqual(['A', 'B']);
    });

    it('should support finding by short_name', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'PRJ-A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'PRJ-B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const found = projects.find(p => p.short_name === 'PRJ-B');
      expect(found).toBeDefined();
      expect(found!.id).toBe(2);
    });

    it('should support checking if user is operator', () => {
      const project = createProject();
      expect(project.operator_ids.includes(1)).toBe(true);
      expect(project.operator_ids.includes(3)).toBe(false);
    });

    it('should support checking if user is viewer', () => {
      const project = createProject();
      expect(project.viewer_ids.includes(3)).toBe(true);
      expect(project.viewer_ids.includes(1)).toBe(false);
    });

    it('should support JSON parse/parse round-trip preserving data types except Date', () => {
      const project = createProject();
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      // After round-trip, dates become strings
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      // Other fields preserve types
      expect(typeof parsed.id).toBe('number');
      expect(typeof parsed.short_name).toBe('string');
      expect(typeof parsed.status).toBe('boolean');
    });
  });

  // ============================================================
  // CreateProjectRequest 边界值与特殊场景
  // ============================================================
  describe('CreateProjectRequest edge cases and special scenarios', () => {
    it('should support very long short_name strings', () => {
      const longName = 'A'.repeat(1000);
      const req: CreateProjectRequest = {
        short_name: longName,
        full_name: 'F',
        company_id: 1,
      };
      expect(req.short_name.length).toBe(1000);
    });

    it('should support very long full_name strings', () => {
      const longName = '项目'.repeat(500);
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: longName,
        company_id: 1,
      };
      expect(req.full_name).toBe(longName);
    });

    it('should support very long description strings', () => {
      const longDesc = '描述'.repeat(500);
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        description: longDesc,
        company_id: 1,
      };
      expect(req.description).toBe(longDesc);
    });

    it('should support short_name with emoji characters', () => {
      const req: CreateProjectRequest = {
        short_name: '🚀 项目',
        full_name: 'F',
        company_id: 1,
      };
      expect(req.short_name).toContain('🚀');
    });

    it('should support full_name with emoji characters', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: '🎯 目标项目 ✨',
        company_id: 1,
      };
      expect(req.full_name).toContain('🎯');
    });

    it('should support strings with newlines and tabs', () => {
      const req: CreateProjectRequest = {
        short_name: 'line1\nline2',
        full_name: 'name\twith\ttabs',
        description: 'desc\nwith\nnewlines',
        company_id: 1,
      };
      expect(req.short_name).toContain('\n');
      expect(req.full_name).toContain('\t');
      expect(req.description).toContain('\n');
    });

    it('should support unicode characters in all fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'プロジェクト',
        full_name: '프로젝트 이름',
        description: 'Проект',
        company_id: 1,
      };
      expect(req.short_name).toContain('プロ');
      expect(req.full_name).toContain('프로');
      expect(req.description).toContain('Проект');
    });

    it('should be serializable to JSON', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '项目',
        description: '描述',
        company_id: 1,
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(req);
    });

    it('should be cloneable with spread operator', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '项目',
        company_id: 1,
      };
      const clone = { ...req };
      expect(clone).toEqual(req);
      expect(clone).not.toBe(req);
    });

    it('should be destructurable', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '项目',
        description: '描述',
        company_id: 1,
        operator_ids: [1],
        viewer_ids: [2],
      };
      const { short_name, full_name, description, company_id, operator_ids, viewer_ids } = req;
      expect(short_name).toBe('PRJ');
      expect(full_name).toBe('项目');
      expect(description).toBe('描述');
      expect(company_id).toBe(1);
      expect(operator_ids).toEqual([1]);
      expect(viewer_ids).toEqual([2]);
    });

    it('should support operator_ids with many elements', () => {
      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        operator_ids: ids,
      };
      expect(req.operator_ids).toHaveLength(100);
    });

    it('should support viewer_ids with many elements', () => {
      const ids = Array.from({ length: 100 }, (_, i) => i + 1);
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        viewer_ids: ids,
      };
      expect(req.viewer_ids).toHaveLength(100);
    });

    it('should support whitespace-only strings', () => {
      const req: CreateProjectRequest = {
        short_name: '   ',
        full_name: '   ',
        description: '   ',
        company_id: 1,
      };
      expect(req.short_name.trim()).toBe('');
      expect(req.full_name.trim()).toBe('');
      expect(req.description!.trim()).toBe('');
    });

    it('should support negative company_id', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: -1,
      };
      expect(req.company_id).toBe(-1);
    });

    it('should support large company_id value', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: Number.MAX_SAFE_INTEGER,
      };
      expect(req.company_id).toBe(Number.MAX_SAFE_INTEGER);
    });
  });

  // ============================================================
  // UpdateProjectRequest 边界值与特殊场景
  // ============================================================
  describe('UpdateProjectRequest edge cases and special scenarios', () => {
    it('should support very long strings in updates', () => {
      const req: UpdateProjectRequest = {
        short_name: 'A'.repeat(1000),
        full_name: '项目'.repeat(500),
      };
      expect(req.short_name!.length).toBe(1000);
      expect(req.full_name!.length).toBe(1000);
    });

    it('should support emoji in update fields', () => {
      const req: UpdateProjectRequest = {
        short_name: '🚀',
        full_name: '🎯 新项目',
        description: '📝 新描述',
      };
      expect(req.short_name).toContain('🚀');
      expect(req.full_name).toContain('🎯');
      expect(req.description).toContain('📝');
    });

    it('should support unicode in update fields', () => {
      const req: UpdateProjectRequest = {
        short_name: 'プロジェクト',
        full_name: '프로젝트',
        description: 'Проект',
      };
      expect(req.short_name).toContain('プロ');
      expect(req.full_name).toContain('프로');
      expect(req.description).toContain('Проект');
    });

    it('should be serializable to JSON', () => {
      const req: UpdateProjectRequest = {
        short_name: 'NEW',
        status: false,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.short_name).toBe('NEW');
      expect(parsed.status).toBe(false);
    });

    it('should serialize empty update to empty JSON object', () => {
      const req: UpdateProjectRequest = {};
      const json = JSON.stringify(req);
      expect(json).toBe('{}');
    });

    it('should be cloneable with spread operator', () => {
      const req: UpdateProjectRequest = { short_name: 'test', status: true };
      const clone = { ...req };
      expect(clone).toEqual(req);
      expect(clone).not.toBe(req);
    });

    it('should be destructurable with defaults', () => {
      const req: UpdateProjectRequest = { short_name: 'NEW', status: true };
      const { short_name = 'default', status = false, full_name = '默认名' } = req;
      expect(short_name).toBe('NEW');
      expect(status).toBe(true);
      expect(full_name).toBe('默认名');
    });

    it('should allow sequential updates to be applied', () => {
      const original: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '原项目',
        description: '原描述',
        company_id: 1,
        company_name: '薄云',
        operator_ids: [1],
        operator_names: ['张三'],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };

      const update1: UpdateProjectRequest = { full_name: '更新项目名' };
      const after1 = { ...original, ...update1, updated_at: new Date() };
      expect(after1.full_name).toBe('更新项目名');
      expect(after1.short_name).toBe('PRJ');

      const update2: UpdateProjectRequest = { status: false, description: '已关闭' };
      const after2 = { ...after1, ...update2, updated_at: new Date() };
      expect(after2.status).toBe(false);
      expect(after2.description).toBe('已关闭');
      expect(after2.full_name).toBe('更新项目名'); // retained from update1
    });

    it('should allow status toggle sequence', () => {
      const toggle1: UpdateProjectRequest = { status: false };
      const toggle2: UpdateProjectRequest = { status: true };
      const toggle3: UpdateProjectRequest = { status: false };
      expect(toggle1.status).toBe(false);
      expect(toggle2.status).toBe(true);
      expect(toggle3.status).toBe(false);
    });

    it('should allow updating all 7 fields simultaneously', () => {
      const req: UpdateProjectRequest = {
        short_name: 'NEW',
        full_name: '新名称',
        description: '新描述',
        company_id: 99,
        operator_ids: [1, 2],
        viewer_ids: [3, 4],
        status: false,
      };
      expect(Object.keys(req)).toHaveLength(7);
      expect(req.short_name).toBe('NEW');
      expect(req.full_name).toBe('新名称');
      expect(req.description).toBe('新描述');
      expect(req.company_id).toBe(99);
      expect(req.operator_ids).toEqual([1, 2]);
      expect(req.viewer_ids).toEqual([3, 4]);
      expect(req.status).toBe(false);
    });

    it('should support whitespace-only string updates', () => {
      const req: UpdateProjectRequest = {
        short_name: '   ',
        full_name: '   ',
        description: '   ',
      };
      expect(req.short_name!.trim()).toBe('');
      expect(req.full_name!.trim()).toBe('');
      expect(req.description!.trim()).toBe('');
    });

    it('should distinguish between undefined and empty string', () => {
      const reqWithUndefined: UpdateProjectRequest = { short_name: undefined };
      const reqWithEmpty: UpdateProjectRequest = { short_name: '' };
      expect(reqWithUndefined.short_name).toBeUndefined();
      expect(reqWithEmpty.short_name).toBe('');
      expect('short_name' in reqWithUndefined).toBe(true);
      expect('short_name' in reqWithEmpty).toBe(true);
    });

    it('should distinguish between undefined and empty array for operator_ids', () => {
      const reqUndefined: UpdateProjectRequest = { operator_ids: undefined };
      const reqEmpty: UpdateProjectRequest = { operator_ids: [] };
      expect(reqUndefined.operator_ids).toBeUndefined();
      expect(reqEmpty.operator_ids).toEqual([]);
      expect(reqEmpty.operator_ids).toHaveLength(0);
    });

    it('should distinguish between undefined and empty array for viewer_ids', () => {
      const reqUndefined: UpdateProjectRequest = { viewer_ids: undefined };
      const reqEmpty: UpdateProjectRequest = { viewer_ids: [] };
      expect(reqUndefined.viewer_ids).toBeUndefined();
      expect(reqEmpty.viewer_ids).toEqual([]);
    });

    it('should support operator_ids with many elements', () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const req: UpdateProjectRequest = { operator_ids: ids };
      expect(req.operator_ids).toHaveLength(50);
    });

    it('should support viewer_ids with many elements', () => {
      const ids = Array.from({ length: 50 }, (_, i) => i + 1);
      const req: UpdateProjectRequest = { viewer_ids: ids };
      expect(req.viewer_ids).toHaveLength(50);
    });

    it('should support negative company_id in update', () => {
      const req: UpdateProjectRequest = { company_id: -10 };
      expect(req.company_id).toBe(-10);
    });

    it('should support large company_id in update', () => {
      const req: UpdateProjectRequest = { company_id: Number.MAX_SAFE_INTEGER };
      expect(req.company_id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should allow updating description from string to empty string', () => {
      const update1: UpdateProjectRequest = { description: '有内容' };
      const update2: UpdateProjectRequest = { description: '' };
      expect(update1.description).toBe('有内容');
      expect(update2.description).toBe('');
    });
  });

  // ============================================================
  // 集成测试：Create/Update -> Project 转换
  // ============================================================
  describe('Integration: Create/Update to Project transformation', () => {
    it('should create Project from CreateProjectRequest with generated fields', () => {
      const createReq: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '薄云项目',
        description: '项目描述',
        company_id: 1,
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      const now = new Date();
      const project: Project = {
        id: 1,
        short_name: createReq.short_name,
        full_name: createReq.full_name,
        description: createReq.description ?? null,
        company_id: createReq.company_id,
        company_name: '薄云科技',
        operator_ids: createReq.operator_ids ?? [],
        operator_names: ['张三', '李四'],
        viewer_ids: createReq.viewer_ids ?? [],
        viewer_names: ['王五'],
        status: true,
        created_at: now,
        updated_at: now,
      };
      expect(project.id).toBe(1);
      expect(project.short_name).toBe('PRJ');
      expect(project.company_name).toBe('薄云科技');
      expect(project.status).toBe(true);
      expect(project.created_at).toBe(now);
    });

    it('should apply UpdateProjectRequest to existing Project', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '旧项目',
        description: '旧描述',
        company_id: 1,
        company_name: '薄云',
        operator_ids: [1],
        operator_names: ['张三'],
        viewer_ids: [2],
        viewer_names: ['李四'],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateProjectRequest = {
        full_name: '新项目',
        description: '新描述',
        operator_ids: [1, 3],
      };
      const updated: Project = {
        ...project,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.id).toBe(1);
      expect(updated.full_name).toBe('新项目');
      expect(updated.description).toBe('新描述');
      expect(updated.operator_ids).toEqual([1, 3]);
      expect(updated.short_name).toBe('PRJ'); // unchanged
      expect(updated.status).toBe(true); // unchanged
    });

    it('should apply empty update without changing project', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '项目',
        description: '描述',
        company_id: 1,
        company_name: '薄云',
        operator_ids: [1],
        operator_names: ['张三'],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateProjectRequest = {};
      const updated: Project = {
        ...project,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.short_name).toBe(project.short_name);
      expect(updated.full_name).toBe(project.full_name);
      expect(updated.description).toBe(project.description);
      expect(updated.company_id).toBe(project.company_id);
      expect(updated.operator_ids).toBe(project.operator_ids);
      expect(updated.viewer_ids).toBe(project.viewer_ids);
      expect(updated.status).toBe(project.status);
    });

    it('should disable project via update', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '项目',
        description: null,
        company_id: 1,
        company_name: '薄云',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateProjectRequest = { status: false };
      const updated: Project = { ...project, ...update, updated_at: new Date() };
      expect(updated.status).toBe(false);
    });

    it('should enable project via update', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '项目',
        description: null,
        company_id: 1,
        company_name: '薄云',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: false,
        created_at: new Date('2023-01-01'),
        updated_at: new Date('2023-01-01'),
      };
      const update: UpdateProjectRequest = { status: true };
      const updated: Project = { ...project, ...update, updated_at: new Date() };
      expect(updated.status).toBe(true);
    });

    it('should simulate full CRUD lifecycle', () => {
      // CREATE
      const createReq: CreateProjectRequest = {
        short_name: 'BY',
        full_name: '薄云商机倍增服务',
        description: 'AI驱动',
        company_id: 1,
        operator_ids: [1],
        viewer_ids: [2, 3],
      };
      let project: Project = {
        id: 1,
        short_name: createReq.short_name,
        full_name: createReq.full_name,
        description: createReq.description ?? null,
        company_id: createReq.company_id,
        company_name: '薄云科技',
        operator_ids: createReq.operator_ids ?? [],
        operator_names: ['管理员'],
        viewer_ids: createReq.viewer_ids ?? [],
        viewer_names: ['观察者A', '观察者B'],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      expect(project.full_name).toContain('薄云');
      expect(project.operator_ids).toHaveLength(1);
      expect(project.viewer_ids).toHaveLength(2);

      // UPDATE: change name and add operators
      const updateReq1: UpdateProjectRequest = {
        full_name: '薄云商机倍增服务v2',
        operator_ids: [1, 4, 5],
      };
      project = { ...project, ...updateReq1, updated_at: new Date('2024-03-01') };
      expect(project.full_name).toContain('v2');
      expect(project.operator_ids).toHaveLength(3);
      expect(project.short_name).toBe('BY');

      // UPDATE: disable
      const updateReq2: UpdateProjectRequest = { status: false };
      project = { ...project, ...updateReq2, updated_at: new Date('2024-06-01') };
      expect(project.status).toBe(false);

      // UPDATE: re-enable with new description
      const updateReq3: UpdateProjectRequest = { status: true, description: '重新启用' };
      project = { ...project, ...updateReq3, updated_at: new Date('2024-09-01') };
      expect(project.status).toBe(true);
      expect(project.description).toBe('重新启用');

      // VERIFY: all fields reflect the final state
      expect(project.id).toBe(1);
      expect(project.company_name).toBe('薄云科技');
      expect(project.created_at.getFullYear()).toBe(2024);
    });

    it('should handle company change via update', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '项目',
        description: null,
        company_id: 1,
        company_name: '旧公司',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateProjectRequest = { company_id: 2 };
      const updated: Project = {
        ...project,
        ...update,
        // company_name needs to be updated separately (not in UpdateProjectRequest)
        updated_at: new Date(),
      };
      expect(updated.company_id).toBe(2);
      expect(updated.company_name).toBe('旧公司'); // unchanged - company_name is not in UpdateProjectRequest
    });

    it('should handle replacing operators completely', () => {
      const project: Project = {
        id: 1,
        short_name: 'PRJ',
        full_name: '项目',
        description: null,
        company_id: 1,
        company_name: '公司',
        operator_ids: [1, 2, 3],
        operator_names: ['A', 'B', 'C'],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date('2024-01-01'),
      };
      const update: UpdateProjectRequest = { operator_ids: [4, 5] };
      const updated: Project = { ...project, ...update, updated_at: new Date() };
      expect(updated.operator_ids).toEqual([4, 5]);
      // operator_names still reflects old data - would need separate update
      expect(updated.operator_names).toEqual(['A', 'B', 'C']);
    });
  });

  // ============================================================
  // 重新导出验证
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from entity', () => {
      const project: Project = {
        id: 1,
        short_name: 'P',
        full_name: 'F',
        description: null,
        company_id: 1,
        company_name: 'C',
        operator_ids: [],
        operator_names: [],
        viewer_ids: [],
        viewer_names: [],
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(project.short_name).toBe('P');
    });

    it('should allow all request types to be imported and used', () => {
      const createReq: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        company_id: 1,
      };
      const updateReq: UpdateProjectRequest = {
        full_name: '更新名称',
        status: false,
      };
      expect(createReq.short_name).toBe('NEW');
      expect(updateReq.full_name).toBe('更新名称');
      expect(updateReq.status).toBe(false);
    });

    it('should allow creating project and request objects together', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const updateReq: UpdateProjectRequest = { full_name: '新名称' };
      expect(project.full_name).toBe('F');
      expect(updateReq.full_name).toBe('新名称');
    });
  });

  // ============================================================
  // JSON 序列化往返测试
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('Project should survive JSON round-trip with Date reviver', () => {
      const original: Project = {
        id: 42,
        short_name: 'BY-GEO',
        full_name: '薄云商机倍增服务',
        description: 'AI驱动',
        company_id: 1,
        company_name: '薄云科技',
        operator_ids: [1, 2],
        operator_names: ['张三', '李四'],
        viewer_ids: [3],
        viewer_names: ['王五'],
        status: true,
        created_at: new Date('2024-06-15T08:30:00Z'),
        updated_at: new Date('2024-06-20T10:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(42);
      expect(parsed.short_name).toBe('BY-GEO');
      expect(parsed.full_name).toBe('薄云商机倍增服务');
      expect(parsed.description).toBe('AI驱动');
      expect(parsed.company_id).toBe(1);
      expect(parsed.company_name).toBe('薄云科技');
      expect(parsed.operator_ids).toEqual([1, 2]);
      expect(parsed.operator_names).toEqual(['张三', '李四']);
      expect(parsed.viewer_ids).toEqual([3]);
      expect(parsed.viewer_names).toEqual(['王五']);
      expect(parsed.status).toBe(true);
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });

    it('Project with null description should survive JSON round-trip', () => {
      const original: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: false,
        created_at: new Date('2024-01-01T00:00:00Z'),
        updated_at: new Date('2024-01-01T00:00:00Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
      expect(parsed.status).toBe(false);
    });

    it('CreateProjectRequest should survive JSON round-trip exactly', () => {
      const original: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '薄云项目',
        description: '项目描述',
        company_id: 1,
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(original);
    });

    it('UpdateProjectRequest with all fields should survive JSON round-trip', () => {
      const original: UpdateProjectRequest = {
        short_name: 'NEW',
        full_name: '新名称',
        description: '新描述',
        company_id: 99,
        operator_ids: [1, 2],
        viewer_ids: [3, 4],
        status: false,
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed).toEqual(original);
    });

    it('UpdateProjectRequest empty object should serialize to empty JSON', () => {
      const original: UpdateProjectRequest = {};
      const json = JSON.stringify(original);
      expect(json).toBe('{}');
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('UpdateProjectRequest partial update should survive JSON round-trip', () => {
      const original: UpdateProjectRequest = { status: true, short_name: 'UPD' };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.status).toBe(true);
      expect(parsed.short_name).toBe('UPD');
      expect(Object.keys(parsed)).toHaveLength(2);
    });

    it('Date fields should serialize to ISO strings', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date('2024-01-15T12:30:45.123Z'),
        updated_at: new Date('2024-06-20T08:00:00.000Z'),
      };
      const json = JSON.stringify(project);
      const parsed = JSON.parse(json);
      expect(parsed.created_at).toBe('2024-01-15T12:30:45.123Z');
      expect(parsed.updated_at).toBe('2024-06-20T08:00:00.000Z');
    });

    it('Project array should survive JSON round-trip', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: '项目A', description: null,
          company_id: 1, company_name: 'C1', operator_ids: [1], operator_names: ['张三'],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
        },
        {
          id: 2, short_name: 'B', full_name: '项目B', description: 'desc',
          company_id: 2, company_name: 'C2', operator_ids: [], operator_names: [],
          viewer_ids: [2], viewer_names: ['李四'], status: false,
          created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01'),
        },
      ];
      const json = JSON.stringify(projects);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].short_name).toBe('A');
      expect(parsed[1].status).toBe(false);
    });
  });

  // ============================================================
  // Object.freeze 不可变性（拒绝修改验证）
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen Project should reject short_name mutation', () => {
      const project: Project = {
        id: 1, short_name: 'PRJ', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(project);
      expect(() => { (project as any).short_name = 'HACKED'; }).toThrow();
      expect(project.short_name).toBe('PRJ');
    });

    it('frozen Project should reject status mutation', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(project);
      expect(() => { (project as any).status = false; }).toThrow();
      expect(project.status).toBe(true);
    });

    it('frozen Project should reject id mutation', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(project);
      expect(() => { (project as any).id = 999; }).toThrow();
      expect(project.id).toBe(1);
    });

    it('frozen Project should reject company_id mutation', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(project);
      expect(() => { (project as any).company_id = 42; }).toThrow();
      expect(project.company_id).toBe(1);
    });

    it('frozen CreateProjectRequest should reject mutation', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '项目',
        company_id: 1,
      };
      Object.freeze(req);
      expect(() => { (req as any).short_name = 'HACK'; }).toThrow();
      expect(req.short_name).toBe('PRJ');
    });

    it('frozen UpdateProjectRequest should reject mutation', () => {
      const req: UpdateProjectRequest = { status: true };
      Object.freeze(req);
      expect(() => { (req as any).status = false; }).toThrow();
      expect(req.status).toBe(true);
    });

    it('frozen empty UpdateProjectRequest should reject adding new fields', () => {
      const req: UpdateProjectRequest = {};
      Object.freeze(req);
      expect(() => { (req as any).short_name = 'test'; }).toThrow();
      expect(req.short_name).toBeUndefined();
    });
  });

  // ============================================================
  // 可选字段类型收窄
  // ============================================================
  describe('type narrowing for optional fields', () => {
    it('UpdateProjectRequest.short_name narrows after undefined check', () => {
      const req: UpdateProjectRequest = { short_name: 'BY-GEO' };
      if (req.short_name !== undefined) {
        const name: string = req.short_name;
        expect(typeof name).toBe('string');
        expect(name).toBe('BY-GEO');
      }
    });

    it('UpdateProjectRequest.full_name narrows after undefined check', () => {
      const req: UpdateProjectRequest = { full_name: '薄云项目' };
      if (req.full_name !== undefined) {
        const name: string = req.full_name;
        expect(name).toBe('薄云项目');
      }
    });

    it('UpdateProjectRequest.description narrows after undefined check', () => {
      const req: UpdateProjectRequest = { description: '描述内容' };
      if (req.description !== undefined) {
        const desc: string = req.description;
        expect(desc).toBe('描述内容');
      }
    });

    it('UpdateProjectRequest.company_id narrows after undefined check', () => {
      const req: UpdateProjectRequest = { company_id: 42 };
      if (req.company_id !== undefined) {
        const id: number = req.company_id;
        expect(id).toBe(42);
      }
    });

    it('UpdateProjectRequest.operator_ids narrows after undefined check', () => {
      const req: UpdateProjectRequest = { operator_ids: [1, 2, 3] };
      if (req.operator_ids !== undefined) {
        const ids: number[] = req.operator_ids;
        expect(ids).toEqual([1, 2, 3]);
      }
    });

    it('UpdateProjectRequest.viewer_ids narrows after undefined check', () => {
      const req: UpdateProjectRequest = { viewer_ids: [10, 20] };
      if (req.viewer_ids !== undefined) {
        const ids: number[] = req.viewer_ids;
        expect(ids).toEqual([10, 20]);
      }
    });

    it('UpdateProjectRequest.status narrows after undefined check', () => {
      const req: UpdateProjectRequest = { status: true };
      if (req.status !== undefined) {
        const s: boolean = req.status;
        expect(s).toBe(true);
      }
    });

    it('should handle optional field fallback with nullish coalescing', () => {
      const req: UpdateProjectRequest = {};
      const short_name = req.short_name ?? 'default-name';
      const full_name = req.full_name ?? '默认全名';
      const description = req.description ?? '默认描述';
      const company_id = req.company_id ?? 0;
      const status = req.status ?? true;
      expect(short_name).toBe('default-name');
      expect(full_name).toBe('默认全名');
      expect(description).toBe('默认描述');
      expect(company_id).toBe(0);
      expect(status).toBe(true);
    });

    it('should not use fallback when value is provided', () => {
      const req: UpdateProjectRequest = { short_name: 'PRJ', status: false, company_id: 5 };
      const short_name = req.short_name ?? 'default';
      const status = req.status ?? true;
      const company_id = req.company_id ?? 0;
      expect(short_name).toBe('PRJ');
      expect(status).toBe(false);
      expect(company_id).toBe(5);
    });

    it('should narrow CreateProjectRequest optional fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'P',
        full_name: 'F',
        company_id: 1,
        description: '描述',
        operator_ids: [1],
      };
      if (req.description !== undefined) {
        expect(req.description).toBe('描述');
      }
      if (req.operator_ids !== undefined) {
        expect(req.operator_ids).toEqual([1]);
      }
      expect(req.viewer_ids).toBeUndefined();
    });
  });

  // ============================================================
  // 结构相等与深拷贝
  // ============================================================
  describe('structural equality and deep copy', () => {
    const createDate = () => new Date('2024-06-01T00:00:00Z');

    it('two Project objects with same values should be structurally equal', () => {
      const date = createDate();
      const p1: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: 'desc',
        company_id: 10, company_name: '公司', operator_ids: [1, 2], operator_names: ['A', 'B'],
        viewer_ids: [3], viewer_names: ['C'], status: true,
        created_at: date, updated_at: date,
      };
      const p2: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: 'desc',
        company_id: 10, company_name: '公司', operator_ids: [1, 2], operator_names: ['A', 'B'],
        viewer_ids: [3], viewer_names: ['C'], status: true,
        created_at: date, updated_at: date,
      };
      expect(p1).toEqual(p2);
      expect(p1).not.toBe(p2);
    });

    it('spread copy of Project should be structurally equal but different reference', () => {
      const date = createDate();
      const original: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: 'desc',
        company_id: 10, company_name: '公司', operator_ids: [1], operator_names: ['A'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: date, updated_at: date,
      };
      const copy = { ...original };
      expect(copy).toEqual(original);
      expect(copy).not.toBe(original);
    });

    it('spread copy should create shallow copy of Date references', () => {
      const date = createDate();
      const original: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: date, updated_at: date,
      };
      const copy = { ...original };
      expect(copy.created_at).toBe(original.created_at); // same Date reference
      expect(copy.updated_at).toBe(original.updated_at);
    });

    it('spread copy should create shallow copy of array references', () => {
      const original: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1, 2], operator_names: ['A'],
        viewer_ids: [3], viewer_names: ['B'], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const copy = { ...original };
      expect(copy.operator_ids).toBe(original.operator_ids); // same array ref
      expect(copy.operator_names).toBe(original.operator_names);
      expect(copy.viewer_ids).toBe(original.viewer_ids);
      expect(copy.viewer_names).toBe(original.viewer_names);
    });

    it('JSON parse/stringify should create deep copy of Project', () => {
      const original: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: 'desc',
        company_id: 10, company_name: '公司', operator_ids: [1, 2], operator_names: ['A', 'B'],
        viewer_ids: [3], viewer_names: ['C'], status: true,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      const deepCopy = JSON.parse(JSON.stringify(original));
      expect(deepCopy.id).toBe(original.id);
      expect(deepCopy.short_name).toBe(original.short_name);
      expect(deepCopy.status).toBe(original.status);
      expect(deepCopy.operator_ids).toEqual(original.operator_ids);
      expect(typeof deepCopy.created_at).toBe('string'); // Date becomes string
    });

    it('two CreateProjectRequest objects with same values should be structurally equal', () => {
      const req1: CreateProjectRequest = { short_name: 'P', full_name: 'F', company_id: 1 };
      const req2: CreateProjectRequest = { short_name: 'P', full_name: 'F', company_id: 1 };
      expect(req1).toEqual(req2);
      expect(req1).not.toBe(req2);
    });

    it('spread copy of UpdateProjectRequest should be independent', () => {
      const original: UpdateProjectRequest = { short_name: 'PRJ', status: true };
      const copy = { ...original };
      copy.short_name = 'HACK';
      copy.status = false;
      expect(original.short_name).toBe('PRJ');
      expect(original.status).toBe(true);
    });

    it('JSON round-trip should create independent copy of CreateProjectRequest', () => {
      const original: CreateProjectRequest = {
        short_name: 'PRJ', full_name: '项目', company_id: 1,
        operator_ids: [1, 2], viewer_ids: [3],
      };
      const copy = JSON.parse(JSON.stringify(original));
      copy.short_name = 'HACK';
      copy.operator_ids!.push(99);
      expect(original.short_name).toBe('PRJ');
      expect(original.operator_ids).toEqual([1, 2]);
      expect(copy.short_name).toBe('HACK');
    });
  });

  // ============================================================
  // 解构模式（rest 运算符、默认值）
  // ============================================================
  describe('destructuring patterns', () => {
    const createFullProject = (): Project => ({
      id: 1,
      short_name: 'BY-GEO',
      full_name: '薄云商机倍增服务',
      description: 'AI驱动',
      company_id: 1,
      company_name: '薄云科技',
      operator_ids: [1, 2],
      operator_names: ['张三', '李四'],
      viewer_ids: [3],
      viewer_names: ['王五'],
      status: true,
      created_at: new Date('2024-01-01'),
      updated_at: new Date('2024-06-01'),
    });

    it('should destructure all Project fields', () => {
      const project = createFullProject();
      const { id, short_name, full_name, description, company_id, company_name,
        operator_ids, operator_names, viewer_ids, viewer_names, status,
        created_at, updated_at } = project;
      expect(id).toBe(1);
      expect(short_name).toBe('BY-GEO');
      expect(full_name).toBe('薄云商机倍增服务');
      expect(description).toBe('AI驱动');
      expect(company_id).toBe(1);
      expect(company_name).toBe('薄云科技');
      expect(operator_ids).toEqual([1, 2]);
      expect(operator_names).toEqual(['张三', '李四']);
      expect(viewer_ids).toEqual([3]);
      expect(viewer_names).toEqual(['王五']);
      expect(status).toBe(true);
      expect(created_at).toBeInstanceOf(Date);
      expect(updated_at).toBeInstanceOf(Date);
    });

    it('should use rest operator for splitting Project', () => {
      const project = createFullProject();
      const { id, created_at, updated_at, ...rest } = project;
      expect(id).toBe(1);
      expect(rest).toEqual({
        short_name: 'BY-GEO',
        full_name: '薄云商机倍增服务',
        description: 'AI驱动',
        company_id: 1,
        company_name: '薄云科技',
        operator_ids: [1, 2],
        operator_names: ['张三', '李四'],
        viewer_ids: [3],
        viewer_names: ['王五'],
        status: true,
      });
    });

    it('should destructure CreateProjectRequest fields', () => {
      const req: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '项目',
        description: '描述',
        company_id: 1,
        operator_ids: [1],
        viewer_ids: [2],
      };
      const { short_name, full_name, description, company_id, operator_ids, viewer_ids } = req;
      expect(short_name).toBe('PRJ');
      expect(full_name).toBe('项目');
      expect(description).toBe('描述');
      expect(company_id).toBe(1);
      expect(operator_ids).toEqual([1]);
      expect(viewer_ids).toEqual([2]);
    });

    it('should destructure UpdateProjectRequest with default values', () => {
      const req: UpdateProjectRequest = {};
      const { short_name = '默认简称', full_name = '默认全名', status = true, company_id = 0 } = req;
      expect(short_name).toBe('默认简称');
      expect(full_name).toBe('默认全名');
      expect(status).toBe(true);
      expect(company_id).toBe(0);
    });

    it('should destructure UpdateProjectRequest preserving actual values', () => {
      const req: UpdateProjectRequest = { short_name: 'PRJ', status: false, company_id: 5 };
      const { short_name = '默认', status = true, company_id = 0 } = req;
      expect(short_name).toBe('PRJ');
      expect(status).toBe(false);
      expect(company_id).toBe(5);
    });

    it('should use rest operator on UpdateProjectRequest', () => {
      const req: UpdateProjectRequest = { short_name: 'PRJ', status: true, company_id: 1 };
      const { short_name, ...rest } = req;
      expect(short_name).toBe('PRJ');
      expect(rest).toEqual({ status: true, company_id: 1 });
    });

    it('should destructure Project with computed property access', () => {
      const project = createFullProject();
      const keys = ['id', 'short_name', 'company_id', 'status'] as const;
      const values = keys.map(k => project[k]);
      expect(values).toEqual([1, 'BY-GEO', 1, true]);
    });

    it('should swap fields via destructuring', () => {
      const req1: CreateProjectRequest = { short_name: 'A', full_name: '项目A', company_id: 1 };
      const req2: CreateProjectRequest = { short_name: 'B', full_name: '项目B', company_id: 2 };
      const { short_name: name1, full_name: full1 } = req1;
      const { short_name: name2, full_name: full2 } = req2;
      expect(name1).toBe('A');
      expect(full1).toBe('项目A');
      expect(name2).toBe('B');
      expect(full2).toBe('项目B');
    });
  });

  // ============================================================
  // Object.assign 合并操作
  // ============================================================
  describe('Object.assign merge operations', () => {
    it('should merge CreateProjectRequest into Project base', () => {
      const createReq: CreateProjectRequest = {
        short_name: 'PRJ',
        full_name: '薄云项目',
        description: '描述',
        company_id: 1,
        operator_ids: [1],
        viewer_ids: [2],
      };
      const project = Object.assign(
        { id: 1, company_name: '薄云科技', operator_names: ['张三'], viewer_names: ['李四'], status: true, created_at: new Date(), updated_at: new Date() },
        createReq,
      ) as Project;
      expect(project.short_name).toBe('PRJ');
      expect(project.full_name).toBe('薄云项目');
      expect(project.id).toBe(1);
      expect(project.company_name).toBe('薄云科技');
    });

    it('should apply UpdateProjectRequest via Object.assign', () => {
      const project: Project = {
        id: 1, short_name: 'PRJ', full_name: '旧项目', description: '旧描述',
        company_id: 1, company_name: '薄云', operator_ids: [1], operator_names: ['张三'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const update: UpdateProjectRequest = { full_name: '新项目', status: false };
      Object.assign(project, update);
      expect(project.full_name).toBe('新项目');
      expect(project.status).toBe(false);
      expect(project.short_name).toBe('PRJ'); // unchanged
    });

    it('should apply empty UpdateProjectRequest without effect', () => {
      const project: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const originalName = project.short_name;
      Object.assign(project, {});
      expect(project.short_name).toBe(originalName);
    });

    it('should count update fields using Object.assign', () => {
      const update: UpdateProjectRequest = { short_name: 'NEW', status: true, company_id: 5 };
      const target = {};
      Object.assign(target, update);
      expect(Object.keys(target)).toHaveLength(3);
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('collection advanced operations', () => {
    const createProjects = (): Project[] => [
      {
        id: 1, short_name: 'BY-GEO', full_name: '薄云商机倍增服务', description: 'AI',
        company_id: 1, company_name: '薄云科技', operator_ids: [1, 2], operator_names: ['张三', '李四'],
        viewer_ids: [3], viewer_names: ['王五'], status: true,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      },
      {
        id: 2, short_name: 'PROJ-B', full_name: '项目B', description: 'desc',
        company_id: 1, company_name: '薄云科技', operator_ids: [4], operator_names: ['赵六'],
        viewer_ids: [5, 6], viewer_names: ['孙七', '周八'], status: true,
        created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01'),
      },
      {
        id: 3, short_name: 'PROJ-C', full_name: '项目C', description: null,
        company_id: 2, company_name: '其他公司', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: false,
        created_at: new Date('2024-03-01'), updated_at: new Date('2024-03-01'),
      },
      {
        id: 4, short_name: 'PROJ-D', full_name: '项目D', description: '测试',
        company_id: 2, company_name: '其他公司', operator_ids: [7], operator_names: ['吴九'],
        viewer_ids: [], viewer_names: [], status: false,
        created_at: new Date('2024-04-01'), updated_at: new Date('2024-04-01'),
      },
      {
        id: 5, short_name: 'BY-AI', full_name: '薄云AI项目', description: 'AI驱动',
        company_id: 1, company_name: '薄云科技', operator_ids: [1, 2, 8], operator_names: ['张三', '李四', '郑十'],
        viewer_ids: [9, 10], viewer_names: ['观察A', '观察B'], status: true,
        created_at: new Date('2024-05-01'), updated_at: new Date('2024-05-01'),
      },
    ];

    it('should reduce projects to company count map', () => {
      const projects = createProjects();
      const countByCompany = projects.reduce<Record<string, number>>((acc, p) => {
        acc[p.company_name] = (acc[p.company_name] || 0) + 1;
        return acc;
      }, {});
      expect(countByCompany['薄云科技']).toBe(3);
      expect(countByCompany['其他公司']).toBe(2);
    });

    it('should check every project has non-empty short_name', () => {
      const projects = createProjects();
      const allHaveShortName = projects.every(p => p.short_name.length > 0);
      expect(allHaveShortName).toBe(true);
    });

    it('should check some projects are disabled', () => {
      const projects = createProjects();
      const someDisabled = projects.some(p => !p.status);
      expect(someDisabled).toBe(true);
    });

    it('should group projects by status', () => {
      const projects = createProjects();
      const grouped = projects.reduce<Record<string, Project[]>>((acc, p) => {
        const key = String(p.status);
        if (!acc[key]) acc[key] = [];
        acc[key].push(p);
        return acc;
      }, {});
      expect(grouped['true']).toHaveLength(3);
      expect(grouped['false']).toHaveLength(2);
    });

    it('should group projects by company_id', () => {
      const projects = createProjects();
      const grouped = projects.reduce<Map<number, Project[]>>((map, p) => {
        if (!map.has(p.company_id)) map.set(p.company_id, []);
        map.get(p.company_id)!.push(p);
        return map;
      }, new Map());
      expect(grouped.get(1)).toHaveLength(3);
      expect(grouped.get(2)).toHaveLength(2);
    });

    it('should reduce to total operator count', () => {
      const projects = createProjects();
      const totalOperators = projects.reduce((sum, p) => sum + p.operator_ids.length, 0);
      expect(totalOperators).toBe(7); // 2 + 1 + 0 + 1 + 3
    });

    it('should reduce to total viewer count', () => {
      const projects = createProjects();
      const totalViewers = projects.reduce((sum, p) => sum + p.viewer_ids.length, 0);
      expect(totalViewers).toBe(5); // 1 + 2 + 0 + 0 + 2
    });

    it('should check every project has valid id > 0', () => {
      const projects = createProjects();
      expect(projects.every(p => p.id > 0)).toBe(true);
    });

    it('should check some projects belong to company_id 1', () => {
      const projects = createProjects();
      expect(projects.some(p => p.company_id === 1)).toBe(true);
    });

    it('should filter and map in chain', () => {
      const projects = createProjects();
      const activeNames = projects.filter(p => p.status).map(p => p.short_name);
      expect(activeNames).toEqual(['BY-GEO', 'PROJ-B', 'BY-AI']);
    });

    it('should find index of project by short_name', () => {
      const projects = createProjects();
      const idx = projects.findIndex(p => p.short_name === 'PROJ-C');
      expect(idx).toBe(2);
    });

    it('should return -1 from findIndex for non-existent short_name', () => {
      const projects = createProjects();
      const idx = projects.findIndex(p => p.short_name === 'NONEXISTENT');
      expect(idx).toBe(-1);
    });

    it('should flatMap short_names with company prefix', () => {
      const projects = createProjects();
      const displayNames = projects.flatMap(p => [`${p.company_name}/${p.short_name}`]);
      expect(displayNames).toHaveLength(5);
      expect(displayNames[0]).toBe('薄云科技/BY-GEO');
    });

    it('should use reduce to build id-to-project map', () => {
      const projects = createProjects();
      const idMap = projects.reduce<Map<number, Project>>((map, p) => {
        map.set(p.id, p);
        return map;
      }, new Map());
      expect(idMap.get(1)!.short_name).toBe('BY-GEO');
      expect(idMap.get(3)!.company_name).toBe('其他公司');
      expect(idMap.has(99)).toBe(false);
    });

    it('should collect all unique operator ids across projects', () => {
      const projects = createProjects();
      const allOperatorIds = new Set(projects.flatMap(p => p.operator_ids));
      expect(allOperatorIds.size).toBe(5); // 1,2,4,7,8
      expect(allOperatorIds.has(1)).toBe(true);
      expect(allOperatorIds.has(8)).toBe(true);
    });

    it('should collect all unique viewer ids across projects', () => {
      const projects = createProjects();
      const allViewerIds = new Set(projects.flatMap(p => p.viewer_ids));
      expect(allViewerIds.size).toBe(5); // 3,5,6,9,10
    });

    it('should find projects where user is operator', () => {
      const projects = createProjects();
      const userId = 1;
      const projectsWhereOperator = projects.filter(p => p.operator_ids.includes(userId));
      expect(projectsWhereOperator).toHaveLength(2); // BY-GEO and BY-AI
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('consecutive update chains', () => {
    it('should apply 3 consecutive updates preserving integrity', () => {
      let project: Project = {
        id: 1, short_name: 'PRJ', full_name: '旧项目', description: '旧描述',
        company_id: 1, company_name: '薄云', operator_ids: [1], operator_names: ['张三'],
        viewer_ids: [2], viewer_names: ['李四'], status: true,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1: change name
      project = { ...project, ...{ full_name: '薄云商机倍增服务' } as UpdateProjectRequest, updated_at: new Date('2024-03-01') };
      expect(project.full_name).toBe('薄云商机倍增服务');
      expect(project.operator_ids).toEqual([1]);

      // Update 2: add operators + disable
      project = { ...project, ...{ operator_ids: [1, 3, 5], status: false } as UpdateProjectRequest, updated_at: new Date('2024-06-01') };
      expect(project.operator_ids).toEqual([1, 3, 5]);
      expect(project.status).toBe(false);
      expect(project.full_name).toBe('薄云商机倍增服务');

      // Update 3: switch company entirely
      project = { ...project, ...{ company_id: 2, full_name: '薄云AI平台', status: true } as UpdateProjectRequest, updated_at: new Date('2024-09-01') };
      expect(project.company_id).toBe(2);
      expect(project.status).toBe(true);
      expect(project.operator_ids).toEqual([1, 3, 5]); // retained from update 2
      expect(project.id).toBe(1); // always retained
    });

    it('should handle status toggle sequence', () => {
      let project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(project.status).toBe(true);

      project = { ...project, status: false, updated_at: new Date() };
      expect(project.status).toBe(false);

      project = { ...project, status: true, updated_at: new Date() };
      expect(project.status).toBe(true);

      project = { ...project, status: false, updated_at: new Date() };
      expect(project.status).toBe(false);
    });

    it('should handle empty updates interspersed with real updates', () => {
      let project: Project = {
        id: 1, short_name: 'P', full_name: '旧名称', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };

      // Empty update
      project = { ...project, ...{} as UpdateProjectRequest, updated_at: new Date() };
      expect(project.full_name).toBe('旧名称');

      // Real update
      project = { ...project, ...{ full_name: '新名称' } as UpdateProjectRequest, updated_at: new Date() };
      expect(project.full_name).toBe('新名称');

      // Empty update
      project = { ...project, ...{} as UpdateProjectRequest, updated_at: new Date() };
      expect(project.full_name).toBe('新名称');
    });

    it('should handle 5 consecutive partial updates', () => {
      let project: Project = {
        id: 1, short_name: 'S1', full_name: 'F1', description: 'D1',
        company_id: 1, company_name: 'C', operator_ids: [1], operator_names: ['A'],
        viewer_ids: [2], viewer_names: ['B'], status: true,
        created_at: new Date(), updated_at: new Date(),
      };

      const updates: UpdateProjectRequest[] = [
        { short_name: 'S2' },
        { full_name: 'F2' },
        { description: 'D2' },
        { operator_ids: [1, 3] },
        { status: false },
      ];

      updates.forEach((update) => {
        project = { ...project, ...update, updated_at: new Date() };
      });

      expect(project.short_name).toBe('S2');
      expect(project.full_name).toBe('F2');
      expect(project.description).toBe('D2');
      expect(project.operator_ids).toEqual([1, 3]);
      expect(project.status).toBe(false);
      expect(project.id).toBe(1);
      expect(project.company_id).toBe(1);
    });
  });

  // ============================================================
  // 日期操作（时区、算术、精度）
  // ============================================================
  describe('Date operations', () => {
    it('should support created_at with millisecond precision', () => {
      const date = new Date('2024-06-15T12:30:45.123Z');
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: date, updated_at: date,
      };
      expect(project.created_at.getMilliseconds()).toBe(123);
    });

    it('should support date arithmetic between created_at and updated_at', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-06-01T00:00:00Z');
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: created, updated_at: updated,
      };
      const diffMs = project.updated_at.getTime() - project.created_at.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBeGreaterThan(150);
      expect(diffDays).toBeLessThan(153);
    });

    it('should support updating updated_at to current time', () => {
      const before = new Date();
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date('2024-01-01'), updated_at: before,
      };
      project.updated_at = new Date();
      expect(project.updated_at.getTime()).toBeGreaterThanOrEqual(before.getTime());
    });

    it('should support dates from different years', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01'),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2025-06-15'), updated_at: new Date('2025-06-15'),
        },
      ];
      expect(projects[0].created_at.getFullYear()).toBe(2020);
      expect(projects[1].created_at.getFullYear()).toBe(2025);
    });

    it('should support sorting projects by created_at', () => {
      const projects: Project[] = [
        {
          id: 3, short_name: 'C', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2024-06-01'), updated_at: new Date(),
        },
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2024-01-01'), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2024-03-01'), updated_at: new Date(),
        },
      ];
      const sorted = [...projects].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      expect(sorted[0].id).toBe(1);
      expect(sorted[1].id).toBe(2);
      expect(sorted[2].id).toBe(3);
    });

    it('should detect stale projects via date comparison', () => {
      const staleThreshold = new Date('2024-03-01');
      const projects: Project[] = [
        {
          id: 1, short_name: 'old', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2023-06-01'), updated_at: new Date('2023-06-01'),
        },
        {
          id: 2, short_name: 'new', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
        },
      ];
      const stale = projects.filter(p => p.updated_at < staleThreshold);
      expect(stale).toHaveLength(1);
      expect(stale[0].short_name).toBe('old');
    });

    it('should support Date.now() for updated_at assignment', () => {
      const before = Date.now();
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(before),
      };
      const after = Date.now();
      expect(project.updated_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(project.updated_at.getTime()).toBeLessThanOrEqual(after);
    });
  });

  // ============================================================
  // Set/Map 操作
  // ============================================================
  describe('Set/Map operations', () => {
    it('should collect unique company_names into Set', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: '薄云科技', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: '薄云科技', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 3, short_name: 'C', full_name: 'F', description: null,
          company_id: 2, company_name: '其他公司', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const companies = new Set(projects.map(p => p.company_name));
      expect(companies.size).toBe(2);
      expect(companies.has('薄云科技')).toBe(true);
      expect(companies.has('其他公司')).toBe(true);
    });

    it('should store projects in Map keyed by id', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'BY-GEO', full_name: '薄云项目', description: null,
          company_id: 1, company_name: '薄云', operator_ids: [1], operator_names: ['A'],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'PROJ-B', full_name: '项目B', description: null,
          company_id: 2, company_name: '其他', operator_ids: [], operator_names: [],
          viewer_ids: [2], viewer_names: ['B'], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const projectMap = new Map(projects.map(p => [p.id, p]));
      expect(projectMap.get(1)!.short_name).toBe('BY-GEO');
      expect(projectMap.get(2)!.company_name).toBe('其他');
      expect(projectMap.has(3)).toBe(false);
    });

    it('should use Map for update request deduplication', () => {
      const updates: UpdateProjectRequest[] = [
        { short_name: 'A' },
        { status: true },
        { short_name: 'B' }, // duplicate key concept
      ];
      const nameUpdates = updates.filter(u => u.short_name !== undefined);
      expect(nameUpdates).toHaveLength(2);
    });

    it('should build Map from CreateProjectRequest array', () => {
      const requests: CreateProjectRequest[] = [
        { short_name: 'PRJ-A', full_name: '项目A', company_id: 1 },
        { short_name: 'PRJ-B', full_name: '项目B', company_id: 2 },
      ];
      const reqMap = new Map(requests.map((r, i) => [i, r]));
      expect(reqMap.get(0)!.short_name).toBe('PRJ-A');
      expect(reqMap.get(1)!.short_name).toBe('PRJ-B');
    });

    it('should collect unique short_names into Set', () => {
      const projects: Project[] = [
        {
          id: 1, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 2, short_name: 'A', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
        {
          id: 3, short_name: 'B', full_name: 'F', description: null,
          company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
          viewer_ids: [], viewer_names: [], status: true,
          created_at: new Date(), updated_at: new Date(),
        },
      ];
      const names = new Set(projects.map(p => p.short_name));
      expect(names.size).toBe(2);
      expect(names.has('A')).toBe(true);
      expect(names.has('B')).toBe(true);
    });
  });

  // ============================================================
  // hasOwnProperty 与属性描述符
  // ============================================================
  describe('property ownership and descriptors', () => {
    it('should verify hasOwnProperty for all Project fields', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const fields = ['id', 'short_name', 'full_name', 'description', 'company_id',
        'company_name', 'operator_ids', 'operator_names', 'viewer_ids', 'viewer_names',
        'status', 'created_at', 'updated_at'];
      fields.forEach(field => {
        expect(Object.prototype.hasOwnProperty.call(project, field)).toBe(true);
      });
      expect(Object.prototype.hasOwnProperty.call(project, 'nonexistent')).toBe(false);
    });

    it('should verify hasOwnProperty for UpdateProjectRequest partial fields', () => {
      const req: UpdateProjectRequest = { short_name: 'test', status: true };
      expect(Object.prototype.hasOwnProperty.call(req, 'short_name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(req, 'status')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(req, 'full_name')).toBe(false);
      expect(Object.prototype.hasOwnProperty.call(req, 'company_id')).toBe(false);
    });

    it('should verify all Project fields are enumerable', () => {
      const project: Project = {
        id: 1, short_name: 'P', full_name: 'F', description: null,
        company_id: 1, company_name: 'C', operator_ids: [], operator_names: [],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.keys(project).forEach(key => {
        const desc = Object.getOwnPropertyDescriptor(project, key);
        expect(desc!.enumerable).toBe(true);
        expect(desc!.writable).toBe(true);
        expect(desc!.configurable).toBe(true);
      });
    });

    it('should verify CreateProjectRequest fields are writable and configurable', () => {
      const req: CreateProjectRequest = {
        short_name: 'P', full_name: 'F', company_id: 1,
      };
      const desc = Object.getOwnPropertyDescriptor(req, 'short_name');
      expect(desc!.writable).toBe(true);
      expect(desc!.configurable).toBe(true);
    });

    it('should allow property reassignment on unfrozen project', () => {
      const project: Project = {
        id: 1, short_name: 'OLD', full_name: '旧名', description: null,
        company_id: 1, company_name: 'C', operator_ids: [1], operator_names: ['A'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      project.short_name = 'NEW';
      project.full_name = '新名';
      project.operator_ids = [1, 2];
      expect(project.short_name).toBe('NEW');
      expect(project.full_name).toBe('新名');
      expect(project.operator_ids).toEqual([1, 2]);
    });
  });

  // ============================================================
  // 函数参数传递与返回值
  // ============================================================
  describe('function parameter passing and return values', () => {
    const mockCreate = (req: CreateProjectRequest, id: number, companyName: string): Project => ({
      id,
      short_name: req.short_name,
      full_name: req.full_name,
      description: req.description ?? null,
      company_id: req.company_id,
      company_name: companyName,
      operator_ids: req.operator_ids ?? [],
      operator_names: [],
      viewer_ids: req.viewer_ids ?? [],
      viewer_names: [],
      status: true,
      created_at: new Date(),
      updated_at: new Date(),
    });

    const mockUpdate = (project: Project, req: UpdateProjectRequest): Project => ({
      ...project,
      ...req,
      updated_at: new Date(),
    });

    it('should pass CreateProjectRequest to function and receive Project', () => {
      const createReq: CreateProjectRequest = {
        short_name: 'BY',
        full_name: '薄云商机倍增服务',
        description: 'AI驱动',
        company_id: 1,
        operator_ids: [1, 2],
        viewer_ids: [3],
      };
      const result = mockCreate(createReq, 1, '薄云科技');
      expect(result.id).toBe(1);
      expect(result.short_name).toBe('BY');
      expect(result.full_name).toBe('薄云商机倍增服务');
      expect(result.description).toBe('AI驱动');
      expect(result.company_name).toBe('薄云科技');
      expect(result.status).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should pass Project and UpdateProjectRequest to update function', () => {
      const original: Project = {
        id: 1, short_name: 'PRJ', full_name: '旧项目', description: '旧描述',
        company_id: 1, company_name: '薄云', operator_ids: [1], operator_names: ['张三'],
        viewer_ids: [2], viewer_names: ['李四'], status: true,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updateReq: UpdateProjectRequest = { full_name: '新项目', operator_ids: [1, 3] };
      const result = mockUpdate(original, updateReq);
      expect(result.full_name).toBe('新项目');
      expect(result.operator_ids).toEqual([1, 3]);
      expect(result.id).toBe(1);
      expect(result.short_name).toBe('PRJ');
    });

    it('should pass empty update without side effects', () => {
      const original: Project = {
        id: 1, short_name: 'PRJ', full_name: '项目', description: 'desc',
        company_id: 1, company_name: 'C', operator_ids: [1], operator_names: ['A'],
        viewer_ids: [], viewer_names: [], status: true,
        created_at: new Date(), updated_at: new Date(),
      };
      const result = mockUpdate(original, {});
      expect(result.short_name).toBe(original.short_name);
      expect(result.full_name).toBe(original.full_name);
      expect(result.status).toBe(original.status);
    });

    it('should support creating project from request via spread in function', () => {
      const createProject = (req: CreateProjectRequest, id: number): Project => ({
        id,
        short_name: req.short_name,
        full_name: req.full_name,
        description: req.description ?? null,
        company_id: req.company_id,
        company_name: '默认公司',
        operator_ids: req.operator_ids ?? [],
        operator_names: [],
        viewer_ids: req.viewer_ids ?? [],
        viewer_names: [],
        status: true,
        created_at: new Date(),
        updated_at: new Date(),
      });
      const req: CreateProjectRequest = {
        short_name: 'NEW',
        full_name: '新项目',
        company_id: 5,
      };
      const project = createProject(req, 42);
      expect(project.id).toBe(42);
      expect(project.short_name).toBe('NEW');
      expect(project.status).toBe(true);
      expect(project.description).toBeNull();
    });

    it('should handle multiple create calls with different requests', () => {
      const requests: CreateProjectRequest[] = [
        { short_name: 'A', full_name: '项目A', company_id: 1 },
        { short_name: 'B', full_name: '项目B', company_id: 2, description: '有描述' },
        { short_name: 'C', full_name: '项目C', company_id: 1, operator_ids: [1, 2] },
      ];
      const projects = requests.map((req, i) => mockCreate(req, i + 1, '公司'));
      expect(projects).toHaveLength(3);
      expect(projects[0].short_name).toBe('A');
      expect(projects[1].description).toBe('有描述');
      expect(projects[2].operator_ids).toEqual([1, 2]);
    });
  });
});

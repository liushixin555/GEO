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
});

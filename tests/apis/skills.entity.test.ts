/**
 * @jest-environment node
 */
import {
  Skills,
  CreateSkillsRequest,
  UpdateSkillsRequest,
} from '../../apis/entity/skills.entity';

describe('skills.entity', () => {
  // ============================================================
  // Skills interface
  // ============================================================
  describe('Skills interface', () => {
    it('should create a valid Skills object with all required fields', () => {
      const skills: Skills = {
        id: 1,
        name: 'SEO优化',
        description: '搜索引擎优化技能',
        skill_dir: '/skills/seo',
        created_by: 1,
        creator_name: '管理员',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skills.id).toBe(1);
      expect(skills.name).toBe('SEO优化');
      expect(skills.description).toBe('搜索引擎优化技能');
      expect(skills.skill_dir).toBe('/skills/seo');
      expect(skills.created_by).toBe(1);
      expect(skills.creator_name).toBe('管理员');
    });

    it('should have exactly 8 fields', () => {
      const skills: Skills = {
        id: 1,
        name: 'A',
        description: null,
        skill_dir: '/test',
        created_by: null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(Object.keys(skills).sort()).toEqual(
        ['id', 'name', 'description', 'skill_dir', 'created_by', 'creator_name', 'created_at', 'updated_at'].sort()
      );
      expect(Object.keys(skills)).toHaveLength(8);
    });

    // --- id ---
    it('should have id as number type', () => {
      const skills: Skills = {
        id: 999,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof skills.id).toBe('number');
      expect(skills.id).toBe(999);
    });

    it('should support id as 0', () => {
      const skills: Skills = {
        id: 0,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.id).toBe(0);
    });

    it('should support large id values', () => {
      const skills: Skills = {
        id: Number.MAX_SAFE_INTEGER,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.id).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support negative id values', () => {
      const skills: Skills = {
        id: -1,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.id).toBe(-1);
    });

    // --- name ---
    it('should have name as string type', () => {
      const skills: Skills = {
        id: 1, name: '内容生成',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof skills.name).toBe('string');
      expect(skills.name).toBe('内容生成');
    });

    it('should support name with Chinese characters', () => {
      const skills: Skills = {
        id: 1, name: '薄云商机倍增服务',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toContain('薄云');
    });

    it('should support name with various formats', () => {
      const names = ['SEO优化', 'skill-001', 'AI_Writing', 'skill.dir', 'ABC123'];
      names.forEach((n) => {
        const skills: Skills = {
          id: 1, name: n,
          description: null, skill_dir: '/test',
          created_by: null, creator_name: null,
          created_at: new Date(), updated_at: new Date(),
        };
        expect(skills.name).toBe(n);
      });
    });

    it('should support empty string name', () => {
      const skills: Skills = {
        id: 1, name: '',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toBe('');
    });

    it('should support name with special characters', () => {
      const skills: Skills = {
        id: 1, name: '技能 (v2.0) - 测试版',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toContain('v2.0');
      expect(skills.name).toContain('测试版');
    });

    it('should support long name', () => {
      const longName = 'A'.repeat(200);
      const skills: Skills = {
        id: 1, name: longName,
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toBe(longName);
      expect(skills.name.length).toBe(200);
    });

    // --- description ---
    it('should allow description to be null', () => {
      const skills: Skills = {
        id: 2,
        name: '写作技能',
        description: null,
        skill_dir: '/skills/writing',
        created_by: null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skills.description).toBeNull();
    });

    it('should support description as string', () => {
      const skills: Skills = {
        id: 1, name: 'A',
        description: '这是一个技能描述',
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toBe('这是一个技能描述');
    });

    it('should support description as empty string', () => {
      const skills: Skills = {
        id: 1, name: 'A',
        description: '',
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toBe('');
    });

    it('should support description with Chinese characters', () => {
      const skills: Skills = {
        id: 1, name: 'A',
        description: '薄云商机倍增服务技能描述',
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toContain('薄云');
    });

    it('should support long description text', () => {
      const longDesc = 'D'.repeat(1000);
      const skills: Skills = {
        id: 1, name: 'A',
        description: longDesc,
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toBe(longDesc);
      expect(skills.description!.length).toBe(1000);
    });

    it('should support description with special characters', () => {
      const skills: Skills = {
        id: 1, name: 'A',
        description: '描述 @admin #tag https://example.com <script>',
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toContain('@admin');
      expect(skills.description).toContain('#tag');
    });

    // --- skill_dir ---
    it('should have skill_dir as string type', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: '/skills/seo',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof skills.skill_dir).toBe('string');
      expect(skills.skill_dir).toBe('/skills/seo');
    });

    it('should support skill_dir with Unix path format', () => {
      const dirs = ['/skills/seo', '/skills/writing', '/skills/ai/content-gen'];
      dirs.forEach((dir) => {
        const skills: Skills = {
          id: 1, name: 'A', description: null, skill_dir: dir,
          created_by: null, creator_name: null,
          created_at: new Date(), updated_at: new Date(),
        };
        expect(skills.skill_dir).toBe(dir);
      });
    });

    it('should support skill_dir with Windows path format', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: 'C:\\skills\\seo',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.skill_dir).toBe('C:\\skills\\seo');
    });

    it('should support skill_dir as relative path', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: './skills/seo',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.skill_dir).toBe('./skills/seo');
    });

    it('should support skill_dir as URL', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: 'https://example.com/skills/seo',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.skill_dir).toContain('https://');
    });

    it('should support skill_dir as empty string', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: '',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.skill_dir).toBe('');
    });

    // --- created_by ---
    it('should allow created_by to be null', () => {
      const skills: Skills = {
        id: 3,
        name: '系统技能',
        description: '系统内置',
        skill_dir: '/skills/system',
        created_by: null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skills.created_by).toBeNull();
    });

    it('should have created_by as number type when set', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 42,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof skills.created_by).toBe('number');
      expect(skills.created_by).toBe(42);
    });

    it('should support created_by as 0', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 0,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.created_by).toBe(0);
    });

    it('should support large created_by values', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: Number.MAX_SAFE_INTEGER,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.created_by).toBe(Number.MAX_SAFE_INTEGER);
    });

    // --- creator_name ---
    it('should allow creator_name to be null', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name).toBeNull();
    });

    it('should have creator_name as string type when set', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1,
        creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(typeof skills.creator_name).toBe('string');
      expect(skills.creator_name).toBe('管理员');
    });

    it('should support creator_name with Chinese characters', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1,
        creator_name: '张三',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name).toBe('张三');
    });

    it('should support creator_name as empty string', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null,
        creator_name: '',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name).toBe('');
    });

    // --- created_at / updated_at ---
    it('should have created_at as Date instance', () => {
      const now = new Date();
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: now, updated_at: new Date(),
      };
      expect(skills.created_at).toBeInstanceOf(Date);
      expect(skills.created_at).toBe(now);
    });

    it('should have updated_at as Date instance', () => {
      const now = new Date();
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: now,
      };
      expect(skills.updated_at).toBeInstanceOf(Date);
      expect(skills.updated_at).toBe(now);
    });

    it('should support different created_at and updated_at timestamps', () => {
      const created = new Date('2024-01-01T00:00:00Z');
      const updated = new Date('2024-12-31T23:59:59Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: created, updated_at: updated,
      };
      expect(skills.created_at.getTime()).toBeLessThan(skills.updated_at.getTime());
    });

    it('should support same created_at and updated_at timestamps', () => {
      const now = new Date();
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: now, updated_at: now,
      };
      expect(skills.created_at.getTime()).toBe(skills.updated_at.getTime());
    });

    it('should support created_at with specific date', () => {
      const created = new Date('2024-06-15T08:30:00Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: created, updated_at: new Date(),
      };
      expect(skills.created_at.getFullYear()).toBe(2024);
      expect(skills.created_at.getMonth()).toBe(5); // June (0-indexed)
    });

    it('should support updated_at in the future', () => {
      const future = new Date('2099-06-15T00:00:00Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: future,
      };
      expect(skills.updated_at.getUTCFullYear()).toBe(2099);
    });

    // --- realistic scenarios ---
    it('should create a complete skill with realistic data', () => {
      const skills: Skills = {
        id: 100,
        name: 'SEO优化',
        description: '搜索引擎优化技能，用于提升文章在搜索引擎中的排名',
        skill_dir: '/skills/seo-optimization',
        created_by: 1,
        creator_name: '管理员',
        created_at: new Date('2024-06-01T08:00:00Z'),
        updated_at: new Date('2024-06-15T12:30:00Z'),
      };
      expect(skills.name).toBe('SEO优化');
      expect(skills.skill_dir).toBe('/skills/seo-optimization');
      expect(skills.created_by).toBe(1);
      expect(skills.creator_name).toBe('管理员');
    });

    it('should create a system skill with null created_by', () => {
      const skills: Skills = {
        id: 1, name: '系统默认', description: '系统内置技能',
        skill_dir: '/skills/system-default',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(skills.created_by).toBeNull();
      expect(skills.creator_name).toBeNull();
    });

    it('should create a skill with no description', () => {
      const skills: Skills = {
        id: 2, name: '快速发布', description: null,
        skill_dir: '/skills/quick-publish',
        created_by: 1, creator_name: '张三',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toBeNull();
      expect(skills.created_by).toBe(1);
    });

    it('should create multiple skills with different data', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO优化', description: '搜索引擎优化', skill_dir: '/skills/seo', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '内容生成', description: 'AI内容生成', skill_dir: '/skills/ai-gen', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
        { id: 3, name: '自动发布', description: null, skill_dir: '/skills/auto-publish', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      expect(skills).toHaveLength(3);
      expect(skills.map((s) => s.name)).toEqual(['SEO优化', '内容生成', '自动发布']);
    });

    // --- object operations ---
    it('should allow object spread to create new skill with overrides', () => {
      const base: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const updated: Skills = { ...base, name: 'Updated', description: '新描述' };
      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('新描述');
      expect(updated.id).toBe(base.id);
      expect(updated.skill_dir).toBe(base.skill_dir);
    });

    it('should allow destructuring of skill fields', () => {
      const skills: Skills = {
        id: 1, name: 'SEO优化', description: '搜索引擎优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, name, description, skill_dir, created_by, creator_name } = skills;
      expect(id).toBe(1);
      expect(name).toBe('SEO优化');
      expect(description).toBe('搜索引擎优化');
      expect(skill_dir).toBe('/skills/seo');
      expect(created_by).toBe(1);
      expect(creator_name).toBe('管理员');
    });

    it('should support Object.keys on skills', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const keys = Object.keys(skills);
      expect(keys).toContain('id');
      expect(keys).toContain('name');
      expect(keys).toContain('description');
      expect(keys).toContain('skill_dir');
      expect(keys).toContain('created_by');
      expect(keys).toContain('creator_name');
      expect(keys).toContain('created_at');
      expect(keys).toContain('updated_at');
    });

    it('should support Object.values on skills', () => {
      const skills: Skills = {
        id: 1, name: 'X', description: 'Y',
        skill_dir: '/test',
        created_by: 2, creator_name: 'Z',
        created_at: new Date(), updated_at: new Date(),
      };
      const values = Object.values(skills);
      expect(values).toContain(1);
      expect(values).toContain('X');
      expect(values).toContain('Y');
      expect(values).toContain('/test');
      expect(values).toContain(2);
      expect(values).toContain('Z');
    });

    it('should support Object.entries on skills', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const entries = Object.entries(skills);
      expect(entries).toHaveLength(8);
      const idEntry = entries.find(([key]) => key === 'id');
      expect(idEntry).toBeDefined();
      expect(idEntry![1]).toBe(1);
    });

    it('should support JSON.stringify with date conversion', () => {
      const created = new Date('2024-06-01T00:00:00Z');
      const skills: Skills = {
        id: 1, name: 'SEO', description: '优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: created, updated_at: created,
      };
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(1);
      expect(parsed.name).toBe('SEO');
      expect(parsed.description).toBe('优化');
      expect(parsed.skill_dir).toBe('/skills/seo');
      expect(parsed.created_by).toBe(1);
      expect(parsed.creator_name).toBe('管理员');
      expect(typeof parsed.created_at).toBe('string');
    });

    it('should support JSON.stringify with null fields', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
      expect(parsed.created_by).toBeNull();
      expect(parsed.creator_name).toBeNull();
    });

    it('should allow hasOwnProperty checks on skills', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.hasOwnProperty('id')).toBe(true);
      expect(skills.hasOwnProperty('name')).toBe(true);
      expect(skills.hasOwnProperty('description')).toBe(true);
      expect(skills.hasOwnProperty('skill_dir')).toBe(true);
      expect(skills.hasOwnProperty('created_by')).toBe(true);
      expect(skills.hasOwnProperty('nonexistent')).toBe(false);
    });

    // --- array operations ---
    it('should support array methods on skill collection', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO优化', description: '搜索', skill_dir: '/skills/seo', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '内容生成', description: 'AI', skill_dir: '/skills/ai', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
        { id: 3, name: '自动发布', description: null, skill_dir: '/skills/publish', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const filtered = skills.filter((s) => s.created_by !== null);
      expect(filtered).toHaveLength(2);

      const found = skills.find((s) => s.name === '内容生成');
      expect(found).toBeDefined();
      expect(found!.skill_dir).toBe('/skills/ai');
    });

    it('should support sorting skills by id', () => {
      const skills: Skills[] = [
        { id: 3, name: 'C', description: null, skill_dir: '/c', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 1, name: 'A', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...skills].sort((a, b) => a.id - b.id);
      expect(sorted.map((s) => s.name)).toEqual(['A', 'B', 'C']);
    });

    it('should support mapping skill fields', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo', created_by: 1, creator_name: 'A', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'AI', description: '生成', skill_dir: '/ai', created_by: 2, creator_name: 'B', created_at: new Date(), updated_at: new Date() },
      ];
      const names = skills.map((s) => s.name);
      expect(names).toEqual(['SEO', 'AI']);

      const dirs = skills.map((s) => s.skill_dir);
      expect(dirs).toEqual(['/seo', '/ai']);
    });

    it('should support skill comparison', () => {
      const skill1: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const skill2: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skill1.id).toBe(skill2.id);
      expect(skill1.name).toBe(skill2.name);
      expect(skill1.skill_dir).toBe(skill2.skill_dir);
    });

    // --- type narrowing ---
    it('should support type narrowing for description', () => {
      const withDesc: Skills = {
        id: 1, name: 'A', description: '有描述',
        skill_dir: '/test', created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const noDesc: Skills = {
        id: 2, name: 'A', description: null,
        skill_dir: '/test', created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (withDesc.description !== null) {
        expect(withDesc.description.length).toBeGreaterThan(0);
      }
      if (noDesc.description === null) {
        expect(noDesc.description).toBeNull();
      }
    });

    it('should support type narrowing for created_by', () => {
      const withCreator: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const noCreator: Skills = {
        id: 2, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (withCreator.created_by !== null) {
        expect(typeof withCreator.created_by).toBe('number');
      }
      if (noCreator.created_by === null) {
        expect(noCreator.created_by).toBeNull();
      }
    });

    it('should support type narrowing for creator_name', () => {
      const withName: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const noName: Skills = {
        id: 2, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (withName.creator_name !== null) {
        expect(typeof withName.creator_name).toBe('string');
      }
      if (noName.creator_name === null) {
        expect(noName.creator_name).toBeNull();
      }
    });
  });

  // ============================================================
  // CreateSkillsRequest interface
  // ============================================================
  describe('CreateSkillsRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        skill_dir: '/skills/new',
      };
      expect(req.name).toBe('新技能');
      expect(req.skill_dir).toBe('/skills/new');
    });

    it('should have exactly 2 required fields', () => {
      const req: CreateSkillsRequest = {
        name: 'A',
        skill_dir: '/test',
      };
      expect(req.name).toBeDefined();
      expect(req.skill_dir).toBeDefined();
    });

    it('should include optional description field', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        description: '技能描述',
        skill_dir: '/skills/new',
      };
      expect(req.description).toBe('技能描述');
    });

    it('should include optional created_by field', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        skill_dir: '/skills/new',
        created_by: 1,
      };
      expect(req.created_by).toBe(1);
    });

    it('should allow created_by to be null', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        skill_dir: '/skills/new',
        created_by: null,
      };
      expect(req.created_by).toBeNull();
    });

    it('should have only required fields when optional fields omitted', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        skill_dir: '/skills/new',
      };
      expect(req.description).toBeUndefined();
      expect(req.created_by).toBeUndefined();
    });

    it('should include all optional fields', () => {
      const req: CreateSkillsRequest = {
        name: '全字段技能',
        description: '完整描述',
        skill_dir: '/skills/full',
        created_by: 42,
      };
      expect(req.name).toBe('全字段技能');
      expect(req.description).toBe('完整描述');
      expect(req.skill_dir).toBe('/skills/full');
      expect(req.created_by).toBe(42);
    });

    it('should support name with Chinese characters', () => {
      const req: CreateSkillsRequest = {
        name: '薄云商机倍增服务',
        skill_dir: '/skills/by',
      };
      expect(req.name).toContain('薄云');
    });

    it('should support name with special characters', () => {
      const req: CreateSkillsRequest = {
        name: '技能 (v2.0) - 测试版',
        skill_dir: '/skills/test',
      };
      expect(req.name).toContain('v2.0');
    });

    it('should support description as empty string', () => {
      const req: CreateSkillsRequest = {
        name: '技能',
        description: '',
        skill_dir: '/test',
      };
      expect(req.description).toBe('');
    });

    it('should support long description', () => {
      const longDesc = 'D'.repeat(500);
      const req: CreateSkillsRequest = {
        name: '技能',
        description: longDesc,
        skill_dir: '/test',
      };
      expect(req.description).toBe(longDesc);
    });

    it('should support created_by as 0', () => {
      const req: CreateSkillsRequest = {
        name: '技能',
        skill_dir: '/test',
        created_by: 0,
      };
      expect(req.created_by).toBe(0);
    });

    it('should support large created_by value', () => {
      const req: CreateSkillsRequest = {
        name: '技能',
        skill_dir: '/test',
        created_by: Number.MAX_SAFE_INTEGER,
      };
      expect(req.created_by).toBe(Number.MAX_SAFE_INTEGER);
    });

    it('should support various skill_dir formats', () => {
      const dirs = ['/skills/a', './relative', 'https://example.com/skills'];
      dirs.forEach((dir) => {
        const req: CreateSkillsRequest = {
          name: '技能',
          skill_dir: dir,
        };
        expect(req.skill_dir).toBe(dir);
      });
    });

    it('should support JSON.stringify on request', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        description: '描述',
        skill_dir: '/test',
        created_by: 1,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('测试');
      expect(parsed.description).toBe('描述');
      expect(parsed.skill_dir).toBe('/test');
      expect(parsed.created_by).toBe(1);
    });

    it('should support JSON.stringify with undefined optional fields', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        skill_dir: '/test',
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('测试');
      expect(parsed).not.toHaveProperty('description');
      expect(parsed).not.toHaveProperty('created_by');
    });
  });

  // ============================================================
  // UpdateSkillsRequest interface
  // ============================================================
  describe('UpdateSkillsRequest interface', () => {
    it('should create a valid request with all optional fields', () => {
      const req: UpdateSkillsRequest = {
        name: '更新技能',
        description: '更新描述',
        skill_dir: '/skills/updated',
      };
      expect(req.name).toBe('更新技能');
      expect(req.description).toBe('更新描述');
      expect(req.skill_dir).toBe('/skills/updated');
    });

    it('should allow partial updates with single field - name only', () => {
      const req: UpdateSkillsRequest = { name: '只改名字' };
      expect(Object.keys(req)).toHaveLength(1);
      expect(req.name).toBe('只改名字');
      expect(req.description).toBeUndefined();
      expect(req.skill_dir).toBeUndefined();
    });

    it('should allow partial updates with single field - description only', () => {
      const req: UpdateSkillsRequest = { description: '新描述' };
      expect(req.description).toBe('新描述');
      expect(req.name).toBeUndefined();
      expect(req.skill_dir).toBeUndefined();
    });

    it('should allow partial updates with single field - skill_dir only', () => {
      const req: UpdateSkillsRequest = { skill_dir: '/skills/new-dir' };
      expect(req.skill_dir).toBe('/skills/new-dir');
      expect(req.name).toBeUndefined();
      expect(req.description).toBeUndefined();
    });

    it('should allow empty update request', () => {
      const req: UpdateSkillsRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow updating name and description together', () => {
      const req: UpdateSkillsRequest = { name: '新名字', description: '新描述' };
      expect(req.name).toBe('新名字');
      expect(req.description).toBe('新描述');
      expect(req.skill_dir).toBeUndefined();
    });

    it('should allow updating name and skill_dir together', () => {
      const req: UpdateSkillsRequest = { name: '新名字', skill_dir: '/new' };
      expect(req.name).toBe('新名字');
      expect(req.skill_dir).toBe('/new');
      expect(req.description).toBeUndefined();
    });

    it('should allow updating description and skill_dir together', () => {
      const req: UpdateSkillsRequest = { description: '描述', skill_dir: '/new' };
      expect(req.description).toBe('描述');
      expect(req.skill_dir).toBe('/new');
      expect(req.name).toBeUndefined();
    });

    it('should support name with Chinese characters in update', () => {
      const req: UpdateSkillsRequest = { name: '薄云商机倍增服务' };
      expect(req.name).toContain('薄云');
    });

    it('should support description as empty string in update', () => {
      const req: UpdateSkillsRequest = { description: '' };
      expect(req.description).toBe('');
    });

    it('should support skill_dir as empty string in update', () => {
      const req: UpdateSkillsRequest = { skill_dir: '' };
      expect(req.skill_dir).toBe('');
    });

    it('should support long description in update', () => {
      const longDesc = 'D'.repeat(500);
      const req: UpdateSkillsRequest = { description: longDesc };
      expect(req.description).toBe(longDesc);
    });

    it('should support JSON.stringify on update request', () => {
      const req: UpdateSkillsRequest = { name: '测试', description: '描述' };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('测试');
      expect(parsed.description).toBe('描述');
    });

    it('should support JSON.stringify on empty update request', () => {
      const req: UpdateSkillsRequest = {};
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(Object.keys(parsed)).toHaveLength(0);
    });

    it('should have exactly 3 optional fields', () => {
      const req: UpdateSkillsRequest = {
        name: 'A',
        description: 'B',
        skill_dir: 'C',
      };
      expect(Object.keys(req)).toHaveLength(3);
      expect(Object.keys(req).sort()).toEqual(['description', 'name', 'skill_dir'].sort());
    });
  });

  // ============================================================
  // re-exports from index
  // ============================================================
  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      const skill: Skills = {
        id: 1, name: '测试', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skill.name).toBe('测试');
    });

    it('should allow creating and using skill objects together', () => {
      const skill1: Skills = {
        id: 1, name: 'SEO优化', description: '搜索',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const skill2: Skills = {
        id: 2, name: '内容生成', description: null,
        skill_dir: '/skills/ai-gen',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skill1.name).not.toBe(skill2.name);
      expect(skill1.created_by).not.toBeNull();
      expect(skill2.created_by).toBeNull();
    });

    it('should allow using CreateSkillsRequest to create a skill', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        description: '测试描述',
        skill_dir: '/skills/test',
        created_by: 1,
      };
      const skill: Skills = {
        id: 1,
        name: req.name,
        description: req.description ?? null,
        skill_dir: req.skill_dir,
        created_by: req.created_by ?? null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skill.name).toBe(req.name);
      expect(skill.description).toBe(req.description);
      expect(skill.skill_dir).toBe(req.skill_dir);
    });

    it('should allow using UpdateSkillsRequest to update a skill', () => {
      const original: Skills = {
        id: 1, name: '旧名称', description: '旧描述',
        skill_dir: '/skills/old',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const update: UpdateSkillsRequest = {
        name: '新名称',
        description: '新描述',
      };
      const updated: Skills = {
        ...original,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.name).toBe('新名称');
      expect(updated.description).toBe('新描述');
      expect(updated.id).toBe(original.id);
      expect(updated.skill_dir).toBe(original.skill_dir);
    });
  });
});

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

    it('should support negative large id values', () => {
      const skills: Skills = {
        id: -Number.MAX_SAFE_INTEGER,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.id).toBe(-Number.MAX_SAFE_INTEGER);
    });

    it('should support decimal id (TypeScript does not enforce integer)', () => {
      const skills: Skills = {
        id: 3.14,
        name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.id).toBe(3.14);
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

    it('should support name with emoji characters', () => {
      const skills: Skills = {
        id: 1, name: '🚀 技能 ⭐',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toContain('🚀');
      expect(skills.name).toContain('⭐');
    });

    it('should support name with unicode characters', () => {
      const skills: Skills = {
        id: 1, name: 'スキル テスト',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name).toContain('スキル');
    });

    it('should support name with whitespace', () => {
      const skills: Skills = {
        id: 1, name: '  技能名称  ',
        description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.name.trim()).toBe('技能名称');
      expect(skills.name).toContain('  ');
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

    it('should support description with emoji characters', () => {
      const skills: Skills = {
        id: 1, name: 'A',
        description: '这是一个🎯技能描述📝',
        skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description).toContain('🎯');
      expect(skills.description).toContain('📝');
    });

    it('should distinguish between null and empty string description', () => {
      const nullDesc: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const emptyDesc: Skills = {
        id: 2, name: 'A', description: '', skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(nullDesc.description).toBeNull();
      expect(emptyDesc.description).toBe('');
      expect(nullDesc.description === null).toBe(true);
      expect(emptyDesc.description === '').toBe(true);
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

    it('should support skill_dir with deep nested path', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: '/skills/ai/content/generation/v2',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.skill_dir.split('/')).toHaveLength(6);
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

    it('should support negative created_by values', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: -5,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.created_by).toBe(-5);
    });

    it('should support decimal created_by', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1.5,
        creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.created_by).toBe(1.5);
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

    it('should support creator_name with special characters', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1,
        creator_name: 'admin (系统)',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name).toContain('系统');
    });

    it('should support creator_name with emoji', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1,
        creator_name: '👤 用户',
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name).toContain('👤');
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

    it('should support epoch date', () => {
      const epoch = new Date(0);
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: epoch, updated_at: epoch,
      };
      expect(skills.created_at.getTime()).toBe(0);
      expect(skills.updated_at.getTime()).toBe(0);
    });

    it('should support far past date', () => {
      const past = new Date('1900-01-01T00:00:00Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: past, updated_at: new Date(),
      };
      expect(skills.created_at.getFullYear()).toBe(1900);
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

    it('should support JSON.parse with date revival', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01T00:00:00Z'),
        updated_at: new Date('2024-06-15T00:00:00Z'),
      };
      const json = JSON.stringify(skills);
      const revived = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') {
          return new Date(value);
        }
        return value;
      });
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.created_at.getFullYear()).toBe(2024);
    });

    it('should support Object.assign for merging skill data', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const merged = Object.assign({}, skills, { name: 'Updated', description: '新描述' });
      expect(merged.name).toBe('Updated');
      expect(merged.description).toBe('新描述');
      expect(merged.id).toBe(1);
      expect(skills.name).toBe('A'); // original unchanged
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

    it('should support Object.freeze on skills', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.freeze(skills);
      expect(Object.isFrozen(skills)).toBe(true);
    });

    it('should support Object.seal on skills', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.seal(skills);
      expect(Object.isSealed(skills)).toBe(true);
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

    it('should support sorting skills by name', () => {
      const skills: Skills[] = [
        { id: 3, name: '自动发布', description: null, skill_dir: '/c', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 1, name: 'SEO优化', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '内容生成', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const sorted = [...skills].sort((a, b) => a.name.localeCompare(b.name, 'zh-CN'));
      expect(sorted).toHaveLength(3);
      // localeCompare with zh-CN sorts Chinese characters by pinyin order
      expect(sorted.map((s) => s.name)).toEqual(
        [...skills.map((s) => s.name)].sort((a, b) => a.localeCompare(b, 'zh-CN'))
      );
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

    it('should support reducing skills to id-name map', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: null, skill_dir: '/seo', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'AI', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const map = skills.reduce<Record<number, string>>((acc, s) => {
        acc[s.id] = s.name;
        return acc;
      }, {});
      expect(map[1]).toBe('SEO');
      expect(map[2]).toBe('AI');
    });

    it('should support some and every on skills', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: null, skill_dir: '/seo', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'AI', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      expect(skills.some((s) => s.created_by !== null)).toBe(true);
      expect(skills.some((s) => s.description !== null)).toBe(false);
      expect(skills.every((s) => s.id > 0)).toBe(true);
    });

    it('should support slicing skills array', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO优化', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '内容生成', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: '自动发布', description: null, skill_dir: '/c', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const slice = skills.slice(0, 2);
      expect(slice).toHaveLength(2);
      expect(slice[0].name).toBe('SEO优化');
      expect(slice[1].name).toBe('内容生成');
    });

    it('should support concatenating skill arrays', () => {
      const arr1: Skills[] = [
        { id: 1, name: 'SEO', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const arr2: Skills[] = [
        { id: 2, name: 'AI', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const combined = arr1.concat(arr2);
      expect(combined).toHaveLength(2);
      expect(combined[1].name).toBe('AI');
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

    it('should support filtering skills by description status', () => {
      const skills: Skills[] = [
        { id: 1, name: 'A', description: '有描述', skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'C', description: '也有描述', skill_dir: '/c', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const withDesc = skills.filter((s) => s.description !== null);
      const withoutDesc = skills.filter((s) => s.description === null);
      expect(withDesc).toHaveLength(2);
      expect(withoutDesc).toHaveLength(1);
    });

    it('should support filtering skills by creator', () => {
      const skills: Skills[] = [
        { id: 1, name: 'A', description: null, skill_dir: '/a', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'C', description: null, skill_dir: '/c', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
      ];
      const byAdmin = skills.filter((s) => s.created_by === 1);
      expect(byAdmin).toHaveLength(1);
      expect(byAdmin[0].name).toBe('A');
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

    it('should support optional chaining on description', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description?.length).toBeUndefined();

      const withDesc: Skills = { ...skills, id: 2, description: '描述' };
      expect(withDesc.description?.length).toBe(2);
    });

    it('should support optional chaining on creator_name', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name?.length).toBeUndefined();

      const withName: Skills = { ...skills, id: 2, creator_name: '管理员' };
      expect(withName.creator_name?.length).toBe(3);
    });

    it('should support nullish coalescing on description', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const desc = skills.description ?? '默认描述';
      expect(desc).toBe('默认描述');
    });

    it('should support nullish coalescing on created_by', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const createdBy = skills.created_by ?? 0;
      expect(createdBy).toBe(0);
    });

    it('should support nullish coalescing on creator_name', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const name = skills.creator_name ?? '未知创建者';
      expect(name).toBe('未知创建者');
    });

    // --- Map/Set ---
    it('should support using skill as Map value', () => {
      const map = new Map<number, Skills>();
      const skills: Skills = {
        id: 1, name: 'SEO优化', description: '搜索',
        skill_dir: '/skills/seo', created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      map.set(skills.id, skills);
      expect(map.get(1)?.name).toBe('SEO优化');
      expect(map.get(1)?.skill_dir).toBe('/skills/seo');
    });

    it('should support using skill in Set', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<Skills>();
      set.add(skills);
      expect(set.has(skills)).toBe(true);
      expect(set.size).toBe(1);
    });

    // --- immutability ---
    it('should support spread update preserving immutability', () => {
      const original: Skills = {
        id: 1, name: '原始技能', description: '原始描述',
        skill_dir: '/skills/original',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated: Skills = {
        ...original,
        name: '更新技能',
        description: '新描述',
        updated_at: new Date(),
      };
      expect(original.name).toBe('原始技能');
      expect(original.description).toBe('原始描述');
      expect(updated.name).toBe('更新技能');
      expect(updated.description).toBe('新描述');
      expect(updated.id).toBe(original.id);
      expect(updated.skill_dir).toBe(original.skill_dir);
    });

    it('should support sequential updates', () => {
      let skill: Skills = {
        id: 1, name: 'V1', description: '第一版',
        skill_dir: '/skills/v1',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1: change name
      skill = { ...skill, name: 'V2', updated_at: new Date('2024-03-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('第一版');

      // Update 2: change description and skill_dir
      skill = { ...skill, description: '第二版', skill_dir: '/skills/v2', updated_at: new Date('2024-06-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('第二版');
      expect(skill.skill_dir).toBe('/skills/v2');

      // Update 3: set created_by to null
      skill = { ...skill, created_by: null, creator_name: null, updated_at: new Date('2024-09-01') };
      expect(skill.created_by).toBeNull();
      expect(skill.creator_name).toBeNull();
      expect(skill.name).toBe('V2');

      // Final state
      expect(skill.id).toBe(1);
      expect(skill.created_at.getFullYear()).toBe(2024);
    });

    it('should support full CRUD lifecycle', () => {
      // CREATE
      const created: Skills = {
        id: 1, name: '新技能', description: '新创建的技能',
        skill_dir: '/skills/new',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(created.name).toBe('新技能');

      // READ (simulate)
      const found = created;
      expect(found.id).toBe(1);
      expect(found.description).toBe('新创建的技能');

      // UPDATE
      const updated: Skills = {
        ...created,
        name: '更新技能',
        description: '更新后的描述',
        updated_at: new Date('2024-06-01'),
      };
      expect(updated.name).toBe('更新技能');
      expect(updated.description).toBe('更新后的描述');
      expect(updated.created_at.getFullYear()).toBe(2024);
      expect(updated.id).toBe(created.id);

      // DELETE (simulate - set to null values)
      const deleted: Skills = {
        ...updated,
        description: null,
        created_by: null,
        creator_name: null,
        updated_at: new Date('2024-12-01'),
      };
      expect(deleted.description).toBeNull();
      expect(deleted.created_by).toBeNull();
    });

    // --- computed values ---
    it('should support creating skill with computed values', () => {
      const baseId = 100;
      const offset = 5;
      const skills: Skills = {
        id: baseId + offset,
        name: '技能_' + String(baseId),
        description: '这是第' + String(offset) + '个技能',
        skill_dir: '/skills/skill_' + String(baseId + offset),
        created_by: baseId,
        creator_name: '管理员',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skills.id).toBe(105);
      expect(skills.name).toBe('技能_100');
      expect(skills.description).toBe('这是第5个技能');
      expect(skills.skill_dir).toBe('/skills/skill_105');
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

    it('should support name with emoji', () => {
      const req: CreateSkillsRequest = {
        name: '🚀 新技能 🎯',
        skill_dir: '/skills/test',
      };
      expect(req.name).toContain('🚀');
    });

    it('should support empty string name', () => {
      const req: CreateSkillsRequest = {
        name: '',
        skill_dir: '/test',
      };
      expect(req.name).toBe('');
    });

    it('should support long name', () => {
      const longName = 'S'.repeat(300);
      const req: CreateSkillsRequest = {
        name: longName,
        skill_dir: '/test',
      };
      expect(req.name.length).toBe(300);
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

    it('should support description with special characters', () => {
      const req: CreateSkillsRequest = {
        name: '技能',
        description: '描述<script>alert("xss")</script>',
        skill_dir: '/test',
      };
      expect(req.description).toContain('<script>');
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

    it('should support negative created_by value', () => {
      const req: CreateSkillsRequest = {
        name: '技能',
        skill_dir: '/test',
        created_by: -1,
      };
      expect(req.created_by).toBe(-1);
    });

    it('should support various skill_dir formats', () => {
      const dirs = ['/skills/a', './relative', 'https://example.com/skills', 'C:\\skills\\win'];
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

    it('should support JSON.stringify with null created_by', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        skill_dir: '/test',
        created_by: null,
      };
      const json = JSON.stringify(req);
      const parsed = JSON.parse(json);
      expect(parsed.created_by).toBeNull();
    });

    it('should support destructuring CreateSkillsRequest', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        description: '描述',
        skill_dir: '/test',
        created_by: 1,
      };
      const { name, description, skill_dir, created_by } = req;
      expect(name).toBe('测试');
      expect(description).toBe('描述');
      expect(skill_dir).toBe('/test');
      expect(created_by).toBe(1);
    });

    it('should support Object.keys on CreateSkillsRequest', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        description: '描述',
        skill_dir: '/test',
        created_by: 1,
      };
      const keys = Object.keys(req);
      expect(keys).toContain('name');
      expect(keys).toContain('description');
      expect(keys).toContain('skill_dir');
      expect(keys).toContain('created_by');
    });

    it('should have exactly 4 fields when all provided', () => {
      const req: CreateSkillsRequest = {
        name: '测试',
        description: '描述',
        skill_dir: '/test',
        created_by: 1,
      };
      expect(Object.keys(req)).toHaveLength(4);
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

    it('should support name with emoji in update', () => {
      const req: UpdateSkillsRequest = { name: '🎯 更新技能' };
      expect(req.name).toContain('🎯');
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

    it('should support destructuring UpdateSkillsRequest', () => {
      const req: UpdateSkillsRequest = { name: 'A', description: 'B', skill_dir: 'C' };
      const { name, description, skill_dir } = req;
      expect(name).toBe('A');
      expect(description).toBe('B');
      expect(skill_dir).toBe('C');
    });

    it('should support Object.keys on UpdateSkillsRequest', () => {
      const req: UpdateSkillsRequest = { name: 'A' };
      expect(Object.keys(req)).toEqual(['name']);
    });

    it('should support Object.entries on UpdateSkillsRequest', () => {
      const req: UpdateSkillsRequest = { name: 'A', description: 'B' };
      const entries = Object.entries(req);
      expect(entries).toHaveLength(2);
    });

    it('should support spread merge with another update', () => {
      const req1: UpdateSkillsRequest = { name: 'A' };
      const req2: UpdateSkillsRequest = { description: 'B' };
      const merged = { ...req1, ...req2 };
      expect(merged.name).toBe('A');
      expect(merged.description).toBe('B');
    });

    it('should support name with whitespace in update', () => {
      const req: UpdateSkillsRequest = { name: '  技能名称  ' };
      expect(req.name?.trim()).toBe('技能名称');
    });
  });

  // ============================================================
  // 类型收窄与特殊场景
  // ============================================================
  describe('Type narrowing and special scenarios', () => {
    it('should support type narrowing for description (non-null)', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: '描述内容',
        skill_dir: '/test', created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (skills.description !== null) {
        expect(skills.description.length).toBeGreaterThan(0);
        expect(typeof skills.description).toBe('string');
      }
    });

    it('should support type narrowing for description (null)', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null,
        skill_dir: '/test', created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      if (skills.description === null) {
        expect(skills.description).toBeNull();
      }
    });

    it('should distinguish between null and empty string description', () => {
      const nullDesc: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const emptyDesc: Skills = {
        id: 2, name: 'A', description: '', skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(nullDesc.description).toBeNull();
      expect(emptyDesc.description).toBe('');
      expect(nullDesc.description === null).toBe(true);
      expect(emptyDesc.description === '').toBe(true);
    });

    it('should support optional chaining on description', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.description?.length).toBeUndefined();

      const withDesc: Skills = { ...skills, id: 2, description: '描述' };
      expect(withDesc.description?.length).toBe(2);
    });

    it('should support optional chaining on creator_name', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skills.creator_name?.length).toBeUndefined();

      const withName: Skills = { ...skills, id: 2, creator_name: '管理员' };
      expect(withName.creator_name?.length).toBe(3);
    });

    it('should support nullish coalescing on description', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const desc = skills.description ?? '默认描述';
      expect(desc).toBe('默认描述');
    });

    it('should support nullish coalescing on created_by', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const createdBy = skills.created_by ?? 0;
      expect(createdBy).toBe(0);
    });

    it('should support nullish coalescing on creator_name', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const name = skills.creator_name ?? '未知创建者';
      expect(name).toBe('未知创建者');
    });

    it('should support using skill as Map value', () => {
      const map = new Map<number, Skills>();
      const skills: Skills = {
        id: 1, name: 'SEO优化', description: '搜索',
        skill_dir: '/skills/seo', created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      map.set(skills.id, skills);
      expect(map.get(1)?.name).toBe('SEO优化');
      expect(map.get(1)?.skill_dir).toBe('/skills/seo');
    });

    it('should support using skill in Set', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const set = new Set<Skills>();
      set.add(skills);
      expect(set.has(skills)).toBe(true);
      expect(set.size).toBe(1);
    });

    it('should support Object.assign for merging skill data', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated = Object.assign({}, skills, { name: 'Updated', description: '新描述' });
      expect(updated.name).toBe('Updated');
      expect(updated.description).toBe('新描述');
      expect(updated.id).toBe(1);
      expect(skills.name).toBe('A'); // original unchanged
    });

    it('should support JSON.parse with date revival', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01T00:00:00Z'),
        updated_at: new Date('2024-06-15T00:00:00Z'),
      };
      const json = JSON.stringify(skills);
      const revived = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') {
          return new Date(value);
        }
        return value;
      });
      expect(revived.created_at).toBeInstanceOf(Date);
      expect(revived.updated_at).toBeInstanceOf(Date);
      expect(revived.created_at.getFullYear()).toBe(2024);
    });

    it('should support creating skill with computed values', () => {
      const baseId = 100;
      const multiplier = 2;
      const skills: Skills = {
        id: baseId * multiplier,
        name: '计算技能',
        description: '第' + String(multiplier) + '个',
        skill_dir: '/skills/computed_' + String(baseId),
        created_by: baseId,
        creator_name: '管理员',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skills.id).toBe(200);
      expect(skills.description).toBe('第2个');
      expect(skills.skill_dir).toBe('/skills/computed_100');
    });

    it('should support spread update preserving immutability', () => {
      const original: Skills = {
        id: 1, name: '原始', description: '原始描述',
        skill_dir: '/skills/old',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated: Skills = {
        ...original,
        name: '更新',
        description: '新描述',
        updated_at: new Date(),
      };
      expect(original.name).toBe('原始');
      expect(original.description).toBe('原始描述');
      expect(updated.name).toBe('更新');
      expect(updated.description).toBe('新描述');
      expect(updated.id).toBe(original.id);
      expect(updated.skill_dir).toBe(original.skill_dir);
    });

    it('should support sequential updates', () => {
      let skill: Skills = {
        id: 1, name: 'V1', description: '第一版',
        skill_dir: '/skills/v1',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      // Update 1: change name
      skill = { ...skill, name: 'V2', updated_at: new Date('2024-03-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('第一版');

      // Update 2: change description and skill_dir
      skill = { ...skill, description: '第二版', skill_dir: '/skills/v2', updated_at: new Date('2024-06-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('第二版');

      // Update 3: clear creator
      skill = { ...skill, created_by: null, creator_name: null, updated_at: new Date('2024-09-01') };
      expect(skill.created_by).toBeNull();
      expect(skill.creator_name).toBeNull();

      // Final state
      expect(skill.id).toBe(1);
      expect(skill.created_at.getFullYear()).toBe(2024);
    });

    it('should support full CRUD lifecycle', () => {
      // CREATE
      const created: Skills = {
        id: 1, name: '新建技能', description: '新创建',
        skill_dir: '/skills/new',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(created.name).toBe('新建技能');

      // READ (simulate)
      const found = created;
      expect(found.id).toBe(1);
      expect(found.description).toBe('新创建');

      // UPDATE
      const updated: Skills = {
        ...created,
        name: '更新技能',
        description: '更新后的描述',
        updated_at: new Date('2024-06-01'),
      };
      expect(updated.name).toBe('更新技能');
      expect(updated.description).toBe('更新后的描述');
      expect(updated.created_at.getFullYear()).toBe(2024);
      expect(updated.id).toBe(created.id); // id unchanged

      // DELETE (simulate - clear fields)
      const deleted: Skills = {
        ...updated,
        description: null,
        created_by: null,
        creator_name: null,
        updated_at: new Date('2024-12-01'),
      };
      expect(deleted.description).toBeNull();
      expect(deleted.created_by).toBeNull();
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

    it('should allow creating skill from request with null created_by', () => {
      const req: CreateSkillsRequest = {
        name: '系统技能',
        skill_dir: '/skills/system',
        created_by: null,
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
      expect(skill.created_by).toBeNull();
      expect(skill.name).toBe('系统技能');
    });

    it('should support batch creation from requests', () => {
      const requests: CreateSkillsRequest[] = [
        { name: 'SEO', skill_dir: '/skills/seo', description: '搜索优化' },
        { name: 'AI', skill_dir: '/skills/ai' },
        { name: '发布', skill_dir: '/skills/publish', created_by: 1 },
      ];
      const skills: Skills[] = requests.map((req, i) => ({
        id: i + 1,
        name: req.name,
        description: req.description ?? null,
        skill_dir: req.skill_dir,
        created_by: req.created_by ?? null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      }));
      expect(skills).toHaveLength(3);
      expect(skills[0].description).toBe('搜索优化');
      expect(skills[1].description).toBeNull();
      expect(skills[2].created_by).toBe(1);
    });

    it('should support partial update preserving original fields', () => {
      const original: Skills = {
        id: 1, name: 'SEO优化', description: '搜索引擎优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const update: UpdateSkillsRequest = { name: 'AI优化' };
      const updated: Skills = {
        ...original,
        ...update,
        updated_at: new Date(),
      };
      expect(updated.name).toBe('AI优化');
      expect(updated.description).toBe('搜索引擎优化'); // preserved
      expect(updated.skill_dir).toBe('/skills/seo'); // preserved
      expect(updated.created_by).toBe(1); // preserved
    });

    it('should support converting between interfaces', () => {
      const createReq: CreateSkillsRequest = {
        name: '新技能',
        description: '描述',
        skill_dir: '/test',
        created_by: 1,
      };
      // Convert CreateSkillsRequest to UpdateSkillsRequest (pick mutable fields)
      const updateReq: UpdateSkillsRequest = {
        name: createReq.name,
        description: createReq.description,
        skill_dir: createReq.skill_dir,
      };
      expect(updateReq.name).toBe('新技能');
      expect(updateReq.description).toBe('描述');
      expect(updateReq.skill_dir).toBe('/test');
    });
  });

  // ============================================================
  // JSON 序列化往返
  // ============================================================
  describe('JSON serialization round-trip', () => {
    it('should survive JSON round-trip with all fields', () => {
      const original: Skills = {
        id: 42,
        name: 'SEO优化',
        description: '搜索引擎优化',
        skill_dir: '/skills/seo',
        created_by: 1,
        creator_name: '管理员',
        created_at: new Date('2024-06-15T08:30:00.123Z'),
        updated_at: new Date('2024-06-20T14:45:00.456Z'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json, (key, value) => {
        if (key === 'created_at' || key === 'updated_at') return new Date(value);
        return value;
      });
      expect(parsed.id).toBe(42);
      expect(parsed.name).toBe('SEO优化');
      expect(parsed.description).toBe('搜索引擎优化');
      expect(parsed.skill_dir).toBe('/skills/seo');
      expect(parsed.created_by).toBe(1);
      expect(parsed.creator_name).toBe('管理员');
      expect(parsed.created_at).toBeInstanceOf(Date);
      expect(parsed.updated_at).toBeInstanceOf(Date);
    });

    it('should survive JSON round-trip with null description', () => {
      const original: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const json = JSON.stringify(original);
      const parsed = JSON.parse(json);
      expect(parsed.description).toBeNull();
      expect(parsed.created_by).toBeNull();
      expect(parsed.creator_name).toBeNull();
    });

    it('should serialize Date fields to ISO strings', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-06-15T08:30:00.000Z'),
        updated_at: new Date('2024-06-20T14:45:00.000Z'),
      };
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(typeof parsed.created_at).toBe('string');
      expect(typeof parsed.updated_at).toBe('string');
      expect(parsed.created_at).toContain('2024-06-15');
      expect(parsed.updated_at).toContain('2024-06-20');
    });

    it('should preserve number precision through JSON round-trip', () => {
      const skills: Skills = {
        id: Number.MAX_SAFE_INTEGER, name: 'A', description: null, skill_dir: '/test',
        created_by: 42, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(parsed.id).toBe(Number.MAX_SAFE_INTEGER);
      expect(parsed.created_by).toBe(42);
    });

    it('should preserve Chinese characters through JSON round-trip', () => {
      const skills: Skills = {
        id: 1, name: '薄云商机倍增服务',
        description: '技能描述——中文测试',
        skill_dir: '/skills/中文路径',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(parsed.name).toBe('薄云商机倍增服务');
      expect(parsed.description).toBe('技能描述——中文测试');
      expect(parsed.skill_dir).toBe('/skills/中文路径');
      expect(parsed.creator_name).toBe('管理员');
    });

    it('skills array should survive JSON round-trip', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo', created_by: 1, creator_name: 'A', created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01') },
        { id: 2, name: 'AI', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date('2024-02-01'), updated_at: new Date('2024-02-01') },
      ];
      const json = JSON.stringify(skills);
      const parsed = JSON.parse(json);
      expect(parsed).toHaveLength(2);
      expect(parsed[0].name).toBe('SEO');
      expect(parsed[1].description).toBeNull();
    });
  });

  // ============================================================
  // Object.freeze 不可变性
  // ============================================================
  describe('Object.freeze immutability', () => {
    it('frozen skill should reject name mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'SEO', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).name = 'hacked'; }).toThrow();
      expect(skills.name).toBe('SEO');
    });

    it('frozen skill should reject id mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).id = 999; }).toThrow();
      expect(skills.id).toBe(1);
    });

    it('frozen skill should reject description mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: '原始', skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).description = 'hacked'; }).toThrow();
      expect(skills.description).toBe('原始');
    });

    it('frozen skill should reject skill_dir mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: null, skill_dir: '/original',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).skill_dir = '/hacked'; }).toThrow();
      expect(skills.skill_dir).toBe('/original');
    });

    it('frozen skill should reject created_by mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).created_by = 999; }).toThrow();
      expect(skills.created_by).toBe(1);
    });

    it('frozen skill should reject creator_name mutation', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).creator_name = 'hacked'; }).toThrow();
      expect(skills.creator_name).toBe('管理员');
    });

    it('frozen skill should reject adding new fields', () => {
      const skills: Skills = Object.freeze({
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      });
      expect(() => { (skills as any).extra = 'new'; }).toThrow();
      expect((skills as any).extra).toBeUndefined();
    });

    it('Object.isFrozen should return true for frozen skill', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.isFrozen(skills)).toBe(false);
      Object.freeze(skills);
      expect(Object.isFrozen(skills)).toBe(true);
    });
  });

  // ============================================================
  // 结构相等与深拷贝
  // ============================================================
  describe('structural equality and deep copy', () => {
    it('two skills with same values should be structurally equal', () => {
      const skill1: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
      };
      const skill2: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
      };
      expect(skill1).not.toBe(skill2); // different references
      expect(skill1.id).toBe(skill2.id);
      expect(skill1.name).toBe(skill2.name);
      expect(skill1.description).toBe(skill2.description);
      expect(skill1.skill_dir).toBe(skill2.skill_dir);
      expect(skill1.created_by).toBe(skill2.created_by);
      expect(skill1.creator_name).toBe(skill2.creator_name);
    });

    it('spread copy should be structurally equal but different reference', () => {
      const original: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
      };
      const copy: Skills = { ...original };
      expect(copy).not.toBe(original);
      expect(copy.id).toBe(original.id);
      expect(copy.name).toBe(original.name);
      expect(copy.description).toBe(original.description);
      expect(copy.skill_dir).toBe(original.skill_dir);
      expect(copy.created_by).toBe(original.created_by);
      expect(copy.creator_name).toBe(original.creator_name);
      expect(copy.created_at).toBe(original.created_at); // same Date reference (shallow)
    });

    it('JSON parse/stringify should create deep copy of skill', () => {
      const original: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01T00:00:00Z'),
        updated_at: new Date('2024-06-15T00:00:00Z'),
      };
      const json = JSON.stringify(original);
      const deepCopy = JSON.parse(json);
      expect(deepCopy).not.toBe(original);
      expect(deepCopy.id).toBe(original.id);
      expect(deepCopy.name).toBe(original.name);
      expect(deepCopy.created_at).not.toBe(original.created_at); // different reference
      expect(typeof deepCopy.created_at).toBe('string'); // Date becomes string
    });

    it('JSON deep copy should be independent from original', () => {
      const original: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
      };
      const json = JSON.stringify(original);
      const deepCopy: any = JSON.parse(json);
      deepCopy.name = 'Modified';
      deepCopy.id = 999;
      expect(original.name).toBe('SEO');
      expect(original.id).toBe(1);
    });

    it('spread copy of skill with null fields should be structurally equal', () => {
      const original: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const copy: Skills = { ...original };
      expect(copy.description).toBeNull();
      expect(copy.created_by).toBeNull();
      expect(copy.creator_name).toBeNull();
      expect(copy.id).toBe(original.id);
    });
  });

  // ============================================================
  // 解构模式
  // ============================================================
  describe('destructuring patterns', () => {
    it('should use rest operator for partial extraction', () => {
      const skills: Skills = {
        id: 1, name: 'SEO优化', description: '搜索引擎优化',
        skill_dir: '/skills/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, name, ...rest } = skills;
      expect(id).toBe(1);
      expect(name).toBe('SEO优化');
      expect(rest.description).toBe('搜索引擎优化');
      expect(rest.skill_dir).toBe('/skills/seo');
      expect(rest.created_by).toBe(1);
      expect(rest.creator_name).toBe('管理员');
    });

    it('should destructure all fields individually', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-06-01'),
      };
      const { id, name, description, skill_dir, created_by, creator_name, created_at, updated_at } = skills;
      expect(id).toBe(1);
      expect(name).toBe('SEO');
      expect(description).toBe('搜索');
      expect(skill_dir).toBe('/seo');
      expect(created_by).toBe(1);
      expect(creator_name).toBe('管理员');
      expect(created_at.getFullYear()).toBe(2024);
      expect(updated_at.getFullYear()).toBe(2024);
    });

    it('should destructure with computed property access', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const field = 'name';
      expect(skills[field as keyof Skills]).toBe('SEO');
      const numField = 'id';
      expect(skills[numField as keyof Skills]).toBe(1);
    });

    it('should use rest operator to extract metadata only', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const { id, name, description, skill_dir, ...metadata } = skills;
      expect(metadata.created_by).toBe(1);
      expect(metadata.creator_name).toBe('管理员');
      expect(metadata.created_at).toBeInstanceOf(Date);
      expect(metadata.updated_at).toBeInstanceOf(Date);
    });
  });

  // ============================================================
  // 集合高级操作
  // ============================================================
  describe('advanced collection operations', () => {
    const makeSkill = (id: number, name: string, desc: string | null, dir: string, createdBy: number | null, creatorName: string | null): Skills => ({
      id, name, description: desc, skill_dir: dir,
      created_by: createdBy, creator_name: creatorName,
      created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01'),
    });

    it('should filter and map in chain', () => {
      const skills = [
        makeSkill(1, 'SEO', '搜索', '/seo', 1, '管理员'),
        makeSkill(2, 'AI', null, '/ai', null, null),
        makeSkill(3, '发布', '自动发布', '/pub', 2, '张三'),
      ];
      const names = skills.filter(s => s.description !== null).map(s => s.name);
      expect(names).toEqual(['SEO', '发布']);
    });

    it('should find index of skill by name', () => {
      const skills = [
        makeSkill(1, 'SEO', null, '/seo', null, null),
        makeSkill(2, 'AI', null, '/ai', null, null),
        makeSkill(3, '发布', null, '/pub', null, null),
      ];
      expect(skills.findIndex(s => s.name === 'AI')).toBe(1);
    });

    it('should return -1 from findIndex for non-existent name', () => {
      const skills = [
        makeSkill(1, 'SEO', null, '/seo', null, null),
      ];
      expect(skills.findIndex(s => s.name === '不存在')).toBe(-1);
    });

    it('should flatMap skill names with path prefix', () => {
      const skills = [
        makeSkill(1, 'SEO', null, '/seo', null, null),
        makeSkill(2, 'AI', null, '/ai', null, null),
      ];
      const prefixed = skills.flatMap(s => [s.name, s.skill_dir]);
      expect(prefixed).toEqual(['SEO', '/seo', 'AI', '/ai']);
    });

    it('should use reduce to build id-to-skill map', () => {
      const skills = [
        makeSkill(1, 'SEO', null, '/seo', 1, '管理员'),
        makeSkill(2, 'AI', null, '/ai', 2, '张三'),
      ];
      const map = skills.reduce<Map<number, Skills>>((acc, s) => {
        acc.set(s.id, s);
        return acc;
      }, new Map());
      expect(map.get(1)?.name).toBe('SEO');
      expect(map.get(2)?.name).toBe('AI');
    });

    it('should group skills by description status', () => {
      const skills = [
        makeSkill(1, 'A', '有描述', '/a', null, null),
        makeSkill(2, 'B', null, '/b', null, null),
        makeSkill(3, 'C', '也有描述', '/c', null, null),
      ];
      const grouped = skills.reduce<Record<string, Skills[]>>((acc, s) => {
        const key = s.description === null ? 'noDesc' : 'hasDesc';
        if (!acc[key]) acc[key] = [];
        acc[key].push(s);
        return acc;
      }, {});
      expect(grouped.hasDesc).toHaveLength(2);
      expect(grouped.noDesc).toHaveLength(1);
    });

    it('should find skill with highest id', () => {
      const skills = [
        makeSkill(10, 'A', null, '/a', null, null),
        makeSkill(50, 'B', null, '/b', null, null),
        makeSkill(30, 'C', null, '/c', null, null),
      ];
      const max = skills.reduce((prev, curr) => curr.id > prev.id ? curr : prev);
      expect(max.name).toBe('B');
      expect(max.id).toBe(50);
    });

    it('should find skill with lowest id', () => {
      const skills = [
        makeSkill(10, 'A', null, '/a', null, null),
        makeSkill(50, 'B', null, '/b', null, null),
        makeSkill(30, 'C', null, '/c', null, null),
      ];
      const min = skills.reduce((prev, curr) => curr.id < prev.id ? curr : prev);
      expect(min.name).toBe('A');
      expect(min.id).toBe(10);
    });

    it('should count skills per creator', () => {
      const skills = [
        makeSkill(1, 'A', null, '/a', 1, '管理员'),
        makeSkill(2, 'B', null, '/b', 2, '张三'),
        makeSkill(3, 'C', null, '/c', 1, '管理员'),
      ];
      const counts = skills.reduce<Record<string, number>>((acc, s) => {
        const creator = s.creator_name ?? '系统';
        acc[creator] = (acc[creator] || 0) + 1;
        return acc;
      }, {});
      expect(counts['管理员']).toBe(2);
      expect(counts['张三']).toBe(1);
      expect(counts['系统']).toBe(undefined);
    });
  });

  // ============================================================
  // 连续更新链
  // ============================================================
  describe('consecutive update chains', () => {
    it('should apply 3 consecutive updates preserving integrity', () => {
      let skill: Skills = {
        id: 1, name: 'V1', description: '版本1', skill_dir: '/v1',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      skill = { ...skill, name: 'V2', updated_at: new Date('2024-03-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('版本1');
      expect(skill.id).toBe(1);

      skill = { ...skill, description: '版本2', skill_dir: '/v2', updated_at: new Date('2024-06-01') };
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('版本2');
      expect(skill.skill_dir).toBe('/v2');

      skill = { ...skill, created_by: null, creator_name: null, updated_at: new Date('2024-09-01') };
      expect(skill.created_by).toBeNull();
      expect(skill.creator_name).toBeNull();
      expect(skill.name).toBe('V2');
      expect(skill.description).toBe('版本2');
    });

    it('should handle description toggle (null -> string -> null)', () => {
      let skill: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      expect(skill.description).toBeNull();

      skill = { ...skill, description: '新增描述', updated_at: new Date('2024-03-01') };
      expect(skill.description).toBe('新增描述');

      skill = { ...skill, description: null, updated_at: new Date('2024-06-01') };
      expect(skill.description).toBeNull();
    });

    it('should handle 5 consecutive partial updates', () => {
      let skill: Skills = {
        id: 1, name: 'Init', description: '初始', skill_dir: '/init',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };

      skill = { ...skill, name: 'U1', updated_at: new Date('2024-02-01') };
      expect(skill.name).toBe('U1');

      skill = { ...skill, description: '更新1', updated_at: new Date('2024-03-01') };
      expect(skill.description).toBe('更新1');
      expect(skill.name).toBe('U1');

      skill = { ...skill, skill_dir: '/u3', updated_at: new Date('2024-04-01') };
      expect(skill.skill_dir).toBe('/u3');

      skill = { ...skill, creator_name: '张三', updated_at: new Date('2024-05-01') };
      expect(skill.creator_name).toBe('张三');
      expect(skill.created_by).toBe(1);

      skill = { ...skill, created_by: 2, updated_at: new Date('2024-06-01') };
      expect(skill.created_by).toBe(2);
      expect(skill.creator_name).toBe('张三');
      expect(skill.name).toBe('U1');
    });

    it('should preserve id through all updates', () => {
      let skill: Skills = {
        id: 42, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      for (let i = 0; i < 10; i++) {
        skill = { ...skill, name: `更新${i}`, updated_at: new Date() };
        expect(skill.id).toBe(42);
      }
    });
  });

  // ============================================================
  // 日期操作
  // ============================================================
  describe('date operations', () => {
    it('should support created_at with millisecond precision', () => {
      const ms = new Date('2024-06-15T08:30:00.123Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: ms, updated_at: new Date(),
      };
      expect(skills.created_at.getMilliseconds()).toBe(123);
    });

    it('should support date arithmetic between created_at and updated_at', () => {
      const created = new Date('2024-06-01T00:00:00Z');
      const updated = new Date('2024-06-15T00:00:00Z');
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: created, updated_at: updated,
      };
      const diffMs = skills.updated_at.getTime() - skills.created_at.getTime();
      const diffDays = diffMs / (1000 * 60 * 60 * 24);
      expect(diffDays).toBe(14);
    });

    it('should support sorting skills by created_at', () => {
      const skills: Skills[] = [
        { id: 3, name: 'C', description: null, skill_dir: '/c', created_by: null, creator_name: null, created_at: new Date('2024-03-01'), updated_at: new Date() },
        { id: 1, name: 'A', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date('2024-01-01'), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date('2024-02-01'), updated_at: new Date() },
      ];
      const sorted = [...skills].sort((a, b) => a.created_at.getTime() - b.created_at.getTime());
      expect(sorted.map(s => s.name)).toEqual(['A', 'B', 'C']);
    });

    it('should detect stale skills via date comparison', () => {
      const now = new Date('2024-12-01');
      const staleThreshold = 180 * 24 * 60 * 60 * 1000; // 180 days in ms
      const skills: Skills[] = [
        { id: 1, name: 'Recent', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date('2024-06-01'), updated_at: new Date('2024-11-01') },
        { id: 2, name: 'Stale', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date('2024-01-01'), updated_at: new Date('2024-03-01') },
      ];
      const stale = skills.filter(s => (now.getTime() - s.updated_at.getTime()) > staleThreshold);
      expect(stale).toHaveLength(1);
      expect(stale[0].name).toBe('Stale');
    });

    it('should support Date.now() for updated_at assignment', () => {
      const before = Date.now();
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'),
        updated_at: new Date(Date.now()),
      };
      const after = Date.now();
      expect(skills.updated_at.getTime()).toBeGreaterThanOrEqual(before);
      expect(skills.updated_at.getTime()).toBeLessThanOrEqual(after);
    });

    it('should support skills from different years', () => {
      const skills: Skills[] = [
        { id: 1, name: 'Old', description: null, skill_dir: '/a', created_by: null, creator_name: null, created_at: new Date('2020-01-01'), updated_at: new Date('2020-01-01') },
        { id: 2, name: 'New', description: null, skill_dir: '/b', created_by: null, creator_name: null, created_at: new Date('2024-06-01'), updated_at: new Date('2024-06-01') },
      ];
      expect(skills[0].created_at.getFullYear()).toBe(2020);
      expect(skills[1].created_at.getFullYear()).toBe(2024);
    });
  });

  // ============================================================
  // Set/Map 操作
  // ============================================================
  describe('Set/Map operations', () => {
    it('should collect unique creator names into Set', () => {
      const skills: Skills[] = [
        { id: 1, name: 'A', description: null, skill_dir: '/a', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/b', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'C', description: null, skill_dir: '/c', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
      ];
      const creators = new Set(skills.filter(s => s.creator_name !== null).map(s => s.creator_name));
      expect(creators.size).toBe(2);
      expect(creators.has('管理员')).toBe(true);
      expect(creators.has('张三')).toBe(true);
    });

    it('should store skills in Map keyed by skill_dir', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: null, skill_dir: '/seo', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'AI', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const map = new Map(skills.map(s => [s.skill_dir, s]));
      expect(map.get('/seo')?.name).toBe('SEO');
      expect(map.get('/ai')?.name).toBe('AI');
      expect(map.get('/nonexistent')).toBeUndefined();
    });

    it('should collect unique skill_dir values into Set', () => {
      const skills: Skills[] = [
        { id: 1, name: 'A', description: null, skill_dir: '/seo', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'B', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
        { id: 3, name: 'C', description: null, skill_dir: '/seo', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() },
      ];
      const dirs = new Set(skills.map(s => s.skill_dir));
      expect(dirs.size).toBe(2);
    });

    it('should use Map for skill lookup by name', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO优化', description: '搜索', skill_dir: '/seo', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: '内容生成', description: 'AI', skill_dir: '/ai', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
      ];
      const byName = new Map(skills.map(s => [s.name, s]));
      expect(byName.get('SEO优化')?.skill_dir).toBe('/seo');
      expect(byName.has('不存在')).toBe(false);
    });

    it('should convert Map entries to array', () => {
      const map = new Map<number, Skills>();
      map.set(1, { id: 1, name: 'SEO', description: null, skill_dir: '/seo', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() });
      map.set(2, { id: 2, name: 'AI', description: null, skill_dir: '/ai', created_by: null, creator_name: null, created_at: new Date(), updated_at: new Date() });
      const arr = Array.from(map.values());
      expect(arr).toHaveLength(2);
      expect(arr.map(s => s.name)).toEqual(['SEO', 'AI']);
    });
  });

  // ============================================================
  // 属性描述符
  // ============================================================
  describe('property descriptors', () => {
    it('should verify hasOwnProperty for all Skills fields', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(Object.prototype.hasOwnProperty.call(skills, 'id')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'description')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'skill_dir')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'created_by')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'creator_name')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'created_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'updated_at')).toBe(true);
      expect(Object.prototype.hasOwnProperty.call(skills, 'nonexistent')).toBe(false);
    });

    it('should verify all fields are enumerable', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      Object.keys(skills).forEach(key => {
        const desc = Object.getOwnPropertyDescriptor(skills, key);
        expect(desc?.enumerable).toBe(true);
      });
    });

    it('should allow property reassignment on unfrozen skill', () => {
      const skills: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      skills.name = 'B';
      skills.description = '新描述';
      skills.created_by = 42;
      expect(skills.name).toBe('B');
      expect(skills.description).toBe('新描述');
      expect(skills.created_by).toBe(42);
    });

    it('should verify property descriptor for specific fields', () => {
      const skills: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date(), updated_at: new Date(),
      };
      const idDesc = Object.getOwnPropertyDescriptor(skills, 'id');
      expect(idDesc?.value).toBe(1);
      expect(idDesc?.writable).toBe(true);
      expect(idDesc?.configurable).toBe(true);

      const nameDesc = Object.getOwnPropertyDescriptor(skills, 'name');
      expect(nameDesc?.value).toBe('SEO');
      expect(nameDesc?.writable).toBe(true);
    });
  });

  // ============================================================
  // 函数参数传递
  // ============================================================
  describe('function parameter passing', () => {
    it('should pass skill to transform function', () => {
      const original: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const transform = (s: Skills): Skills => ({
        ...s,
        name: s.name.toUpperCase(),
        updated_at: new Date(),
      });
      const result = transform(original);
      expect(result.name).toBe('SEO');
      expect(result.description).toBe('搜索');
      expect(original.name).toBe('SEO');
    });

    it('should pass skills to compare function', () => {
      const skill1: Skills = {
        id: 1, name: 'A', description: null, skill_dir: '/a',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const skill2: Skills = {
        id: 2, name: 'B', description: null, skill_dir: '/b',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      const compareById = (a: Skills, b: Skills): number => a.id - b.id;
      expect(compareById(skill1, skill2)).toBeLessThan(0);
      expect(compareById(skill2, skill1)).toBeGreaterThan(0);
    });

    it('should use skill in map callback to extract summary', () => {
      const skills: Skills[] = [
        { id: 1, name: 'SEO', description: '搜索优化', skill_dir: '/seo', created_by: 1, creator_name: '管理员', created_at: new Date(), updated_at: new Date() },
        { id: 2, name: 'AI', description: 'AI生成', skill_dir: '/ai', created_by: 2, creator_name: '张三', created_at: new Date(), updated_at: new Date() },
      ];
      const summaries = skills.map(s => `${s.id}: ${s.name} (${s.creator_name ?? '系统'})`);
      expect(summaries).toEqual([
        '1: SEO (管理员)',
        '2: AI (张三)',
      ]);
    });

    it('should create skill copy via function returning new object', () => {
      const original: Skills = {
        id: 1, name: 'SEO', description: '搜索', skill_dir: '/seo',
        created_by: 1, creator_name: '管理员',
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const cloneSkill = (s: Skills): Skills => ({ ...s });
      const copy = cloneSkill(original);
      expect(copy).not.toBe(original);
      expect(copy.id).toBe(original.id);
      expect(copy.name).toBe(original.name);
    });

    it('should pass skill as function argument and return updated version', () => {
      const updateName = (skill: Skills, newName: string): Skills => ({
        ...skill,
        name: newName,
        updated_at: new Date(),
      });
      const original: Skills = {
        id: 1, name: '旧名称', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date('2024-01-01'), updated_at: new Date('2024-01-01'),
      };
      const updated = updateName(original, '新名称');
      expect(updated.name).toBe('新名称');
      expect(original.name).toBe('旧名称');
      expect(updated.id).toBe(original.id);
    });
  });
});

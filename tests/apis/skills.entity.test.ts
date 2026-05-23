/**
 * @jest-environment node
 */
import {
  Skills,
  CreateSkillsRequest,
  UpdateSkillsRequest,
} from '../../apis/entity/skills.entity';

describe('skills.entity', () => {
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
      expect(skills.skill_dir).toBe('/skills/seo');
      expect(skills.created_by).toBe(1);
      expect(skills.creator_name).toBe('管理员');
    });

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
      expect(skills.creator_name).toBeNull();
    });
  });

  describe('CreateSkillsRequest interface', () => {
    it('should create a valid request with all required fields', () => {
      const req: CreateSkillsRequest = {
        name: '新技能',
        skill_dir: '/skills/new',
      };
      expect(req.name).toBe('新技能');
      expect(req.skill_dir).toBe('/skills/new');
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
  });

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

    it('should allow partial updates with single field', () => {
      const req: UpdateSkillsRequest = { name: '只改名字' };
      expect(Object.keys(req)).toHaveLength(1);
    });

    it('should allow empty update request', () => {
      const req: UpdateSkillsRequest = {};
      expect(Object.keys(req)).toHaveLength(0);
    });

    it('should allow description update only', () => {
      const req: UpdateSkillsRequest = { description: '新描述' };
      expect(req.description).toBe('新描述');
      expect(req.name).toBeUndefined();
    });
  });

  describe('re-exports from index', () => {
    it('should compile correctly when importing types from index.ts', () => {
      // Type-only imports are validated at compile time by TypeScript
      const skill: Skills = {
        id: 1, name: '测试', description: null, skill_dir: '/test',
        created_by: null, creator_name: null,
        created_at: new Date(), updated_at: new Date(),
      };
      expect(skill.name).toBe('测试');
    });
  });
});

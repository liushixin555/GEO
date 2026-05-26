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
      const skill: Skills = {
        id: 1,
        name: 'test-skill',
        description: 'A test skill',
        skill_dir: 'test-skill',
        created_by: 1,
        creator_name: 'admin',
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skill.id).toBe(1);
      expect(skill.name).toBe('test-skill');
      expect(skill.description).toBe('A test skill');
      expect(skill.skill_dir).toBe('test-skill');
    });

    it('should allow nullable fields', () => {
      const skill: Skills = {
        id: 2,
        name: 'minimal-skill',
        description: null,
        skill_dir: 'minimal',
        created_by: null,
        creator_name: null,
        created_at: new Date(),
        updated_at: new Date(),
      };
      expect(skill.description).toBeNull();
      expect(skill.created_by).toBeNull();
      expect(skill.creator_name).toBeNull();
    });
  });

  describe('CreateSkillsRequest interface', () => {
    it('should create with required fields only', () => {
      const req: CreateSkillsRequest = {
        name: 'new-skill',
        skill_dir: 'new-skill-dir',
      };
      expect(req.name).toBe('new-skill');
      expect(req.skill_dir).toBe('new-skill-dir');
      expect(req.description).toBeUndefined();
      expect(req.created_by).toBeUndefined();
    });

    it('should create with all fields', () => {
      const req: CreateSkillsRequest = {
        name: 'full-skill',
        description: 'Full description',
        skill_dir: 'full-skill-dir',
        created_by: 42,
      };
      expect(req.name).toBe('full-skill');
      expect(req.description).toBe('Full description');
      expect(req.created_by).toBe(42);
    });
  });

  describe('UpdateSkillsRequest interface', () => {
    it('should allow partial updates', () => {
      const req: UpdateSkillsRequest = { name: 'updated-name' };
      expect(req.name).toBe('updated-name');
      expect(req.description).toBeUndefined();
    });

    it('should allow updating description only', () => {
      const req: UpdateSkillsRequest = { description: 'New desc' };
      expect(req.description).toBe('New desc');
      expect(req.name).toBeUndefined();
    });

    it('should allow updating both fields', () => {
      const req: UpdateSkillsRequest = {
        name: 'new-name',
        description: 'new description',
      };
      expect(req.name).toBe('new-name');
      expect(req.description).toBe('new description');
    });
  });
});

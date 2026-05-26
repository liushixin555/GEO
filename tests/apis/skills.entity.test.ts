/**
 * @jest-environment node
 */
import {
  Skills,
  SkillsDetail,
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
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(skill.id).toBe(1);
      expect(skill.name).toBe('test-skill');
      expect(skill.description).toBe('A test skill');
      expect(skill.skill_dir).toBe('test-skill');
      expect(skill.deleted_at).toBeNull();
    });

    it('should allow nullable fields', () => {
      const skill: Skills = {
        id: 2,
        name: 'minimal-skill',
        description: null,
        skill_dir: 'minimal',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
      };
      expect(skill.description).toBeNull();
      expect(skill.created_by).toBeNull();
      expect(skill.deleted_at).toBeNull();
    });

    it('should support deleted_at timestamp for soft-deleted records', () => {
      const deletedAt = new Date('2026-01-15T10:00:00Z');
      const skill: Skills = {
        id: 3,
        name: 'deleted-skill',
        description: null,
        skill_dir: 'deleted',
        created_by: 1,
        created_at: new Date('2026-01-10T10:00:00Z'),
        updated_at: deletedAt,
        deleted_at: deletedAt,
      };
      expect(skill.deleted_at).toBe(deletedAt);
      expect(skill.deleted_at).not.toBeNull();
    });
  });

  describe('SkillsDetail interface', () => {
    it('should extend Skills with creator_name', () => {
      const detail: SkillsDetail = {
        id: 1,
        name: 'test-skill',
        description: 'A test skill',
        skill_dir: 'test-skill',
        created_by: 1,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        creator_name: '管理员',
      };
      expect(detail.creator_name).toBe('管理员');
      expect(detail.id).toBe(1);
      expect(detail.deleted_at).toBeNull();
    });

    it('should allow nullable creator_name', () => {
      const detail: SkillsDetail = {
        id: 2,
        name: 'orphan-skill',
        description: null,
        skill_dir: 'orphan',
        created_by: null,
        created_at: new Date(),
        updated_at: new Date(),
        deleted_at: null,
        creator_name: null,
      };
      expect(detail.creator_name).toBeNull();
    });
  });

  describe('CreateSkillsRequest interface', () => {
    it('should create with required fields only (no created_by)', () => {
      const req: CreateSkillsRequest = {
        name: 'new-skill',
        skill_dir: 'new-skill-dir',
      };
      expect(req.name).toBe('new-skill');
      expect(req.skill_dir).toBe('new-skill-dir');
      expect(req.description).toBeUndefined();
    });

    it('should create with all fields (no created_by exposed)', () => {
      const req: CreateSkillsRequest = {
        name: 'full-skill',
        description: 'Full description',
        skill_dir: 'full-skill-dir',
      };
      expect(req.name).toBe('full-skill');
      expect(req.description).toBe('Full description');
    });

    it('should not expose created_by field', () => {
      const req: CreateSkillsRequest = {
        name: 'safe-skill',
        skill_dir: 'safe-dir',
      };
      // created_by should not exist on the DTO
      expect((req as Record<string, unknown>)['created_by']).toBeUndefined();
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

    it('should support null to explicitly clear description', () => {
      const req: UpdateSkillsRequest = { description: null };
      expect(req.description).toBeNull();
    });

    it('should distinguish undefined (no change) from null (clear)', () => {
      const noChange: UpdateSkillsRequest = {};
      const clear: UpdateSkillsRequest = { description: null };
      const update: UpdateSkillsRequest = { description: 'new value' };

      expect(noChange.description).toBeUndefined();
      expect(clear.description).toBeNull();
      expect(update.description).toBe('new value');
    });
  });
});

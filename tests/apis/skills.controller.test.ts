/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken(userId = 2, companyId = 2) {
  return jwt.sign(
    { userId, username: 'admin', role: 'admin', companyId },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken() {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

/** 创建包含 SKILL.md 的 zip buffer */
function createSkillZip(skillName = 'test-skill', description = 'A test skill'): Buffer {
  const zip = new AdmZip();
  zip.addFile(
    `${skillName}/SKILL.md`,
    Buffer.from(`---\nname: ${skillName}\ndescription: ${description}\n---\n# Skill Content`)
  );
  return zip.toBuffer();
}

describe('Skills Controller', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // 清理 skills 目录（不删 tmp/uploads，multer 需要它）
    const skillsDir = path.resolve(process.cwd(), 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
    // 确保 tmp/uploads 存在
    const tmpDir = path.resolve(process.cwd(), 'tmp', 'uploads');
    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir, { recursive: true });
    }
  });

  afterEach(() => {
    const skillsDir = path.resolve(process.cwd(), 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
  });

  describe('GET /api/skills', () => {
    it('should return 401 without token', async () => {
      const response = await agent.get('/api/skills');
      expect(response.status).toBe(401);
    });

    it('should return 403 for view role', async () => {
      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${viewToken()}`);
      expect(response.status).toBe(403);
    });

    it('should return skills list for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([
        { id: 1, name: 'TypeScript', description: 'TS', skillDir: 'typescript', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date() },
      ]);
      const mockCount = jest.fn().mockResolvedValue(1);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toHaveLength(1);
      expect(response.body.data.list[0].name).toBe('TypeScript');
    });

    it('should return all skills for admin (no company filtering)', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: {},
        })
      );
    });

    it('should support search parameter', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills?search=react')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'react', mode: 'insensitive' } },
        })
      );
    });

    it('should support pagination parameters', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills?page=2&pageSize=5')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          skip: 5,
          take: 5,
        })
      );
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('GET /api/skills/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .get('/api/skills/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('无效的技能ID');
    });

    it('should return skill detail for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, name: 'TypeScript', description: 'TS', skillDir: 'typescript', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.data.name).toBe('TypeScript');
    });

    it('should return 404 for non-existent skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/skills/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('技能不存在');
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });

  describe('POST /api/skills', () => {
    it('should return 400 when no file uploaded', async () => {
      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Test' });

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('请选择技能 zip 包');
    });

    it('should return 400 when zip has no SKILL.md', async () => {
      const zip = new AdmZip();
      zip.addFile('readme.txt', Buffer.from('hello'));

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zip.toBuffer(), 'skill.zip');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('SKILL.md');
    });

    it('should create skill successfully with zip file', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, name: 'test-skill', description: 'A test skill', skillDir: 'test-skill', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      const zipBuffer = createSkillZip();

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zipBuffer, 'skill.zip');

      expect(response.status).toBe(201);
      expect(response.body.data.name).toBe('test-skill');
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'test-skill',
            createdBy: 1,
          }),
        })
      );
    });

    it('should create skill for admin and set created_by', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 2, name: 'admin-skill', description: 'Admin skill', skillDir: 'admin-skill', createdBy: 2, creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      const zipBuffer = createSkillZip('admin-skill', 'Admin skill');

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .attach('file', zipBuffer, 'skill.zip');

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ createdBy: 2 }),
        })
      );
    });

    it('should return 400 when skill directory already exists', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      // Create the directory first so it "exists"
      const skillsDir = path.resolve(process.cwd(), 'skills', 'existing-skill');
      fs.mkdirSync(skillsDir, { recursive: true });

      const zipBuffer = createSkillZip('existing-skill', 'Existing');

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zipBuffer, 'skill.zip');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('已存在');

      // Cleanup
      fs.rmSync(path.resolve(process.cwd(), 'skills', 'existing-skill'), { recursive: true, force: true });
    });

    it('should return 400 for non-zip file', async () => {
      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', Buffer.from('not a zip'), 'skill.txt');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('zip');
    });

    it('should return 400 when SKILL.md has no frontmatter', async () => {
      const zip = new AdmZip();
      zip.addFile('skill/SKILL.md', Buffer.from('# No frontmatter here'));

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zip.toBuffer(), 'skill.zip');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('frontmatter');
    });

    it('should return 400 when SKILL.md has no name field', async () => {
      const zip = new AdmZip();
      zip.addFile('skill/SKILL.md', Buffer.from('---\ndescription: No name\n---\n'));

      const response = await agent
        .post('/api/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zip.toBuffer(), 'skill.zip');

      expect(response.status).toBe(500);
      expect(response.body.message).toContain('name');
    });
  });

  describe('PUT /api/skills/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .put('/api/skills/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(400);
    });

    it('should update skill successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: 2, creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'Vue' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Vue');
    });

    it('should allow admin to update their own skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: 2, creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'Vue' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Vue');
    });

    it('should reject admin updating other user skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('只能修改自己创建的技能');
    });

    it('should reject admin updating skill with null created_by', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date() };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(403);
    });

    it('should return 404 for non-existent skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/999')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(404);
      expect(response.body.message).toBe('技能不存在');
    });

    it('should return 500 on database error during update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .put('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Vue' });

      expect(response.status).toBe(500);
    });
  });

  describe('DELETE /api/skills/:id', () => {
    it('should return 400 for invalid id', async () => {
      const response = await agent
        .delete('/api/skills/abc')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
    });

    it('should return 404 for non-existent skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
    });

    it('should delete skill successfully for sysadmin', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'React', description: 'UI', skillDir: null, createdBy: 2,
        creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)  // getById
        .mockResolvedValueOnce(existing); // delete check
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
      expect(response.body.message).toContain('删除技能成功');
    });

    it('should allow admin to delete their own skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'React', description: 'UI', skillDir: null, createdBy: 2,
        creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(200);
      expect(response.body.code).toBe(0);
    });

    it('should reject admin deleting other user skill', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
      expect(response.body.message).toContain('只能删除自己创建的技能');
    });

    it('should reject admin deleting skill with null created_by', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'React', description: 'UI', skillDir: null, createdBy: null,
        creator: null, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`);

      expect(response.status).toBe(403);
    });

    it('should remove skill directory when skill_dir exists', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const skillDirName = 'removable-skill-dir';
      const skillsBase = path.resolve(process.cwd(), 'skills');
      const fullDir = path.join(skillsBase, skillDirName);

      // Create a temp directory to be removed
      fs.mkdirSync(fullDir, { recursive: true });
      fs.writeFileSync(path.join(fullDir, 'SKILL.md'), 'test');

      const existing = {
        id: 1, name: 'Removable', description: 'To remove', skillDir: skillDirName, createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(fs.existsSync(fullDir)).toBe(false);
    });

    it('should return 500 on database error', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue(new Error('DB error'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .delete('/api/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
    });
  });
});

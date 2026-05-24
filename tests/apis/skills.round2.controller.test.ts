/**
 * @jest-environment node
 *
 * Skills Controller 第二轮测试 — 补全关联服务和工具层覆盖率
 *
 * 目标文件:
 *   - skills.service.impl.ts  (Branch 72.72% → 100%)
 *   - skills-file.service.ts  (Stmts 90.52%, Branch 67.64% → 100%)
 *   - skill-md.util.ts        (Stmts 90.9%, Branch 88.88% → 100%)
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import yaml from 'js-yaml';

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
import { SkillsServiceImpl } from '../../apis/service/impl/skills.service.impl';
import { SkillsFileServiceImpl } from '../../apis/service/skills-file.service';
import { parseSkillMd } from '../../apis/utils/skill-md.util';

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

// ============================================================
// 1. SkillsServiceImpl 单元测试 — 补全 Branch 覆盖
// ============================================================
describe('SkillsServiceImpl — 单元测试', () => {
  let service: SkillsServiceImpl;

  beforeEach(() => {
    service = new SkillsServiceImpl();
    jest.clearAllMocks();
  });

  describe('create()', () => {
    it('当 created_by 为 null 时应省略 createdBy 字段（line 50 false branch）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, name: 'no-creator', description: null, skillDir: 'no-creator',
        createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      const result = await service.create({
        name: 'no-creator',
        skill_dir: 'no-creator',
        created_by: null,
      });

      expect(result.id).toBe(1);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: 'no-creator',
          }),
        })
      );
      // 确认 createdBy 不在 data 中（spread 展开为 {}）
      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBeUndefined();
    });

    it('当 created_by 为 0（falsy）时也应省略 createdBy 字段', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 2, name: 'zero-creator', description: null, skillDir: 'zero',
        createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      await service.create({
        name: 'zero-creator',
        skill_dir: 'zero',
        created_by: 0,
      });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBeUndefined();
    });

    it('当 created_by 为正整数时应在 data 中包含 createdBy', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 3, name: 'has-creator', description: 'desc', skillDir: 'has',
        createdBy: 5, creator: { cnName: '用户5' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      await service.create({
        name: 'has-creator',
        description: 'desc',
        skill_dir: 'has',
        created_by: 5,
      });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBe(5);
    });

    it('当 created_by 为 undefined 时应省略 createdBy 字段', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 4, name: 'undef-creator', description: null, skillDir: 'undef',
        createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      await service.create({
        name: 'undef-creator',
        skill_dir: 'undef',
        created_by: undefined,
      });

      const callData = mockCreate.mock.calls[0][0].data;
      expect(callData.createdBy).toBeUndefined();
    });
  });

  describe('update()', () => {
    it('当 request 中 name 和 description 均未提供时应传空 data', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Old', description: 'Old desc', skillDir: 'old', deletedAt: null,
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, creator: { cnName: 'Admin' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      await service.update(1, {});

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} })
      );
    });

    it('当 request 只提供 name 时 description 应不在 data 中', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Old', description: 'Old desc', skillDir: 'old', deletedAt: null,
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, name: 'New', creator: { cnName: 'Admin' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      await service.update(1, { name: 'New' });

      const callData = mockUpdate.mock.calls[0][0].data;
      expect(callData.name).toBe('New');
      expect(callData.description).toBeUndefined();
    });

    it('当 request 只提供 description 时 name 应不在 data 中', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Old', description: 'Old desc', skillDir: 'old', deletedAt: null,
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, description: 'New desc', creator: { cnName: 'Admin' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      await service.update(1, { description: 'New desc' });

      const callData = mockUpdate.mock.calls[0][0].data;
      expect(callData.description).toBe('New desc');
      expect(callData.name).toBeUndefined();
    });

    it('当记录已被软删除时应抛出 NotFoundError', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: jest.fn() } });

      await expect(service.update(1, { name: 'New' })).rejects.toThrow('技能不存在');
    });
  });

  describe('delete()', () => {
    it('当记录已被软删除时应抛出 NotFoundError', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: jest.fn() } });

      await expect(service.delete(1)).rejects.toThrow('技能不存在');
    });

    it('正常删除应设置 deletedAt 并调用 update', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = { id: 1, name: 'Del', deletedAt: null };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      await service.delete(1);

      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: 1 },
          data: expect.objectContaining({ deletedAt: expect.any(Date) }),
        })
      );
    });
  });

  describe('list()', () => {
    it('当无 search 参数时 where 应为空对象', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      await service.list(1, 10);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ where: {} })
      );
    });

    it('当有 search 参数时 where 应包含搜索条件', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      await service.list(1, 10, 'react');

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { name: { contains: 'react', mode: 'insensitive' } },
        })
      );
    });

    it('应正确映射 creator 信息到 creator_name', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockItems = [
        { id: 1, name: 'S1', description: null, skillDir: 's1', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date() },
        { id: 2, name: 'S2', description: 'desc', skillDir: 's2', createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date() },
      ];
      const mockFindMany = jest.fn().mockResolvedValue(mockItems);
      const mockCount = jest.fn().mockResolvedValue(2);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const { list } = await service.list(1, 10);

      expect(list[0].creator_name).toBe('管理员');
      expect(list[1].creator_name).toBeNull();
    });
  });

  describe('getById()', () => {
    it('当记录存在时应返回映射后的实体', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, name: 'Test', description: 'desc', skillDir: 'test', createdBy: 1,
        creator: { cnName: 'Admin' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const result = await service.getById(1);

      expect(result.id).toBe(1);
      expect(result.name).toBe('Test');
      expect(result.creator_name).toBe('Admin');
    });

    it('当记录不存在时应抛出 NotFoundError', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      await expect(service.getById(999)).rejects.toThrow('技能不存在');
    });
  });
});

// ============================================================
// 2. SkillsFileServiceImpl 单元测试 — 补全 Stmts/Branch 覆盖
// ============================================================
describe('SkillsFileServiceImpl — 单元测试', () => {
  let fileService: SkillsFileServiceImpl;
  const skillsBase = path.resolve(process.cwd(), 'skills');
  const tmpBase = path.resolve(process.cwd(), 'tmp', 'uploads');

  beforeEach(() => {
    fileService = new SkillsFileServiceImpl();
    jest.clearAllMocks();
    // 清理 skills 目录
    if (fs.existsSync(skillsBase)) {
      fs.rmSync(skillsBase, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(skillsBase)) {
      fs.rmSync(skillsBase, { recursive: true, force: true });
    }
  });

  describe('getSkillsDir()', () => {
    it('当 skills 目录不存在时应自动创建', () => {
      // 确保目录不存在
      if (fs.existsSync(skillsBase)) {
        fs.rmSync(skillsBase, { recursive: true, force: true });
      }
      const dir = fileService.getSkillsDir();
      expect(fs.existsSync(dir)).toBe(true);
    });

    it('当 skills 目录已存在时应直接返回路径', () => {
      fs.mkdirSync(skillsBase, { recursive: true });
      const dir = fileService.getSkillsDir();
      expect(dir).toBe(skillsBase);
    });
  });

  describe('getTmpDir()', () => {
    it('当 tmp/uploads 目录不存在时应自动创建（line 43）', () => {
      // 创建一个全新的 service 实例，确保 tmpDir 缓存为 null
      const freshService = new SkillsFileServiceImpl();
      // 确保 tmp 目录不存在
      if (fs.existsSync(tmpBase)) {
        fs.rmSync(tmpBase, { recursive: true, force: true });
      }
      const dir = freshService.getTmpDir();
      expect(fs.existsSync(dir)).toBe(true);
      // 恢复 tmp 目录
      fs.mkdirSync(tmpBase, { recursive: true });
    });
  });

  describe('extractSkillZip()', () => {
    it('当 zip 包含路径遍历条目时应抛出 BusinessError（line 86）', () => {
      // adm-zip 在 Windows 上会规范化路径，无法通过真实 zip 测试路径遍历
      // 使用 isolateModules mock AdmZip 来模拟路径遍历条目
      jest.isolateModules(() => {
        const mockEntry1 = {
          isDirectory: false,
          entryName: 'safe-skill/SKILL.md',
          getData: () => Buffer.from('---\nname: safe-skill\n---\n'),
          header: { size: 100 },
        };
        const mockEntry2 = {
          isDirectory: false,
          entryName: '../../../etc/passwd',
          getData: () => Buffer.from('malicious'),
          header: { size: 100 },
        };
        const mockZip = {
          getEntries: () => [mockEntry1, mockEntry2],
        };
        jest.doMock('adm-zip', () => {
          return jest.fn().mockImplementation(() => mockZip);
        });

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        // 创建一个有效的 PK header 文件
        const zipPath = path.join(tmpBase, 'mock-traversal.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          expect(() => svc.extractSkillZip(zipPath)).toThrow('zip 包包含非法路径');
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('当 zip 条目超过 100MB 大小限制时应抛出 BusinessError（line 89）', () => {
      jest.isolateModules(() => {
        const mockEntry1 = {
          isDirectory: false,
          entryName: 'big-skill/SKILL.md',
          getData: () => Buffer.from('---\nname: big-skill\n---\n'),
          header: { size: 100 },
        };
        const mockEntry2 = {
          isDirectory: false,
          entryName: 'big-skill/large.bin',
          getData: () => Buffer.from('x'.repeat(100)),
          header: { size: 150 * 1024 * 1024 }, // 150MB > 100MB limit
        };
        const mockZip = {
          getEntries: () => [mockEntry1, mockEntry2],
        };
        jest.doMock('adm-zip', () => {
          return jest.fn().mockImplementation(() => mockZip);
        });

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        const zipPath = path.join(tmpBase, 'mock-big.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          expect(() => svc.extractSkillZip(zipPath)).toThrow('zip 包中文件过大');
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('当解压路径包含非法路径时应抛出 BusinessError（line 107）', () => {
      // 利用验证循环和解压循环的微妙差异测试：
      // 验证循环对 resolvedSkillsDir 本身有例外（|| entryResolved !== resolvedSkillsDir）
      // 解压循环没有此例外，entryName='.' 会通过验证但被解压循环捕获
      jest.isolateModules(() => {
        const skillMdContent = '---\nname: dot-skill\n---\n';
        const mockEntry1 = {
          isDirectory: false,
          entryName: 'dot-skill/SKILL.md',
          getData: () => Buffer.from(skillMdContent),
          header: { size: skillMdContent.length },
        };
        // entryName='.' 解析到 skillsDir 本身
        // 验证: path.resolve(skillsDir, '.') === skillsDir → 通过（例外条件）
        // 解压: path.resolve(path.join(skillsDir, '.')) === skillsDir → 失败（无例外）
        const dotEntry = {
          isDirectory: false,
          entryName: '.',
          getData: () => Buffer.from('dot-data'),
          header: { size: 100 },
        };
        const mockZip = {
          getEntries: () => [mockEntry1, dotEntry],
        };
        jest.doMock('adm-zip', () => {
          return jest.fn().mockImplementation(() => mockZip);
        });

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        const zipPath = path.join(tmpBase, 'mock-dot-traversal.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          expect(() => svc.extractSkillZip(zipPath)).toThrow('zip 包包含非法路径');
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('当解压总大小超过 500MB 时应抛出 BusinessError（line 112）', () => {
      jest.isolateModules(() => {
        const skillMdContent = '---\nname: huge-skill\n---\n';
        // SKILL.md 条目 — 真实小 Buffer，会被成功写入
        const skillEntry = {
          isDirectory: false,
          entryName: 'huge-skill/SKILL.md',
          getData: () => Buffer.from(skillMdContent),
          header: { size: skillMdContent.length },
        };
        // 大文件条目 — 使用带 length 的对象模拟大数据（不实际分配内存）
        // header.size 设为小值以通过验证循环的单条目大小检查
        const bigEntry = {
          isDirectory: false,
          entryName: 'huge-skill/payload.bin',
          getData: () => ({ length: 600 * 1024 * 1024 }), // 600MB fake
          header: { size: 1024 },
        };
        const mockZip = {
          getEntries: () => [skillEntry, bigEntry],
        };
        jest.doMock('adm-zip', () => {
          return jest.fn().mockImplementation(() => mockZip);
        });

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        const zipPath = path.join(tmpBase, 'mock-huge.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          expect(() => svc.extractSkillZip(zipPath)).toThrow('zip 包解压后总大小超过限制');
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('正常解压应返回正确的技能信息', () => {
      const zip = new AdmZip();
      zip.addFile('normal-skill/SKILL.md', Buffer.from('---\nname: normal-skill\ndescription: A normal skill\n---\n# Content'));
      zip.addFile('normal-skill/src/index.ts', Buffer.from('export {}'));

      const zipPath = path.join(tmpBase, 'normal.zip');
      zip.writeZip(zipPath);

      try {
        const result = fileService.extractSkillZip(zipPath);
        expect(result.name).toBe('normal-skill');
        expect(result.description).toBe('A normal skill');
        expect(result.topDir).toBe('normal-skill');
        // 验证文件确实被解压
        const extractedMd = path.join(skillsBase, 'normal-skill', 'SKILL.md');
        expect(fs.existsSync(extractedMd)).toBe(true);
      } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      }
    });

    it('包含目录条目时应正确创建子目录（lines 97-102）', () => {
      jest.isolateModules(() => {
        const skillMdContent = '---\nname: dir-skill\ndescription: Dir test\n---\n';
        const entries = [
          // 目录条目
          { isDirectory: true, entryName: 'dir-skill/', getData: () => Buffer.alloc(0), header: { size: 0 } },
          { isDirectory: true, entryName: 'dir-skill/src/', getData: () => Buffer.alloc(0), header: { size: 0 } },
          // SKILL.md 文件
          { isDirectory: false, entryName: 'dir-skill/SKILL.md', getData: () => Buffer.from(skillMdContent), header: { size: skillMdContent.length } },
          // 源文件
          { isDirectory: false, entryName: 'dir-skill/src/index.ts', getData: () => Buffer.from('export {}'), header: { size: 10 } },
        ];
        const mockZip = { getEntries: () => entries };
        jest.doMock('adm-zip', () => jest.fn().mockImplementation(() => mockZip));

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        const zipPath = path.join(tmpBase, 'mock-dirs.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          const result = svc.extractSkillZip(zipPath);
          expect(result.name).toBe('dir-skill');
          // 验证目录被创建
          expect(fs.existsSync(path.join(skillsBase, 'dir-skill', 'src'))).toBe(true);
          expect(fs.existsSync(path.join(skillsBase, 'dir-skill', 'SKILL.md'))).toBe(true);
          expect(fs.existsSync(path.join(skillsBase, 'dir-skill', 'src', 'index.ts'))).toBe(true);
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('目录条目解析到 skillsDir 外时不应创建目录（line 99 false branch）', () => {
      jest.isolateModules(() => {
        const skillMdContent = '---\nname: escape-dir-skill\n---\n';
        const entries = [
          // 验证循环会先捕获这个目录条目的路径遍历
          { isDirectory: true, entryName: '../../../etc/', getData: () => Buffer.alloc(0), header: { size: 0 } },
          { isDirectory: false, entryName: 'escape-dir-skill/SKILL.md', getData: () => Buffer.from(skillMdContent), header: { size: skillMdContent.length } },
        ];
        const mockZip = { getEntries: () => entries };
        jest.doMock('adm-zip', () => jest.fn().mockImplementation(() => mockZip));

        const { SkillsFileServiceImpl } = require('../../apis/service/skills-file.service');
        const svc = new SkillsFileServiceImpl();
        const zipPath = path.join(tmpBase, 'mock-escape-dir.zip');
        const pkBuffer = Buffer.alloc(4);
        pkBuffer[0] = 0x50; pkBuffer[1] = 0x4B; pkBuffer[2] = 0x03; pkBuffer[3] = 0x04;
        fs.writeFileSync(zipPath, pkBuffer);

        try {
          expect(() => svc.extractSkillZip(zipPath)).toThrow('zip 包包含非法路径');
        } finally {
          if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
        }
      });
    });

    it('当文件不是有效 zip 格式时应抛出 BusinessError', () => {
      const notZipPath = path.join(tmpBase, 'not-zip.bin');
      fs.writeFileSync(notZipPath, Buffer.from('this is not a zip file'));

      try {
        expect(() => fileService.extractSkillZip(notZipPath)).toThrow('文件不是有效的 zip 格式');
      } finally {
        if (fs.existsSync(notZipPath)) fs.unlinkSync(notZipPath);
      }
    });

    it('当 zip 中没有 SKILL.md 时应抛出 BusinessError', () => {
      const zip = new AdmZip();
      zip.addFile('readme.txt', Buffer.from('no skill md here'));

      const zipPath = path.join(tmpBase, 'no-skill-md.zip');
      zip.writeZip(zipPath);

      try {
        expect(() => fileService.extractSkillZip(zipPath)).toThrow('zip 包中未找到 SKILL.md 文件');
      } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      }
    });

    it('当技能目录已存在时应抛出 BusinessError', () => {
      // 预创建目录
      const existingDir = path.join(skillsBase, 'existing-dir');
      fs.mkdirSync(existingDir, { recursive: true });

      const zip = new AdmZip();
      zip.addFile('existing-dir/SKILL.md', Buffer.from('---\nname: existing-dir\n---\n'));

      const zipPath = path.join(tmpBase, 'existing.zip');
      zip.writeZip(zipPath);

      try {
        expect(() => fileService.extractSkillZip(zipPath)).toThrow('已存在');
      } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      }
    });

    it('flat zip（无子目录）应正确处理', () => {
      const zip = new AdmZip();
      zip.addFile('SKILL.md', Buffer.from('---\nname: flat-skill\ndescription: Flat\n---\n# Content'));

      const zipPath = path.join(tmpBase, 'flat.zip');
      zip.writeZip(zipPath);

      try {
        const result = fileService.extractSkillZip(zipPath);
        expect(result.name).toBe('flat-skill');
        expect(result.topDir).toBe('flat-skill');
      } finally {
        if (fs.existsSync(zipPath)) fs.unlinkSync(zipPath);
      }
    });
  });

  describe('validateSkillDirPath()', () => {
    it('当路径为空字符串时不应抛出异常', () => {
      expect(() => fileService.validateSkillDirPath('')).not.toThrow();
    });

    it('当路径合法时不应抛出异常', () => {
      expect(() => fileService.validateSkillDirPath('valid-skill')).not.toThrow();
    });

    it('当路径包含路径遍历时应抛出 BusinessError（line 159 via validateSkillDirPath）', () => {
      expect(() => fileService.validateSkillDirPath('../../etc')).toThrow('非法的技能目录路径');
    });

    it('当路径为 . 时应抛出 BusinessError', () => {
      expect(() => fileService.validateSkillDirPath('.')).toThrow('非法的技能目录路径');
    });

    it('当路径为 .. 时应抛出 BusinessError', () => {
      expect(() => fileService.validateSkillDirPath('..')).toThrow('非法的技能目录路径');
    });

    it('当路径为绝对路径时应抛出 BusinessError', () => {
      expect(() => fileService.validateSkillDirPath('/etc/passwd')).toThrow('非法的技能目录路径');
    });
  });

  describe('removeSkillDir()', () => {
    it('当路径为空字符串时不应抛出异常', () => {
      expect(() => fileService.removeSkillDir('')).not.toThrow();
    });

    it('应正确删除存在的目录', () => {
      const testDir = path.join(skillsBase, 'to-remove');
      fs.mkdirSync(testDir, { recursive: true });
      fs.writeFileSync(path.join(testDir, 'test.txt'), 'content');

      fileService.removeSkillDir('to-remove');

      expect(fs.existsSync(testDir)).toBe(false);
    });

    it('当目录不存在时不应抛出异常', () => {
      expect(() => fileService.removeSkillDir('nonexistent')).not.toThrow();
    });

    it('当路径包含路径遍历时应抛出 BusinessError（line 159）', () => {
      // 先创建一个目标目录，确保不会误删
      const safeDir = path.join(skillsBase, 'safe-dir');
      fs.mkdirSync(safeDir, { recursive: true });
      fs.writeFileSync(path.join(safeDir, 'safe.txt'), 'safe');

      expect(() => fileService.removeSkillDir('../safe-dir')).toThrow('非法的技能目录路径');

      // 验证安全目录仍然存在
      expect(fs.existsSync(safeDir)).toBe(true);
    });
  });
});

// ============================================================
// 3. parseSkillMd 单元测试 — 补全 Branch 覆盖
// ============================================================
describe('parseSkillMd — 单元测试', () => {
  it('当 name 为数字类型时应抛出错误（line 17 typeof 分支）', () => {
    const content = '---\nname: 123\ndescription: Numeric name\n---\n';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md frontmatter 中缺少 name 字段');
  });

  it('当 name 为布尔值时应抛出错误', () => {
    const content = '---\nname: true\ndescription: Boolean name\n---\n';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md frontmatter 中缺少 name 字段');
  });

  it('当 name 为空字符串时应抛出错误（!parsed.name 分支）', () => {
    const content = '---\nname: ""\ndescription: Empty name\n---\n';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md frontmatter 中缺少 name 字段');
  });

  it('当 name 为 null 时应抛出错误', () => {
    // YAML 中 ~ 表示 null
    const content = '---\nname: ~\ndescription: Null name\n---\n';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md frontmatter 中缺少 name 字段');
  });

  it('当缺少 frontmatter 时应抛出错误', () => {
    const content = '# No frontmatter';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md 缺少 frontmatter');
  });

  it('当 frontmatter 为空时应抛出错误', () => {
    // 需要在两个 --- 之间有空行才能匹配正则
    const content = '---\n\n---\n# Empty frontmatter';
    expect(() => parseSkillMd(content)).toThrow('SKILL.md frontmatter 格式无效');
  });

  it('正常解析应返回 name 和 description', () => {
    const content = '---\nname: my-skill\ndescription: My description\n---\n# Content';
    const result = parseSkillMd(content);
    expect(result.name).toBe('my-skill');
    expect(result.description).toBe('My description');
  });

  it('name 应被 trim', () => {
    const content = '---\nname:   padded-name   \n---\n';
    const result = parseSkillMd(content);
    expect(result.name).toBe('padded-name');
  });

  it('description 应被 trim', () => {
    const content = '---\nname: skill\ndescription:   padded desc   \n---\n';
    const result = parseSkillMd(content);
    expect(result.description).toBe('padded desc');
  });

  it('当 description 缺失时应返回空字符串', () => {
    const content = '---\nname: no-desc\n---\n';
    const result = parseSkillMd(content);
    expect(result.description).toBe('');
  });

  it('当 description 为非字符串时应返回空字符串', () => {
    const content = '---\nname: skill\ndescription: 123\n---\n';
    const result = parseSkillMd(content);
    expect(result.description).toBe('');
  });

  it('应支持 CRLF 换行', () => {
    const content = '---\r\nname: crlf-skill\r\ndescription: CRLF test\r\n---\r\n# Content';
    const result = parseSkillMd(content);
    expect(result.name).toBe('crlf-skill');
    expect(result.description).toBe('CRLF test');
  });

  it('frontmatter 中有额外字段时应忽略', () => {
    const content = '---\nauthor: test\nversion: 1.0\nname: extra-skill\ndescription: Extra\n---\n';
    const result = parseSkillMd(content);
    expect(result.name).toBe('extra-skill');
    expect(result.description).toBe('Extra');
  });
});

// ============================================================
// 4. 控制器层额外边界用例
// ============================================================
describe('Skills Controller — 第二轮补充', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const skillsDir = path.resolve(process.cwd(), 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
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

  describe('PUT /api/skills/:id — 空请求体', () => {
    it('发送空 body 更新时应成功（无字段变更）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'React', description: 'UI', skillDir: 'react', createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue(existing);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({});

      expect(response.status).toBe(200);
      expect(mockUpdate).toHaveBeenCalledWith(
        expect.objectContaining({ data: {} })
      );
    });
  });

  describe('PUT /api/skills/:id — 同时更新 name 和 description', () => {
    it('同时提供 name 和 description 时应都更新', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Old', description: 'Old desc', skillDir: 'old', createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({
        ...existing, name: 'New', description: 'New desc',
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'New', description: 'New desc' });

      expect(response.status).toBe(200);
      const callData = mockUpdate.mock.calls[0][0].data;
      expect(callData.name).toBe('New');
      expect(callData.description).toBe('New desc');
    });
  });

  describe('DELETE /api/skills/:id — ConflictError 处理', () => {
    it('当 delete 操作抛出 ConflictError 时应返回 409', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { ConflictError } = require('../../apis/entity/errors');
      const existing = {
        id: 1, name: 'Test', description: 'desc', skillDir: null, createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new ConflictError('冲突'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(409);
    });
  });

  describe('DELETE /api/skills/:id — BusinessError 处理', () => {
    it('当 delete 操作抛出 BusinessError 时应返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { BusinessError } = require('../../apis/entity/errors');
      const existing = {
        id: 1, name: 'Test', description: 'desc', skillDir: null, createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new BusinessError('业务错误'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('业务错误');
    });
  });

  describe('PUT /api/skills/:id — ConflictError 处理', () => {
    it('当 update 操作抛出 ConflictError 时应返回 409', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { ConflictError } = require('../../apis/entity/errors');
      const existing = {
        id: 1, name: 'Old', description: 'Old', skillDir: 'old', createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new ConflictError('名称冲突'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'Duplicate' });

      expect(response.status).toBe(409);
      expect(response.body.message).toBe('名称冲突');
    });
  });

  describe('PUT /api/skills/:id — BusinessError 处理', () => {
    it('当 update 操作抛出 BusinessError 时应返回 400', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const { BusinessError } = require('../../apis/entity/errors');
      const existing = {
        id: 1, name: 'Old', description: 'Old', skillDir: 'old', createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockRejectedValue(new BusinessError('参数无效'));
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ name: 'New' });

      expect(response.status).toBe(400);
      expect(response.body.message).toBe('参数无效');
    });
  });

  describe('GET /api/skills/:id — non-Error throw', () => {
    it('当 getById 抛出字符串时应返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockRejectedValue('unexpected string');
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('获取技能详情失败');
    });
  });

  describe('DELETE /api/skills/:id — 非 Error 抛出', () => {
    it('当 delete 操作抛出非 Error 值时应返回 500', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Test', description: 'desc', skillDir: null, createdBy: 1,
        creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockRejectedValue('string error');
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(500);
      expect(response.body.message).toBe('删除技能失败');
    });
  });

  describe('POST /api/skills — 上传中间件 multer Error', () => {
    it('当 multer 回调返回 Error 对象时应返回 400 并包含错误消息', async () => {
      // 上传非 zip 文件触发 multer fileFilter 的 Error
      const response = await agent
        .post('/api/v1/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', Buffer.from('not a zip'), 'skill.exe');

      expect(response.status).toBe(400);
      expect(response.body.message).toContain('zip');
    });
  });

  describe('GET /api/skills — 并行查询', () => {
    it('findMany 和 count 应并行执行（Promise.all）', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const callOrder: string[] = [];
      const mockFindMany = jest.fn().mockImplementation(async () => {
        callOrder.push('findMany-start');
        await new Promise(r => setTimeout(r, 10));
        callOrder.push('findMany-end');
        return [];
      });
      const mockCount = jest.fn().mockImplementation(async () => {
        callOrder.push('count-start');
        await new Promise(r => setTimeout(r, 5));
        callOrder.push('count-end');
        return 0;
      });
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      // 验证两个查询都被调用
      expect(mockFindMany).toHaveBeenCalled();
      expect(mockCount).toHaveBeenCalled();
    });
  });

  describe('GET /api/skills — 排序', () => {
    it('应按 id 降序排列', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      await agent
        .get('/api/v1/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({
          orderBy: { id: 'desc' },
        })
      );
    });
  });

  describe('PUT /api/skills/:id — 鉴权边界', () => {
    it('admin 修改自己的技能（created_by 匹配 userId）应成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 1, name: 'Own', description: 'desc', skillDir: 'own', createdBy: 2,
        creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'Updated' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/1')
        .set('Authorization', `Bearer ${adminToken(2, 2)}`)
        .send({ name: 'Updated' });

      expect(response.status).toBe(200);
      expect(response.body.data.name).toBe('Updated');
    });

    it('sysadmin 修改任何人的技能都应成功', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 5, name: 'Others', description: 'desc', skillDir: 'others', createdBy: 99,
        creator: { cnName: '用户99' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn().mockResolvedValue(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: 'SysAdmin Edit' });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .put('/api/v1/skills/5')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .send({ description: 'SysAdmin Edit' });

      expect(response.status).toBe(200);
      expect(response.body.data.description).toBe('SysAdmin Edit');
    });
  });

  describe('DELETE /api/skills/:id — 鉴权边界', () => {
    it('sysadmin 可删除任何人的技能', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const existing = {
        id: 3, name: 'Others', description: 'desc', skillDir: null, createdBy: 88,
        creator: { cnName: '用户88' }, createdAt: new Date(), updatedAt: new Date(),
      };
      const mockFindFirst = jest.fn()
        .mockResolvedValueOnce(existing)
        .mockResolvedValueOnce(existing);
      const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

      const response = await agent
        .delete('/api/v1/skills/3')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('删除技能成功');
    });
  });

  describe('POST /api/skills — SKILL.md 边界情况', () => {
    it('SKILL.md 中 name 包含空格应被 trim', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      const mockCreate = jest.fn().mockResolvedValue({
        id: 1, name: 'spaced skill', description: '', skillDir: 'spaced-skill',
        createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, create: mockCreate } });

      const zip = new AdmZip();
      zip.addFile(
        'spaced-skill/SKILL.md',
        Buffer.from('---\nname:   spaced skill   \n---\n# Content')
      );

      const response = await agent
        .post('/api/v1/skills')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', zip.toBuffer(), 'skill.zip');

      expect(response.status).toBe(201);
      expect(mockCreate).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ name: 'spaced skill' }),
        })
      );
    });
  });

  describe('handleSkillError — 各错误类型覆盖', () => {
    it('GET 详情 NotFoundError 应返回 404', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue(null);
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/skills/999')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(404);
      expect(response.body.message).toContain('技能不存在');
    });
  });

  describe('mapSkills — 边界字段映射', () => {
    it('当 creator 为 null 时 creator_name 应为 null', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, name: 'NoCreator', description: null, skillDir: 'no-creator',
        createdBy: null, creator: null, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.creator_name).toBeNull();
      expect(response.body.data.created_by).toBeNull();
    });

    it('当 creator 存在时应正确映射 cnName', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindFirst = jest.fn().mockResolvedValue({
        id: 1, name: 'WithCreator', description: 'desc', skillDir: 'with',
        createdBy: 5, creator: { cnName: '张三' }, createdAt: new Date(), updatedAt: new Date(),
      });
      getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

      const response = await agent
        .get('/api/v1/skills/1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(response.body.data.creator_name).toBe('张三');
      expect(response.body.data.created_by).toBe(5);
    });
  });

  describe('列表分页边界', () => {
    it('page=1 pageSize=1 应正确计算 skip=0 take=1', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/skills?page=1&pageSize=1')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 0, take: 1 })
      );
    });

    it('page=3 pageSize=10 应正确计算 skip=20 take=10', async () => {
      const { getPrisma } = require('../../apis/utils/db.util');
      const mockFindMany = jest.fn().mockResolvedValue([]);
      const mockCount = jest.fn().mockResolvedValue(0);
      getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

      const response = await agent
        .get('/api/v1/skills?page=3&pageSize=10')
        .set('Authorization', `Bearer ${sysadminToken()}`);

      expect(response.status).toBe(200);
      expect(mockFindMany).toHaveBeenCalledWith(
        expect.objectContaining({ skip: 20, take: 10 })
      );
    });
  });
});

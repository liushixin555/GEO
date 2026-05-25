/**
 * @jest-environment node
 *
 * Skills Controller 第三轮测试 — 补全 Controller 层 100% 覆盖
 *
 * 目标缺口 (Uncovered Line #s: 49-55, 142, 145):
 *   - uploadSkillMiddleware: multer Error with code (LIMIT_FILE_SIZE, LIMIT_UNEXPECTED_FILE, other)
 *   - updateSkills: name 验证 (非字符串/空/超长)
 *   - updateSkills: description 验证 (非字符串/超长)
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import path from 'path';
import fs from 'fs';

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

// ============================================================
// 1. uploadSkillMiddleware — Multer Error with code (lines 49-55)
// ============================================================
describe('uploadSkillMiddleware — Multer Error Codes', () => {
  it('LIMIT_FILE_SIZE → 400 文件大小超过限制', () => {
    jest.isolateModules(() => {
      const limitErr = new Error('File too large') as Error & { code: string };
      limitErr.code = 'LIMIT_FILE_SIZE';

      jest.doMock('multer', () => {
        return jest.fn().mockImplementation(() => ({
          single: () => (req: any, res: any, cb: any) => cb(limitErr),
        }));
      });

      const ctrl = require('../../apis/controller/skills.controller');
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json };

      ctrl.uploadSkillMiddleware({} as any, res as any, () => {});

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: '文件大小超过 50MB 限制' });
    });
  });

  it('LIMIT_UNEXPECTED_FILE → 400 请使用 file 字段上传', () => {
    jest.isolateModules(() => {
      const limitErr = new Error('Unexpected field') as Error & { code: string };
      limitErr.code = 'LIMIT_UNEXPECTED_FILE';

      jest.doMock('multer', () => {
        return jest.fn().mockImplementation(() => ({
          single: () => (req: any, res: any, cb: any) => cb(limitErr),
        }));
      });

      const ctrl = require('../../apis/controller/skills.controller');
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json };

      ctrl.uploadSkillMiddleware({} as any, res as any, () => {});

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: '请使用 file 字段上传' });
    });
  });

  it('其他 multer code → 400 multerErr.message', () => {
    jest.isolateModules(() => {
      const otherErr = new Error('Unknown multer error') as Error & { code: string };
      otherErr.code = 'LIMIT_PART_COUNT';

      jest.doMock('multer', () => {
        return jest.fn().mockImplementation(() => ({
          single: () => (req: any, res: any, cb: any) => cb(otherErr),
        }));
      });

      const ctrl = require('../../apis/controller/skills.controller');
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json };

      ctrl.uploadSkillMiddleware({} as any, res as any, () => {});

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: 'Unknown multer error' });
    });
  });

  it('Error without code → 400 err.message', () => {
    jest.isolateModules(() => {
      const errNoCode = new Error('仅支持 .zip 文件');

      jest.doMock('multer', () => {
        return jest.fn().mockImplementation(() => ({
          single: () => (req: any, res: any, cb: any) => cb(errNoCode),
        }));
      });

      const ctrl = require('../../apis/controller/skills.controller');
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json };

      ctrl.uploadSkillMiddleware({} as any, res as any, () => {});

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: '仅支持 .zip 文件' });
    });
  });

  it('happy path → next() called', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        return jest.fn().mockImplementation(() => ({
          single: () => (req: any, res: any, cb: any) => cb(null),
        }));
      });

      const ctrl = require('../../apis/controller/skills.controller');
      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json };
      const next = jest.fn();

      ctrl.uploadSkillMiddleware({} as any, res as any, next);

      expect(next).toHaveBeenCalled();
      expect(status).not.toHaveBeenCalled();
    });
  });
});

// ============================================================
// 2. updateSkills — name 验证 (line 142)
// ============================================================
describe('PUT /api/skills/:id — name 验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('name 为数字时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 123 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 为 null 时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: null });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 为空字符串时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: '' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 为纯空格时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: '   ' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 超过 200 字符时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'a'.repeat(201) });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 恰好 200 字符时应成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'a'.repeat(200) });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'a'.repeat(200) });

    expect(response.status).toBe(200);
  });

  it('name 为 undefined 时不应触发验证（不传 name 字段）', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: 'New desc' });

    expect(response.status).toBe(200);
  });
});

// ============================================================
// 3. updateSkills — description 验证 (line 145)
// ============================================================
describe('PUT /api/skills/:id — description 验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('description 为数字时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: 123 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('description 为 null 时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: null });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('description 超过 2000 字符时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: 'a'.repeat(2001) });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('description 恰好 2000 字符时应成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: 'a'.repeat(2000) });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: 'a'.repeat(2000) });

    expect(response.status).toBe(200);
  });

  it('description 为空字符串时应成功（允许清空描述）', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, description: '' });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: '' });

    expect(response.status).toBe(200);
  });

  it('name 和 description 同时无效时应先返回 name 错误', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 123, description: 456 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('name 有效但 description 无效时应返回 description 错误', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'Valid', description: 456 });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('description 为 undefined 时不应触发验证', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'NewName' });

    expect(response.status).toBe(200);
  });
});

// ============================================================
// 4. Logger 调用验证 — 确保 logger.info 在成功操作时被调用
// ============================================================
describe('Logger 验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    const skillsDir = path.resolve(process.cwd(), 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
  });

  afterEach(() => {
    const skillsDir = path.resolve(process.cwd(), 'skills');
    if (fs.existsSync(skillsDir)) {
      fs.rmSync(skillsDir, { recursive: true, force: true });
    }
  });

  it('更新成功时应记录 skill.updated 日志', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'New' });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const loggerSpy = jest.spyOn(require('../../apis/utils/logger.util').logger, 'info').mockImplementation(() => {});

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'New' });

    expect(response.status).toBe(200);
    expect(loggerSpy).toHaveBeenCalledWith('skill.updated', expect.objectContaining({
      skillId: 1,
      userId: 1,
    }));

    loggerSpy.mockRestore();
  });

  it('删除成功时应记录 skill.deleted 日志', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 2, name: 'Del', description: 'desc', skillDir: null, createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const loggerSpy = jest.spyOn(require('../../apis/utils/logger.util').logger, 'info').mockImplementation(() => {});

    const response = await agent
      .delete('/api/v1/skills/2')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(loggerSpy).toHaveBeenCalledWith('skill.deleted', expect.objectContaining({
      skillId: 2,
      userId: 1,
    }));

    loggerSpy.mockRestore();
  });
});

// ============================================================
// 5. handleSkillError — NotFoundError 覆盖更多路径
// ============================================================
describe('handleSkillError — 多端点覆盖', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/skills/:id — NotFoundError 应返回 404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const { NotFoundError } = require('../../apis/entity/errors');
    const mockFindFirst = jest.fn().mockRejectedValue(new NotFoundError('技能'));
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .get('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('技能不存在');
  });

  it('PUT /api/skills/:id — NotFoundError from update 应返回 404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const { NotFoundError } = require('../../apis/entity/errors');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockRejectedValue(new NotFoundError('技能'));
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'New' });

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('技能不存在');
  });

  it('DELETE /api/skills/:id — NotFoundError from delete 应返回 404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const { NotFoundError } = require('../../apis/entity/errors');
    const existing = {
      id: 1, name: 'Del', description: 'desc', skillDir: null, createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    const mockUpdate = jest.fn().mockRejectedValue(new NotFoundError('技能'));
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .delete('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('技能不存在');
  });

  it('PUT /api/skills/:id — non-Error throw 应返回 500', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockRejectedValue('unexpected string');
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'New' });

    expect(response.status).toBe(500);
    expect(response.body.message).toBe('更新技能失败');
  });

  it('DELETE /api/skills/:id — NotFoundError from getById 应返回 404', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const { NotFoundError } = require('../../apis/entity/errors');
    const mockFindFirst = jest.fn().mockRejectedValue(new NotFoundError('技能'));
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .delete('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(404);
    expect(response.body.message).toBe('技能不存在');
  });
});

// ============================================================
// 6. 安全注入测试 — 确保 role/userId 校验一致性
// ============================================================
describe('角色权限矩阵', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  const endpoints = [
    { method: 'GET', path: '/api/v1/skills', hasBody: false },
    { method: 'GET', path: '/api/v1/skills/1', hasBody: false },
    { method: 'POST', path: '/api/v1/skills', hasBody: true },
    { method: 'PUT', path: '/api/v1/skills/1', hasBody: true },
    { method: 'DELETE', path: '/api/v1/skills/1', hasBody: false },
  ];

  endpoints.forEach(({ method, path: reqPath, hasBody }) => {
    it(`${method} ${reqPath} — 无 token 应返回 401`, async () => {
      const req = agent[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](reqPath);
      if (hasBody) req.send({});
      const response = await req;
      expect(response.status).toBe(401);
    });

    it(`${method} ${reqPath} — view 角色应返回 403`, async () => {
      const viewT = jwt.sign(
        { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
        'test-secret',
        { expiresIn: '2h' }
      );
      const req = agent[method.toLowerCase() as 'get' | 'post' | 'put' | 'delete'](reqPath)
        .set('Authorization', `Bearer ${viewT}`);
      if (hasBody) req.send({});
      const response = await req;
      expect(response.status).toBe(403);
    });
  });
});

// ============================================================
// 7. 响应结构验证 — 确保 success/created/fail/paginate 格式一致
// ============================================================
describe('响应结构验证', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/skills — 列表应包含 code/data/message 分页结构', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockResolvedValue([
      { id: 1, name: 'S1', description: null, skillDir: 's1', createdBy: 1, creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date() },
    ]);
    const mockCount = jest.fn().mockResolvedValue(1);
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

    const response = await agent
      .get('/api/v1/skills')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 0,
      data: {
        list: expect.any(Array),
        total: 1,
        page: 1,
        pageSize: 10,
      },
    });
  });

  it('GET /api/skills/:id — 详情应包含 code/data', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindFirst = jest.fn().mockResolvedValue({
      id: 1, name: 'S1', description: 'desc', skillDir: 's1', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .get('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 0,
      data: expect.objectContaining({
        id: 1,
        name: 'S1',
      }),
    });
  });

  it('PUT /api/skills/:id — 成功响应应包含 code=0, data, message', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'New' });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: 'New' });

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 0,
      data: expect.objectContaining({ name: 'New' }),
      message: expect.any(String),
    });
  });

  it('DELETE /api/skills/:id — 成功响应应包含 code=0, message', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Del', description: 'desc', skillDir: null, createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const response = await agent
      .delete('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      code: 0,
      data: null,
      message: expect.stringContaining('删除技能成功'),
    });
  });

  it('GET /api/skills — 错误响应应包含 code 和 message', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockRejectedValue(new Error('DB error'));
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: jest.fn().mockResolvedValue(0) } });

    const response = await agent
      .get('/api/v1/skills')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(500);
    expect(response.body).toMatchObject({
      code: 500,
      message: expect.any(String),
    });
  });
});

// ============================================================
// 8. 边界值多样性 — 补充各种参数边界
// ============================================================
describe('边界值多样性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('GET /api/skills — page 为非数字字符串时应使用默认值 1', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

    const response = await agent
      .get('/api/v1/skills?page=abc')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ skip: 0, take: 10 })
    );
  });

  it('GET /api/skills — pageSize 为非数字字符串时应使用默认值 10', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

    const response = await agent
      .get('/api/v1/skills?pageSize=xyz')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 10 })
    );
  });

  it('GET /api/skills — pageSize=1 应为最小有效值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

    const response = await agent
      .get('/api/v1/skills?pageSize=1')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 1 })
    );
  });

  it('GET /api/skills — pageSize=100 应为最大有效值', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindMany = jest.fn().mockResolvedValue([]);
    const mockCount = jest.fn().mockResolvedValue(0);
    getPrisma.mockReturnValue({ skills: { findMany: mockFindMany, count: mockCount } });

    const response = await agent
      .get('/api/v1/skills?pageSize=100')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(200);
    expect(mockFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ take: 100 })
    );
  });

  it('GET /api/skills/:id — id 为极大整数时应正常处理', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const mockFindFirst = jest.fn().mockResolvedValue(null);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .get('/api/v1/skills/999999999')
      .set('Authorization', `Bearer ${sysadminToken()}`);

    expect(response.status).toBe(404);
  });

  it('PUT /api/skills/:id — 同时提供有效 name 和 description 应成功', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'Old desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'New', description: 'New desc' });
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

  it('PUT /api/skills/:id — name 为布尔类型时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: true });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });

  it('PUT /api/skills/:id — description 为布尔类型时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: false });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('PUT /api/skills/:id — description 为数组时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ description: ['not', 'valid'] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能描述无效');
  });

  it('PUT /api/skills/:id — name 为数组时应返回 400', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 1,
      creator: { cnName: '管理员' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst } });

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .send({ name: ['not', 'valid'] });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('技能名称无效');
  });
});

// ============================================================
// 9. 日志多样性 — 验证不同 userId 场景的日志输出
// ============================================================
describe('日志多样性', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('admin 更新自己的技能时日志应包含正确的 userId', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Old', description: 'desc', skillDir: 'old', createdBy: 2,
      creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn().mockResolvedValue(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, name: 'New' });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const loggerSpy = jest.spyOn(require('../../apis/utils/logger.util').logger, 'info').mockImplementation(() => {});

    const response = await agent
      .put('/api/v1/skills/1')
      .set('Authorization', `Bearer ${adminToken(2, 2)}`)
      .send({ name: 'New' });

    expect(response.status).toBe(200);
    expect(loggerSpy).toHaveBeenCalledWith('skill.updated', expect.objectContaining({
      skillId: 1,
      userId: 2,
    }));

    loggerSpy.mockRestore();
  });

  it('admin 删除自己的技能时日志应包含正确的 userId', async () => {
    const { getPrisma } = require('../../apis/utils/db.util');
    const existing = {
      id: 1, name: 'Del', description: 'desc', skillDir: null, createdBy: 2,
      creator: { cnName: '运营' }, createdAt: new Date(), updatedAt: new Date(),
    };
    const mockFindFirst = jest.fn()
      .mockResolvedValueOnce(existing)
      .mockResolvedValueOnce(existing);
    const mockUpdate = jest.fn().mockResolvedValue({ ...existing, deletedAt: new Date() });
    getPrisma.mockReturnValue({ skills: { findFirst: mockFindFirst, update: mockUpdate } });

    const loggerSpy = jest.spyOn(require('../../apis/utils/logger.util').logger, 'info').mockImplementation(() => {});

    const response = await agent
      .delete('/api/v1/skills/1')
      .set('Authorization', `Bearer ${adminToken(2, 2)}`);

    expect(response.status).toBe(200);
    expect(loggerSpy).toHaveBeenCalledWith('skill.deleted', expect.objectContaining({
      skillId: 1,
      userId: 2,
    }));

    loggerSpy.mockRestore();
  });
});

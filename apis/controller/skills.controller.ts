import { Request, Response } from 'express';
import multer from 'multer';
import fs from 'fs';
import { SkillsServiceImpl } from '../service/impl/skills.service.impl';
import { SkillsFileServiceImpl } from '../service/skills-file.service';
import { success, fail, paginate, created } from '../utils';
import { NotFoundError, ConflictError, BusinessError } from '../entity';
import { logger } from '../utils/logger.util';

const skillsService = new SkillsServiceImpl();
const skillsFileService = new SkillsFileServiceImpl();

// Lazy-initialized multer instance
let upload: ReturnType<typeof multer> | null = null;

function getUpload(): ReturnType<typeof multer> {
  if (!upload) {
    upload = multer({
      dest: skillsFileService.getTmpDir(),
      limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
      fileFilter: (_req, file, cb) => {
        if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
          cb(null, true);
        } else {
          cb(new Error('仅支持 .zip 文件'));
        }
      },
    });
  }
  return upload;
}

function handleSkillError(res: Response, err: unknown, contextMsg: string): void {
  if (err instanceof NotFoundError) {
    fail(res, 404, err.message);
  } else if (err instanceof ConflictError) {
    fail(res, 409, err.message);
  } else if (err instanceof BusinessError) {
    fail(res, 400, err.message);
  } else {
    const reason = err instanceof Error ? err.message : String(err);
    logger.error('skill.error', { context: contextMsg, error: reason, stack: err instanceof Error ? err.stack : undefined });
    fail(res, 500, `${contextMsg}：${reason}`);
  }
}

export function uploadSkillMiddleware(req: Request, res: Response, next: () => void): void {
  getUpload().single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof Error && 'code' in err) {
        const multerErr = err as Error & { code: string };
        if (multerErr.code === 'LIMIT_FILE_SIZE') {
          fail(res, 400, '文件大小超过 50MB 限制');
        } else if (multerErr.code === 'LIMIT_UNEXPECTED_FILE') {
          fail(res, 400, '请使用 file 字段上传');
        } else {
          fail(res, 400, multerErr.message);
        }
      } else {
        fail(res, 400, err instanceof Error ? err.message : '上传失败');
      }
      return;
    }
    next();
  });
}

export async function listSkills(req: Request, res: Response): Promise<void> {
  try {
    const page = Math.max(1, parseInt(req.query.page as string, 10) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string, 10) || 10));
    const search = req.query.search as string | undefined;

    const { list, total } = await skillsService.list(page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    handleSkillError(res, err, '获取技能列表失败');
  }
}

export async function getSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    const item = await skillsService.getById(id);
    success(res, item);
  } catch (err: unknown) {
    handleSkillError(res, err, '获取技能详情失败');
  }
}

export async function createSkills(req: Request, res: Response): Promise<void> {
  const tmpPath = req.file?.path;
  let extractedSkillDir: string | null = null;
  try {
    if (!req.file) { fail(res, 400, '请选择技能 zip 包'); return; }
    // Defensive: authMiddleware guarantees req.user exists
    if (!req.user) { fail(res, 401, '未登录'); return; }

    // Delegate file operations to SkillsFileService
    const { topDir, name, description, skillDir } = skillsFileService.extractSkillZip(req.file.path);
    extractedSkillDir = skillDir;

    // Create DB record
    const item = await skillsService.create({
      name,
      description,
      skill_dir: topDir,
      created_by: req.user.userId,
    });

    created(res, item, '技能创建成功');
    logger.info('skill.created', { skillId: item.id, name: item.name, userId: req.user!.userId });
  } catch (err: unknown) {
    // Rollback: clean up extracted directory on failure
    if (extractedSkillDir && fs.existsSync(extractedSkillDir)) {
      fs.rmSync(extractedSkillDir, { recursive: true, force: true });
    }
    handleSkillError(res, err, '创建技能失败');
  } finally {
    // Clean up temp file
    if (tmpPath && fs.existsSync(tmpPath)) {
      fs.unlinkSync(tmpPath);
    }
  }
}

export async function updateSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    // Only author or sysadmin can update
    const existing = await skillsService.getById(id);
    if (req.user?.role !== 'sysadmin' && existing.created_by !== req.user?.userId) {
      fail(res, 403, '只能修改自己创建的技能');
      return;
    }

    // Field whitelist — only name and description are updatable
    const { name, description } = req.body;
    if (name !== undefined && (typeof name !== 'string' || name.trim().length === 0 || name.length > 200)) {
      fail(res, 400, '技能名称无效'); return;
    }
    if (description !== undefined && (typeof description !== 'string' || description.length > 500)) {
      fail(res, 400, '技能描述无效'); return;
    }
    const item = await skillsService.update(id, { name, description });
    success(res, item, '更新技能成功');
    logger.info('skill.updated', { skillId: id, userId: req.user?.userId });
  } catch (err: unknown) {
    handleSkillError(res, err, '更新技能失败');
  }
}

export async function deleteSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    // Only author or sysadmin can delete
    const existing = await skillsService.getById(id);
    if (req.user?.role !== 'sysadmin' && existing.created_by !== req.user?.userId) {
      fail(res, 403, '只能删除自己创建的技能');
      return;
    }

    const skillDir = existing.skill_dir;

    // Pre-validate skill directory path before any state changes
    if (skillDir) {
      skillsFileService.validateSkillDirPath(skillDir);
    }

    // Step 1: DB soft delete (reversible)
    await skillsService.delete(id);

    // Step 2: Remove skill directory (irreversible) — only after DB success
    if (skillDir) {
      skillsFileService.removeSkillDir(skillDir);
    }

    success(res, null, '删除技能成功');
    logger.info('skill.deleted', { skillId: id, userId: req.user?.userId });
  } catch (err: unknown) {
    handleSkillError(res, err, '删除技能失败');
  }
}

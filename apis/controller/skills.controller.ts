import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { SkillsServiceImpl } from '../service/impl/skills.service.impl';
import { success, fail, paginate } from '../utils';

const skillsService = new SkillsServiceImpl();

const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
const TMP_DIR = path.resolve(process.cwd(), 'tmp', 'uploads');

// Ensure directories exist
if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });
if (!fs.existsSync(SKILLS_DIR)) fs.mkdirSync(SKILLS_DIR, { recursive: true });

// Multer config for zip uploads
const upload = multer({
  dest: TMP_DIR,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
  fileFilter: (_req, file, cb) => {
    if (file.mimetype === 'application/zip' || file.mimetype === 'application/x-zip-compressed' || file.originalname.endsWith('.zip')) {
      cb(null, true);
    } else {
      cb(new Error('仅支持 .zip 文件'));
    }
  },
});

export function uploadSkillMiddleware(req: Request, res: Response, next: () => void): void {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      fail(res, 400, err.message || '上传失败');
      return;
    }
    next();
  });
}

/**
 * Parse SKILL.md frontmatter to extract name and description.
 * Format:
 * ---
 * name: skill-name
 * description: Some description
 * ---
 */
function parseSkillMd(content: string): { name: string; description: string } {
  const frontmatterMatch = content.match(/^---\s*\n([\s\S]*?)\n---/);
  if (!frontmatterMatch) throw new Error('SKILL.md 缺少 frontmatter（--- 包裹的 YAML 头部）');

  const yaml = frontmatterMatch[1];
  const nameMatch = yaml.match(/^name:\s*(.+)$/m);
  const descMatch = yaml.match(/^description:\s*(.+)$/m);

  if (!nameMatch) throw new Error('SKILL.md frontmatter 中缺少 name 字段');

  return {
    name: nameMatch[1].trim(),
    description: descMatch ? descMatch[1].trim() : '',
  };
}

export async function listSkills(req: Request, res: Response): Promise<void> {
  try {
    const page = parseInt(req.query.page as string) || 1;
    const pageSize = parseInt(req.query.pageSize as string) || 10;
    const search = req.query.search as string | undefined;

    const { list, total } = await skillsService.list(page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: any) {
    fail(res, 500, err.message || '获取技能列表失败');
  }
}

export async function getSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    const item = await skillsService.getById(id);
    success(res, item);
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '获取技能详情失败');
    }
  }
}

export async function createSkills(req: Request, res: Response): Promise<void> {
  const tmpPath = req.file?.path;
  try {
    if (!req.file) { fail(res, 400, '请选择技能 zip 包'); return; }

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    // Find SKILL.md in zip (may be at root or inside a directory)
    let skillMdEntry = zipEntries.find(e => !e.isDirectory && e.entryName.endsWith('SKILL.md'));
    if (!skillMdEntry) {
      fail(res, 400, 'zip 包中未找到 SKILL.md 文件');
      return;
    }

    // Parse SKILL.md
    const skillMdContent = skillMdEntry.getData().toString('utf-8');
    const { name, description } = parseSkillMd(skillMdContent);

    // Determine the top-level directory in the zip
    // e.g., "ant-design/SKILL.md" → base dir is "ant-design"
    const entryPath = skillMdEntry.entryName;
    const topDir = entryPath.includes('/') ? entryPath.split('/')[0] : name;

    // Target directory
    const skillDir = path.join(SKILLS_DIR, topDir);
    if (fs.existsSync(skillDir)) {
      fail(res, 400, `技能目录「${topDir}」已存在，请先删除同名技能或使用不同的目录名`);
      return;
    }

    // Validate zip entries for path traversal (Zip Slip) and zip bomb
    const resolvedSkillsDir = path.resolve(SKILLS_DIR);
    const MAX_ENTRY_SIZE = 100 * 1024 * 1024; // 100MB per entry
    for (const entry of zipEntries) {
      const entryResolved = path.resolve(resolvedSkillsDir, entry.entryName);
      if (!entryResolved.startsWith(resolvedSkillsDir + path.sep) && entryResolved !== resolvedSkillsDir) {
        fail(res, 400, 'zip 包包含非法路径');
        return;
      }
      if (!entry.isDirectory && entry.header.size > MAX_ENTRY_SIZE) {
        fail(res, 400, 'zip 包中文件过大');
        return;
      }
    }

    // Extract to skills directory
    fs.mkdirSync(SKILLS_DIR, { recursive: true });
    zip.extractAllTo(SKILLS_DIR, true);

    // Verify SKILL.md exists after extraction
    const extractedSkillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(extractedSkillMd) && entryPath.includes('/')) {
      // The SKILL.md was inside a subdirectory - check if zip was flat
      const altPath = path.join(SKILLS_DIR, 'SKILL.md');
      if (fs.existsSync(altPath)) {
        // Flat zip - create directory and move files
        fs.mkdirSync(skillDir, { recursive: true });
        fs.renameSync(altPath, path.join(skillDir, 'SKILL.md'));
      }
    }

    // Create DB record
    const item = await skillsService.create({
      name,
      description,
      skill_dir: topDir,
      created_by: req.user!.userId,
    });

    res.status(201).json({ code: 0, message: '技能创建成功', data: item });
  } catch (err: any) {
    // Clean up on failure
    fail(res, 500, err.message || '创建技能失败');
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

    const item = await skillsService.update(id, req.body);
    success(res, item, '更新技能成功');
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '更新技能失败');
    }
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

    // Remove skill directory
    if (existing.skill_dir) {
      const skillDir = path.join(SKILLS_DIR, existing.skill_dir);
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
    }

    await skillsService.delete(id);
    success(res, null, '删除技能成功');
  } catch (err: any) {
    if (err.message === '技能不存在') {
      fail(res, 404, err.message);
    } else {
      fail(res, 500, err.message || '删除技能失败');
    }
  }
}

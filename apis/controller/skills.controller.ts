import { Request, Response } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { SkillsServiceImpl } from '../service/impl/skills.service.impl';
import { success, fail, paginate, created } from '../utils';

const skillsService = new SkillsServiceImpl();

const SKILLS_DIR = path.resolve(process.cwd(), 'skills');
const TMP_DIR = path.resolve(process.cwd(), 'tmp', 'uploads');
const MAX_ENTRY_SIZE = 100 * 1024 * 1024; // 100MB per entry
const MAX_TOTAL_EXTRACTED_SIZE = 500 * 1024 * 1024; // 500MB total extracted

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

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  return '操作失败';
}

export function uploadSkillMiddleware(req: Request, res: Response, next: () => void): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      const msg = err instanceof Error ? err.message : '上传失败';
      fail(res, 400, msg);
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
    const page = Math.max(1, parseInt(req.query.page as string) || 1);
    const pageSize = Math.min(100, Math.max(1, parseInt(req.query.pageSize as string) || 10));
    const search = req.query.search as string | undefined;

    const { list, total } = await skillsService.list(page, pageSize, search);
    paginate(res, list, total, page, pageSize);
  } catch (err: unknown) {
    fail(res, 500, '获取技能列表失败');
  }
}

export async function getSkills(req: Request, res: Response): Promise<void> {
  try {
    const id = parseInt(req.params.id as string, 10);
    if (isNaN(id)) { fail(res, 400, '无效的技能ID'); return; }

    const item = await skillsService.getById(id);
    success(res, item);
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === '技能不存在') {
      fail(res, 404, message);
    } else {
      fail(res, 500, '获取技能详情失败');
    }
  }
}

export async function createSkills(req: Request, res: Response): Promise<void> {
  const tmpPath = req.file?.path;
  let extractedDir: string | null = null;
  try {
    if (!req.file) { fail(res, 400, '请选择技能 zip 包'); return; }
    if (!req.user) { fail(res, 401, '未登录'); return; }

    // Validate zip magic bytes (PK header: 0x50 0x4B)
    const fileBuffer = fs.readFileSync(req.file.path);
    if (fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
      fail(res, 400, '文件不是有效的 zip 格式');
      return;
    }

    const zip = new AdmZip(req.file.path);
    const zipEntries = zip.getEntries();

    // Find SKILL.md in zip (may be at root or inside a directory)
    const skillMdEntry = zipEntries.find(e => !e.isDirectory && e.entryName.endsWith('SKILL.md'));
    if (!skillMdEntry) {
      fail(res, 400, 'zip 包中未找到 SKILL.md 文件');
      return;
    }

    // Parse SKILL.md
    const skillMdContent = skillMdEntry.getData().toString('utf-8');
    const { name, description } = parseSkillMd(skillMdContent);

    // Determine the top-level directory in the zip
    const entryPath = skillMdEntry.entryName;
    const topDir = entryPath.includes('/') ? entryPath.split('/')[0] : name;

    // Target directory
    const skillDir = path.join(SKILLS_DIR, topDir);
    if (fs.existsSync(skillDir)) {
      fail(res, 400, `技能「${name}」已存在，请先删除同名技能`);
      return;
    }

    // Validate zip entries for path traversal (Zip Slip) and size limits
    const resolvedSkillsDir = path.resolve(SKILLS_DIR);
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

    // Extract entries one by one (Zip Slip safe + Zip Bomb protection)
    let totalExtractedSize = 0;
    for (const entry of zipEntries) {
      if (entry.isDirectory) {
        const dirPath = path.join(SKILLS_DIR, entry.entryName);
        const resolvedDir = path.resolve(dirPath);
        if (resolvedDir.startsWith(resolvedSkillsDir + path.sep) || resolvedDir === resolvedSkillsDir) {
          fs.mkdirSync(dirPath, { recursive: true });
        }
        continue;
      }
      const targetPath = path.join(SKILLS_DIR, entry.entryName);
      const resolved = path.resolve(targetPath);
      if (!resolved.startsWith(resolvedSkillsDir + path.sep)) {
        throw new Error('zip 包包含非法路径');
      }
      const data = entry.getData();
      totalExtractedSize += data.length;
      if (totalExtractedSize > MAX_TOTAL_EXTRACTED_SIZE) {
        throw new Error('zip 包解压后总大小超过限制');
      }
      fs.mkdirSync(path.dirname(targetPath), { recursive: true });
      fs.writeFileSync(targetPath, data);
    }
    extractedDir = skillDir;

    // Verify SKILL.md exists after extraction
    const extractedSkillMd = path.join(skillDir, 'SKILL.md');
    if (!fs.existsSync(extractedSkillMd)) {
      // Flat zip: SKILL.md extracted to skills/SKILL.md, need to move into skillDir
      const altPath = path.join(SKILLS_DIR, 'SKILL.md');
      if (fs.existsSync(altPath)) {
        fs.mkdirSync(skillDir, { recursive: true });
        // Move all flat-extracted files (not just SKILL.md)
        const flatFiles = fs.readdirSync(SKILLS_DIR);
        for (const file of flatFiles) {
          if (file === topDir) continue; // skip the new skillDir itself
          const src = path.join(SKILLS_DIR, file);
          const stat = fs.statSync(src);
          if (stat.isDirectory()) continue;
          const dest = path.join(skillDir, file);
          fs.renameSync(src, dest);
        }
      }
    }

    // Create DB record
    const item = await skillsService.create({
      name,
      description,
      skill_dir: topDir,
      created_by: req.user.userId,
    });

    created(res, item, '技能创建成功');
  } catch (err: unknown) {
    // Rollback: clean up extracted directory on failure
    if (extractedDir && fs.existsSync(extractedDir)) {
      fs.rmSync(extractedDir, { recursive: true, force: true });
    }
    const message = getErrorMessage(err);
    if (message.startsWith('已存在同名技能')) {
      fail(res, 409, message);
    } else {
      fail(res, 500, '创建技能失败');
    }
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

    const { name, description } = req.body;
    const item = await skillsService.update(id, { name, description });
    success(res, item, '更新技能成功');
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === '技能不存在') {
      fail(res, 404, message);
    } else {
      fail(res, 500, '更新技能失败');
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

    // Remove skill directory with path validation
    if (existing.skill_dir) {
      const skillDir = path.join(SKILLS_DIR, existing.skill_dir);
      const resolvedSkillDir = path.resolve(skillDir);
      const resolvedSkillsBase = path.resolve(SKILLS_DIR);
      if (!resolvedSkillDir.startsWith(resolvedSkillsBase + path.sep)) {
        fail(res, 400, '非法的技能目录路径');
        return;
      }
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
    }

    await skillsService.delete(id);
    success(res, null, '删除技能成功');
  } catch (err: unknown) {
    const message = getErrorMessage(err);
    if (message === '技能不存在') {
      fail(res, 404, message);
    } else {
      fail(res, 500, '删除技能失败');
    }
  }
}

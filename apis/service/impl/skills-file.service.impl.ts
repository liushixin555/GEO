import path from 'path';
import fs from 'fs';
import AdmZip from 'adm-zip';
import { parseSkillMd } from '../../utils/skill-md.util';
import { BusinessError } from '../../errors';
import { ISkillsFileService, SkillZipResult } from '../skills-file.service';

const MAX_ENTRY_SIZE = 100 * 1024 * 1024; // 100MB per entry
const MAX_TOTAL_EXTRACTED_SIZE = 500 * 1024 * 1024; // 500MB total extracted
const MAX_NAME_LENGTH = 200;
const MAX_DESC_LENGTH = 2000;

export class SkillsFileServiceImpl implements ISkillsFileService {
  private skillsDir: string | null = null;
  private tmpDir: string | null = null;

  getSkillsDir(): string {
    if (!this.skillsDir) {
      this.skillsDir = path.resolve(process.cwd(), 'skills');
      if (!fs.existsSync(this.skillsDir)) {
        fs.mkdirSync(this.skillsDir, { recursive: true });
      }
    }
    return this.skillsDir;
  }

  getTmpDir(): string {
    if (!this.tmpDir) {
      this.tmpDir = path.resolve(process.cwd(), 'tmp', 'uploads');
      if (!fs.existsSync(this.tmpDir)) {
        fs.mkdirSync(this.tmpDir, { recursive: true });
      }
    }
    return this.tmpDir;
  }

  extractSkillZip(zipPath: string): SkillZipResult {
    const skillsDir = this.getSkillsDir();
    const resolvedSkillsDir = path.resolve(skillsDir);

    // Validate zip magic bytes (PK header: 0x50 0x4B)
    const fileBuffer = fs.readFileSync(zipPath);
    if (fileBuffer[0] !== 0x50 || fileBuffer[1] !== 0x4B) {
      throw new BusinessError('文件不是有效的 zip 格式');
    }

    const zip = new AdmZip(zipPath);
    const zipEntries = zip.getEntries();

    // Find SKILL.md in zip
    const skillMdEntry = zipEntries.find(e => !e.isDirectory && e.entryName.endsWith('SKILL.md'));
    if (!skillMdEntry) {
      throw new BusinessError('zip 包中未找到 SKILL.md 文件');
    }

    // Parse SKILL.md
    const skillMdContent = skillMdEntry.getData().toString('utf-8');
    const { name, description } = parseSkillMd(skillMdContent);

    // Validate parsed field lengths
    if (name.length > MAX_NAME_LENGTH) {
      throw new BusinessError(`技能名称长度不能超过 ${MAX_NAME_LENGTH} 个字符`);
    }
    if (description.length > MAX_DESC_LENGTH) {
      throw new BusinessError(`技能描述长度不能超过 ${MAX_DESC_LENGTH} 个字符`);
    }

    // Determine the top-level directory in the zip
    const entryPath = skillMdEntry.entryName;
    const topDir = entryPath.includes('/') ? entryPath.split('/')[0] : name;

    // Target directory
    const skillDir = path.join(skillsDir, topDir);
    if (fs.existsSync(skillDir)) {
      throw new BusinessError(`技能「${name}」已存在，请先删除同名技能`);
    }

    // Validate zip entries for path traversal (Zip Slip) and size limits
    for (const entry of zipEntries) {
      const entryResolved = path.resolve(resolvedSkillsDir, entry.entryName);
      if (!entryResolved.startsWith(resolvedSkillsDir + path.sep) && entryResolved !== resolvedSkillsDir) {
        throw new BusinessError('zip 包包含非法路径');
      }
      if (!entry.isDirectory && entry.header.size > MAX_ENTRY_SIZE) {
        throw new BusinessError('zip 包中文件过大');
      }
    }

    // Extract entries one by one (Zip Slip safe + Zip Bomb protection)
    try {
      let totalExtractedSize = 0;
      for (const entry of zipEntries) {
        if (entry.isDirectory) {
          const dirPath = path.join(skillsDir, entry.entryName);
          const resolvedDir = path.resolve(dirPath);
          if (resolvedDir.startsWith(resolvedSkillsDir + path.sep) || resolvedDir === resolvedSkillsDir) {
            fs.mkdirSync(dirPath, { recursive: true });
          }
          continue;
        }
        const targetPath = path.join(skillsDir, entry.entryName);
        const resolved = path.resolve(targetPath);
        if (!resolved.startsWith(resolvedSkillsDir + path.sep)) {
          throw new BusinessError('zip 包包含非法路径');
        }
        const data = entry.getData();
        totalExtractedSize += data.length;
        if (totalExtractedSize > MAX_TOTAL_EXTRACTED_SIZE) {
          throw new BusinessError('zip 包解压后总大小超过限制');
        }
        fs.mkdirSync(path.dirname(targetPath), { recursive: true });
        fs.writeFileSync(targetPath, data);
      }

      // Verify SKILL.md exists after extraction
      const extractedSkillMd = path.join(skillDir, 'SKILL.md');
      if (!fs.existsSync(extractedSkillMd)) {
        // Flat zip: SKILL.md extracted to skills/SKILL.md, need to move into skillDir
        const altPath = path.join(skillsDir, 'SKILL.md');
        if (fs.existsSync(altPath)) {
          fs.mkdirSync(skillDir, { recursive: true });
          const flatFiles = fs.readdirSync(skillsDir);
          for (const file of flatFiles) {
            if (file === topDir) continue;
            const src = path.join(skillsDir, file);
            const stat = fs.statSync(src);
            if (stat.isDirectory()) continue;
            const dest = path.join(skillDir, file);
            fs.renameSync(src, dest);
          }
        }
      }
    } catch (err) {
      // Rollback partial extraction
      if (fs.existsSync(skillDir)) {
        fs.rmSync(skillDir, { recursive: true, force: true });
      }
      throw err;
    }

    return { topDir, name, description, skillDir };
  }

  validateSkillDirPath(skillDirName: string): void {
    if (!skillDirName) return;
    const skillsDir = this.getSkillsDir();
    const resolvedSkillDir = path.resolve(skillsDir, skillDirName);
    const resolvedSkillsBase = path.resolve(skillsDir);
    if (!resolvedSkillDir.startsWith(resolvedSkillsBase + path.sep)) {
      throw new BusinessError('非法的技能目录路径');
    }
  }

  removeSkillDir(skillDirName: string): void {
    if (!skillDirName) return;

    const skillsDir = this.getSkillsDir();
    const skillDir = path.join(skillsDir, skillDirName);
    const resolvedSkillDir = path.resolve(skillDir);
    const resolvedSkillsBase = path.resolve(skillsDir);

    if (!resolvedSkillDir.startsWith(resolvedSkillsBase + path.sep)) {
      throw new BusinessError('非法的技能目录路径');
    }

    if (fs.existsSync(skillDir)) {
      const stat = fs.lstatSync(skillDir);
      if (stat.isSymbolicLink()) {
        throw new BusinessError('非法的技能目录');
      }
      fs.rmSync(skillDir, { recursive: true, force: true });
    }
  }
}

export interface SkillZipResult {
  topDir: string;
  name: string;
  description: string;
  skillDir: string;
}

export interface SkillMetaResult {
  name: string;
  description: string;
}

export interface ISkillsFileService {
  parseSkillZipMeta(zipPath: string): SkillMetaResult;
  extractSkillZip(zipPath: string, overwriteDir?: boolean): SkillZipResult;
  validateSkillDirPath(skillDirName: string): void;
  removeSkillDir(skillDirName: string): void;
  getSkillsDir(): string;
  getTmpDir(): string;
}

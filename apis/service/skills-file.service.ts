export interface SkillZipResult {
  topDir: string;
  name: string;
  description: string;
  skillDir: string;
}

export interface ISkillsFileService {
  extractSkillZip(zipPath: string): SkillZipResult;
  validateSkillDirPath(skillDirName: string): void;
  removeSkillDir(skillDirName: string): void;
  getSkillsDir(): string;
  getTmpDir(): string;
}

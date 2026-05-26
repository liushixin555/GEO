import yaml from 'js-yaml';
import { BusinessError } from '../errors';

/**
 * Parse SKILL.md frontmatter to extract name and description.
 * Format:
 * ---
 * name: skill-name
 * description: Some description
 * ---
 */
export function parseSkillMd(content: string): { name: string; description: string } {
  const frontmatterMatch = content.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  if (!frontmatterMatch) throw new BusinessError('SKILL.md 缺少 frontmatter（--- 包裹的 YAML 头部）');

  const parsed = yaml.load(frontmatterMatch[1]) as Record<string, unknown>;
  if (!parsed || typeof parsed !== 'object') {
    throw new BusinessError('SKILL.md frontmatter 格式无效');
  }
  if (!parsed.name || typeof parsed.name !== 'string') {
    throw new BusinessError('SKILL.md frontmatter 中缺少 name 字段');
  }

  return {
    name: parsed.name.trim(),
    description: typeof parsed.description === 'string' ? parsed.description.trim() : '',
  };
}

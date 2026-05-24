/**
 * Parse SKILL.md frontmatter to extract name and description.
 * Format:
 * ---
 * name: skill-name
 * description: Some description
 * ---
 */
export function parseSkillMd(content: string): { name: string; description: string } {
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

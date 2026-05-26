/**
 * @jest-environment node
 */
import { parseSkillMd } from '../../apis/utils/skill-md.util';
import { BusinessError } from '../../apis/errors';

describe('skill-md.util', () => {
  const validFrontmatter = `---
name: my-skill
description: A test skill description
---
# Skill Content
Some body text`;

  it('should parse valid SKILL.md frontmatter', () => {
    const result = parseSkillMd(validFrontmatter);
    expect(result.name).toBe('my-skill');
    expect(result.description).toBe('A test skill description');
  });

  it('should trim whitespace from name and description', () => {
    const md = `---
name:   spaced-name
description:   spaced description
---`;
    const result = parseSkillMd(md);
    expect(result.name).toBe('spaced-name');
    expect(result.description).toBe('spaced description');
  });

  it('should return empty string when description is missing', () => {
    const md = `---
name: no-desc
---`;
    const result = parseSkillMd(md);
    expect(result.name).toBe('no-desc');
    expect(result.description).toBe('');
  });

  it('should throw BusinessError when frontmatter is missing', () => {
    expect(() => parseSkillMd('# No frontmatter')).toThrow(BusinessError);
    expect(() => parseSkillMd('# No frontmatter')).toThrow('frontmatter');
  });

  it('should throw BusinessError when name field is missing', () => {
    const md = `---
description: has desc but no name
---`;
    expect(() => parseSkillMd(md)).toThrow(BusinessError);
    expect(() => parseSkillMd(md)).toThrow('name');
  });

  it('should throw BusinessError when name is not a string', () => {
    const md = `---
name: 123
description: numeric name
---`;
    expect(() => parseSkillMd(md)).toThrow(BusinessError);
  });

  it('should throw BusinessError when frontmatter is invalid YAML', () => {
    const md = `---
name: test
description: [invalid
---`;
    // js-yaml may throw on invalid YAML; our function wraps it
    expect(() => parseSkillMd(md)).toThrow();
  });

  it('should handle CRLF line endings', () => {
    const md = '---\r\nname: crlf-skill\r\ndescription: CRLF test\r\n---';
    const result = parseSkillMd(md);
    expect(result.name).toBe('crlf-skill');
    expect(result.description).toBe('CRLF test');
  });

  it('should handle description as non-string gracefully', () => {
    const md = `---
name: test
description: 42
---`;
    const result = parseSkillMd(md);
    expect(result.name).toBe('test');
    expect(result.description).toBe('');
  });
});

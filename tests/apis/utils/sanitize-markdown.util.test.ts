/**
 * @jest-environment node
 */
import {
  sanitizeMarkdown,
  validateMarkdownLength,
  validateAndSanitizeMarkdown,
  MAX_MARKDOWN_LENGTH,
} from '../../../apis/utils/sanitize-markdown.util';

describe('sanitize-markdown.util', () => {
  describe('sanitizeMarkdown', () => {
    it('should pass through safe Markdown unchanged', () => {
      const md = '# Hello\n\nThis is **bold** and *italic* text.\n\n- List item';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).toBe(md);
      expect(result.wasCleaned).toBe(false);
      expect(result.removedItems).toEqual([]);
    });

    it('should remove <script> tags', () => {
      const md = '# Title\n\n<script>alert("XSS")</script>\n\nSome text';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('<script>');
      expect(result.sanitized).not.toContain('alert');
      expect(result.wasCleaned).toBe(true);
      expect(result.removedItems).toContain('危险HTML标签');
    });

    it('should remove self-closing <script> tags', () => {
      const md = '<script src="evil.js" />';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('script');
      expect(result.wasCleaned).toBe(true);
    });

    it('should remove <iframe> tags', () => {
      const md = '<iframe src="https://evil.com"></iframe>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('iframe');
    });

    it('should remove <embed> tags', () => {
      const md = '<embed src="evil.swf">';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('embed');
    });

    it('should remove <object> tags', () => {
      const md = '<object data="evil.swf"></object>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('object');
    });

    it('should remove <form> tags', () => {
      const md = '<form action="https://evil.com"><input type="submit"></form>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('form');
    });

    it('should remove onclick event attributes', () => {
      const md = '<div onclick="alert(1)">click me</div>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('onclick');
      expect(result.wasCleaned).toBe(true);
      expect(result.removedItems).toContain('事件属性');
    });

    it('should remove onerror event attributes', () => {
      const md = '<img src="x" onerror="alert(1)">';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('onerror');
    });

    it('should remove javascript: protocol in href', () => {
      const md = '<a href="javascript:alert(1)">click</a>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.removedItems).toContain('危险URL协议');
    });

    it('should remove data: protocol in src', () => {
      const md = '<img src="data:text/html,<script>alert(1)</script>">';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('data:');
    });

    it('should remove vbscript: protocol', () => {
      const md = '<a href="vbscript:msgbox">click</a>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('vbscript:');
    });

    it('should remove control characters', () => {
      const md = 'Hello\x00World\x07Test\x1F';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).toBe('HelloWorldTest');
      expect(result.removedItems).toContain('控制字符');
    });

    it('should preserve tab, newline, and carriage return', () => {
      const md = 'Line1\nLine2\tTab\r\nWindows';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).toBe(md);
      expect(result.wasCleaned).toBe(false);
    });

    it('should handle case-insensitive tag removal', () => {
      const md = '<SCRIPT>alert(1)</SCRIPT>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('SCRIPT');
      expect(result.wasCleaned).toBe(true);
    });

    it('should handle case-insensitive event attribute removal', () => {
      const md = '<div ONCLICK="alert(1)">click</div>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('ONCLICK');
    });

    it('should preserve safe HTML tags (div, span, a, img, p, br, hr, etc.)', () => {
      const md = '<p>Paragraph</p>\n<div>A div</div>\n<a href="https://example.com">Link</a>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).toContain('<p>');
      expect(result.sanitized).toContain('<div>');
      expect(result.sanitized).toContain('<a href="https://example.com">');
    });

    it('should handle multiple dangerous elements in one content', () => {
      const md = '# Title\n<script>evil()</script>\n<img onerror="hack()">\n<a href="javascript:void(0)">xss</a>';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).not.toContain('script');
      expect(result.sanitized).not.toContain('onerror');
      expect(result.sanitized).not.toContain('javascript:');
      expect(result.wasCleaned).toBe(true);
      expect(result.removedItems.length).toBeGreaterThanOrEqual(2);
    });

    it('should handle empty string', () => {
      const result = sanitizeMarkdown('');
      expect(result.sanitized).toBe('');
      expect(result.wasCleaned).toBe(false);
    });

    it('should handle pure Markdown content without any HTML', () => {
      const md = '# Heading\n\n## Subheading\n\n- item 1\n- item 2\n\n> quote\n\n```\ncode\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |';
      const result = sanitizeMarkdown(md);
      expect(result.sanitized).toBe(md);
      expect(result.wasCleaned).toBe(false);
    });
  });

  describe('validateMarkdownLength', () => {
    it('should pass for content under limit', () => {
      expect(() => validateMarkdownLength('short content')).not.toThrow();
    });

    it('should pass for content at exact limit', () => {
      const content = 'a'.repeat(MAX_MARKDOWN_LENGTH);
      expect(() => validateMarkdownLength(content)).not.toThrow();
    });

    it('should throw for content exceeding limit', () => {
      const content = 'a'.repeat(MAX_MARKDOWN_LENGTH + 1);
      expect(() => validateMarkdownLength(content)).toThrow('Markdown 内容超过最大长度限制');
    });
  });

  describe('validateAndSanitizeMarkdown', () => {
    it('should validate length and sanitize content', () => {
      const md = 'Hello <script>evil()</script> World';
      const result = validateAndSanitizeMarkdown(md);
      expect(result).not.toContain('<script>');
    });

    it('should throw for non-string input', () => {
      expect(() => validateAndSanitizeMarkdown(123 as any)).toThrow('Markdown 内容必须为字符串');
    });

    it('should throw for null input', () => {
      expect(() => validateAndSanitizeMarkdown(null as any)).toThrow('Markdown 内容必须为字符串');
    });

    it('should throw for undefined input', () => {
      expect(() => validateAndSanitizeMarkdown(undefined as any)).toThrow('Markdown 内容必须为字符串');
    });

    it('should throw for content exceeding limit', () => {
      const content = 'a'.repeat(MAX_MARKDOWN_LENGTH + 1);
      expect(() => validateAndSanitizeMarkdown(content)).toThrow('Markdown 内容超过最大长度限制');
    });

    it('should return clean content unchanged', () => {
      const md = '# Hello World\n\nThis is safe.';
      expect(validateAndSanitizeMarkdown(md)).toBe(md);
    });

    it('should log warning when dangerous content is removed', () => {
      const warnSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
      const md = '<script>alert(1)</script>';
      validateAndSanitizeMarkdown(md);
      expect(warnSpy).toHaveBeenCalledWith(
        '[sanitize-markdown] 检测到并移除危险内容:',
        expect.any(String),
      );
      warnSpy.mockRestore();
    });
  });
});

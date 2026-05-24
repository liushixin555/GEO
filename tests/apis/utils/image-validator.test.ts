/**
 * @jest-environment node
 *
 * Tests for apis/utils/image-validator.ts
 * Covers: ALLOWED_TYPES, MIME_TO_EXT, validateMime, getExtension, verifyFileSignature
 */
import fs from 'fs';
import path from 'path';
import { ImageValidator } from '../../../apis/utils/image-validator';

const uploadsDir = path.resolve(process.cwd(), 'uploads');

// Valid image buffers with correct magic bytes
const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
  'base64'
);

const VALID_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=',
  'base64'
);

const VALID_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const VALID_WEBP = Buffer.from(
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  'base64'
);

function cleanup(filePath: string) {
  try { fs.unlinkSync(filePath); } catch {}
}

beforeAll(() => {
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
});

// ==================== Static Properties ====================

describe('ImageValidator - Static Properties', () => {
  it('should have 4 allowed types (no SVG)', () => {
    expect(ImageValidator.ALLOWED_TYPES).toHaveLength(4);
    expect(ImageValidator.ALLOWED_TYPES).toContain('image/jpeg');
    expect(ImageValidator.ALLOWED_TYPES).toContain('image/png');
    expect(ImageValidator.ALLOWED_TYPES).toContain('image/gif');
    expect(ImageValidator.ALLOWED_TYPES).toContain('image/webp');
  });

  it('should NOT include image/svg+xml', () => {
    expect(ImageValidator.ALLOWED_TYPES).not.toContain('image/svg+xml');
  });

  it('should NOT include image/bmp', () => {
    expect(ImageValidator.ALLOWED_TYPES).not.toContain('image/bmp');
  });

  it('should have MIME_TO_EXT with 4 entries', () => {
    expect(Object.keys(ImageValidator.MIME_TO_EXT)).toHaveLength(4);
  });

  it('should map JPEG to .jpg', () => {
    expect(ImageValidator.MIME_TO_EXT['image/jpeg']).toBe('.jpg');
  });

  it('should map PNG to .png', () => {
    expect(ImageValidator.MIME_TO_EXT['image/png']).toBe('.png');
  });

  it('should map GIF to .gif', () => {
    expect(ImageValidator.MIME_TO_EXT['image/gif']).toBe('.gif');
  });

  it('should map WebP to .webp', () => {
    expect(ImageValidator.MIME_TO_EXT['image/webp']).toBe('.webp');
  });
});

// ==================== validateMime ====================

describe('ImageValidator.validateMime', () => {
  it('should return true for image/jpeg', () => {
    expect(ImageValidator.validateMime('image/jpeg')).toBe(true);
  });

  it('should return true for image/png', () => {
    expect(ImageValidator.validateMime('image/png')).toBe(true);
  });

  it('should return true for image/gif', () => {
    expect(ImageValidator.validateMime('image/gif')).toBe(true);
  });

  it('should return true for image/webp', () => {
    expect(ImageValidator.validateMime('image/webp')).toBe(true);
  });

  it('should return false for image/svg+xml', () => {
    expect(ImageValidator.validateMime('image/svg+xml')).toBe(false);
  });

  it('should return false for image/bmp', () => {
    expect(ImageValidator.validateMime('image/bmp')).toBe(false);
  });

  it('should return false for image/tiff', () => {
    expect(ImageValidator.validateMime('image/tiff')).toBe(false);
  });

  it('should return false for application/pdf', () => {
    expect(ImageValidator.validateMime('application/pdf')).toBe(false);
  });

  it('should return false for text/plain', () => {
    expect(ImageValidator.validateMime('text/plain')).toBe(false);
  });

  it('should return false for empty string', () => {
    expect(ImageValidator.validateMime('')).toBe(false);
  });
});

// ==================== getExtension ====================

describe('ImageValidator.getExtension', () => {
  it('should return .jpg for image/jpeg', () => {
    expect(ImageValidator.getExtension('image/jpeg')).toBe('.jpg');
  });

  it('should return .png for image/png', () => {
    expect(ImageValidator.getExtension('image/png')).toBe('.png');
  });

  it('should return .gif for image/gif', () => {
    expect(ImageValidator.getExtension('image/gif')).toBe('.gif');
  });

  it('should return .webp for image/webp', () => {
    expect(ImageValidator.getExtension('image/webp')).toBe('.webp');
  });

  it('should return .bin for unknown MIME type', () => {
    expect(ImageValidator.getExtension('image/bmp')).toBe('.bin');
  });

  it('should return .bin for empty string', () => {
    expect(ImageValidator.getExtension('')).toBe('.bin');
  });

  it('should return .bin for application/octet-stream', () => {
    expect(ImageValidator.getExtension('application/octet-stream')).toBe('.bin');
  });
});

// ==================== verifyFileSignature ====================

describe('ImageValidator.verifyFileSignature', () => {
  // --- PNG ---

  it('should verify valid PNG signature', () => {
    const tmpPath = path.join(uploadsDir, '_sig_test.png');
    fs.writeFileSync(tmpPath, VALID_PNG);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(true);
    cleanup(tmpPath);
  });

  it('should reject fake PNG content', () => {
    const tmpPath = path.join(uploadsDir, '_sig_fake.png');
    fs.writeFileSync(tmpPath, 'this is not a real PNG');
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
    cleanup(tmpPath);
  });

  // --- JPEG ---

  it('should verify valid JPEG signature', () => {
    const tmpPath = path.join(uploadsDir, '_sig_test.jpg');
    fs.writeFileSync(tmpPath, VALID_JPEG);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/jpeg')).toBe(true);
    cleanup(tmpPath);
  });

  it('should reject fake JPEG content', () => {
    const tmpPath = path.join(uploadsDir, '_sig_fake.jpg');
    fs.writeFileSync(tmpPath, 'this is not a real JPEG');
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/jpeg')).toBe(false);
    cleanup(tmpPath);
  });

  // --- GIF ---

  it('should verify valid GIF signature', () => {
    const tmpPath = path.join(uploadsDir, '_sig_test.gif');
    fs.writeFileSync(tmpPath, VALID_GIF);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/gif')).toBe(true);
    cleanup(tmpPath);
  });

  it('should reject fake GIF content', () => {
    const tmpPath = path.join(uploadsDir, '_sig_fake.gif');
    fs.writeFileSync(tmpPath, 'not a GIF at all');
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/gif')).toBe(false);
    cleanup(tmpPath);
  });

  // --- WebP ---

  it('should verify valid WebP signature', () => {
    const tmpPath = path.join(uploadsDir, '_sig_test.webp');
    fs.writeFileSync(tmpPath, VALID_WEBP);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/webp')).toBe(true);
    cleanup(tmpPath);
  });

  it('should reject fake WebP content', () => {
    const tmpPath = path.join(uploadsDir, '_sig_fake.webp');
    fs.writeFileSync(tmpPath, 'not a WebP file');
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/webp')).toBe(false);
    cleanup(tmpPath);
  });

  // --- Unknown MIME type ---

  it('should return false for unknown MIME type', () => {
    const tmpPath = path.join(uploadsDir, '_sig_test.bin');
    fs.writeFileSync(tmpPath, Buffer.from([0xFF, 0xD8, 0xFF]));
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/bmp')).toBe(false);
    cleanup(tmpPath);
  });

  // --- Empty file ---

  it('should reject empty file', () => {
    const tmpPath = path.join(uploadsDir, '_sig_empty.png');
    fs.writeFileSync(tmpPath, Buffer.alloc(0));
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
    cleanup(tmpPath);
  });

  // --- File shorter than signature ---

  it('should reject file shorter than signature length', () => {
    const tmpPath = path.join(uploadsDir, '_sig_short.png');
    // PNG signature is 8 bytes, write only 3
    fs.writeFileSync(tmpPath, Buffer.from([0x89, 0x50, 0x4E]));
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
    cleanup(tmpPath);
  });

  // --- Non-existent file ---

  it('should throw for non-existent file', () => {
    const tmpPath = path.join(uploadsDir, '_sig_nonexistent.png');
    expect(() => ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toThrow();
  });

  // --- Cross-type mismatch ---

  it('should reject JPEG content with PNG MIME type', () => {
    const tmpPath = path.join(uploadsDir, '_sig_mismatch.png');
    fs.writeFileSync(tmpPath, VALID_JPEG);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
    cleanup(tmpPath);
  });

  it('should reject PNG content with JPEG MIME type', () => {
    const tmpPath = path.join(uploadsDir, '_sig_mismatch.jpg');
    fs.writeFileSync(tmpPath, VALID_PNG);
    expect(ImageValidator.verifyFileSignature(tmpPath, 'image/jpeg')).toBe(false);
    cleanup(tmpPath);
  });
});

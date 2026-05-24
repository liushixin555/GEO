import fs from 'fs';

export type ImageType = 'image/jpeg' | 'image/png' | 'image/gif' | 'image/webp';

export class ImageValidator {
  static readonly ALLOWED_TYPES: readonly ImageType[] = [
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
  ];

  static readonly MIME_TO_EXT: Readonly<Record<string, string>> = {
    'image/jpeg': '.jpg',
    'image/png': '.png',
    'image/gif': '.gif',
    'image/webp': '.webp',
  };

  private static readonly FILE_SIGNATURES: Readonly<Record<string, Buffer>> = {
    'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
    'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
    'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
    'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]),
  };

  static validateMime(mimetype: string): boolean {
    return this.ALLOWED_TYPES.includes(mimetype as ImageType);
  }

  static getExtension(mimetype: string): string {
    return this.MIME_TO_EXT[mimetype] || '.bin';
  }

  static verifyFileSignature(filePath: string, mimetype: string): boolean {
    const sig = this.FILE_SIGNATURES[mimetype];
    if (!sig) return false;
    const fd = fs.openSync(filePath, 'r');
    const buf = Buffer.alloc(sig.length);
    fs.readSync(fd, buf, 0, sig.length, 0);
    fs.closeSync(fd);
    return buf.equals(sig);
  }
}

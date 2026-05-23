import AdmZip from 'adm-zip';
import { XMLParser } from 'fast-xml-parser';
import yaml from 'js-yaml';

export type DocumentType =
  | 'pdf' | 'doc' | 'docx' | 'md' | 'json' | 'yaml' | 'yml'
  | 'xls' | 'xlsx' | 'csv' | 'ppt' | 'pptx' | 'xml';

export interface ValidationResult {
  valid: boolean;
  detectedType: DocumentType | null;
  error: string | null;
}

// OLE2 Compound Document magic bytes (shared by DOC, XLS, PPT)
const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);

const EXTENSION_TO_MIME: Record<string, string[]> = {
  pdf: ['application/pdf'],
  doc: ['application/msword'],
  docx: ['application/vnd.openxmlformats-officedocument.wordprocessingml.document'],
  md: ['text/markdown', 'text/plain'],
  json: ['application/json', 'text/plain'],
  yaml: ['text/yaml', 'application/x-yaml', 'text/plain'],
  yml: ['text/yaml', 'application/x-yaml', 'text/plain'],
  xls: ['application/vnd.ms-excel'],
  xlsx: ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'],
  csv: ['text/csv', 'text/plain'],
  ppt: ['application/vnd.ms-powerpoint'],
  pptx: ['application/vnd.openxmlformats-officedocument.presentationml.presentation'],
  xml: ['text/xml', 'application/xml'],
};

export class DocumentValidator {
  static readonly ALLOWED_EXTENSIONS: DocumentType[] = [
    'pdf', 'doc', 'docx', 'md', 'json', 'yaml', 'yml',
    'xls', 'xlsx', 'csv', 'ppt', 'pptx', 'xml',
  ];
  static readonly MAX_FILE_SIZE = 30 * 1024 * 1024; // 30MB
  static readonly MIME_MAP = EXTENSION_TO_MIME;

  static getExtension(filename: string): string {
    const parts = filename.toLowerCase().split('.');
    return parts.length > 1 ? parts[parts.length - 1] : '';
  }

  static validateExtension(filename: string): boolean {
    const ext = this.getExtension(filename);
    return this.ALLOWED_EXTENSIONS.includes(ext as DocumentType);
  }

  static validateFileSize(size: number): boolean {
    return size > 0 && size <= this.MAX_FILE_SIZE;
  }

  static async validateContent(buffer: Buffer, declaredExtension: string): Promise<ValidationResult> {
    const ext = declaredExtension.toLowerCase();
    if (!this.ALLOWED_EXTENSIONS.includes(ext as DocumentType)) {
      return { valid: false, detectedType: null, error: `不支持的文档格式: .${ext}` };
    }

    try {
      const detectedType = await this.detectType(buffer);
      if (!detectedType) {
        // For text-based formats, detection may return null; verify by parsing
        const textResult = this.validateTextContent(buffer, ext);
        if (textResult) return textResult;
        return { valid: false, detectedType: null, error: '无法识别文件内容格式' };
      }

      // OLE2: cannot distinguish DOC/XLS/PPT by magic, trust declared extension
      if (detectedType === 'ole2') {
        const ole2Types = ['doc', 'xls', 'ppt'];
        if (ole2Types.includes(ext)) {
          return { valid: true, detectedType: ext as DocumentType, error: null };
        }
        return { valid: false, detectedType: null, error: `OLE2 文件与扩展名 .${ext} 不匹配` };
      }

      // Generic ZIP (not recognized as Office format)
      if (detectedType === 'zip') {
        return { valid: false, detectedType: null, error: 'ZIP 文件不是有效的 Office 文档格式' };
      }

      // Check if detected type matches declared extension
      if (detectedType !== ext && detectedType !== this.getCanonicalType(ext)) {
        return { valid: false, detectedType: detectedType as DocumentType, error: `文件内容与扩展名不匹配: 声明 .${ext}，实际为 .${detectedType}` };
      }

      return { valid: true, detectedType: detectedType as DocumentType, error: null };
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '文件内容校验失败';
      return { valid: false, detectedType: null, error: msg };
    }
  }

  private static getCanonicalType(ext: string): string {
    // yml and yaml are equivalent
    if (ext === 'yml') return 'yaml';
    return ext;
  }

  private static async detectType(buffer: Buffer): Promise<string | null> {
    if (buffer.length < 4) return null;

    // PDF: %PDF-
    if (buffer.toString('ascii', 0, 5) === '%PDF-') return 'pdf';

    // OLE2: DOC, XLS, PPT all share the same magic
    if (buffer.length >= 8 && buffer.subarray(0, 8).equals(OLE2_MAGIC)) {
      return 'ole2'; // Caller should use declared extension for OLE2 types
    }

    // ZIP-based: DOCX, XLSX, PPTX
    // ZIP magic: PK\x03\x04
    if (buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4B && buffer[2] === 0x03 && buffer[3] === 0x04) {
      try {
        const zip = new AdmZip(buffer);
        const zipEntries = zip.getEntries();
        // ZIP 炸弹防护：限制条目数量和解压后总大小
        if (zipEntries.length > 1000) return null;
        const totalUncompressed = zipEntries.reduce((sum, e) => sum + (e.header?.size || 0), 0);
        if (totalUncompressed > 100 * 1024 * 1024) return null;
        const entries = zipEntries.map(e => e.entryName);
        if (entries.some(e => e.startsWith('word/'))) return 'docx';
        if (entries.some(e => e.startsWith('xl/'))) return 'xlsx';
        if (entries.some(e => e.startsWith('ppt/'))) return 'pptx';
        return 'zip'; // Generic ZIP, not a recognized Office format
      } catch {
        return null;
      }
    }

    return null;
  }

  private static validateTextContent(buffer: Buffer, ext: string): ValidationResult | null {
    let text: string;
    try {
      text = buffer.toString('utf-8');
    } catch {
      return { valid: false, detectedType: null, error: '文件不是有效的 UTF-8 文本' };
    }

    switch (ext) {
      case 'json': {
        try {
          JSON.parse(text);
          return { valid: true, detectedType: 'json', error: null };
        } catch {
          return { valid: false, detectedType: null, error: 'JSON 格式无效' };
        }
      }
      case 'yaml':
      case 'yml': {
        try {
          const result = yaml.load(text, { schema: yaml.JSON_SCHEMA });
          if (result === null || result === undefined) {
            return { valid: false, detectedType: null, error: 'YAML 内容为空' };
          }
          return { valid: true, detectedType: 'yaml', error: null };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'YAML 格式无效';
          return { valid: false, detectedType: null, error: `YAML 格式无效: ${msg}` };
        }
      }
      case 'xml': {
        try {
          const parser = new XMLParser({
            ignoreAttributes: false,
            processEntities: false,
            htmlEntities: false,
          });
          const result = parser.parse(text);
          if (!result || typeof result !== 'object') {
            return { valid: false, detectedType: null, error: 'XML 格式无效' };
          }
          return { valid: true, detectedType: 'xml', error: null };
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : 'XML 格式无效';
          return { valid: false, detectedType: null, error: `XML 格式无效: ${msg}` };
        }
      }
      case 'csv': {
        const lines = text.split('\n').filter(l => l.trim().length > 0);
        if (lines.length === 0) {
          return { valid: false, detectedType: null, error: 'CSV 文件为空' };
        }
        const firstLine = lines[0];
        if (firstLine.includes(',') || firstLine.includes('\t') || firstLine.includes(';')) {
          return { valid: true, detectedType: 'csv', error: null };
        }
        return { valid: false, detectedType: null, error: 'CSV 文件未检测到分隔符（逗号、制表符或分号）' };
      }
      case 'md': {
        // Markdown: check for common patterns
        const hasMarkdownPatterns = /(^#{1,6}\s)|(\*\*.*?\*\*)|(\[.*?\]\(.*?\))|(^[-*+]\s)|(^>\s)|(```)/m.test(text);
        if (hasMarkdownPatterns) {
          return { valid: true, detectedType: 'md', error: null };
        }
        return { valid: false, detectedType: null, error: '文件内容不包含有效的 Markdown 语法' };
      }
      default:
        return null;
    }
  }
}

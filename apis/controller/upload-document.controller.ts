import { Request, Response } from 'express';
import path from 'path';
import { promises as fsp } from 'fs';
import { success, fail } from '../utils';
import { createUploadMiddleware, FileFilterError } from '../utils/upload-factory';
import { DocumentValidator } from '../utils/document-validator';
import config from '../config';

const MAX_FILENAME_LENGTH = 255;

// --- Validation buffer optimization (H-1: avoid reading full file into memory) ---

const HEADER_SIZE = 4096;
const TEXT_MAX_SIZE = 5 * 1024 * 1024; // 5MB for text formats
const HEADER_ONLY_EXTENSIONS = new Set(['pdf', 'doc', 'xls', 'ppt']);
const TEXT_EXTENSIONS = new Set(['json', 'yaml', 'yml', 'xml', 'csv', 'md']);

class TextSizeLimitError extends Error {
  constructor() {
    super('文本文件大小超过限制（最大 5MB）');
    this.name = 'TextSizeLimitError';
  }
}

async function readValidationBuffer(filePath: string, ext: string): Promise<Buffer> {
  // Binary formats (PDF, OLE2): only need magic bytes from first 4KB
  if (HEADER_ONLY_EXTENSIONS.has(ext)) {
    const handle = await fsp.open(filePath, 'r');
    try {
      const buffer = Buffer.alloc(HEADER_SIZE);
      await handle.read(buffer, 0, HEADER_SIZE, 0);
      return buffer;
    } finally {
      await handle.close();
    }
  }

  // Text formats: enforce smaller size limit before reading into memory
  if (TEXT_EXTENSIONS.has(ext)) {
    const stat = await fsp.stat(filePath);
    if (stat.size > TEXT_MAX_SIZE) {
      throw new TextSizeLimitError();
    }
  }

  // ZIP-based formats (DOCX/XLSX/PPTX) and text formats: read full file
  return fsp.readFile(filePath);
}

// --- Error message sanitization (H-3: prevent detection logic leakage) ---

function sanitizeErrorMessage(error: string | null): string {
  if (!error) return '文档内容格式校验失败';
  // 隐藏包含内部检测类型信息的错误消息（如"实际为 .xlsx"）
  if (error.includes('实际为')) return '文件内容与声明格式不匹配';
  // 其他已知安全消息直接转发
  return error;
}

// --- Middleware ---

export const uploadDocumentMiddleware = createUploadMiddleware({
  maxSize: config.upload.documentMaxSize,
  fileFilter: (_req, file, cb) => {
    if (file.originalname.length > MAX_FILENAME_LENGTH) {
      cb(new FileFilterError('文件名过长（最大 255 个字符）'));
      return;
    }
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext.includes('/') || ext.includes('\\') || ext.includes('..')) {
      cb(new FileFilterError('非法文件扩展名'));
      return;
    }
    if (!DocumentValidator.validateExtension(file.originalname)) {
      cb(new FileFilterError(`不支持的文档格式，仅支持: ${DocumentValidator.ALLOWED_EXTENSIONS.map((e: string) => `.${e}`).join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

// --- Handler ---

export async function uploadDocumentFile(req: Request, res: Response): Promise<void> {
  if (!req.file) {
    fail(res, 400, '请选择要上传的文档');
    return;
  }

  const ext = DocumentValidator.getExtension(req.file.originalname);

  let buffer: Buffer;
  try {
    buffer = await readValidationBuffer(req.file.path, ext);
  } catch (err: unknown) {
    try { await fsp.unlink(req.file.path); } catch {}
    if (err instanceof TextSizeLimitError) {
      fail(res, 400, err.message);
    } else {
      fail(res, 500, '上传失败');
    }
    return;
  }

  try {
    const validation = await DocumentValidator.validateContent(buffer, ext);
    if (!validation.valid) {
      try { await fsp.unlink(req.file.path); } catch {}
      fail(res, 400, sanitizeErrorMessage(validation.error));
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, {
      url,
      originalName: req.file.originalname,
      fileType: ext,
      fileSize: req.file.size,
    }, '上传成功');
  } catch {
    try { await fsp.unlink(req.file.path); } catch {}
    fail(res, 500, '上传失败');
  }
}

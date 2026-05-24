import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import { promises as fsp } from 'fs';
import crypto from 'crypto';
import { success, fail } from '../utils';
import { DocumentValidator } from '../utils/document-validator';

class FileFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileFilterError';
  }
}

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
// 直接创建，recursive 模式下已存在不报错（修复 TOCTOU 竞态）
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const MAX_FILENAME_LENGTH = 255;

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const name = crypto.randomUUID();
    cb(null, ext ? `${name}${ext}` : name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: DocumentValidator.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    // 文件名长度限制
    if (file.originalname.length > MAX_FILENAME_LENGTH) {
      cb(new FileFilterError('文件名过长（最大 255 个字符）'));
      return;
    }
    // 防御性校验：扩展名中不应包含路径分隔符
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext.includes('/') || ext.includes('\\') || ext.includes('..')) {
      cb(new FileFilterError('非法文件扩展名'));
      return;
    }
    if (!DocumentValidator.validateExtension(file.originalname)) {
      cb(new FileFilterError(`不支持的文档格式，仅支持: ${DocumentValidator.ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

export function uploadDocumentMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: unknown) => {
    if (err) {
      if (err instanceof MulterError && err.code === 'LIMIT_FILE_SIZE') {
        fail(res, 400, `文件大小超过限制（最大 ${DocumentValidator.MAX_FILE_SIZE / 1024 / 1024}MB）`);
        return;
      }
      if (err instanceof FileFilterError) {
        fail(res, 400, err.message);
        return;
      }
      // 不暴露内部错误消息
      fail(res, 500, '上传失败');
      return;
    }
    next();
  });
}

export async function uploadDocumentFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的文档');
      return;
    }

    const ext = DocumentValidator.getExtension(req.file.originalname);
    const buffer = await fsp.readFile(req.file.path);

    // Strict content validation
    const validation = await DocumentValidator.validateContent(buffer, ext);
    if (!validation.valid) {
      // Delete the uploaded file since validation failed
      try { await fsp.unlink(req.file.path); } catch {}
      fail(res, 400, validation.error || '文档内容格式校验失败');
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
    // Clean up file on error
    if (req.file) {
      try { await fsp.unlink(req.file.path); } catch {}
    }
    fail(res, 500, '上传失败');
  }
}

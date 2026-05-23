import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { success, fail } from '../utils';
import { DocumentValidator } from '../utils/document-validator';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    if (!fs.existsSync(UPLOAD_DIR)) {
      fs.mkdirSync(UPLOAD_DIR, { recursive: true });
    }
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomUUID();
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: DocumentValidator.MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    if (!DocumentValidator.validateExtension(file.originalname)) {
      cb(new Error(`不支持的文档格式，仅支持: ${DocumentValidator.ALLOWED_EXTENSIONS.map(e => `.${e}`).join(', ')}`));
      return;
    }
    cb(null, true);
  },
});

export function uploadDocumentMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        fail(res, 400, `文件大小超过限制（最大 ${DocumentValidator.MAX_FILE_SIZE / 1024 / 1024}MB）`);
        return;
      }
      const status = err.message.includes('不支持的文档格式') ? 400 : 500;
      fail(res, status, err.message || '上传失败');
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
    const buffer = fs.readFileSync(req.file.path);

    // Strict content validation
    const validation = await DocumentValidator.validateContent(buffer, ext);
    if (!validation.valid) {
      // Delete the uploaded file since validation failed
      fs.unlinkSync(req.file.path);
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
  } catch (err: unknown) {
    // Clean up file on error
    if (req.file && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
    const msg = err instanceof Error ? err.message : '上传失败';
    fail(res, 500, msg);
  }
}

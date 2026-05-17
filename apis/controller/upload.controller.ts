import { Request, Response, NextFunction } from 'express';
import multer from 'multer';
import path from 'path';
import crypto from 'crypto';
import { success, fail } from '../utils';

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/svg+xml'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, path.resolve(process.cwd(), 'uploads'));
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = crypto.randomUUID();
    cb(null, `${name}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_SIZE },
  fileFilter: (_req, file, cb) => {
    if (ALLOWED_TYPES.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('不支持的图片格式'));
    }
  },
});

export function uploadMiddleware(req: Request, res: Response, next: NextFunction): void {
  upload.single('file')(req, res, (err: any) => {
    if (err) {
      const status = err.message === '不支持的图片格式' ? 400 : 500;
      fail(res, status, err.message || '上传失败');
      return;
    }
    next();
  });
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的图片');
      return;
    }
    const url = `/uploads/${req.file.filename}`;
    success(res, { url }, '上传成功');
  } catch (err: any) {
    fail(res, 500, err.message || '上传失败');
  }
}

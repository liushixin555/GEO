import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { success, fail } from '../utils';

const UPLOAD_DIR = path.resolve(process.cwd(), 'uploads');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
const MAX_SIZE = 10 * 1024 * 1024; // 10MB

const MIME_TO_EXT: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/gif': '.gif',
  'image/webp': '.webp',
};

const FILE_SIGNATURES: Record<string, Buffer> = {
  'image/jpeg': Buffer.from([0xFF, 0xD8, 0xFF]),
  'image/png': Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]),
  'image/gif': Buffer.from([0x47, 0x49, 0x46, 0x38]),
  'image/webp': Buffer.from([0x52, 0x49, 0x46, 0x46]),
};

function verifyFileSignature(filePath: string, mimetype: string): boolean {
  const sig = FILE_SIGNATURES[mimetype];
  if (!sig) return false;
  const fd = fs.openSync(filePath, 'r');
  const buf = Buffer.alloc(sig.length);
  fs.readSync(fd, buf, 0, sig.length, 0);
  fs.closeSync(fd);
  return buf.equals(sig);
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const ext = MIME_TO_EXT[file.mimetype] || '.bin';
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
  upload.single('file')(req, res, (err: unknown) => {
    if (!err) {
      next();
      return;
    }

    if (err instanceof MulterError) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        fail(res, 413, '文件大小超过 10MB 限制');
      } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
        fail(res, 400, '上传字段名应为 file');
      } else {
        fail(res, 400, '上传参数错误');
      }
    } else if (err instanceof Error && err.message === '不支持的图片格式') {
      fail(res, 400, '不支持的图片格式');
    } else {
      fail(res, 500, '上传失败');
    }
  });
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的图片');
      return;
    }

    if (!verifyFileSignature(req.file.path, req.file.mimetype)) {
      fs.unlinkSync(req.file.path);
      fail(res, 400, '文件内容与声明类型不匹配');
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url }, '上传成功');
  } catch {
    try {
      if (req.file) {
        try { fs.unlinkSync(req.file.path); } catch {}
      }
    } catch {}
    fail(res, 500, '上传失败');
  }
}

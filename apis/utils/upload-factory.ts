import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { fail } from './response.util';
import config from '../config';

export class FileFilterError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'FileFilterError';
  }
}

let _uploadDir: string | null = null;

export function getUploadDir(): string {
  if (!_uploadDir) {
    _uploadDir = config.uploadDir;
    fs.mkdirSync(_uploadDir, { recursive: true });
  }
  return _uploadDir;
}

export interface UploadMiddlewareOptions {
  maxSize: number;
  fileFilter: (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => void;
  getExtension?: (file: Express.Multer.File) => string;
}

export function createUploadMiddleware(options: UploadMiddlewareOptions) {
  const uploadDir = getUploadDir();

  const storage = multer.diskStorage({
    destination: (_req, _file, cb) => {
      cb(null, uploadDir);
    },
    filename: (_req, file, cb) => {
      const name = crypto.randomUUID();
      const ext = options.getExtension
        ? options.getExtension(file)
        : path.extname(file.originalname).toLowerCase();
      cb(null, ext ? `${name}${ext}` : name);
    },
  });

  const upload = multer({
    storage,
    limits: { fileSize: options.maxSize },
    fileFilter: options.fileFilter,
  });

  return (req: Request, res: Response, next: NextFunction): void => {
    upload.single('file')(req, res, (err: unknown) => {
      if (!err) {
        next();
        return;
      }

      if (err instanceof MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          fail(res, 413, `文件大小超过限制（最大 ${options.maxSize / 1024 / 1024}MB）`);
        } else if (err.code === 'LIMIT_UNEXPECTED_FILE') {
          fail(res, 400, '上传字段名应为 file');
        } else {
          fail(res, 400, '上传参数错误');
        }
      } else if (err instanceof FileFilterError) {
        fail(res, 400, err.message);
      } else {
        fail(res, 500, '上传失败');
      }
    });
  };
}

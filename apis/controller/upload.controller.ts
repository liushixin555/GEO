import { Request, Response } from 'express';
import fs from 'fs';
import { success, fail } from '../utils';
import { createUploadMiddleware, FileFilterError } from '../utils/upload-factory';
import { ImageValidator } from '../utils/image-validator';
import config from '../config';

export const uploadMiddleware = createUploadMiddleware({
  maxSize: config.upload.imageMaxSize,
  fileFilter: (_req, file, cb) => {
    if (ImageValidator.validateMime(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new FileFilterError('不支持的图片格式'));
    }
  },
  getExtension: (file) => ImageValidator.getExtension(file.mimetype),
});

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的图片');
      return;
    }

    if (!ImageValidator.verifyFileSignature(req.file.path, req.file.mimetype)) {
      try { fs.unlinkSync(req.file.path); } catch {}
      fail(res, 400, '文件内容与声明类型不匹配');
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url }, '上传成功');
  } catch {
    try {
      if (req.file) { fs.unlinkSync(req.file.path); }
    } catch {}
    fail(res, 500, '上传失败');
  }
}

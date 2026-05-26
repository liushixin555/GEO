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

function safeCleanup(filePath: string): void {
  try { fs.unlinkSync(filePath); } catch (_e) { /* 清理失败不应阻断响应 */ }
}

export async function uploadFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的图片');
      return;
    }

    if (!ImageValidator.verifyFileSignature(req.file.path, req.file.mimetype)) {
      safeCleanup(req.file.path);
      fail(res, 400, '文件内容与声明类型不匹配');
      return;
    }

    if (!ImageValidator.validateDimensions(req.file.path).valid) {
      safeCleanup(req.file.path);
      fail(res, 400, '图片尺寸超过限制（最大 8000x8000 像素）');
      return;
    }

    const url = `/uploads/${req.file.filename}`;
    success(res, { url }, '上传成功');
  } catch (_err: unknown) {
    try {
      if (req.file) safeCleanup(req.file.path);
    } catch { /* 二次清理失败忽略 */ }
    fail(res, 500, '上传失败');
  }
}

import { Request, Response } from 'express';
import path from 'path';
import { promises as fsp } from 'fs';
import { success, fail } from '../utils';
import { createUploadMiddleware, FileFilterError } from '../utils/upload-factory';
import { DocumentValidator } from '../utils/document-validator';
import config from '../config';

const MAX_FILENAME_LENGTH = 255;

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

export async function uploadDocumentFile(req: Request, res: Response): Promise<void> {
  try {
    if (!req.file) {
      fail(res, 400, '请选择要上传的文档');
      return;
    }

    const ext = DocumentValidator.getExtension(req.file.originalname);
    const buffer = await fsp.readFile(req.file.path);

    const validation = await DocumentValidator.validateContent(buffer, ext);
    if (!validation.valid) {
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
    if (req.file) {
      try { await fsp.unlink(req.file.path); } catch {}
    }
    fail(res, 500, '上传失败');
  }
}

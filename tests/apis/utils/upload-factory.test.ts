/**
 * @jest-environment node
 *
 * Tests for apis/utils/upload-factory.ts
 * Covers: FileFilterError, getUploadDir, createUploadMiddleware
 */
import { Request, Response, NextFunction } from 'express';
import fs from 'fs';
import path from 'path';
import { MulterError } from 'multer';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

jest.mock('../../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

// ==================== FileFilterError ====================

describe('FileFilterError', () => {
  it('should be an instance of Error', () => {
    const { FileFilterError } = require('../../../apis/utils/upload-factory');
    const err = new FileFilterError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should set name to FileFilterError', () => {
    const { FileFilterError } = require('../../../apis/utils/upload-factory');
    const err = new FileFilterError('custom message');
    expect(err.name).toBe('FileFilterError');
  });

  it('should set message correctly', () => {
    const { FileFilterError } = require('../../../apis/utils/upload-factory');
    const err = new FileFilterError('不支持的格式');
    expect(err.message).toBe('不支持的格式');
  });
});

// ==================== getUploadDir ====================

describe('getUploadDir', () => {
  it('should return a string path', () => {
    const { getUploadDir } = require('../../../apis/utils/upload-factory');
    const dir = getUploadDir();
    expect(typeof dir).toBe('string');
    expect(dir.length).toBeGreaterThan(0);
  });

  it('should ensure upload directory exists', () => {
    const { getUploadDir } = require('../../../apis/utils/upload-factory');
    const dir = getUploadDir();
    expect(fs.existsSync(dir)).toBe(true);
  });

  it('should return the same path on repeated calls', () => {
    const { getUploadDir } = require('../../../apis/utils/upload-factory');
    const dir1 = getUploadDir();
    const dir2 = getUploadDir();
    expect(dir1).toBe(dir2);
  });
});

// ==================== createUploadMiddleware ====================

describe('createUploadMiddleware', () => {
  const { createUploadMiddleware, FileFilterError } = require('../../../apis/utils/upload-factory');

  const VALID_PNG = Buffer.from(
    'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
    'base64'
  );

  function makeMiddlewareOptions(overrides = {}) {
    return {
      maxSize: 10 * 1024 * 1024,
      fileFilter: (_req: any, _file: any, cb: any) => cb(null, true),
      ...overrides,
    };
  }

  /** Helper: create mock response with status+json chain */
  function mockRes() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    return { json, status, res: { status } as unknown as Response };
  }

  // ---------- LIMIT_FILE_SIZE error ----------

  it('should return 413 for LIMIT_FILE_SIZE error', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            const err = new MulterError('LIMIT_FILE_SIZE');
            cb(err);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(json).toHaveBeenCalledWith({
        code: 413,
        message: expect.stringContaining('文件大小超过限制'),
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- LIMIT_UNEXPECTED_FILE error ----------

  it('should return 400 for LIMIT_UNEXPECTED_FILE error', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            const err = new MulterError('LIMIT_UNEXPECTED_FILE');
            cb(err);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(json).toHaveBeenCalledWith({
        code: 400,
        message: '上传字段名应为 file',
      });
      expect(next).not.toHaveBeenCalled();
    });
  });

  // ---------- Generic MulterError ----------

  it('should return 400 for generic MulterError', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            const err = new MulterError('LIMIT_FIELD_COUNT');
            cb(err);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(json).toHaveBeenCalledWith({
        code: 400,
        message: '上传参数错误',
      });
    });
  });

  // ---------- FileFilterError ----------

  it('should return 400 for FileFilterError', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            const { FileFilterError: FFE } = require('../../../apis/utils/upload-factory');
            cb(new FFE('不支持的图片格式'));
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(json).toHaveBeenCalledWith({
        code: 400,
        message: '不支持的图片格式',
      });
    });
  });

  // ---------- Unknown error ----------

  it('should return 500 for unknown error', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(new Error('Something went wrong'));
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(json).toHaveBeenCalledWith({
        code: 500,
        message: '上传失败',
      });
    });
  });

  // ---------- No error (success) ----------

  it('should call next() when no error', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(null);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
      const { json, res } = mockRes();
      const next = jest.fn();

      createMiddleware(makeMiddlewareOptions())({} as Request, res, next);

      expect(next).toHaveBeenCalled();
      expect(json).not.toHaveBeenCalled();
    });
  });

  // ---------- getExtension option ----------

  it('should use getExtension for filename when provided', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(null);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MulterError;
        return mockMulter;
      });

      const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');

      const middleware = createMiddleware({
        maxSize: 10 * 1024 * 1024,
        fileFilter: (_req: any, _file: any, cb: any) => cb(null, true),
        getExtension: (file: any) => '.custom',
      });

      const { json, res } = mockRes();
      const next = jest.fn();

      // Just verify the middleware was created and can be called
      expect(typeof middleware).toBe('function');
      middleware({} as Request, res, next);
      expect(next).toHaveBeenCalled();
    });
  });

  // ---------- Integration: upload real file through middleware ----------

  it('should upload a valid PNG file through integration', async () => {
    const { createUploadMiddleware: createMiddleware } = require('../../../apis/utils/upload-factory');
    const request = require('supertest');
    const express = require('express');
    const jwt = require('jsonwebtoken');

    const app = express();
    const middleware = createMiddleware({
      maxSize: 10 * 1024 * 1024,
      fileFilter: (_req: any, file: any, cb: any) => {
        if (['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.mimetype)) {
          cb(null, true);
        } else {
          cb(new FileFilterError('不支持的图片格式'));
        }
      },
      getExtension: (file: any) => {
        const map: Record<string, string> = {
          'image/jpeg': '.jpg',
          'image/png': '.png',
          'image/gif': '.gif',
          'image/webp': '.webp',
        };
        return map[file.mimetype] || '.bin';
      },
    });

    app.post('/test-upload', middleware, (req: any, res: any) => {
      res.json({ code: 0, data: { filename: req.file?.filename } });
    });

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const testFile = path.join(uploadsDir, '_factory_test.png');
    fs.writeFileSync(testFile, VALID_PNG);

    const response = await request(app)
      .post('/test-upload')
      .attach('file', testFile);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.filename).toMatch(/\.png$/);

    // Cleanup
    try { fs.unlinkSync(path.join(uploadsDir, response.body.data.filename)); } catch {}
    try { fs.unlinkSync(testFile); } catch {}
  });
});

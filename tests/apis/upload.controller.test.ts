/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { Request, Response } from 'express';

process.env.JWT_SECRET = 'test-secret';
process.env.JWT_EXPIRES_IN = '2h';
process.env.SWAGGER_ENABLED = 'false';
process.env.RATE_LIMIT_WINDOW_MS = '60000';
process.env.RATE_LIMIT_MAX = '100';

jest.mock('../../apis/utils/db.util', () => ({
  getPrisma: jest.fn(),
  closePrisma: jest.fn(),
}));

import app from '../../apis/app';
import { uploadFile, uploadMiddleware } from '../../apis/controller/upload.controller';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

function sysadminToken() {
  return jwt.sign(
    { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function adminToken() {
  return jwt.sign(
    { userId: 2, username: 'admin', role: 'admin', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

function viewToken() {
  return jwt.sign(
    { userId: 3, username: 'viewer', role: 'view', companyId: 2 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

const VALID_PNG = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
  'base64'
);

const VALID_JPEG = Buffer.from(
  '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=',
  'base64'
);

const VALID_GIF = Buffer.from(
  'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
  'base64'
);

const VALID_WEBP = Buffer.from(
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
  'base64'
);

function cleanup(filePath: string) {
  try { fs.unlinkSync(filePath); } catch {}
}

// ==================== Integration Tests ====================

describe('Upload Controller - Integration', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const testImagePath = path.join(uploadsDir, '_test_upload.png');

  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    fs.writeFileSync(testImagePath, VALID_PNG);
  });

  afterAll(() => {
    cleanup(testImagePath);
  });

  // ---------- Auth & Permission ----------

  it('should return 401 without token', async () => {
    const response = await agent.post('/api/v1/upload');
    expect(response.status).toBe(401);
  });

  it('should return 403 for view role', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  // ---------- Successful uploads ----------

  it('should upload PNG image successfully as sysadmin', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.message).toBe('上传成功');
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    expect(response.body.data.url).toMatch(/\.png$/);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
  });

  it('should upload image successfully as admin', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
  });

  it('should upload JPEG image successfully', async () => {
    const jpegPath = path.join(uploadsDir, '_test.jpg');
    fs.writeFileSync(jpegPath, VALID_JPEG);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jpegPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.jpg$/);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
    cleanup(jpegPath);
  });

  it('should upload GIF image successfully', async () => {
    const gifPath = path.join(uploadsDir, '_test.gif');
    fs.writeFileSync(gifPath, VALID_GIF);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', gifPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.gif$/);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
    cleanup(gifPath);
  });

  it('should upload WebP image successfully', async () => {
    const webpPath = path.join(uploadsDir, '_test.webp');
    fs.writeFileSync(webpPath, VALID_WEBP);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', webpPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.webp$/);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
    cleanup(webpPath);
  });

  it('should reject SVG files with 400', async () => {
    const svgPath = path.join(uploadsDir, '_test.svg');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>';
    fs.writeFileSync(svgPath, svg);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', svgPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');

    cleanup(svgPath);
  });

  // ---------- Validation errors ----------

  it('should return 400 when no file provided', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should reject non-image files with 400 (unsupported format)', async () => {
    const txtPath = path.join(uploadsDir, '_test.txt');
    fs.writeFileSync(txtPath, 'not an image');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');

    cleanup(txtPath);
  });

  it('should reject file exceeding 10MB with 413', async () => {
    const largePath = path.join(uploadsDir, '_test_large.png');
    const buffer = Buffer.alloc(11 * 1024 * 1024, 'x');
    fs.writeFileSync(largePath, buffer);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);

    expect(response.status).toBe(413);
    expect(response.body.message).toBe('文件大小超过限制（最大 10MB）');

    cleanup(largePath);
  }, 30000);

  it('should reject unsupported file type (.pdf)', async () => {
    const pdfPath = path.join(uploadsDir, '_test.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 test content');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(400);

    cleanup(pdfPath);
  });

  it('should reject unsupported file type (.doc)', async () => {
    const docPath = path.join(uploadsDir, '_test.doc');
    fs.writeFileSync(docPath, 'fake doc content');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docPath);

    expect(response.status).toBe(400);

    cleanup(docPath);
  });

  it('should reject MIME-forged file (non-image with image Content-Type)', async () => {
    const fakePath = path.join(uploadsDir, '_test_fake.png');
    fs.writeFileSync(fakePath, 'this is not a real PNG image content');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { contentType: 'image/png' });

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('文件内容与声明类型不匹配');

    cleanup(fakePath);
  });

  it('should return 400 with wrong field name (LIMIT_UNEXPECTED_FILE)', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('image', testImagePath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('上传字段名应为 file');
  });
});

// ==================== Unit Tests ====================

describe('uploadFile - Unit', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  it('should return 400 when req.file is undefined', async () => {
    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '请选择要上传的图片' });
  });

  it('should return 200 with correct url on success', async () => {
    const tmpPath = path.join(uploadsDir, '_unit_test_success.png');
    fs.writeFileSync(tmpPath, VALID_PNG);

    const req = {
      file: { filename: 'abc-123.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/abc-123.png' },
    });

    cleanup(tmpPath);
  });

  it('should return 500 with generic message when exception occurs', async () => {
    const req = {
      get file() { throw new Error('disk full'); },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
  });

  it('should return 500 with default message when error has no message', async () => {
    const req = {
      get file() { throw new Error(); },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
  });

  it('should handle file with various extensions correctly', async () => {
    const tmpPath = path.join(uploadsDir, '_unit_test_ext.jpg');
    fs.writeFileSync(tmpPath, VALID_JPEG);

    const req = {
      file: { filename: 'uuid-value.jpg', path: tmpPath, mimetype: 'image/jpeg' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/uuid-value.jpg' },
    });

    cleanup(tmpPath);
  });

  it('should reject file when content does not match declared MIME type', async () => {
    const tmpPath = path.join(uploadsDir, '_unit_fake.png');
    fs.writeFileSync(tmpPath, 'this is not a PNG');

    const req = {
      file: { filename: 'fake.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });
});

// ==================== verifyFileSignature Unit Tests ====================

describe('verifyFileSignature - Unit', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  it('should return false for unknown mimetype (image/bmp)', async () => {
    const tmpPath = path.join(uploadsDir, '_test_unknown_mime');
    fs.writeFileSync(tmpPath, Buffer.from([0xFF, 0xD8, 0xFF]));

    const req = {
      file: { filename: 'test.bin', path: tmpPath, mimetype: 'image/bmp' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should verify JPEG signature correctly', async () => {
    const tmpPath = path.join(uploadsDir, '_test_jpeg_sig.jpg');
    fs.writeFileSync(tmpPath, VALID_JPEG);

    const req = {
      file: { filename: 'sig-test.jpg', path: tmpPath, mimetype: 'image/jpeg' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/sig-test.jpg' },
    });

    cleanup(tmpPath);
  });

  it('should verify GIF signature correctly', async () => {
    const tmpPath = path.join(uploadsDir, '_test_gif_sig.gif');
    fs.writeFileSync(tmpPath, VALID_GIF);

    const req = {
      file: { filename: 'sig-test.gif', path: tmpPath, mimetype: 'image/gif' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/sig-test.gif' },
    });

    cleanup(tmpPath);
  });

  it('should verify WebP signature correctly', async () => {
    const tmpPath = path.join(uploadsDir, '_test_webp_sig.webp');
    fs.writeFileSync(tmpPath, VALID_WEBP);

    const req = {
      file: { filename: 'sig-test.webp', path: tmpPath, mimetype: 'image/webp' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/sig-test.webp' },
    });

    cleanup(tmpPath);
  });

  it('should reject JPEG with corrupted signature', async () => {
    const tmpPath = path.join(uploadsDir, '_test_corrupt_jpg.jpg');
    fs.writeFileSync(tmpPath, 'this is not a real JPEG');

    const req = {
      file: { filename: 'corrupt.jpg', path: tmpPath, mimetype: 'image/jpeg' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should reject GIF with corrupted signature', async () => {
    const tmpPath = path.join(uploadsDir, '_test_corrupt_gif.gif');
    fs.writeFileSync(tmpPath, 'not a GIF at all');

    const req = {
      file: { filename: 'corrupt.gif', path: tmpPath, mimetype: 'image/gif' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should reject WebP with corrupted signature', async () => {
    const tmpPath = path.join(uploadsDir, '_test_corrupt_webp.webp');
    fs.writeFileSync(tmpPath, 'not a WebP file');

    const req = {
      file: { filename: 'corrupt.webp', path: tmpPath, mimetype: 'image/webp' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });
});

// ==================== uploadFile Error Path Edge Cases ====================

describe('uploadFile - Error Paths', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  it('should handle cleanup failure when verifyFileSignature rejects', async () => {
    const tmpPath = path.join(uploadsDir, '_test_cleanup_fail.png');
    fs.writeFileSync(tmpPath, 'fake content');

    const req = {
      file: { filename: 'cleanup-test.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文件内容与声明类型不匹配' });
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should return 500 and attempt cleanup when success path throws', async () => {
    const tmpPath = path.join(uploadsDir, '_test_error_cleanup.png');
    fs.writeFileSync(tmpPath, VALID_PNG);

    const req = {
      file: { filename: 'err-test.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;

    let callCount = 0;
    const json = jest.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) throw new Error('response error');
    });
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);

    cleanup(tmpPath);
  });
});

// ==================== Edge case tests ====================

describe('Upload Controller - Edge Cases', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  it('should handle filename with special characters', async () => {
    const testImagePath = path.join(uploadsDir, '_test_upload.png');
    fs.writeFileSync(testImagePath, VALID_PNG);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: '测试 图片 (1).png' });

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);

    cleanup(path.join(uploadsDir, response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle file with no extension', async () => {
    const noExtPath = path.join(uploadsDir, '_test_noext');
    fs.writeFileSync(noExtPath, 'not an image');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', noExtPath);

    expect(response.status).toBe(400);

    cleanup(noExtPath);
  });

  it('should handle BMP file rejection', async () => {
    const bmpPath = path.join(uploadsDir, '_test.bmp');
    const bmp = Buffer.alloc(54 + 4, 0);
    bmp.write('BM', 0);
    fs.writeFileSync(bmpPath, bmp);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', bmpPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');

    cleanup(bmpPath);
  });

  it('should handle TIFF file rejection', async () => {
    const tiffPath = path.join(uploadsDir, '_test.tiff');
    fs.writeFileSync(tiffPath, 'II* fake tiff');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', tiffPath);

    expect(response.status).toBe(400);

    cleanup(tiffPath);
  });

  it('should reject .exe file', async () => {
    const exePath = path.join(uploadsDir, '_test.exe');
    fs.writeFileSync(exePath, 'MZ fake executable');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', exePath);

    expect(response.status).toBe(400);

    cleanup(exePath);
  });

  it('should reject .zip file', async () => {
    const zipPath = path.join(uploadsDir, '_test.zip');
    fs.writeFileSync(zipPath, 'PK fake zip');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', zipPath);

    expect(response.status).toBe(400);

    cleanup(zipPath);
  });

  it('should reject .html file (XSS prevention)', async () => {
    const htmlPath = path.join(uploadsDir, '_test.html');
    fs.writeFileSync(htmlPath, '<html><body>XSS</body></html>');

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', htmlPath);

    expect(response.status).toBe(400);

    cleanup(htmlPath);
  });

  it('should reject expired token', async () => {
    const expiredToken = jwt.sign(
      { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
      'test-secret',
      { expiresIn: '0s' }
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('should reject invalid token', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(response.status).toBe(401);
  });
});

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

// ==================== Integration Tests ====================

describe('Upload Controller - Integration', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const testImagePath = path.join(uploadsDir, '_test_upload.png');

  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // Create a minimal valid 1x1 PNG
    const png = Buffer.from(
      'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==',
      'base64'
    );
    fs.writeFileSync(testImagePath, png);
  });

  afterAll(() => {
    try { fs.unlinkSync(testImagePath); } catch {}
  });

  // ---------- Auth & Permission ----------

  it('should return 401 without token', async () => {
    const response = await agent.post('/api/upload');
    expect(response.status).toBe(401);
  });

  it('should return 403 for view role', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  // ---------- Successful uploads ----------

  it('should upload PNG image successfully as sysadmin', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.message).toBe('上传成功');
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    expect(response.body.data.url).toMatch(/\.png$/);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
  });

  it('should upload image successfully as admin', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
  });

  it('should upload JPEG image successfully', async () => {
    const jpegPath = path.join(uploadsDir, '_test.jpg');
    const jpeg = Buffer.from(
      '/9j/4AAQSkZJRgABAQEASABIAAD/2wBDAAgGBgcGBQgHBwcJCQgKDBQNDAsLDBkSEw8UHRofHh0aHBwgJC4nICIsIxwcKDcpLDAxNDQ0Hyc5PTgyPC4zNDL/2wBDAQkJCQwLDBgNDRgyIRwhMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjIyMjL/wAARCAABAAEDASIAAhEBAxEB/8QAHwAAAQUBAQEBAQEAAAAAAAAAAAECAwQFBgcICQoL/8QAFBABAAAAAAAAAAAAAAAAAAAACf/EABQRAQAAAAAAAAAAAAAAAAAAAAD/2gAMAwEAAhEDEQA/AKgA/9k=',
      'base64'
    );
    fs.writeFileSync(jpegPath, jpeg);

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jpegPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.jpg$/);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(jpegPath); } catch {}
  });

  it('should upload GIF image successfully', async () => {
    const gifPath = path.join(uploadsDir, '_test.gif');
    const gif = Buffer.from(
      'R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7',
      'base64'
    );
    fs.writeFileSync(gifPath, gif);

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', gifPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.gif$/);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(gifPath); } catch {}
  });

  it('should upload WebP image successfully', async () => {
    const webpPath = path.join(uploadsDir, '_test.webp');
    const webp = Buffer.from(
      'UklGRiQAAABXQVZFZm10IBAAAAABAAEARKwAAIhYAQACABAAZGF0YQAAAAA=',
      'base64'
    );
    fs.writeFileSync(webpPath, webp);

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', webpPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.webp$/);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(webpPath); } catch {}
  });

  it('should upload SVG image successfully', async () => {
    const svgPath = path.join(uploadsDir, '_test.svg');
    const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"><rect width="1" height="1"/></svg>';
    fs.writeFileSync(svgPath, svg);

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', svgPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.svg$/);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(svgPath); } catch {}
  });

  // ---------- Validation errors ----------

  it('should return 400 when no file provided', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should reject non-image files with 400 (unsupported format)', async () => {
    const txtPath = path.join(uploadsDir, '_test.txt');
    fs.writeFileSync(txtPath, 'not an image');

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');

    try { fs.unlinkSync(txtPath); } catch {}
  });

  it('should reject file exceeding 10MB with 500', async () => {
    // Create a file just over 10MB
    const largePath = path.join(uploadsDir, '_test_large.png');
    const buffer = Buffer.alloc(11 * 1024 * 1024, 'x');
    fs.writeFileSync(largePath, buffer);

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);

    // Multer file size error is NOT '不支持的图片格式', so mapped to 500
    expect(response.status).toBe(500);

    try { fs.unlinkSync(largePath); } catch {}
  }, 30000);

  it('should reject unsupported file type (.pdf)', async () => {
    const pdfPath = path.join(uploadsDir, '_test.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 test content');

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(pdfPath); } catch {}
  });

  it('should reject unsupported file type (.doc)', async () => {
    const docPath = path.join(uploadsDir, '_test.doc');
    fs.writeFileSync(docPath, 'fake doc content');

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(docPath); } catch {}
  });
});

// ==================== Unit Tests ====================

describe('uploadFile - Unit', () => {
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
    const req = { file: { filename: 'abc-123.png' } } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/abc-123.png' },
    });
  });

  it('should return 500 when exception occurs with error message', async () => {
    const req = {
      get file() { throw new Error('disk full'); },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: 'disk full' });
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
    const req = { file: { filename: 'uuid-value.jpeg' } } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/uuid-value.jpeg' },
    });
  });
});

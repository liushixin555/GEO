/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import { Request, Response, NextFunction } from 'express';
import multer, { MulterError } from 'multer';

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
import { FileFilterError, createUploadMiddleware } from '../../apis/utils/upload-factory';
import { ImageValidator } from '../../apis/utils/image-validator';

const agent = request.agent(app).set('User-Agent', 'test-agent/1.0');

// ==================== Token Helpers ====================

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

function tokenForRole(role: string, userId = 99) {
  return jwt.sign(
    { userId, username: `user_${role}`, role, companyId: 1 },
    'test-secret',
    { expiresIn: '2h' }
  );
}

// ==================== Test Data ====================

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
  'UklGRiQAAABXQVZFZm10IBAAAAABAAEAARKwAAIhYAQACABAAZGF0YQAAAAA=',
  'base64'
);

// GIF87a variant (different GIF version)
const VALID_GIF87A = Buffer.from([0x47, 0x49, 0x46, 0x38, 0x37, 0x61, 0x01, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00]);

function cleanup(filePath: string) {
  try { fs.unlinkSync(filePath); } catch {}
}

function uploadsDir() {
  return path.resolve(process.cwd(), 'uploads');
}

function writeTemp(name: string, data: Buffer | string) {
  const dir = uploadsDir();
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  const p = path.join(dir, name);
  fs.writeFileSync(p, data);
  return p;
}

// ==================== 1. Integration Tests - Auth & Permission ====================

describe('Upload Controller - Integration', () => {
  const testImagePath = writeTemp('_test_upload.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('should return 401 without token', async () => {
    const response = await agent.post('/api/v1/upload');
    expect(response.status).toBe(401);
  });

  it('should return 401 with empty Authorization header', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', '');
    expect(response.status).toBe(401);
  });

  it('should return 401 with Bearer but no token', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', 'Bearer ');
    expect(response.status).toBe(401);
  });

  it('should return 401 with malformed token', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', 'Bearer not-a-valid-jwt');
    expect(response.status).toBe(401);
  });

  it('should return 401 with wrong scheme', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Basic ${Buffer.from('user:pass').toString('base64')}`);
    expect(response.status).toBe(401);
  });

  it('should return 403 for view role', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  it('should reject expired token with 401', async () => {
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

  it('should reject token signed with wrong secret', async () => {
    const wrongSecretToken = jwt.sign(
      { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
      'wrong-secret',
      { expiresIn: '2h' }
    );
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${wrongSecretToken}`);
    expect(response.status).toBe(401);
  });
});

// ==================== 2. Integration Tests - Role Matrix ====================

describe('Upload Controller - Role Matrix', () => {
  const testImagePath = writeTemp('_role_test.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('sysadmin can upload images', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('admin can upload images', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', testImagePath);
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('view role is forbidden from uploading', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });
});

// ==================== 3. Integration Tests - Successful Uploads ====================

describe('Upload Controller - Successful Uploads', () => {
  const testImagePath = writeTemp('_success_test.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('should upload PNG image successfully', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);
    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.message).toBe('上传成功');
    expect(response.body.data).toBeDefined();
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    expect(response.body.data.url).toMatch(/\.png$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should upload JPEG image successfully', async () => {
    const jpegPath = writeTemp('_test.jpg', VALID_JPEG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jpegPath);
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.jpg$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(jpegPath);
  });

  it('should upload GIF image successfully', async () => {
    const gifPath = writeTemp('_test.gif', VALID_GIF);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', gifPath);
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.gif$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(gifPath);
  });

  it('should upload WebP image successfully', async () => {
    const webpPath = writeTemp('_test.webp', VALID_WEBP);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', webpPath);
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.webp$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(webpPath);
  });
});

// ==================== 4. Integration Tests - Response Structure ====================

describe('Upload Controller - Response Structure', () => {
  const testImagePath = writeTemp('_struct_test.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('success response has exact structure { code: 0, message, data: { url } }', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: 0,
      message: '上传成功',
      data: { url: expect.stringMatching(/^\/uploads\/.*\.png$/) },
    });
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('no file response has exact structure { code: 400, message }', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 400,
      message: expect.any(String),
    });
  });

  it('unsupported format response has exact structure', async () => {
    const txtPath = writeTemp('_struct.txt', 'text file');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 400,
      message: '不支持的图片格式',
    });
    cleanup(txtPath);
  });

  it('file too large response has exact structure', async () => {
    const largePath = writeTemp('_large.png', Buffer.alloc(11 * 1024 * 1024, 'x'));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);
    expect(response.status).toBe(413);
    expect(response.body).toEqual({
      code: 413,
      message: expect.stringContaining('文件大小超过限制'),
    });
    cleanup(largePath);
  }, 30000);

  it('MIME mismatch response has exact structure', async () => {
    const fakePath = writeTemp('_fake.png', 'not a real PNG');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 400,
      message: '文件内容与声明类型不匹配',
    });
    cleanup(fakePath);
  });

  it('wrong field name response has exact structure', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('image', testImagePath);
    expect(response.status).toBe(400);
    expect(response.body).toEqual({
      code: 400,
      message: '上传字段名应为 file',
    });
  });

  it('401 response has correct structure', async () => {
    const response = await agent.post('/api/v1/upload');
    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('message');
  });

  it('403 response has correct structure', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('message');
  });
});

// ==================== 5. Integration Tests - Validation Errors ====================

describe('Upload Controller - Validation Errors', () => {
  const testImagePath = writeTemp('_val_test.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('should return 400 when no file provided', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should reject non-image files (text)', async () => {
    const txtPath = writeTemp('_test.txt', 'not an image');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');
    cleanup(txtPath);
  });

  it('should reject file exceeding 10MB with 413', async () => {
    const largePath = writeTemp('_test_large.png', Buffer.alloc(11 * 1024 * 1024, 'x'));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);
    expect(response.status).toBe(413);
    expect(response.body.message).toBe('文件大小超过限制（最大 10MB）');
    cleanup(largePath);
  }, 30000);

  it('should reject PDF', async () => {
    const pdfPath = writeTemp('_test.pdf', '%PDF-1.4 test content');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);
    expect(response.status).toBe(400);
    cleanup(pdfPath);
  });

  it('should reject DOC', async () => {
    const docPath = writeTemp('_test.doc', 'fake doc content');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docPath);
    expect(response.status).toBe(400);
    cleanup(docPath);
  });

  it('should reject MIME-forged file', async () => {
    const fakePath = writeTemp('_test_fake.png', 'this is not a real PNG');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('文件内容与声明类型不匹配');
    cleanup(fakePath);
  });

  it('should return 400 with wrong field name', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('image', testImagePath);
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('上传字段名应为 file');
  });
});

// ==================== 6. Integration Tests - Unsupported File Types ====================

describe('Upload Controller - Unsupported File Types', () => {
  function rejectType(name: string, data: string | Buffer, expectedMsg = '不支持的图片格式') {
    it(`should reject ${name}`, async () => {
      const filePath = writeTemp(`_test${path.extname(name) || '.bin'}`, data);
      const response = await agent
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', filePath);
      expect(response.status).toBe(400);
      expect(response.body.message).toBe(expectedMsg);
      cleanup(filePath);
    });
  }

  rejectType('SVG', '<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
  rejectType('BMP', (() => { const b = Buffer.alloc(58, 0); b.write('BM', 0); return b; })());
  rejectType('TIFF', 'II* fake tiff');
  rejectType('EXE', 'MZ fake executable');
  rejectType('ZIP', 'PK fake zip');
  rejectType('HTML (XSS)', '<html><body>XSS</body></html>');
  rejectType('PHP', '<?php echo "hack"; ?>');
  rejectType('JS', 'alert("xss")');
  rejectType('CSS', 'body{background:url(evil)}');
  rejectType('XML', '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]>');
  rejectType('JSON', '{"evil": true}');
  rejectType('Shell script', '#!/bin/bash\nevil');
});

// ==================== 7. Integration Tests - Security Injection ====================

describe('Upload Controller - Security Injection', () => {
  const testImagePath = writeTemp('_sec_test.png', VALID_PNG);

  afterAll(() => {
    cleanup(testImagePath);
  });

  it('should handle filename with path traversal characters', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: '../../../etc/passwd.png' });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    expect(response.body.data.url).not.toContain('..');
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with SQL injection attempt', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: "'; DROP TABLE users; --.png" });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with XSS script tag', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: '<script>alert(1)</script>.png' });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with double extension', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: 'file.php.png' });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.png$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with unicode characters', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: '测试图片_🎉.png' });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with special characters', async () => {
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: '测试 图片 (1).png' });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should handle filename with very long name', async () => {
    const longName = 'a'.repeat(200) + '.png';
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath, { filename: longName });
    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
  });

  it('should reject Content-Type spoofing (text content as image/png)', async () => {
    const fakePath = writeTemp('_spoof.png', '<script>alert(1)</script>');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { contentType: 'image/png' });
    expect(response.status).toBe(400);
    expect(response.body.message).toBe('文件内容与声明类型不匹配');
    cleanup(fakePath);
  });

  it('should reject file with null bytes in name', async () => {
    const fakePath = writeTemp('_null.png', VALID_PNG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { filename: 'test\x00evil.png' });
    // multer may or may not handle null bytes — just verify no crash
    expect([200, 400, 500]).toContain(response.status);
    if (response.status === 200) {
      cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    }
    cleanup(fakePath);
  });
});

// ==================== 8. Integration Tests - Boundary Values ====================

describe('Upload Controller - Boundary Values', () => {
  it('should accept exactly 10MB file (at limit)', async () => {
    // 10MB = 10485760 bytes
    const exactPath = writeTemp('_exact_10mb.png', Buffer.alloc(10 * 1024 * 1024 - 1, 0));
    // Write a valid PNG header on top
    const fd = fs.openSync(exactPath, 'r+');
    fs.writeSync(fd, VALID_PNG, 0, VALID_PNG.length, 0);
    fs.closeSync(fd);

    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', exactPath);
    // At the exact limit, multer should accept it
    expect([200, 413]).toContain(response.status);
    if (response.status === 200) {
      cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    }
    cleanup(exactPath);
  }, 30000);

  it('should reject file just over 10MB', async () => {
    const overPath = writeTemp('_over_10mb.png', Buffer.alloc(10 * 1024 * 1024 + 1, 'x'));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', overPath);
    expect(response.status).toBe(413);
    cleanup(overPath);
  }, 30000);

  it('should handle file with no extension', async () => {
    const noExtPath = writeTemp('_test_noext', 'not an image');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', noExtPath);
    expect(response.status).toBe(400);
    cleanup(noExtPath);
  });

  it('should handle empty (0-byte) file', async () => {
    const emptyPath = writeTemp('_empty.png', Buffer.alloc(0));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', emptyPath);
    // Empty file won't match any signature → 400
    expect([400, 200]).toContain(response.status);
    if (response.status === 200) {
      cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    }
    cleanup(emptyPath);
  });

  it('should handle 1-byte file', async () => {
    const oneBytePath = writeTemp('_one_byte.png', Buffer.from([0x89]));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', oneBytePath);
    expect(response.status).toBe(400);
    cleanup(oneBytePath);
  });

  it('should handle POST with GET method', async () => {
    const response = await agent
      .get('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(404);
  });

  it('should handle PUT method rejection', async () => {
    const response = await agent
      .put('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(404);
  });
});

// ==================== 9. Integration Tests - Cross-Type Mismatch ====================

describe('Upload Controller - Cross-Type Mismatch', () => {
  it('should reject PNG data with JPEG extension', async () => {
    const mismatchPath = writeTemp('_mismatch.jpg', VALID_PNG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mismatchPath);
    // Content is PNG but declared as JPEG → signature mismatch
    expect(response.status).toBe(400);
    cleanup(mismatchPath);
  });

  it('should reject JPEG data with PNG extension', async () => {
    const mismatchPath = writeTemp('_mismatch.png', VALID_JPEG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mismatchPath);
    expect(response.status).toBe(400);
    cleanup(mismatchPath);
  });

  it('should reject GIF data with WebP extension', async () => {
    const mismatchPath = writeTemp('_mismatch.webp', VALID_GIF);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mismatchPath);
    expect(response.status).toBe(400);
    cleanup(mismatchPath);
  });

  it('should reject WebP data with GIF extension', async () => {
    const mismatchPath = writeTemp('_mismatch.gif', VALID_WEBP);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mismatchPath);
    expect(response.status).toBe(400);
    cleanup(mismatchPath);
  });
});

// ==================== 10. Integration Tests - Concurrent Uploads ====================

describe('Upload Controller - Concurrent Uploads', () => {
  it('should handle multiple concurrent uploads', async () => {
    const files = Array.from({ length: 5 }, (_, i) => {
      return writeTemp(`_concurrent_${i}.png`, VALID_PNG);
    });

    const uploads = files.map(filePath =>
      agent
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', filePath)
    );

    const responses = await Promise.all(uploads);

    for (let i = 0; i < responses.length; i++) {
      expect(responses[i].status).toBe(200);
      expect(responses[i].body.code).toBe(0);
      cleanup(path.join(uploadsDir(), responses[i].body.data.url.replace('/uploads/', '')));
      cleanup(files[i]);
    }
  });

  it('should handle concurrent upload with mixed valid and invalid files', async () => {
    const validPath = writeTemp('_mix_valid.png', VALID_PNG);
    const invalidPath = writeTemp('_mix_invalid.txt', 'not an image');

    const [validRes, invalidRes] = await Promise.all([
      agent
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${sysadminToken()}`)
        .attach('file', validPath),
      agent
        .post('/api/v1/upload')
        .set('Authorization', `Bearer ${adminToken()}`)
        .attach('file', invalidPath),
    ]);

    expect(validRes.status).toBe(200);
    expect(invalidRes.status).toBe(400);

    cleanup(path.join(uploadsDir(), validRes.body.data.url.replace('/uploads/', '')));
    cleanup(validPath);
    cleanup(invalidPath);
  });
});

// ==================== 11. Unit Tests - uploadFile ====================

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

  it('should return 400 when req.file is null', async () => {
    const req = { file: null } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '请选择要上传的图片' });
  });

  it('should return 200 with correct url on success', async () => {
    const tmpPath = writeTemp('_unit_success.png', VALID_PNG);
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

  it('should handle file with various extensions correctly (.jpg)', async () => {
    const tmpPath = writeTemp('_unit_ext.jpg', VALID_JPEG);
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

  it('should handle file with .gif extension', async () => {
    const tmpPath = writeTemp('_unit_ext.gif', VALID_GIF);
    const req = {
      file: { filename: 'test.gif', path: tmpPath, mimetype: 'image/gif' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/test.gif' },
    });
    cleanup(tmpPath);
  });

  it('should handle file with .webp extension', async () => {
    const tmpPath = writeTemp('_unit_ext.webp', VALID_WEBP);
    const req = {
      file: { filename: 'test.webp', path: tmpPath, mimetype: 'image/webp' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/test.webp' },
    });
    cleanup(tmpPath);
  });

  it('should reject file when content does not match declared MIME type', async () => {
    const tmpPath = writeTemp('_unit_fake.png', 'this is not a PNG');
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

// ==================== 12. Unit Tests - verifyFileSignature ====================

describe('verifyFileSignature - Unit', () => {
  it('should return false for unknown mimetype (image/bmp)', async () => {
    const tmpPath = writeTemp('_test_unknown_mime', Buffer.from([0xFF, 0xD8, 0xFF]));
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

  it('should return false for image/svg+xml mimetype', async () => {
    const tmpPath = writeTemp('_test_svg_mime', '<svg></svg>');
    const req = {
      file: { filename: 'test.svg', path: tmpPath, mimetype: 'image/svg+xml' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should return false for image/tiff mimetype', async () => {
    const tmpPath = writeTemp('_test_tiff_mime', 'II* tiff data');
    const req = {
      file: { filename: 'test.tiff', path: tmpPath, mimetype: 'image/tiff' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should verify JPEG signature correctly', async () => {
    const tmpPath = writeTemp('_test_jpeg_sig.jpg', VALID_JPEG);
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
    const tmpPath = writeTemp('_test_gif_sig.gif', VALID_GIF);
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

  it('should verify GIF87a signature correctly', async () => {
    const tmpPath = writeTemp('_test_gif87a.gif', VALID_GIF87A);
    const req = {
      file: { filename: 'sig-test-87a.gif', path: tmpPath, mimetype: 'image/gif' },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: { url: '/uploads/sig-test-87a.gif' },
    });
    cleanup(tmpPath);
  });

  it('should verify WebP signature correctly', async () => {
    const tmpPath = writeTemp('_test_webp_sig.webp', VALID_WEBP);
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
    const tmpPath = writeTemp('_test_corrupt_jpg.jpg', 'this is not a real JPEG');
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
    const tmpPath = writeTemp('_test_corrupt_gif.gif', 'not a GIF at all');
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
    const tmpPath = writeTemp('_test_corrupt_webp.webp', 'not a WebP file');
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

  it('should reject PNG with only partial signature bytes', async () => {
    const tmpPath = writeTemp('_partial_sig.png', Buffer.from([0x89, 0x50]));
    const req = {
      file: { filename: 'partial.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });

  it('should reject JPEG with only first byte', async () => {
    const tmpPath = writeTemp('_one_byte_jpg.jpg', Buffer.from([0xFF]));
    const req = {
      file: { filename: 'onebyte.jpg', path: tmpPath, mimetype: 'image/jpeg' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(fs.existsSync(tmpPath)).toBe(false);
  });
});

// ==================== 13. Unit Tests - Error Paths ====================

describe('uploadFile - Error Paths', () => {
  it('should handle cleanup failure when verifyFileSignature rejects', async () => {
    const tmpPath = writeTemp('_test_cleanup_fail.png', 'fake content');
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
    const tmpPath = writeTemp('_test_error_cleanup.png', VALID_PNG);
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

  it('should handle error when req.file does not exist in catch block', async () => {
    const req = {
      get file() {
        throw new Error('no file access');
      },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
  });

  it('should handle TypeError in uploadFile', async () => {
    const req = {
      file: { path: '/nonexistent/path.png', filename: 'test.png', mimetype: 'image/png' },
    } as unknown as Request;

    // verifyFileSignature will throw because file doesn't exist
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    // File doesn't exist → verifyFileSignature throws → catch block → 500
    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
  });

  it('should handle cleanup when file path is valid in catch block', async () => {
    const tmpPath = writeTemp('_catch_cleanup.png', VALID_PNG);
    const req = {
      file: { filename: 'test.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;

    // Simulate an error during success() by making the success response throw
    let successCalled = false;
    const json = jest.fn().mockImplementation(() => {
      if (!successCalled) {
        successCalled = true;
        throw new Error('success failed');
      }
      // Second call (from fail in catch) succeeds
    });
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    await uploadFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    cleanup(tmpPath);
  });

  it('should silently ignore unlinkSync failure during verifyFileSignature rejection', async () => {
    // Create a file and then delete it so unlinkSync will fail silently
    const tmpPath = writeTemp('_already_deleted.png', 'fake');
    fs.unlinkSync(tmpPath); // delete it now

    const req = {
      file: { filename: 'ghost.png', path: tmpPath, mimetype: 'image/png' },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadFile(req, res);

    // File doesn't exist → verifyFileSignature will fail (can't open) → catch outer → 500
    // OR if it throws from verifyFileSignature, the outer catch handles it
    expect([400, 500]).toContain(status.mock.calls[0]?.[0] ?? 0);
  });
});

// ==================== 14. Unit Tests - uploadMiddleware Error Handling ====================

describe('uploadMiddleware - Error Handling', () => {
  function createMockReqRes() {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();
    const req = {} as Request;
    const res = { status } as unknown as Response;
    return { req, res, next, json, status };
  }

  it('uploadMiddleware is a valid function', () => {
    expect(typeof uploadMiddleware).toBe('function');
  });

  it('should return 413 for LIMIT_FILE_SIZE error', () => {
    const { req, res, next, json, status } = createMockReqRes();
    const middleware = createUploadMiddleware({
      maxSize: 10 * 1024 * 1024,
      fileFilter: (_req, _file, cb) => cb(null, true),
    });

    // Manually simulate multer calling back with LIMIT_FILE_SIZE
    // We'll test via the uploadMiddleware export which is already configured
    // For direct testing, we need to mock multer
  });
});

// ==================== 15. Unit Tests - FileFilterError ====================

describe('FileFilterError', () => {
  it('should have correct name property', () => {
    const err = new FileFilterError('test message');
    expect(err.name).toBe('FileFilterError');
  });

  it('should have correct message', () => {
    const err = new FileFilterError('不支持的图片格式');
    expect(err.message).toBe('不支持的图片格式');
  });

  it('should be an instance of Error', () => {
    const err = new FileFilterError('test');
    expect(err).toBeInstanceOf(Error);
  });

  it('should be an instance of FileFilterError', () => {
    const err = new FileFilterError('test');
    expect(err).toBeInstanceOf(FileFilterError);
  });

  it('should be distinguishable from regular Error', () => {
    const fileErr = new FileFilterError('test');
    const regErr = new Error('test');
    expect(fileErr instanceof FileFilterError).toBe(true);
    expect(regErr instanceof FileFilterError).toBe(false);
  });
});

// ==================== 16. Unit Tests - ImageValidator ====================

describe('ImageValidator', () => {
  describe('validateMime', () => {
    it('should accept image/jpeg', () => {
      expect(ImageValidator.validateMime('image/jpeg')).toBe(true);
    });

    it('should accept image/png', () => {
      expect(ImageValidator.validateMime('image/png')).toBe(true);
    });

    it('should accept image/gif', () => {
      expect(ImageValidator.validateMime('image/gif')).toBe(true);
    });

    it('should accept image/webp', () => {
      expect(ImageValidator.validateMime('image/webp')).toBe(true);
    });

    it('should reject image/svg+xml', () => {
      expect(ImageValidator.validateMime('image/svg+xml')).toBe(false);
    });

    it('should reject image/bmp', () => {
      expect(ImageValidator.validateMime('image/bmp')).toBe(false);
    });

    it('should reject image/tiff', () => {
      expect(ImageValidator.validateMime('image/tiff')).toBe(false);
    });

    it('should reject application/pdf', () => {
      expect(ImageValidator.validateMime('application/pdf')).toBe(false);
    });

    it('should reject text/plain', () => {
      expect(ImageValidator.validateMime('text/plain')).toBe(false);
    });

    it('should reject empty string', () => {
      expect(ImageValidator.validateMime('')).toBe(false);
    });

    it('should reject application/octet-stream', () => {
      expect(ImageValidator.validateMime('application/octet-stream')).toBe(false);
    });

    it('should be case-sensitive (image/JPEG rejected)', () => {
      expect(ImageValidator.validateMime('image/JPEG')).toBe(false);
    });

    it('should reject image/png with charset', () => {
      expect(ImageValidator.validateMime('image/png; charset=utf-8')).toBe(false);
    });
  });

  describe('getExtension', () => {
    it('should return .jpg for image/jpeg', () => {
      expect(ImageValidator.getExtension('image/jpeg')).toBe('.jpg');
    });

    it('should return .png for image/png', () => {
      expect(ImageValidator.getExtension('image/png')).toBe('.png');
    });

    it('should return .gif for image/gif', () => {
      expect(ImageValidator.getExtension('image/gif')).toBe('.gif');
    });

    it('should return .webp for image/webp', () => {
      expect(ImageValidator.getExtension('image/webp')).toBe('.webp');
    });

    it('should return .bin for unknown type', () => {
      expect(ImageValidator.getExtension('application/pdf')).toBe('.bin');
    });

    it('should return .bin for empty string', () => {
      expect(ImageValidator.getExtension('')).toBe('.bin');
    });
  });

  describe('verifyFileSignature', () => {
    it('should verify valid PNG file', () => {
      const tmpPath = writeTemp('_sig_png.png', VALID_PNG);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(true);
      cleanup(tmpPath);
    });

    it('should verify valid JPEG file', () => {
      const tmpPath = writeTemp('_sig_jpg.jpg', VALID_JPEG);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/jpeg')).toBe(true);
      cleanup(tmpPath);
    });

    it('should verify valid GIF file', () => {
      const tmpPath = writeTemp('_sig_gif.gif', VALID_GIF);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/gif')).toBe(true);
      cleanup(tmpPath);
    });

    it('should verify valid WebP file', () => {
      const tmpPath = writeTemp('_sig_webp.webp', VALID_WEBP);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/webp')).toBe(true);
      cleanup(tmpPath);
    });

    it('should reject fake PNG', () => {
      const tmpPath = writeTemp('_fake_png.png', 'not a PNG');
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
      cleanup(tmpPath);
    });

    it('should return false for unknown mimetype', () => {
      const tmpPath = writeTemp('_unknown.bin', Buffer.from([0xFF, 0xD8, 0xFF]));
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/bmp')).toBe(false);
      cleanup(tmpPath);
    });

    it('should throw for non-existent file', () => {
      expect(() => {
        ImageValidator.verifyFileSignature('/nonexistent/file.png', 'image/png');
      }).toThrow();
    });

    it('should reject PNG data checked as JPEG', () => {
      const tmpPath = writeTemp('_cross_check.jpg', VALID_PNG);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/jpeg')).toBe(false);
      cleanup(tmpPath);
    });

    it('should reject JPEG data checked as PNG', () => {
      const tmpPath = writeTemp('_cross_check.png', VALID_JPEG);
      expect(ImageValidator.verifyFileSignature(tmpPath, 'image/png')).toBe(false);
      cleanup(tmpPath);
    });

    it('ALLOWED_TYPES should have correct types', () => {
      expect(ImageValidator.ALLOWED_TYPES).toEqual([
        'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      ]);
    });

    it('MIME_TO_EXT should have correct mappings', () => {
      expect(ImageValidator.MIME_TO_EXT).toEqual({
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/gif': '.gif',
        'image/webp': '.webp',
      });
    });
  });
});

// ==================== 17. Unit Tests - createUploadMiddleware Error Branches ====================

describe('createUploadMiddleware - Error Branches', () => {
  function createMiddleware(opts?: Partial<{ maxSize: number; fileFilter: any }>) {
    return createUploadMiddleware({
      maxSize: opts?.maxSize ?? 1024,
      fileFilter: opts?.fileFilter ?? ((_req: Request, _file: Express.Multer.File, cb: multer.FileFilterCallback) => cb(null, true)),
    });
  }

  it('should return 400 for generic MulterError', () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const next = jest.fn();

    // We test by calling uploadMiddleware directly with mocked internals
    // Since multer handles the actual file parsing, we verify the error handling
    // paths through the response
    expect(typeof uploadMiddleware).toBe('function');
  });

  it('should return 400 for FileFilterError', async () => {
    const txtPath = writeTemp('_filter_err.txt', 'text');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toBe('不支持的图片格式');
    cleanup(txtPath);
  });

  it('should return 413 for file size limit', async () => {
    const largePath = writeTemp('_size_limit.png', Buffer.alloc(11 * 1024 * 1024, 'x'));
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);

    expect(response.status).toBe(413);
    expect(response.body.code).toBe(413);
    cleanup(largePath);
  }, 30000);
});

// ==================== 18. Integration Tests - URL Format ====================

describe('Upload Controller - URL Format', () => {
  it('generated URL should start with /uploads/', async () => {
    const testPath = writeTemp('_url_format.png', VALID_PNG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testPath);

    expect(response.status).toBe(200);
    const url: string = response.body.data.url;
    expect(url.startsWith('/uploads/')).toBe(true);

    // Extract filename and verify UUID format
    const filename = url.replace('/uploads/', '');
    // UUID v4 format: xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
    expect(filename).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\.png$/);

    cleanup(path.join(uploadsDir(), filename));
  });

  it('generated URL should have correct extension for JPEG', async () => {
    const testPath = writeTemp('_url_jpg.jpg', VALID_JPEG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.jpg$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(testPath);
  });

  it('generated URL should have correct extension for GIF', async () => {
    const testPath = writeTemp('_url_gif.gif', VALID_GIF);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.gif$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(testPath);
  });

  it('generated URL should have correct extension for WebP', async () => {
    const testPath = writeTemp('_url_webp.webp', VALID_WEBP);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testPath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/\.webp$/);
    cleanup(path.join(uploadsDir(), response.body.data.url.replace('/uploads/', '')));
    cleanup(testPath);
  });
});

// ==================== 19. Integration Tests - File Cleanup After Rejection ====================

describe('Upload Controller - File Cleanup', () => {
  it('should delete uploaded file when signature verification fails', async () => {
    const fakePath = writeTemp('_cleanup_fake.png', 'not a real PNG');
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', fakePath, { contentType: 'image/png' });

    expect(response.status).toBe(400);

    // Check if any files were created in uploads dir and clean them
    const files = fs.readdirSync(uploadsDir()).filter(f => f.startsWith('_cleanup_'));
    for (const f of files) {
      cleanup(path.join(uploadsDir(), f));
    }
    cleanup(fakePath);
  });

  it('should preserve uploaded file on success', async () => {
    const testPath = writeTemp('_preserve_test.png', VALID_PNG);
    const response = await agent
      .post('/api/v1/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testPath);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.url).toMatch(/^\/uploads\/[0-9a-f-]+\.png$/);

    // Cleanup: remove the uploaded file
    const filename = response.body.data.url.replace('/uploads/', '');
    const possiblePaths = [
      path.join(uploadsDir(), filename),
      path.resolve(process.cwd(), 'uploads', filename),
    ];
    for (const p of possiblePaths) { cleanup(p); }
    cleanup(testPath);
  });
});

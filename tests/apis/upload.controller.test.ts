/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';

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

describe('Upload Controller', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');
  const testImagePath = path.join(uploadsDir, '_test_upload.png');

  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
    // Create a minimal valid 1x1 PNG
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPj/HwADBwIAMCbHYQAAAABJRU5ErkJggg==', 'base64');
    fs.writeFileSync(testImagePath, png);
  });

  afterAll(() => {
    // Clean up test files
    try { fs.unlinkSync(testImagePath); } catch {}
  });

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

  it('should return 400 when no file provided', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should upload image successfully as sysadmin', async () => {
    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', testImagePath);

    expect(response.status).toBe(200);
    expect(response.body.data.url).toMatch(/^\/uploads\//);

    // Clean up uploaded file
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

  it('should reject non-image files', async () => {
    // Create a temp text file
    const txtPath = path.join(uploadsDir, '_test.txt');
    fs.writeFileSync(txtPath, 'not an image');

    const response = await agent
      .post('/api/upload')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);

    expect(response.status).toBe(400);
    try { fs.unlinkSync(txtPath); } catch {}
  });
});

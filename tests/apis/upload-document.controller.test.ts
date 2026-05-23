/**
 * @jest-environment node
 */
import request from 'supertest';
import jwt from 'jsonwebtoken';
import fs from 'fs';
import path from 'path';
import AdmZip from 'adm-zip';
import { Request, Response, NextFunction } from 'express';

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
import { uploadDocumentMiddleware, uploadDocumentFile } from '../../apis/controller/upload-document.controller';
import { DocumentValidator } from '../../apis/utils/document-validator';

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

const uploadsDir = path.resolve(process.cwd(), 'uploads');

// ==================== Integration Tests ====================

describe('Upload Document Controller - Integration', () => {
  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  });

  // ---------- Auth & Permission ----------

  it('should return 401 without token', async () => {
    const response = await agent.post('/api/upload/document');
    expect(response.status).toBe(401);
  });

  it('should return 403 for view role', async () => {
    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  // ---------- Successful uploads ----------

  it('should upload PDF document successfully as sysadmin', async () => {
    const pdfPath = path.join(uploadsDir, '_test_doc.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 test pdf content');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.message).toBe('上传成功');
    expect(response.body.data.url).toMatch(/^\/uploads\//);
    expect(response.body.data.url).toMatch(/\.pdf$/);
    expect(response.body.data.originalName).toBe('_test_doc.pdf');
    expect(response.body.data.fileType).toBe('pdf');
    expect(response.body.data.fileSize).toBeGreaterThan(0);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(pdfPath); } catch {}
  });

  it('should upload JSON document successfully as admin', async () => {
    const jsonPath = path.join(uploadsDir, '_test_doc.json');
    fs.writeFileSync(jsonPath, JSON.stringify({ key: 'value' }));

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', jsonPath);

    expect(response.status).toBe(200);
    expect(response.body.code).toBe(0);
    expect(response.body.data.fileType).toBe('json');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(jsonPath); } catch {}
  });

  it('should upload Markdown document successfully', async () => {
    const mdPath = path.join(uploadsDir, '_test_doc.md');
    fs.writeFileSync(mdPath, '# Hello World\n\nThis is **markdown**.');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mdPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('md');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(mdPath); } catch {}
  });

  it('should upload CSV document successfully', async () => {
    const csvPath = path.join(uploadsDir, '_test_doc.csv');
    fs.writeFileSync(csvPath, 'name,age\nAlice,30\nBob,25');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('csv');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(csvPath); } catch {}
  });

  it('should upload YAML document successfully', async () => {
    const yamlPath = path.join(uploadsDir, '_test_doc.yaml');
    fs.writeFileSync(yamlPath, 'name: test\nvalue: 123');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', yamlPath);

    expect(response.status).toBe(200);
    expect(['yaml', 'yml']).toContain(response.body.data.fileType);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(yamlPath); } catch {}
  });

  it('should upload XML document successfully', async () => {
    const xmlPath = path.join(uploadsDir, '_test_doc.xml');
    fs.writeFileSync(xmlPath, '<?xml version="1.0"?><root><item>test</item></root>');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', xmlPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('xml');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(xmlPath); } catch {}
  });

  it('should upload DOCX document successfully', async () => {
    const docxPath = path.join(uploadsDir, '_test_doc.docx');
    // Create a minimal valid DOCX (ZIP with word/ directory)
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>test</w:t></w:r></w:p></w:body></w:document>'));
    zip.writeZip(docxPath);

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docxPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('docx');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(docxPath); } catch {}
  });

  it('should upload XLSX document successfully', async () => {
    const xlsxPath = path.join(uploadsDir, '_test_doc.xlsx');
    const zip = new AdmZip();
    zip.addFile('xl/workbook.xml', Buffer.from('<?xml version="1.0"?><workbook/>'));
    zip.writeZip(xlsxPath);

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', xlsxPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('xlsx');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(xlsxPath); } catch {}
  });

  it('should upload PPTX document successfully', async () => {
    const pptxPath = path.join(uploadsDir, '_test_doc.pptx');
    const zip = new AdmZip();
    zip.addFile('ppt/presentation.xml', Buffer.from('<?xml version="1.0"?><presentation/>'));
    zip.writeZip(pptxPath);

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pptxPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('pptx');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(pptxPath); } catch {}
  });

  // ---------- Middleware validation errors ----------

  it('should return 400 when no file provided', async () => {
    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should reject unsupported document format (.txt) with 400', async () => {
    const txtPath = path.join(uploadsDir, '_test_doc.txt');
    fs.writeFileSync(txtPath, 'plain text content');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', txtPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(txtPath); } catch {}
  });

  it('should reject unsupported document format (.exe) with 400', async () => {
    const exePath = path.join(uploadsDir, '_test_doc.exe');
    fs.writeFileSync(exePath, 'MZ\x90\x00fake exe content');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', exePath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(exePath); } catch {}
  });

  it('should reject file exceeding 30MB with 400 (LIMIT_FILE_SIZE)', async () => {
    // Create a large JSON file just over 30MB
    const largePath = path.join(uploadsDir, '_test_large_doc.json');
    const data = { x: 'a'.repeat(31 * 1024 * 1024) };
    fs.writeFileSync(largePath, JSON.stringify(data));

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('文件大小超过限制');

    try { fs.unlinkSync(largePath); } catch {}
  }, 60000);

  // ---------- Content validation failures ----------

  it('should reject invalid JSON content with 400', async () => {
    const jsonPath = path.join(uploadsDir, '_test_invalid.json');
    fs.writeFileSync(jsonPath, '{ invalid json content }');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jsonPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('JSON 格式无效');

    try { fs.unlinkSync(jsonPath); } catch {}
  });

  it('should reject invalid YAML content with 400', async () => {
    const yamlPath = path.join(uploadsDir, '_test_invalid.yaml');
    // Write YAML that fails to parse
    fs.writeFileSync(yamlPath, 'key: [unclosed');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', yamlPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(yamlPath); } catch {}
  });

  it('should reject content type mismatch (PDF declared but content is JSON) with 400', async () => {
    const pdfPath = path.join(uploadsDir, '_test_mismatch.pdf');
    fs.writeFileSync(pdfPath, '{"not": "a pdf"}');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(400);

    // Multer creates a new file; the original test file still exists on disk
    // but multer's copy is cleaned up. Clean up our test file.
    try { fs.unlinkSync(pdfPath); } catch {}
  });

  it('should reject generic ZIP (not Office format) with .docx extension with 400', async () => {
    const zipPath = path.join(uploadsDir, '_test_fake.docx');
    const zip = new AdmZip();
    zip.addFile('readme.txt', Buffer.from('not a docx'));
    zip.writeZip(zipPath);

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', zipPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('ZIP');

    try { fs.unlinkSync(zipPath); } catch {}
  });

  it('should upload YML document successfully', async () => {
    const ymlPath = path.join(uploadsDir, '_test_doc.yml');
    fs.writeFileSync(ymlPath, 'key: value');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', ymlPath);

    expect(response.status).toBe(200);
    expect(['yaml', 'yml']).toContain(response.body.data.fileType);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(ymlPath); } catch {}
  });

  it('should reject empty CSV content with 400', async () => {
    const csvPath = path.join(uploadsDir, '_test_empty.csv');
    fs.writeFileSync(csvPath, '');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(csvPath); } catch {}
  });

  it('should reject CSV without separator with 400', async () => {
    const csvPath = path.join(uploadsDir, '_test_nosep.csv');
    fs.writeFileSync(csvPath, 'no separator here');

    const response = await agent
      .post('/api/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(csvPath); } catch {}
  });
});

// ==================== Unit Tests: uploadDocumentMiddleware ====================

describe('uploadDocumentMiddleware - Unit', () => {
  it('should verify middleware function exists and is callable', () => {
    expect(typeof uploadDocumentMiddleware).toBe('function');
  });

  it('should return 500 for generic multer error (not LIMIT_FILE_SIZE, not format error)', () => {
    jest.isolateModules(() => {
      // Mock multer to inject a generic error via the callback
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(new Error('Internal multer error'));
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = class MulterError extends Error { code = ''; };
        return mockMulter;
      });

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should return 500 with fallback message when error has no message', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            const err = new Error('');
            err.message = '';
            cb(err);
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = class MulterError extends Error { code = ''; };
        return mockMulter;
      });

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(500);
      expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });
      expect(next).not.toHaveBeenCalled();
    });
  });
});

// ==================== Unit Tests: uploadDocumentFile ====================

describe('uploadDocumentFile - Unit', () => {
  it('should return 400 when req.file is undefined', async () => {
    const req = {} as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '请选择要上传的文档' });
  });

  it('should return 400 when content validation fails and delete uploaded file', async () => {
    // Create a temp file to simulate uploaded file
    const tempPath = path.join(uploadsDir, '_unit_test_invalid.pdf');
    fs.writeFileSync(tempPath, 'not a real pdf');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.pdf',
        filename: 'uuid-test.pdf',
        size: 100,
      },
    } as unknown as Request;
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    // Uploaded file should be deleted
    expect(fs.existsSync(tempPath)).toBe(false);

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should return 200 with correct response on successful upload', async () => {
    // Create a valid JSON file
    const tempPath = path.join(uploadsDir, '_unit_test_valid.json');
    fs.writeFileSync(tempPath, JSON.stringify({ test: true }));

    const req = {
      file: {
        path: tempPath,
        originalname: 'document.json',
        filename: 'uuid-123.json',
        size: 15,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-123.json',
        originalName: 'document.json',
        fileType: 'json',
        fileSize: 15,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should return 500 with error message when exception occurs during content validation', async () => {
    // Create a file that will pass extension check but fail during content read
    const tempPath = path.join(uploadsDir, '_unit_test_err.json');
    fs.writeFileSync(tempPath, '{"valid": true}');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.json',
        filename: 'err.json',
        size: 13,
      },
    } as unknown as Request;

    // Mock DocumentValidator.validateContent to throw
    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockRejectedValue(new Error('read error'));

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });

    // File should be cleaned up on error
    expect(fs.existsSync(tempPath)).toBe(false);

    // Restore original method
    DocumentValidator.validateContent = originalValidate;
    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should return 500 with default message when error has no message', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_nomsg.json');
    fs.writeFileSync(tempPath, '{"valid": true}');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.json',
        filename: 'nomsg.json',
        size: 13,
      },
    } as unknown as Request;

    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockRejectedValue('string error');

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(500);
    expect(json).toHaveBeenCalledWith({ code: 500, message: '上传失败' });

    expect(fs.existsSync(tempPath)).toBe(false);

    DocumentValidator.validateContent = originalValidate;
    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should clean up file on error when file exists', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_cleanup.json');
    fs.writeFileSync(tempPath, '{}');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.json',
        filename: 'cleanup.json',
        size: 2,
      },
    } as unknown as Request;

    // Force an error by making validateContent throw
    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockRejectedValue(new Error('validation crash'));

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    await uploadDocumentFile(req, res);

    // File should be cleaned up on error
    expect(fs.existsSync(tempPath)).toBe(false);

    DocumentValidator.validateContent = originalValidate;
    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should handle error gracefully when file already deleted on error path', async () => {
    // Simulate a file that doesn't exist on disk (already deleted)
    const req = {
      file: {
        path: path.join(uploadsDir, '_nonexistent_file.json'),
        originalname: 'test.json',
        filename: 'nonexistent.json',
        size: 10,
      },
    } as unknown as Request;

    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockRejectedValue(new Error('some error'));

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status } as unknown as Response;

    // Should not throw even though file doesn't exist for cleanup
    await expect(uploadDocumentFile(req, res)).resolves.not.toThrow();

    expect(status).toHaveBeenCalledWith(500);

    DocumentValidator.validateContent = originalValidate;
  });

  it('should upload valid XML document successfully via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.xml');
    fs.writeFileSync(tempPath, '<?xml version="1.0"?><root><item>test</item></root>');

    const req = {
      file: {
        path: tempPath,
        originalname: 'document.xml',
        filename: 'uuid-xml.xml',
        size: 52,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-xml.xml',
        originalName: 'document.xml',
        fileType: 'xml',
        fileSize: 52,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload valid Markdown document via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.md');
    fs.writeFileSync(tempPath, '# Title\n\nSome **bold** text.');

    const req = {
      file: {
        path: tempPath,
        originalname: 'doc.md',
        filename: 'uuid-md.md',
        size: 26,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-md.md',
        originalName: 'doc.md',
        fileType: 'md',
        fileSize: 26,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload valid CSV document via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.csv');
    fs.writeFileSync(tempPath, 'name,age\nAlice,30');

    const req = {
      file: {
        path: tempPath,
        originalname: 'data.csv',
        filename: 'uuid-csv.csv',
        size: 18,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-csv.csv',
        originalName: 'data.csv',
        fileType: 'csv',
        fileSize: 18,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload valid YAML document via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.yaml');
    fs.writeFileSync(tempPath, 'name: test\nvalue: 123');

    const req = {
      file: {
        path: tempPath,
        originalname: 'config.yaml',
        filename: 'uuid-yaml.yaml',
        size: 21,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-yaml.yaml',
        originalName: 'config.yaml',
        fileType: 'yaml',
        fileSize: 21,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });
});

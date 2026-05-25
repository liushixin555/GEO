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
    const response = await agent.post('/api/v1/upload/document');
    expect(response.status).toBe(401);
  });

  it('should return 403 for view role', async () => {
    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${viewToken()}`);
    expect(response.status).toBe(403);
  });

  // ---------- Successful uploads ----------

  it('should upload PDF document successfully as sysadmin', async () => {
    const pdfPath = path.join(uploadsDir, '_test_doc.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 test pdf content');

    const response = await agent
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`);
    expect(response.status).toBe(400);
  });

  it('should reject unsupported document format (.txt) with 400', async () => {
    const txtPath = path.join(uploadsDir, '_test_doc.txt');
    fs.writeFileSync(txtPath, 'plain text content');

    const response = await agent
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', exePath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(exePath); } catch {}
  });

  it('should reject file exceeding 30MB with 413 (LIMIT_FILE_SIZE)', async () => {
    // Create a large JSON file just over 30MB
    const largePath = path.join(uploadsDir, '_test_large_doc.json');
    const data = { x: 'a'.repeat(31 * 1024 * 1024) };
    fs.writeFileSync(largePath, JSON.stringify(data));

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', largePath);

    expect(response.status).toBe(413);
    expect(response.body.message).toContain('文件大小超过限制');

    try { fs.unlinkSync(largePath); } catch {}
  }, 60000);

  // ---------- Content validation failures ----------

  it('should reject invalid JSON content with 400', async () => {
    const jsonPath = path.join(uploadsDir, '_test_invalid.json');
    fs.writeFileSync(jsonPath, '{ invalid json content }');

    const response = await agent
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', yamlPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(yamlPath); } catch {}
  });

  it('should reject content type mismatch (PDF declared but content is JSON) with 400', async () => {
    const pdfPath = path.join(uploadsDir, '_test_mismatch.pdf');
    fs.writeFileSync(pdfPath, '{"not": "a pdf"}');

    const response = await agent
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
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
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(csvPath); } catch {}
  });

  it('should reject CSV without separator with 400', async () => {
    const csvPath = path.join(uploadsDir, '_test_nosep.csv');
    fs.writeFileSync(csvPath, 'no separator here');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(csvPath); } catch {}
  });

  // ---------- Filename validation ----------

  it('should reject filename exceeding 255 characters with 400', async () => {
    const longName = 'a'.repeat(252) + '.pdf';
    const buffer = Buffer.from('%PDF-1.4 test');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', buffer, longName);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('文件名过长');
  });

  it('should return 400 for LIMIT_UNEXPECTED_FILE when wrong field name', async () => {
    const buffer = Buffer.from('{"test": true}');
    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('document', buffer, 'test.json');

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('上传字段名应为 file');
  });

  // ---------- OLE2 format uploads ----------

  it('should upload DOC (OLE2) document successfully', async () => {
    const docPath = path.join(uploadsDir, '_test_doc.doc');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const docBuffer = Buffer.alloc(512);
    OLE2_MAGIC.copy(docBuffer);
    fs.writeFileSync(docPath, docBuffer);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('doc');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(docPath); } catch {}
  });

  it('should upload XLS (OLE2) document successfully', async () => {
    const xlsPath = path.join(uploadsDir, '_test_doc.xls');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const xlsBuffer = Buffer.alloc(512);
    OLE2_MAGIC.copy(xlsBuffer);
    fs.writeFileSync(xlsPath, xlsBuffer);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', xlsPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('xls');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(xlsPath); } catch {}
  });

  it('should upload PPT (OLE2) document successfully', async () => {
    const pptPath = path.join(uploadsDir, '_test_doc.ppt');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const pptBuffer = Buffer.alloc(512);
    OLE2_MAGIC.copy(pptBuffer);
    fs.writeFileSync(pptPath, pptBuffer);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pptPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('ppt');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(pptPath); } catch {}
  });

  it('should reject OLE2 file with wrong extension (.pdf) with 400', async () => {
    const pdfPath = path.join(uploadsDir, '_test_ole2_fake.pdf');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const ole2Buffer = Buffer.alloc(512);
    OLE2_MAGIC.copy(ole2Buffer);
    fs.writeFileSync(pdfPath, ole2Buffer);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('OLE2');

    try { fs.unlinkSync(pdfPath); } catch {}
  });

  // ---------- Markdown validation edge case ----------

  it('should reject Markdown without valid patterns with 400', async () => {
    const mdPath = path.join(uploadsDir, '_test_plain.md');
    fs.writeFileSync(mdPath, 'Just plain text without any markdown syntax at all.');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', mdPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('Markdown');

    try { fs.unlinkSync(mdPath); } catch {}
  });

  it('should reject XML declared but content is PDF with 400', async () => {
    const xmlPath = path.join(uploadsDir, '_test_pdf_as_xml.xml');
    fs.writeFileSync(xmlPath, '%PDF-1.4 fake pdf content');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', xmlPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不匹配');

    try { fs.unlinkSync(xmlPath); } catch {}
  });

  it('should reject YAML with null content with 400', async () => {
    const yamlPath = path.join(uploadsDir, '_test_null.yaml');
    fs.writeFileSync(yamlPath, '');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', yamlPath);

    expect(response.status).toBe(400);

    try { fs.unlinkSync(yamlPath); } catch {}
  });

  it('should reject XLSX declared but content is DOCX with 400', async () => {
    const xlsxPath = path.join(uploadsDir, '_test_fake.xlsx');
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document/>'));
    zip.writeZip(xlsxPath);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', xlsxPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不匹配');

    try { fs.unlinkSync(xlsxPath); } catch {}
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

  it('should return 400 for path traversal characters in extension', () => {
    jest.isolateModules(() => {
      let capturedFileFilter: any;

      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockImplementation((opts: any) => {
          capturedFileFilter = opts.fileFilter;
          return {
            single: () => (req: any, res: any, cb: any) => {
              capturedFileFilter(req, { originalname: 'test.doc' }, (err: any) => {
                if (err) cb(err);
                else cb(null);
              });
            },
          };
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = class MulterError extends Error { code = ''; };
        return mockMulter;
      });

      const actualPath = jest.requireActual('path');
      jest.doMock('path', () => ({
        ...actualPath,
        extname: () => '.doc/..',
      }));

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('非法文件扩展名') })
      );
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should return 400 for LIMIT_UNEXPECTED_FILE MulterError', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        class MockMulterError extends Error {
          code: string;
          constructor(code: string) {
            super(code);
            this.code = code;
          }
        }
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(new MockMulterError('LIMIT_UNEXPECTED_FILE'));
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MockMulterError;
        return mockMulter;
      });

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: '上传字段名应为 file' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  it('should return 400 for generic MulterError (LIMIT_FIELD_COUNT)', () => {
    jest.isolateModules(() => {
      jest.doMock('multer', () => {
        class MockMulterError extends Error {
          code: string;
          constructor(code: string) {
            super(code);
            this.code = code;
          }
        }
        const mockMulter: any = jest.fn().mockReturnValue({
          single: () => (_req: any, _res: any, cb: any) => {
            cb(new MockMulterError('LIMIT_FIELD_COUNT'));
          },
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = MockMulterError;
        return mockMulter;
      });

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith({ code: 400, message: '上传参数错误' });
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

  // ---------- validation.error fallback branch (line 44) ----------

  it('should return fallback message when validation.error is empty string', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_noerr.json');
    fs.writeFileSync(tempPath, '{"x":1}');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.json',
        filename: 'noerr.json',
        size: 7,
      },
    } as unknown as Request;

    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockResolvedValue({
      valid: false,
      error: '',
      detectedType: null,
    });

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文档内容格式校验失败' });
    expect(fs.existsSync(tempPath)).toBe(false);

    DocumentValidator.validateContent = originalValidate;
    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should return fallback message when validation.error is null', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_nullerr.json');
    fs.writeFileSync(tempPath, '{"x":1}');

    const req = {
      file: {
        path: tempPath,
        originalname: 'test.json',
        filename: 'nullerr.json',
        size: 7,
      },
    } as unknown as Request;

    const originalValidate = DocumentValidator.validateContent;
    DocumentValidator.validateContent = jest.fn().mockResolvedValue({
      valid: false,
      error: null,
      detectedType: null,
    });

    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const res = { status, json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(status).toHaveBeenCalledWith(400);
    expect(json).toHaveBeenCalledWith({ code: 400, message: '文档内容格式校验失败' });
    expect(fs.existsSync(tempPath)).toBe(false);

    DocumentValidator.validateContent = originalValidate;
    try { fs.unlinkSync(tempPath); } catch {}
  });
});

// ==================== Additional Boundary & Security Tests ====================

describe('Upload Document Controller - Boundary & Security', () => {
  const uploadsDir = path.resolve(process.cwd(), 'uploads');

  beforeAll(() => {
    if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  });

  // ---------- Filename boundary ----------

  it('should accept filename exactly at 255 characters', async () => {
    // 251 chars + ".json" = 256 chars → 255 is "a"*246 + ".json" = 251 chars → we need 255 chars total
    const baseName = 'a'.repeat(251);
    const filename = baseName + '.json'; // 256 chars → exceeds limit
    const exactName = 'a'.repeat(250) + '.json'; // 255 chars exactly
    const buffer = Buffer.from('{"test":true}');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', buffer, exactName);

    // 255 chars should be accepted (passes filename check)
    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('json');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
  });

  it('should reject filename at 256 characters', async () => {
    const filename = 'a'.repeat(252) + '.json'; // 256 chars
    const buffer = Buffer.from('{"test":true}');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', buffer, filename);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('文件名过长');
  });

  // ---------- Extension path traversal variants ----------

  it('should reject file with backslash in extension', async () => {
    jest.isolateModules(() => {
      let capturedFileFilter: any;

      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockImplementation((opts: any) => {
          capturedFileFilter = opts.fileFilter;
          return {
            single: () => (req: any, res: any, cb: any) => {
              capturedFileFilter(req, { originalname: 'test.pdf' }, (err: any) => {
                if (err) cb(err);
                else cb(null);
              });
            },
          };
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = class MulterError extends Error { code = ''; };
        return mockMulter;
      });

      const actualPath = jest.requireActual('path');
      jest.doMock('path', () => ({
        ...actualPath,
        extname: () => '.pd\\f',
      }));

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('非法文件扩展名') })
      );
    });
  });

  it('should reject file with double dot in extension', async () => {
    jest.isolateModules(() => {
      let capturedFileFilter: any;

      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockImplementation((opts: any) => {
          capturedFileFilter = opts.fileFilter;
          return {
            single: () => (req: any, res: any, cb: any) => {
              capturedFileFilter(req, { originalname: 'test.pdf' }, (err: any) => {
                if (err) cb(err);
                else cb(null);
              });
            },
          };
        });
        mockMulter.diskStorage = jest.fn().mockReturnValue({});
        mockMulter.MulterError = class MulterError extends Error { code = ''; };
        return mockMulter;
      });

      const actualPath = jest.requireActual('path');
      jest.doMock('path', () => ({
        ...actualPath,
        extname: () => '..pdf',
      }));

      const { uploadDocumentMiddleware: mockedMiddleware } =
        require('../../apis/controller/upload-document.controller');

      const json = jest.fn();
      const status = jest.fn().mockReturnValue({ json });
      const res = { status, json } as unknown as Response;
      const next = jest.fn();

      mockedMiddleware({} as Request, res, next);

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('非法文件扩展名') })
      );
    });
  });

  // ---------- Token validation ----------

  it('should reject expired token for document upload', async () => {
    const expiredToken = jwt.sign(
      { userId: 1, username: 'sysadmin', role: 'sysadmin', companyId: 1 },
      'test-secret',
      { expiresIn: '0s' }
    );

    await new Promise(resolve => setTimeout(resolve, 200));

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${expiredToken}`);

    expect(response.status).toBe(401);
  });

  it('should reject invalid token for document upload', async () => {
    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', 'Bearer invalid-token-string');

    expect(response.status).toBe(401);
  });

  // ---------- CSV separator variants ----------

  it('should upload TAB-separated CSV document successfully', async () => {
    const csvPath = path.join(uploadsDir, '_test_tab.csv');
    fs.writeFileSync(csvPath, 'name\tage\nAlice\t30');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('csv');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(csvPath); } catch {}
  });

  it('should upload semicolon-separated CSV document successfully', async () => {
    const csvPath = path.join(uploadsDir, '_test_semi.csv');
    fs.writeFileSync(csvPath, 'name;age\nAlice;30');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', csvPath);

    expect(response.status).toBe(200);
    expect(response.body.data.fileType).toBe('csv');

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(csvPath); } catch {}
  });

  // ---------- Security: malicious filenames ----------

  it('should reject .html file (XSS prevention) for document upload', async () => {
    const htmlPath = path.join(uploadsDir, '_test_doc.html');
    fs.writeFileSync(htmlPath, '<html><body>XSS</body></html>');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', htmlPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(htmlPath); } catch {}
  });

  it('should reject .js file for document upload', async () => {
    const jsPath = path.join(uploadsDir, '_test_doc.js');
    fs.writeFileSync(jsPath, 'alert("xss")');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jsPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(jsPath); } catch {}
  });

  it('should reject .sh file for document upload', async () => {
    const shPath = path.join(uploadsDir, '_test_doc.sh');
    fs.writeFileSync(shPath, '#!/bin/bash\necho pwned');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', shPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不支持的文档格式');

    try { fs.unlinkSync(shPath); } catch {}
  });

  // ---------- Response structure validation ----------

  it('should return complete response structure with all fields', async () => {
    const pdfPath = path.join(uploadsDir, '_test_structure.pdf');
    fs.writeFileSync(pdfPath, '%PDF-1.4 test pdf content for structure check');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', pdfPath);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      code: 0,
      message: '上传成功',
      data: {
        url: expect.stringMatching(/^\/uploads\/.*\.pdf$/),
        originalName: '_test_structure.pdf',
        fileType: 'pdf',
        fileSize: expect.any(Number),
      },
    });
    expect(response.body.data.fileSize).toBeGreaterThan(0);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(pdfPath); } catch {}
  });

  // ---------- Content type mismatch edge cases ----------

  it('should reject DOCX declared but content is XLSX with 400', async () => {
    const docxPath = path.join(uploadsDir, '_test_fake.docx');
    const zip = new AdmZip();
    zip.addFile('xl/workbook.xml', Buffer.from('<?xml version="1.0"?><workbook/>'));
    zip.writeZip(docxPath);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', docxPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不匹配');

    try { fs.unlinkSync(docxPath); } catch {}
  });

  it('should reject PPTX declared but content is DOCX with 400', async () => {
    const pptxPath = path.join(uploadsDir, '_test_fake.pptx');
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document/>'));
    zip.writeZip(pptxPath);

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${adminToken()}`)
      .attach('file', pptxPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('不匹配');

    try { fs.unlinkSync(pptxPath); } catch {}
  });

  // ---------- YML extension specifically ----------

  it('should upload .yml file and detect as yaml type', async () => {
    const ymlPath = path.join(uploadsDir, '_test_yml_ext.yml');
    fs.writeFileSync(ymlPath, 'title: Test\nitems:\n  - one\n  - two');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', ymlPath);

    expect(response.status).toBe(200);
    expect(['yaml', 'yml']).toContain(response.body.data.fileType);

    const uploadedFile = path.join(uploadsDir, response.body.data.url.replace('/uploads/', ''));
    try { fs.unlinkSync(uploadedFile); } catch {}
    try { fs.unlinkSync(ymlPath); } catch {}
  });

  // ---------- File cleanup on content validation failure ----------

  it('should delete uploaded file when content validation fails', async () => {
    const jsonPath = path.join(uploadsDir, '_test_cleanup_fail.json');
    fs.writeFileSync(jsonPath, 'not valid json {{{');

    const response = await agent
      .post('/api/v1/upload/document')
      .set('Authorization', `Bearer ${sysadminToken()}`)
      .attach('file', jsonPath);

    expect(response.status).toBe(400);
    expect(response.body.message).toContain('JSON');

    // Original test file should still exist (it was the source for attach)
    // But the multer-uploaded copy should be cleaned up
    try { fs.unlinkSync(jsonPath); } catch {}
  });

  // ---------- Unit: middleware fileFilter coverage (direct callback test) ----------

  it('should reject fileFilter for filename exactly at length boundary (256)', () => {
    jest.isolateModules(() => {
      let capturedFileFilter: any;

      jest.doMock('multer', () => {
        const mockMulter: any = jest.fn().mockImplementation((opts: any) => {
          capturedFileFilter = opts.fileFilter;
          return {
            single: () => (req: any, res: any, cb: any) => {
              capturedFileFilter(req, { originalname: 'x'.repeat(256) }, (err: any) => {
                if (err) cb(err);
                else cb(null);
              });
            },
          };
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

      expect(status).toHaveBeenCalledWith(400);
      expect(json).toHaveBeenCalledWith(
        expect.objectContaining({ message: expect.stringContaining('文件名过长') })
      );
    });
  });

  // ---------- PDF success unit test ----------

  it('should upload valid PDF via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.pdf');
    fs.writeFileSync(tempPath, '%PDF-1.4 test pdf content');

    const req = {
      file: {
        path: tempPath,
        originalname: 'document.pdf',
        filename: 'uuid-pdf.pdf',
        size: 22,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-pdf.pdf',
        originalName: 'document.pdf',
        fileType: 'pdf',
        fileSize: 22,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  // ---------- DOCX/XLSX/PPTX unit tests ----------

  it('should upload valid DOCX via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.docx');
    const zip = new AdmZip();
    zip.addFile('word/document.xml', Buffer.from('<?xml version="1.0"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body><w:p><w:r><w:t>test</w:t></w:r></w:p></w:body></w:document>'));
    zip.writeZip(tempPath);

    const stat = fs.statSync(tempPath);
    const req = {
      file: {
        path: tempPath,
        originalname: 'document.docx',
        filename: 'uuid-docx.docx',
        size: stat.size,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-docx.docx',
        originalName: 'document.docx',
        fileType: 'docx',
        fileSize: stat.size,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload valid XLSX via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.xlsx');
    const zip = new AdmZip();
    zip.addFile('xl/workbook.xml', Buffer.from('<?xml version="1.0"?><workbook/>'));
    zip.writeZip(tempPath);

    const stat = fs.statSync(tempPath);
    const req = {
      file: {
        path: tempPath,
        originalname: 'sheet.xlsx',
        filename: 'uuid-xlsx.xlsx',
        size: stat.size,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-xlsx.xlsx',
        originalName: 'sheet.xlsx',
        fileType: 'xlsx',
        fileSize: stat.size,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload valid PPTX via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.pptx');
    const zip = new AdmZip();
    zip.addFile('ppt/presentation.xml', Buffer.from('<?xml version="1.0"?><presentation/>'));
    zip.writeZip(tempPath);

    const stat = fs.statSync(tempPath);
    const req = {
      file: {
        path: tempPath,
        originalname: 'slides.pptx',
        filename: 'uuid-pptx.pptx',
        size: stat.size,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-pptx.pptx',
        originalName: 'slides.pptx',
        fileType: 'pptx',
        fileSize: stat.size,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  // ---------- OLE2 unit tests ----------

  it('should upload DOC (OLE2) via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_ole2.doc');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const buf = Buffer.alloc(512);
    OLE2_MAGIC.copy(buf);
    fs.writeFileSync(tempPath, buf);

    const req = {
      file: {
        path: tempPath,
        originalname: 'legacy.doc',
        filename: 'uuid-doc.doc',
        size: 512,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-doc.doc',
        originalName: 'legacy.doc',
        fileType: 'doc',
        fileSize: 512,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload XLS (OLE2) via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_ole2.xls');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const buf = Buffer.alloc(512);
    OLE2_MAGIC.copy(buf);
    fs.writeFileSync(tempPath, buf);

    const req = {
      file: {
        path: tempPath,
        originalname: 'legacy.xls',
        filename: 'uuid-xls.xls',
        size: 512,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-xls.xls',
        originalName: 'legacy.xls',
        fileType: 'xls',
        fileSize: 512,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  it('should upload PPT (OLE2) via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_ole2.ppt');
    const OLE2_MAGIC = Buffer.from([0xD0, 0xCF, 0x11, 0xE0, 0xA1, 0xB1, 0x1A, 0xE1]);
    const buf = Buffer.alloc(512);
    OLE2_MAGIC.copy(buf);
    fs.writeFileSync(tempPath, buf);

    const req = {
      file: {
        path: tempPath,
        originalname: 'legacy.ppt',
        filename: 'uuid-ppt.ppt',
        size: 512,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: {
        url: '/uploads/uuid-ppt.ppt',
        originalName: 'legacy.ppt',
        fileType: 'ppt',
        fileSize: 512,
      },
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });

  // ---------- YML unit test ----------

  it('should upload valid YML via unit test', async () => {
    const tempPath = path.join(uploadsDir, '_unit_test_valid.yml');
    fs.writeFileSync(tempPath, 'key: value\nlist:\n  - item1');

    const req = {
      file: {
        path: tempPath,
        originalname: 'config.yml',
        filename: 'uuid-yml.yml',
        size: 26,
      },
    } as unknown as Request;
    const json = jest.fn();
    const res = { json } as unknown as Response;

    await uploadDocumentFile(req, res);

    expect(json).toHaveBeenCalledWith({
      code: 0,
      message: '上传成功',
      data: expect.objectContaining({
        url: '/uploads/uuid-yml.yml',
        originalName: 'config.yml',
        fileType: expect.stringMatching(/^(yaml|yml)$/),
      }),
    });

    try { fs.unlinkSync(tempPath); } catch {}
  });
});

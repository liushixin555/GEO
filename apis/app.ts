import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerJSDoc from 'swagger-jsdoc';
import swaggerUI from 'swagger-ui-express';
import path from 'path';
import config from './config';
import { authMiddleware, rateLimitMiddleware, antiCrawlMiddleware, roleMiddleware } from './middleware';
import * as authController from './controller/auth.controller';
import * as companyController from './controller/company.controller';
import * as skillsController from './controller/skills.controller';
import * as userController from './controller/user.controller';
import * as llmModelController from './controller/llm-model.controller';
import * as systemConfigController from './controller/system-config.controller';
import * as publishingPlatformController from './controller/publishing-platform.controller';
import * as projectController from './controller/project.controller';
import * as articleController from './controller/article.controller';
import * as knowledgeController from './controller/knowledge.controller';
import * as knowledgeBaseController from './controller/knowledge-base.controller';
import * as publishingScheduleController from './controller/publishing-schedule.controller';
import { uploadMiddleware, uploadFile } from './controller/upload.controller';
import { uploadDocumentMiddleware, uploadDocumentFile } from './controller/upload-document.controller';
import * as todoController from './controller/todo.controller';

const app: Express = express();

// Trust first proxy (Nginx etc.) — required for correct req.ip behind reverse proxy
app.set('trust proxy', 1);

// Health check — before security middleware to avoid rate-limit interference
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Security middleware — helmet with enhanced configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

// CORS — whitelist-based configuration
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.corsOrigins;
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, false);
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request body parsing with explicit size limit
app.use(express.json({ limit: '10mb' }));

// Static files — allow cross-origin image loading
app.use('/uploads', (_req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads')));

// Anti-crawl & rate limiting — intentionally placed before login route to prevent brute force
app.use(antiCrawlMiddleware);
app.use(rateLimitMiddleware);

// Request audit logging — log 4xx/5xx responses for security monitoring
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn('[API]', req.method, req.originalUrl, res.statusCode,
        `${Date.now() - start}ms`,
        req.user?.userId || 'anonymous',
        req.ip);
    }
  });
  next();
});

// Swagger setup — conditional generation to avoid wasted I/O in production
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  const swaggerSpec = swaggerJSDoc({
    definition: {
      openapi: '3.0.0',
      info: {
        title: '薄云商机倍增服务 API',
        version: '1.0.0',
        description: '薄云商机倍增服务 Enterprise Management Platform API',
      },
      components: {
        securitySchemes: {
          bearerAuth: {
            type: 'http',
            scheme: 'bearer',
            bearerFormat: 'JWT',
          },
        },
      },
    },
    apis: ['./apis/controller/*.ts'],
  });
  app.use('/api-docs', swaggerUI.serve, swaggerUI.setup(swaggerSpec));
  app.get('/api-docs.json', (_req, res) => res.json(swaggerSpec));
}

// Public routes (no auth required)
app.post('/api/auth/login', authController.login);

// Protected routes (auth required)
app.get('/api/auth/verify', authMiddleware, authController.verify);
app.post('/api/auth/logout', authMiddleware, authController.logout);
app.put('/api/auth/selection', authMiddleware, authController.saveSelection);
app.get('/api/auth/companies', authMiddleware, authController.getAccessibleCompanies);
app.get('/api/auth/companies/:id', authMiddleware, authController.getCompanyDetail);
app.get('/api/auth/projects', authMiddleware, authController.getAccessibleProjects);
app.get('/api/auth/context', authMiddleware, authController.getContext);

// Company routes (sysadmin only)
app.get('/api/companies', authMiddleware, roleMiddleware('sysadmin'), companyController.listCompanies);
app.get('/api/companies/:id', authMiddleware, roleMiddleware('sysadmin'), companyController.getCompany);
app.post('/api/companies', authMiddleware, roleMiddleware('sysadmin'), companyController.createCompany);
app.put('/api/companies/:id', authMiddleware, roleMiddleware('sysadmin'), companyController.updateCompany);
app.put('/api/companies/:id/status', authMiddleware, roleMiddleware('sysadmin'), companyController.toggleCompanyStatus);

// Skills routes (sysadmin + admin)
app.get('/api/skills', authMiddleware, roleMiddleware('sysadmin', 'admin'), skillsController.listSkills);
app.get('/api/skills/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), skillsController.getSkills);
app.post('/api/skills', authMiddleware, roleMiddleware('sysadmin', 'admin'), skillsController.uploadSkillMiddleware, skillsController.createSkills);
app.put('/api/skills/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), skillsController.updateSkills);
app.delete('/api/skills/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), skillsController.deleteSkills);

// User routes (sysadmin only)
app.get('/api/users', authMiddleware, roleMiddleware('sysadmin'), userController.listUsers);
app.get('/api/users/:id', authMiddleware, roleMiddleware('sysadmin'), userController.getUser);
app.post('/api/users', authMiddleware, roleMiddleware('sysadmin'), userController.createUser);
app.put('/api/users/:id', authMiddleware, roleMiddleware('sysadmin'), userController.updateUser);
app.delete('/api/users/:id', authMiddleware, roleMiddleware('sysadmin'), userController.deleteUser);

// LLM Model routes (sysadmin only)
app.get('/api/llm-models/enabled', authMiddleware, roleMiddleware('sysadmin', 'admin'), llmModelController.listEnabledLlmModels);
app.get('/api/llm-models', authMiddleware, roleMiddleware('sysadmin'), llmModelController.listLlmModels);
app.get('/api/llm-models/:id', authMiddleware, roleMiddleware('sysadmin'), llmModelController.getLlmModel);
app.post('/api/llm-models', authMiddleware, roleMiddleware('sysadmin'), llmModelController.createLlmModel);
app.put('/api/llm-models/:id', authMiddleware, roleMiddleware('sysadmin'), llmModelController.updateLlmModel);
app.delete('/api/llm-models/:id', authMiddleware, roleMiddleware('sysadmin'), llmModelController.deleteLlmModel);

// System Config routes (sysadmin only)
app.get('/api/system-configs', authMiddleware, roleMiddleware('sysadmin'), systemConfigController.getSystemConfigs);
app.put('/api/system-configs', authMiddleware, roleMiddleware('sysadmin'), systemConfigController.updateSystemConfigs);

// Publishing Platform routes
app.post('/api/publishing-platforms/sync', authMiddleware, roleMiddleware('sysadmin'), publishingPlatformController.syncPublishingPlatforms);
app.get('/api/publishing-platforms', authMiddleware, roleMiddleware('sysadmin', 'admin'), publishingPlatformController.listPublishingPlatforms);

// Project routes (sysadmin + admin)
app.get('/api/projects', authMiddleware, roleMiddleware('sysadmin', 'admin'), projectController.listProjects);
app.get('/api/projects/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), projectController.getProject);
app.post('/api/projects', authMiddleware, roleMiddleware('sysadmin', 'admin'), projectController.createProject);
app.put('/api/projects/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), projectController.updateProject);
app.delete('/api/projects/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), projectController.deleteProject);

// Article routes (sysadmin + admin)
app.get('/api/projects/:projectId/articles', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.listArticles);
app.get('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.getArticle);
app.post('/api/projects/:projectId/articles', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.createArticle);
app.put('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.updateArticle);
app.delete('/api/projects/:projectId/articles/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.deleteArticle);
app.put('/api/projects/:projectId/articles/:id/review', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.reviewArticle);
app.put('/api/projects/:projectId/articles/:id/regenerate', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.regenerateArticle);
app.put('/api/projects/:projectId/articles/:id/content', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.updateArticleContent);
app.put('/api/projects/:projectId/articles/:id/submit-review', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.submitForReview);
app.get('/api/projects/:projectId/articles/:id/versions', authMiddleware, roleMiddleware('sysadmin', 'admin'), articleController.listArticleVersions);

// Project Knowledge aggregation routes (sysadmin + admin)
app.get('/api/projects/:projectId/knowledge/keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listProjectKeywords);
app.get('/api/projects/:projectId/knowledge/portraits', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listProjectPortraits);
app.get('/api/projects/:projectId/knowledge/images', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listProjectImages);
app.get('/api/projects/:projectId/knowledge/documents', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listProjectDocuments);

// Upload route (sysadmin + admin)
app.post('/api/upload', authMiddleware, roleMiddleware('sysadmin', 'admin'), uploadMiddleware, uploadFile);
app.post('/api/upload/document', authMiddleware, roleMiddleware('sysadmin', 'admin'), uploadDocumentMiddleware, uploadDocumentFile);

// Publishing Schedule routes (sysadmin + admin + view)
app.get('/api/publishing-schedule', authMiddleware, roleMiddleware('sysadmin', 'admin', 'view'), publishingScheduleController.listPublishingSchedule);
app.put('/api/publishing-schedule/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), publishingScheduleController.updatePublishingSchedule);

// Knowledge Base routes (sysadmin + admin)
app.get('/api/knowledge-bases', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeBaseController.listKnowledgeBases);
app.get('/api/knowledge-bases/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeBaseController.getKnowledgeBase);
app.post('/api/knowledge-bases', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeBaseController.createKnowledgeBase);
app.put('/api/knowledge-bases/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeBaseController.updateKnowledgeBase);
app.delete('/api/knowledge-bases/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeBaseController.deleteKnowledgeBase);

// Knowledge Inventory (sysadmin + admin)
app.get('/api/knowledge-inventory', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listInventory);

// Todo routes (sysadmin + admin)
app.get('/api/todos', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.listTodos);
app.get('/api/todos/object-options', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.getObjectOptions);
app.get('/api/todos/assignee-candidates', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.getAssigneeCandidates);
app.get('/api/todos/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.getTodo);
app.post('/api/todos', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.createTodo);
app.put('/api/todos/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.updateTodo);
app.post('/api/todos/:id/close', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.closeTodo);
app.post('/api/todos/:id/reopen', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.reopenTodo);
app.post('/api/todos/:id/transfer', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.transferTodo);
app.post('/api/todos/:id/reject', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.rejectTodo);
app.get('/api/todos/:id/logs', authMiddleware, roleMiddleware('sysadmin', 'admin'), todoController.getTodoLogs);

app.get('/api/knowledge-bases/:baseId/keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listKeywords);
app.get('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.getKeyword);
app.post('/api/knowledge-bases/:baseId/keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.createKeyword);
app.post('/api/knowledge-bases/:baseId/keywords/batch', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.batchCreateKeywords);
app.post('/api/knowledge-bases/:baseId/keywords/expand', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.expandKeywords);
app.put('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.updateKeyword);
app.delete('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deleteKeyword);
app.get('/api/knowledge-bases/:baseId/mined-keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listMinedKeywords);
app.post('/api/knowledge-bases/:baseId/keywords/mine', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.mineKeywords);
app.post('/api/knowledge-bases/:baseId/mined-keywords/save', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.saveMinedKeywords);
app.put('/api/knowledge-bases/:baseId/mined-keywords/batch-toggle', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.toggleMinedKeywordsBatch);
app.delete('/api/knowledge-bases/:baseId/mined-keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deleteMinedKeywords);
app.get('/api/knowledge-bases/:baseId/portraits', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listPortraits);
app.get('/api/knowledge-bases/:baseId/portraits/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.getPortrait);
app.post('/api/knowledge-bases/:baseId/portraits', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.createPortrait);
app.put('/api/knowledge-bases/:baseId/portraits/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.updatePortrait);
app.delete('/api/knowledge-bases/:baseId/portraits/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deletePortrait);
app.get('/api/knowledge-bases/:baseId/images', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listImages);
app.get('/api/knowledge-bases/:baseId/images/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.getImage);
app.post('/api/knowledge-bases/:baseId/images', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.createImage);
app.put('/api/knowledge-bases/:baseId/images/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.updateImage);
app.delete('/api/knowledge-bases/:baseId/images/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deleteImage);
app.get('/api/knowledge-bases/:baseId/documents', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listDocuments);
app.get('/api/knowledge-bases/:baseId/documents/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.getDocument);
app.post('/api/knowledge-bases/:baseId/documents', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.createDocument);
app.put('/api/knowledge-bases/:baseId/documents/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.updateDocument);
app.delete('/api/knowledge-bases/:baseId/documents/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deleteDocument);

// 404 fallback — must be after all routes
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// Global error handler — Express identifies by 4-parameter signature
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  console.error('[Unhandled Error]', JSON.stringify({
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
    userId: req.user?.userId,
    userRole: req.user?.role,
    error: { name: err.name, message: err.message },
  }));
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

export default app;

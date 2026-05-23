import express, { Express } from 'express';
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

const app: Express = express();

// Security middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));
app.use(cors());
app.use(express.json());

// Static files — allow cross-origin image loading
app.use('/uploads', (req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  next();
}, express.static(path.resolve(process.cwd(), 'uploads')));

// Anti-crawl & rate limiting
app.use(antiCrawlMiddleware);
app.use(rateLimitMiddleware);

// Swagger setup
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

if (config.swagger.enabled) {
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

// Knowledge Item routes (sysadmin + admin) - scoped to knowledge base
app.get('/api/knowledge-bases/:baseId/keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.listKeywords);
app.get('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.getKeyword);
app.post('/api/knowledge-bases/:baseId/keywords', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.createKeyword);
app.post('/api/knowledge-bases/:baseId/keywords/batch', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.batchCreateKeywords);
app.post('/api/knowledge-bases/:baseId/keywords/expand', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.expandKeywords);
app.put('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.updateKeyword);
app.delete('/api/knowledge-bases/:baseId/keywords/:id', authMiddleware, roleMiddleware('sysadmin', 'admin'), knowledgeController.deleteKeyword);
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

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

export default app;

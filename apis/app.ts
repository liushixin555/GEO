import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import path from 'path';
import config from './config';
import { rateLimitMiddleware, antiCrawlMiddleware } from './middleware';
import { AppError } from './errors';

// Route modules
import authRoutes from './routes/auth.routes';
import companyRoutes from './routes/company.routes';
import skillsRoutes from './routes/skills.routes';
import userRoutes from './routes/user.routes';
import llmModelRoutes from './routes/llm-model.routes';
import systemConfigRoutes from './routes/system-config.routes';
import publishingPlatformRoutes from './routes/publishing-platform.routes';
import projectRoutes from './routes/project.routes';
import articleRoutes from './routes/article.routes';
import knowledgeRoutes from './routes/knowledge.routes';
import uploadRoutes from './routes/upload.routes';
import publishingScheduleRoutes from './routes/publishing-schedule.routes';
import todoRoutes from './routes/todo.routes';

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

// Request audit logging — log 4xx/5xx responses for security monitoring (M-2)
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

// Swagger setup — conditional generation to avoid wasted I/O in production (M-1)
if (config.swagger.enabled && process.env.NODE_ENV !== 'production') {
  const swaggerJSDoc = require('swagger-jsdoc').default || require('swagger-jsdoc');
  const swaggerUI = require('swagger-ui-express');
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
  app.get('/api-docs.json', (_req: Request, res: Response) => res.json(swaggerSpec));
}

// ── Route modules (v1) ─────────────────────────────────────────────
app.use('/api/v1/auth', authRoutes);
app.use('/api/v1/companies', companyRoutes);
app.use('/api/v1/skills', skillsRoutes);
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/llm-models', llmModelRoutes);
app.use('/api/v1/system-configs', systemConfigRoutes);
app.use('/api/v1/publishing-platforms', publishingPlatformRoutes);
app.use('/api/v1/projects', projectRoutes);
app.use('/api/v1', articleRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/publishing-schedule', publishingScheduleRoutes);
app.use('/api/v1', knowledgeRoutes);
app.use('/api/v1/todos', todoRoutes);

// 404 fallback — must be after all routes
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// Global error handler — Express identifies by 4-parameter signature
// M-3: 区分业务错误(AppError)与系统错误
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.statusCode, message: err.message });
    return;
  }
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

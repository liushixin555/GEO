import express, { Express, Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import config from './config';
import { rateLimitMiddleware, antiCrawlMiddleware, swaggerAuthMiddleware } from './middleware';
import { AppError } from './errors';
import { getClientIp } from './utils/ip.util';
import { writeApiAccessLog } from './utils/audit-log-writer.util';

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
import evidenceCardRoutes from './routes/evidence-card.routes';
import projectKnowledgeRoutes from './routes/project-knowledge.routes';
import uploadRoutes from './routes/upload.routes';
import publishingScheduleRoutes from './routes/publishing-schedule.routes';
import todoRoutes from './routes/todo.routes';
import auditLogRoutes from './routes/audit-log.routes';
import citationDiagnosisRoutes from './routes/citation-diagnosis.routes';
import auditRoutes from './audit/routes/audit.routes';

const app: Express = express();

// Trust proxy — configurable via TRUST_PROXY env var (default: 1)
app.set('trust proxy', config.server.trustProxy);

// Health check — before security middleware to avoid rate-limit interference
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' });
});

// Security middleware — helmet with enhanced configuration
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
  hsts: false, // HTTP server — disable HSTS
  contentSecurityPolicy: false, // Scalar API docs needs inline scripts/styles
  crossOriginEmbedderPolicy: false, // HTTP origin — COEP/COOP require HTTPS
  crossOriginOpenerPolicy: false,
}));

// CORS — whitelist-based configuration
// 不在白名单的 origin 直接拒绝请求，返回 403
app.use(cors({
  origin: (origin, callback) => {
    const allowed = config.corsOrigins;
    if (!origin || allowed.includes(origin)) {
      callback(null, true);
    } else {
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'cors_rejected',
        origin,
        allowedOrigins: allowed,
      }));
      callback(new Error('CORS origin not allowed'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// Request body parsing — size limit configurable via BODY_LIMIT_MB env var (default: 10mb)
app.use(express.json({ limit: `${config.bodyLimitMb}mb` }));

// Static files — allow cross-origin image loading with security headers
app.use('/uploads', (_req, res, next) => {
  res.set('Cross-Origin-Resource-Policy', 'cross-origin');
  res.set('X-Content-Type-Options', 'nosniff');
  res.set('Cache-Control', 'private, max-age=3600');
  next();
}, express.static(config.uploadDir, {
  setHeaders: (res, filePath) => {
    // 对危险扩展名强制下载而非渲染，防止存储型 XSS
    const ext = filePath.slice(filePath.lastIndexOf('.')).toLowerCase();
    if (['.svg', '.html', '.htm'].includes(ext)) {
      res.set('Content-Disposition', 'attachment');
      res.set('Content-Security-Policy', "default-src 'none'; script-src 'none'");
    }
  },
}));

// Anti-crawl & rate limiting — intentionally placed before login route to prevent brute force
app.use(antiCrawlMiddleware);
app.use(rateLimitMiddleware);

// Request audit logging — log 4xx/5xx responses for security monitoring (M-2)
app.use((req: Request, res: Response, next: NextFunction) => {
  const start = Date.now();
  res.on('finish', () => {
    if (res.statusCode >= 400) {
      console.warn(JSON.stringify({
        level: 'warn',
        type: 'api_access',
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: Date.now() - start,
        userId: req.user?.userId || 'anonymous',
        ip: getClientIp(req),
      }));
      writeApiAccessLog({
        userId: req.user?.userId,
        ip: getClientIp(req),
        method: req.method,
        url: req.originalUrl,
        status: res.statusCode,
        duration: Date.now() - start,
      });
    }
  });
  next();
});

// API documentation — Scalar UI + Zod schema-based OpenAPI spec + prisma-openapi model schemas
// Regenerate: pnpm run swagger:gen
if (config.swagger.enabled) {
  const { apiReference } = require('@scalar/express-api-reference');
  const swaggerSpec = require('./swagger-spec.json');
  app.get('/api-docs/health', (_req: Request, res: Response) => res.json({ available: true }));
  app.use('/api-docs', swaggerAuthMiddleware, apiReference({
    spec: { url: '/api-docs.json' },
    theme: 'default',
  }));
  app.get('/api-docs.json', swaggerAuthMiddleware, (_req: Request, res: Response) => res.json(swaggerSpec));
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
app.use('/api/v1/projects', articleRoutes);
app.use('/api/v1/projects', projectKnowledgeRoutes);
app.use('/api/v1/knowledge-bases', knowledgeRoutes);
app.use('/api/v1/evidence-cards', evidenceCardRoutes);
app.use('/api/v1/upload', uploadRoutes);
app.use('/api/v1/publishing-schedule', publishingScheduleRoutes);
app.use('/api/v1/todos', todoRoutes);
app.use('/api/v1/audit-logs', auditLogRoutes);
app.use('/api/v1/citation-diagnosis', citationDiagnosisRoutes);
app.use('/api/v1/audit', auditRoutes);

// 404 fallback — must be after all routes
app.use((_req, res) => {
  res.status(404).json({ code: 404, message: '接口不存在' });
});

// Global error handler — Express identifies by 4-parameter signature
// M-3: 区分业务错误(AppError)与系统错误
app.use((err: Error, req: Request, res: Response, _next: NextFunction) => {
  if (err.message === 'CORS origin not allowed') {
    res.status(403).json({ code: 403, message: '跨域请求被拒绝' });
    return;
  }
  if (err instanceof SyntaxError && 'status' in err && (err as any).status === 400) {
    res.status(400).json({ code: 400, message: '请求体 JSON 格式错误' });
    return;
  }
  if (err instanceof AppError) {
    res.status(err.statusCode).json({ code: err.statusCode, message: err.message });
    return;
  }
  console.error(JSON.stringify({
    level: 'error',
    type: 'unhandled_error',
    method: req.method,
    url: req.originalUrl,
    ip: getClientIp(req),
    userId: req.user?.userId,
    userRole: req.user?.role,
    timestamp: new Date().toISOString(),
    error: { name: err.name, message: err.message },
  }));
  res.status(500).json({ code: 500, message: '服务器内部错误' });
});

export default app;

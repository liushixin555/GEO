import app from './app';
import config from './config';
import { closePrisma } from './utils';
import { startArticleGenerationCron, stopArticleGenerationCron } from './scheduler/article-generation.scheduler';

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`[薄云商机倍增服务] Server running on port ${PORT}`);
  console.log(`[薄云商机倍增服务] Environment: ${process.env.NODE_ENV || 'development'}`);
  if (config.swagger.enabled) {
    console.log(`[薄云商机倍增服务] API docs: http://localhost:${PORT}/api-docs`);
  }
  startArticleGenerationCron();
});

// SEC-APP-07: Request timeout — prevent Slowloris-style attacks
server.timeout = 30_000;         // 30s idle connection timeout
server.headersTimeout = 35_000;  // slightly > server.timeout
server.requestTimeout = 30_000;  // 30s total request timeout

process.on('SIGINT', async () => {
  console.log('[薄云商机倍增服务] Shutting down...');
  stopArticleGenerationCron();
  await closePrisma();
  server.close(() => process.exit(0));
});

process.on('SIGTERM', async () => {
  console.log('[薄云商机倍增服务] Shutting down...');
  stopArticleGenerationCron();
  await closePrisma();
  server.close(() => process.exit(0));
});

export default app;

import app from './app';
import config from './config';
import { closePrisma } from './utils';
import { startArticleGenerationCron, stopArticleGenerationCron } from './scheduler/article-generation.scheduler';

const PORT = config.server.port;

const server = app.listen(PORT, () => {
  console.log(`[薄云商机倍增服务] Server running on port ${PORT}`);
  console.log(`[薄云商机倍增服务] Environment: ${process.env.NODE_ENV || 'development'}`);
  if (config.swagger.enabled) {
    console.log(`[薄云商机倍增服务] Swagger docs: http://localhost:${PORT}/api-docs`);
  }
  startArticleGenerationCron();
});

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

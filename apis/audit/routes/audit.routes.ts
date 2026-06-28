import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../../middleware';
import { ROLES } from '../../constants/roles';
import { validate } from '../../middleware/validate';
import { listAuditsSchema, detectSchema, createAuditSchema } from '../schema/audit.schema';
import * as ctrl from '../controller/audit.controller';

/**
 * 诊断管理路由 — 仅 sysadmin/admin 可访问
 *
 * 挂载点：app.use('/api/v1/audit', authMiddleware, auditRoutes)
 * （antiCrawl/rateLimit 已在全局应用）
 *
 * 注意：固定路径（detect）必须放在 :jobId 之前，否则会被解析为 jobId。
 */
const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

// CRUD
router.get('/', validate(listAuditsSchema, 'query'), ctrl.listAudits);

// 引擎执行链（Phase 3）
router.post('/detect', validate(detectSchema), ctrl.detectBrandController);
router.post('/', validate(createAuditSchema), ctrl.createAudit);

// 单任务操作（:jobId 必须置于固定路径之后）
router.get('/:jobId/status', ctrl.getAuditStatus);
router.post('/:jobId/execute', ctrl.executeAudit);
router.post('/:jobId/rerun', ctrl.rerunAudit);
router.get('/:jobId/skill', ctrl.downloadAuditSkill);
router.get('/:jobId', ctrl.getAudit);
router.delete('/:jobId', ctrl.deleteAudit);

// Phase 5 后续将补齐（需要外部爬虫/Tavily 接入）：
//   GET /:jobId/aio                AIO 子检查
//   GET /:jobId/technical          技术 SEO 子检查
//   GET /:jobId/seo-score          SEO 分子检查
//   GET /:jobId/content-optimizer  内容优化子检查

export default router;

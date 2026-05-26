/**
 * Project-scoped Knowledge Aggregation Routes
 *
 * 跨知识库聚合查询——按项目维度查看所有关键词/画像/图片/文档。
 * 只读路由（GET only），不支持创建/修改/删除操作。
 *
 * 与 knowledge.routes.ts 的关系：
 *   - 本文件：项目级聚合（/api/v1/projects/:projectId/knowledge/*）
 *   - knowledge.routes.ts：知识库级 CRUD（/api/v1/knowledge-bases/:baseId/*）
 *
 * 挂载点：app.ts → app.use('/api/v1/projects', projectKnowledgeRoutes)
 * 权限：sysadmin + admin（controller 层 checkProjectOperator 限制运营者范围）
 */
import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { projectIdParamSchema, listProjectKnowledgeSchema } from '../schema/knowledge.schema';
import {
  listProjectKeywords,
  listProjectPortraits,
  listProjectImages,
  listProjectDocuments,
} from '../controller/knowledge.controller';

const router: Router = Router();

router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/:projectId/knowledge/keywords', validate(projectIdParamSchema, 'params'), validate(listProjectKnowledgeSchema, 'query'), listProjectKeywords);
router.get('/:projectId/knowledge/portraits', validate(projectIdParamSchema, 'params'), validate(listProjectKnowledgeSchema, 'query'), listProjectPortraits);
router.get('/:projectId/knowledge/images', validate(projectIdParamSchema, 'params'), validate(listProjectKnowledgeSchema, 'query'), listProjectImages);
router.get('/:projectId/knowledge/documents', validate(projectIdParamSchema, 'params'), validate(listProjectKnowledgeSchema, 'query'), listProjectDocuments);

export default router;

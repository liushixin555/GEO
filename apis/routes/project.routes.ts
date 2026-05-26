/**
 * 项目 CRUD 路由
 *
 * 挂载点: app.ts → app.use('/api/v1/projects', projectRoutes)
 * 权限:   sysadmin + admin（view 被路由层 roleMiddleware 拦截）
 * 校验:   POST/PUT 通过 Zod schema 校验 body，GET/DELETE 通过 idParamSchema 校验 params，
 *         GET / 通过 listProjectSchema 校验 query
 *
 * 路由表:
 *   GET    /           → listProjects    (query: page, pageSize, search, company_id, status)
 *   GET    /:id        → getProject      (params: id)
 *   POST   /           → createProject   (body: createProjectSchema)
 *   PUT    /:id        → updateProject   (params: id, body: updateProjectSchema)
 *   DELETE /:id        → deleteProject   (params: id)
 */
import { Router } from 'express';
import { authMiddleware, roleMiddleware, articleActionLimiter } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import {
  idParamSchema,
  listProjectSchema,
  createProjectSchema,
  updateProjectSchema,
} from '../schema/project.schema';
import {
  listProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
} from '../controller/project.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', validate(listProjectSchema, 'query'), listProjects);
router.get('/:id', validate(idParamSchema, 'params'), getProject);
router.post('/', validate(createProjectSchema), createProject);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateProjectSchema), updateProject);
router.delete('/:id', articleActionLimiter, validate(idParamSchema, 'params'), deleteProject);

export default router;

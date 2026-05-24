import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createProjectSchema, updateProjectSchema } from '../schema/project.schema';
import * as ctrl from '../controller/project.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', ctrl.listProjects);
router.get('/:id', ctrl.getProject);
router.post('/', validate(createProjectSchema), ctrl.createProject);
router.put('/:id', validate(updateProjectSchema), ctrl.updateProject);
router.delete('/:id', ctrl.deleteProject);

export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/project.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', ctrl.listProjects);
router.get('/:id', ctrl.getProject);
router.post('/', ctrl.createProject);
router.put('/:id', ctrl.updateProject);
router.delete('/:id', ctrl.deleteProject);

export default router;

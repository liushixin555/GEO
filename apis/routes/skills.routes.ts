import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/skills.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', ctrl.listSkills);
router.get('/:id', ctrl.getSkills);
router.post('/', ctrl.uploadSkillMiddleware, ctrl.createSkills);
router.put('/:id', ctrl.updateSkills);
router.delete('/:id', ctrl.deleteSkills);

export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/publishing-schedule.controller';

const router = Router();

// list 允许 view 角色
router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW), ctrl.listPublishingSchedule);

// update 仅 sysadmin + admin
router.put('/:id', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.updatePublishingSchedule);

export default router;

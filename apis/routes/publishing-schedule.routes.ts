import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { updatePublishingScheduleSchema, rejectPublishingScheduleSchema } from '../schema/publishing-schedule.schema';
import * as ctrl from '../controller/publishing-schedule.controller';

const router: Router = Router();

// list 允许 view 角色
router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW), ctrl.listPublishingSchedule);

// update 仅 sysadmin + admin
router.put('/:id', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(updatePublishingScheduleSchema), ctrl.updatePublishingSchedule);

// reject 仅 sysadmin + admin（非创建者驳回）
router.put('/:id/reject', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(rejectPublishingScheduleSchema), ctrl.rejectPublishingSchedule);

export default router;

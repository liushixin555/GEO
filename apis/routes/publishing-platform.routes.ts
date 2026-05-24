import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/publishing-platform.controller';

const router = Router();

// sync 仅 sysadmin
router.post('/sync', authMiddleware, roleMiddleware(ROLES.SYSADMIN), ctrl.syncPublishingPlatforms);

// list 混合角色
router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.listPublishingPlatforms);

export default router;

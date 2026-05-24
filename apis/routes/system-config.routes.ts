import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/system-config.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.getSystemConfigs);
router.put('/', ctrl.updateSystemConfigs);

export default router;

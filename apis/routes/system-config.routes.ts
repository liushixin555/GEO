import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { updateSystemConfigsSchema } from '../schema/system-config.schema';
import * as ctrl from '../controller/system-config.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.getSystemConfigs);
router.put('/', validate(updateSystemConfigsSchema), ctrl.updateSystemConfigs);

export default router;

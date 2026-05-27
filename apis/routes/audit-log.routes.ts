import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { listAuditLogsSchema } from '../schema/audit-log.schema';
import * as ctrl from '../controller/audit-log.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', validate(listAuditLogsSchema, 'query'), ctrl.listAuditLogs);
router.get('/events', ctrl.getAuditLogEvents);

export default router;

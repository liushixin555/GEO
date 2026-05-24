import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/company.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.listCompanies);
router.get('/:id', ctrl.getCompany);
router.post('/', ctrl.createCompany);
router.put('/:id', ctrl.updateCompany);
router.put('/:id/status', ctrl.toggleCompanyStatus);

export default router;

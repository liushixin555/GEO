import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createCompanySchema, updateCompanySchema, toggleCompanyStatusSchema } from '../schema/company.schema';
import * as ctrl from '../controller/company.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.listCompanies);
router.get('/:id', ctrl.getCompany);
router.post('/', validate(createCompanySchema), ctrl.createCompany);
router.put('/:id', validate(updateCompanySchema), ctrl.updateCompany);
router.put('/:id/status', validate(toggleCompanyStatusSchema), ctrl.toggleCompanyStatus);

export default router;

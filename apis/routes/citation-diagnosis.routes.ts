import { Router } from 'express';
import { ROLES } from '../constants/roles';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import {
  citationLedgerDetailsParamSchema,
  createCitationDetectionRunSchema,
  createPublishedArticleLinkSchema,
  listCitationDiagnosisSchema,
  runAutomaticCitationDetectionSchema,
} from '../schema/citation-diagnosis.schema';
import * as ctrl from '../controller/citation-diagnosis.controller';

const router: Router = Router();

router.get('/links', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(listCitationDiagnosisSchema, 'query'), ctrl.listPublishedLinks);
router.post('/links', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(createPublishedArticleLinkSchema), ctrl.createPublishedLink);
router.get('/ledger', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(listCitationDiagnosisSchema, 'query'), ctrl.listLedger);
router.get('/ledger/:articleId/details', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(citationLedgerDetailsParamSchema, 'params'), ctrl.getLedgerDetails);
router.post('/run-auto', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(runAutomaticCitationDetectionSchema), ctrl.runAutomaticDetection);
router.get('/runs', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(listCitationDiagnosisSchema, 'query'), ctrl.listDetectionRuns);
router.post('/runs', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(createCitationDetectionRunSchema), ctrl.createDetectionRun);
router.get('/marks', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(listCitationDiagnosisSchema, 'query'), ctrl.listMarks);

export default router;

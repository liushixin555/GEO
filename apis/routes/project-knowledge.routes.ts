import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as knowledgeController from '../controller/knowledge.controller';

const router: Router = Router();

// Project Knowledge aggregation routes — scoped under /projects/:projectId/knowledge
router.use('/:projectId/knowledge', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
router.get('/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
router.get('/:projectId/knowledge/portraits', knowledgeController.listProjectPortraits);
router.get('/:projectId/knowledge/images', knowledgeController.listProjectImages);
router.get('/:projectId/knowledge/documents', knowledgeController.listProjectDocuments);

export default router;

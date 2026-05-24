import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createKnowledgeBaseSchema, updateKnowledgeBaseSchema } from '../schema/knowledge-base.schema';
import * as knowledgeController from '../controller/knowledge.controller';
import * as knowledgeBaseController from '../controller/knowledge-base.controller';

const router = Router();

// Project Knowledge aggregation routes (sysadmin + admin)
router.use('/projects/:projectId/knowledge', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
router.get('/projects/:projectId/knowledge/keywords', knowledgeController.listProjectKeywords);
router.get('/projects/:projectId/knowledge/portraits', knowledgeController.listProjectPortraits);
router.get('/projects/:projectId/knowledge/images', knowledgeController.listProjectImages);
router.get('/projects/:projectId/knowledge/documents', knowledgeController.listProjectDocuments);

// Knowledge Base routes (sysadmin + admin)
router.use('/knowledge-bases', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
router.get('/knowledge-bases', knowledgeBaseController.listKnowledgeBases);
router.get('/knowledge-bases/:id', knowledgeBaseController.getKnowledgeBase);
router.post('/knowledge-bases', validate(createKnowledgeBaseSchema), knowledgeBaseController.createKnowledgeBase);
router.put('/knowledge-bases/:id', validate(updateKnowledgeBaseSchema), knowledgeBaseController.updateKnowledgeBase);
router.delete('/knowledge-bases/:id', knowledgeBaseController.deleteKnowledgeBase);

// Knowledge Inventory
router.get('/knowledge-inventory', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), knowledgeController.listInventory);

// Knowledge Items scoped to knowledge base (sysadmin + admin)
router.use('/knowledge-bases/:baseId', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));
router.get('/knowledge-bases/:baseId/keywords', knowledgeController.listKeywords);
router.get('/knowledge-bases/:baseId/keywords/:id', knowledgeController.getKeyword);
router.post('/knowledge-bases/:baseId/keywords', knowledgeController.createKeyword);
router.post('/knowledge-bases/:baseId/keywords/batch', knowledgeController.batchCreateKeywords);
router.post('/knowledge-bases/:baseId/keywords/expand', knowledgeController.expandKeywords);
router.put('/knowledge-bases/:baseId/keywords/:id', knowledgeController.updateKeyword);
router.delete('/knowledge-bases/:baseId/keywords/:id', knowledgeController.deleteKeyword);
router.get('/knowledge-bases/:baseId/mined-keywords', knowledgeController.listMinedKeywords);
router.post('/knowledge-bases/:baseId/keywords/mine', knowledgeController.mineKeywords);
router.post('/knowledge-bases/:baseId/mined-keywords/save', knowledgeController.saveMinedKeywords);
router.put('/knowledge-bases/:baseId/mined-keywords/batch-toggle', knowledgeController.toggleMinedKeywordsBatch);
router.delete('/knowledge-bases/:baseId/mined-keywords', knowledgeController.deleteMinedKeywords);
router.get('/knowledge-bases/:baseId/portraits', knowledgeController.listPortraits);
router.get('/knowledge-bases/:baseId/portraits/:id', knowledgeController.getPortrait);
router.post('/knowledge-bases/:baseId/portraits', knowledgeController.createPortrait);
router.put('/knowledge-bases/:baseId/portraits/:id', knowledgeController.updatePortrait);
router.delete('/knowledge-bases/:baseId/portraits/:id', knowledgeController.deletePortrait);
router.get('/knowledge-bases/:baseId/images', knowledgeController.listImages);
router.get('/knowledge-bases/:baseId/images/:id', knowledgeController.getImage);
router.post('/knowledge-bases/:baseId/images', knowledgeController.createImage);
router.put('/knowledge-bases/:baseId/images/:id', knowledgeController.updateImage);
router.delete('/knowledge-bases/:baseId/images/:id', knowledgeController.deleteImage);
router.get('/knowledge-bases/:baseId/documents', knowledgeController.listDocuments);
router.get('/knowledge-bases/:baseId/documents/:id', knowledgeController.getDocument);
router.post('/knowledge-bases/:baseId/documents', knowledgeController.createDocument);
router.put('/knowledge-bases/:baseId/documents/:id', knowledgeController.updateDocument);
router.delete('/knowledge-bases/:baseId/documents/:id', knowledgeController.deleteDocument);

export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createKnowledgeBaseSchema, updateKnowledgeBaseSchema } from '../schema/knowledge-base.schema';
import * as knowledgeController from '../controller/knowledge.controller';
import * as knowledgeBaseController from '../controller/knowledge-base.controller';

const router: Router = Router();

// Knowledge Base routes (sysadmin + admin)
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

// Knowledge Base CRUD
router.get('/', knowledgeBaseController.listKnowledgeBases);
router.get('/inventory', knowledgeController.listInventory);
router.get('/:id', knowledgeBaseController.getKnowledgeBase);
router.post('/', validate(createKnowledgeBaseSchema), knowledgeBaseController.createKnowledgeBase);
router.put('/:id', validate(updateKnowledgeBaseSchema), knowledgeBaseController.updateKnowledgeBase);
router.delete('/:id', knowledgeBaseController.deleteKnowledgeBase);

// Knowledge Items scoped to knowledge base
router.get('/:baseId/keywords', knowledgeController.listKeywords);
router.get('/:baseId/keywords/:id', knowledgeController.getKeyword);
router.post('/:baseId/keywords', knowledgeController.createKeyword);
router.post('/:baseId/keywords/batch', knowledgeController.batchCreateKeywords);
router.post('/:baseId/keywords/expand', knowledgeController.expandKeywords);
router.put('/:baseId/keywords/:id', knowledgeController.updateKeyword);
router.delete('/:baseId/keywords/:id', knowledgeController.deleteKeyword);
router.get('/:baseId/mined-keywords', knowledgeController.listMinedKeywords);
router.post('/:baseId/keywords/mine', knowledgeController.mineKeywords);
router.post('/:baseId/mined-keywords/save', knowledgeController.saveMinedKeywords);
router.put('/:baseId/mined-keywords/batch-toggle', knowledgeController.toggleMinedKeywordsBatch);
router.delete('/:baseId/mined-keywords', knowledgeController.deleteMinedKeywords);
router.get('/:baseId/portraits', knowledgeController.listPortraits);
router.get('/:baseId/portraits/:id', knowledgeController.getPortrait);
router.post('/:baseId/portraits', knowledgeController.createPortrait);
router.put('/:baseId/portraits/:id', knowledgeController.updatePortrait);
router.delete('/:baseId/portraits/:id', knowledgeController.deletePortrait);
router.get('/:baseId/images', knowledgeController.listImages);
router.get('/:baseId/images/:id', knowledgeController.getImage);
router.post('/:baseId/images', knowledgeController.createImage);
router.put('/:baseId/images/:id', knowledgeController.updateImage);
router.delete('/:baseId/images/:id', knowledgeController.deleteImage);
router.get('/:baseId/documents', knowledgeController.listDocuments);
router.get('/:baseId/documents/:id', knowledgeController.getDocument);
router.post('/:baseId/documents', knowledgeController.createDocument);
router.put('/:baseId/documents/:id', knowledgeController.updateDocument);
router.delete('/:baseId/documents/:id', knowledgeController.deleteDocument);

export default router;

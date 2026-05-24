import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/article.controller';

const router = Router();

// Auth middleware scoped to article paths only
router.use('/projects/:projectId/articles', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

// Article routes — full paths to avoid nested mount conflicts
router.get('/projects/:projectId/articles', ctrl.listArticles);
router.get('/projects/:projectId/articles/:id', ctrl.getArticle);
router.post('/projects/:projectId/articles', ctrl.createArticle);
router.put('/projects/:projectId/articles/:id', ctrl.updateArticle);
router.delete('/projects/:projectId/articles/:id', ctrl.deleteArticle);
router.put('/projects/:projectId/articles/:id/review', ctrl.reviewArticle);
router.put('/projects/:projectId/articles/:id/regenerate', ctrl.regenerateArticle);
router.put('/projects/:projectId/articles/:id/content', ctrl.updateArticleContent);
router.put('/projects/:projectId/articles/:id/submit-review', ctrl.submitForReview);
router.get('/projects/:projectId/articles/:id/versions', ctrl.listArticleVersions);

export default router;

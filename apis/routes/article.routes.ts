import { Router } from 'express';
import { authMiddleware, roleMiddleware, articleActionLimiter } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createArticleSchema, updateArticleSchema, reviewArticleSchema, updateContentSchema, listArticlesSchema } from '../schema/article.schema';
import * as ctrl from '../controller/article.controller';

const router: Router = Router();

// Auth middleware scoped to article paths only
router.use('/projects/:projectId/articles', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

// Article routes — full paths to avoid nested mount conflicts
router.get('/projects/:projectId/articles', validate(listArticlesSchema, 'query'), ctrl.listArticles);
router.get('/projects/:projectId/articles/:id', ctrl.getArticle);
router.post('/projects/:projectId/articles', validate(createArticleSchema), ctrl.createArticle);
router.put('/projects/:projectId/articles/:id', validate(updateArticleSchema), ctrl.updateArticle);
router.delete('/projects/:projectId/articles/:id', articleActionLimiter, ctrl.deleteArticle);
router.put('/projects/:projectId/articles/:id/review', articleActionLimiter, validate(reviewArticleSchema), ctrl.reviewArticle);
router.put('/projects/:projectId/articles/:id/regenerate', articleActionLimiter, ctrl.regenerateArticle);
router.put('/projects/:projectId/articles/:id/content', validate(updateContentSchema), ctrl.updateArticleContent);
router.put('/projects/:projectId/articles/:id/submit-review', ctrl.submitForReview);
router.get('/projects/:projectId/articles/:id/versions', ctrl.listArticleVersions);

export default router;

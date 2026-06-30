import { Router } from 'express';
import { authMiddleware, roleMiddleware, articleActionLimiter } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createArticleSchema, batchCreateArticlesSchema, batchRegenerateArticlesSchema, regenerateArticleSchema, updateArticleSchema, reviewArticleSchema, updateContentSchema, listArticlesSchema } from '../schema/article.schema';
import * as ctrl from '../controller/article.controller';

const router: Router = Router();

// Auth middleware scoped to article paths only
router.use('/:projectId/articles', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

// Article routes — full paths to avoid nested mount conflicts
router.get('/:projectId/articles', validate(listArticlesSchema, 'query'), ctrl.listArticles);
router.post('/:projectId/articles/batch', validate(batchCreateArticlesSchema), ctrl.batchCreateArticles);
router.put('/:projectId/articles/batch-regenerate', articleActionLimiter, validate(batchRegenerateArticlesSchema), ctrl.batchRegenerateArticles);
router.get('/:projectId/articles/:id', ctrl.getArticle);
router.post('/:projectId/articles', validate(createArticleSchema), ctrl.createArticle);
router.put('/:projectId/articles/:id', validate(updateArticleSchema), ctrl.updateArticle);
router.delete('/:projectId/articles/:id', articleActionLimiter, ctrl.deleteArticle);
router.put('/:projectId/articles/:id/review', articleActionLimiter, validate(reviewArticleSchema), ctrl.reviewArticle);
router.put('/:projectId/articles/:id/regenerate', articleActionLimiter, validate(regenerateArticleSchema), ctrl.regenerateArticle);
router.put('/:projectId/articles/:id/content', validate(updateContentSchema), ctrl.updateArticleContent);
router.put('/:projectId/articles/:id/submit-review', ctrl.submitForReview);
router.get('/:projectId/articles/:id/versions', ctrl.listArticleVersions);
router.get('/:projectId/articles/:id/generation-debug', ctrl.getArticleGenerationDebug);
router.get('/:projectId/articles/:id/evidence-cards', ctrl.listArticleEvidenceCards);

export default router;

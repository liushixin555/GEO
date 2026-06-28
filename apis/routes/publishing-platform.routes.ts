import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { updatePublishingPlatformFavoriteSchema } from '../schema/publishing-platform.schema';
import * as ctrl from '../controller/publishing-platform.controller';

const router: Router = Router();

// sync 仅 sysadmin
router.post('/sync', authMiddleware, roleMiddleware(ROLES.SYSADMIN), ctrl.syncPublishingPlatforms);

// taxonomies 混合角色
router.get('/taxonomies', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.listTaxonomies);

// list 混合角色
router.put('/:id/favorite', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(updatePublishingPlatformFavoriteSchema), ctrl.updatePublishingPlatformFavorite);
router.post('/:id/favorite', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(updatePublishingPlatformFavoriteSchema), ctrl.updatePublishingPlatformFavorite);

router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.listPublishingPlatforms);

export default router;

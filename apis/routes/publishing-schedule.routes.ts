import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createPublishingScheduleSchema, updatePublishingScheduleSchema, rejectPublishingScheduleSchema, listPublishingScheduleSchema, listPublishableArticlesSchema, autoCreatePublishingScheduleSchema } from '../schema/publishing-schedule.schema';
import * as ctrl from '../controller/publishing-schedule.controller';

const router: Router = Router();

// 发布计划列表允许 view 角色
router.get('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW), validate(listPublishingScheduleSchema, 'query'), ctrl.listPublishingSchedule);

// 获取可发布文章列表
router.get('/articles', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(listPublishableArticlesSchema, 'query'), ctrl.listPublishableArticles);

// 创建发布计划
router.post('/auto', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(autoCreatePublishingScheduleSchema), ctrl.autoCreatePublishingSchedule);

router.get('/:id/orders', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN, ROLES.VIEW), ctrl.listPublishingScheduleOrders);
router.post('/:id/orders/sync', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.syncPublishingScheduleOrders);

router.post('/', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(createPublishingScheduleSchema), ctrl.createPublishingSchedule);

// 更新发布计划
router.put('/:id', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(updatePublishingScheduleSchema), ctrl.updatePublishingSchedule);

// 驳回发布计划
router.put('/:id/reject', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), validate(rejectPublishingScheduleSchema), ctrl.rejectPublishingSchedule);

// 删除发布计划
router.delete('/:id', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.deletePublishingSchedule);

export default router;

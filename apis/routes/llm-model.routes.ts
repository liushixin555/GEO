import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/llm-model.controller';

const router = Router();

// listEnabled 混合角色，放在 router 级中间件之前单独处理
router.get('/enabled', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.listEnabledLlmModels);

// 其余路由仅 sysadmin
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.listLlmModels);
router.get('/:id', ctrl.getLlmModel);
router.post('/', ctrl.createLlmModel);
router.put('/:id', ctrl.updateLlmModel);
router.delete('/:id', ctrl.deleteLlmModel);

export default router;

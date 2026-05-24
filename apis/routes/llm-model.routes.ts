import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createLlmModelSchema, updateLlmModelSchema } from '../schema/llm-model.schema';
import * as ctrl from '../controller/llm-model.controller';

const router = Router();

// listEnabled 混合角色，放在 router 级中间件之前单独处理
router.get('/enabled', authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN), ctrl.listEnabledLlmModels);

// 其余路由仅 sysadmin
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.listLlmModels);
router.get('/:id', ctrl.getLlmModel);
router.post('/', validate(createLlmModelSchema), ctrl.createLlmModel);
router.put('/:id', validate(updateLlmModelSchema), ctrl.updateLlmModel);
router.delete('/:id', ctrl.deleteLlmModel);

export default router;

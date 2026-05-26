import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createUserSchema, updateUserSchema, listUsersSchema, idParamSchema } from '../schema/user.schema';
import * as ctrl from '../controller/user.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', validate(listUsersSchema, 'query'), ctrl.listUsers);
router.get('/:id', validate(idParamSchema, 'params'), ctrl.getUser);
router.post('/', validate(createUserSchema), ctrl.createUser);
router.put('/:id', validate(idParamSchema, 'params'), validate(updateUserSchema), ctrl.updateUser);
router.delete('/:id', validate(idParamSchema, 'params'), ctrl.deleteUser);

export default router;

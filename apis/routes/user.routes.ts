import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { createUserSchema, updateUserSchema, listUsersSchema } from '../schema/user.schema';
import * as ctrl from '../controller/user.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', validate(listUsersSchema, 'query'), ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', validate(createUserSchema), ctrl.createUser);
router.put('/:id', validate(updateUserSchema), ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

export default router;

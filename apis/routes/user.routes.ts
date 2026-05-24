import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/user.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN));

router.get('/', ctrl.listUsers);
router.get('/:id', ctrl.getUser);
router.post('/', ctrl.createUser);
router.put('/:id', ctrl.updateUser);
router.delete('/:id', ctrl.deleteUser);

export default router;

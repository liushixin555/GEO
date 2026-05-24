import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as ctrl from '../controller/todo.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', ctrl.listTodos);
router.get('/object-options', ctrl.getObjectOptions);
router.get('/assignee-candidates', ctrl.getAssigneeCandidates);
router.get('/:id', ctrl.getTodo);
router.post('/', ctrl.createTodo);
router.put('/:id', ctrl.updateTodo);
router.post('/:id/close', ctrl.closeTodo);
router.post('/:id/reopen', ctrl.reopenTodo);
router.post('/:id/transfer', ctrl.transferTodo);
router.post('/:id/reject', ctrl.rejectTodo);
router.get('/:id/logs', ctrl.getTodoLogs);

export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { listTodosSchema, createTodoSchema, updateTodoSchema, transferTodoSchema, objectOptionsSchema, assigneeCandidatesSchema } from '../schema/todo.schema';
import * as ctrl from '../controller/todo.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', validate(listTodosSchema, 'query'), ctrl.listTodos);
router.get('/object-options', validate(objectOptionsSchema, 'query'), ctrl.getObjectOptions);
router.get('/assignee-candidates', validate(assigneeCandidatesSchema, 'query'), ctrl.getAssigneeCandidates);
router.get('/:id', ctrl.getTodo);
router.post('/', validate(createTodoSchema), ctrl.createTodo);
router.put('/:id', validate(updateTodoSchema), ctrl.updateTodo);
router.post('/:id/close', ctrl.closeTodo);
router.post('/:id/reopen', ctrl.reopenTodo);
router.post('/:id/transfer', validate(transferTodoSchema), ctrl.transferTodo);
router.post('/:id/reject', ctrl.rejectTodo);
router.get('/:id/logs', ctrl.getTodoLogs);

export default router;

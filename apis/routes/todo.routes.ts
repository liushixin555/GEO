import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import { listTodosSchema, createTodoSchema, updateTodoSchema, transferTodoSchema, objectOptionsSchema, assigneeCandidatesSchema, todoIdSchema } from '../schema/todo.schema';
import * as ctrl from '../controller/todo.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', validate(listTodosSchema, 'query'), ctrl.listTodos);
router.get('/object-options', validate(objectOptionsSchema, 'query'), ctrl.getObjectOptions);
router.get('/assignee-candidates', validate(assigneeCandidatesSchema, 'query'), ctrl.getAssigneeCandidates);
router.get('/:id', validate(todoIdSchema, 'params'), ctrl.getTodo);
router.post('/', validate(createTodoSchema), ctrl.createTodo);
router.put('/:id', validate(todoIdSchema, 'params'), validate(updateTodoSchema), ctrl.updateTodo);
router.post('/:id/close', validate(todoIdSchema, 'params'), ctrl.closeTodo);
router.post('/:id/reopen', validate(todoIdSchema, 'params'), ctrl.reopenTodo);
router.post('/:id/transfer', validate(todoIdSchema, 'params'), validate(transferTodoSchema), ctrl.transferTodo);
router.post('/:id/reject', validate(todoIdSchema, 'params'), ctrl.rejectTodo);
router.get('/:id/logs', validate(todoIdSchema, 'params'), ctrl.getTodoLogs);

export default router;

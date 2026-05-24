import { Router } from 'express';
import { authMiddleware, loginLimiter } from '../middleware';
import { validate } from '../middleware/validate';
import { loginSchema, saveSelectionSchema } from '../schema/auth.schema';
import * as ctrl from '../controller/auth.controller';

const router: Router = Router();

// Public route (no auth required, but rate-limited to prevent brute force)
router.post('/login', loginLimiter, validate(loginSchema), ctrl.login);

// Authenticated routes
router.get('/verify', authMiddleware, ctrl.verify);
router.post('/logout', authMiddleware, ctrl.logout);
router.put('/selection', authMiddleware, validate(saveSelectionSchema), ctrl.saveSelection);
router.get('/companies', authMiddleware, ctrl.getAccessibleCompanies);
router.get('/companies/:id', authMiddleware, ctrl.getCompanyDetail);
router.get('/projects', authMiddleware, ctrl.getAccessibleProjects);
router.get('/context', authMiddleware, ctrl.getContext);

export default router;

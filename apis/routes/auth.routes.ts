import { Router } from 'express';
import { authMiddleware } from '../middleware';
import * as ctrl from '../controller/auth.controller';

const router = Router();

// Public route (no auth required)
router.post('/login', ctrl.login);

// Authenticated routes
router.get('/verify', authMiddleware, ctrl.verify);
router.post('/logout', authMiddleware, ctrl.logout);
router.put('/selection', authMiddleware, ctrl.saveSelection);
router.get('/companies', authMiddleware, ctrl.getAccessibleCompanies);
router.get('/companies/:id', authMiddleware, ctrl.getCompanyDetail);
router.get('/projects', authMiddleware, ctrl.getAccessibleProjects);
router.get('/context', authMiddleware, ctrl.getContext);

export default router;

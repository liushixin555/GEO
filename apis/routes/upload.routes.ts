import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import { uploadMiddleware, uploadFile } from '../controller/upload.controller';
import { uploadDocumentMiddleware, uploadDocumentFile } from '../controller/upload-document.controller';

const router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.post('/', uploadMiddleware, uploadFile);
router.post('/document', uploadDocumentMiddleware, uploadDocumentFile);

export default router;

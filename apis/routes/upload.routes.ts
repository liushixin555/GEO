import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { ROLES } from '../constants/roles';
import * as uploadCtrl from '../controller/upload.controller';
import * as uploadDocumentCtrl from '../controller/upload-document.controller';

const router: Router = Router();
router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.post('/', uploadCtrl.uploadMiddleware, uploadCtrl.uploadFile);
router.post('/document', uploadDocumentCtrl.uploadDocumentMiddleware, uploadDocumentCtrl.uploadDocumentFile);

export default router;

import { Router } from 'express';
import { authMiddleware, roleMiddleware } from '../middleware';
import { validate } from '../middleware/validate';
import { ROLES } from '../constants/roles';
import {
  createEvidenceCardSchema,
  deleteEvidenceCardsSchema,
  updateEvidenceCardSchema,
} from '../schema/evidence-card.schema';
import * as evidenceCardController from '../controller/evidence-card.controller';

const router: Router = Router();

router.use(authMiddleware, roleMiddleware(ROLES.SYSADMIN, ROLES.ADMIN));

router.get('/', evidenceCardController.listEvidenceCards);
router.get('/:id', evidenceCardController.getEvidenceCard);
router.post('/', validate(createEvidenceCardSchema), evidenceCardController.createEvidenceCard);
router.put('/:id', validate(updateEvidenceCardSchema), evidenceCardController.updateEvidenceCard);
router.delete('/', validate(deleteEvidenceCardsSchema), evidenceCardController.deleteEvidenceCards);

export default router;

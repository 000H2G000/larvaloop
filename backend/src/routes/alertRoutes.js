import { Router } from 'express';
import * as alerts from '../controllers/alertController.js';
import { validate } from '../middlewares/validateMiddleware.js';
import { alertIdParams, listAlertsQuery } from '../validators/alertValidator.js';

// TODO(Phase 2): protect with JWT auth + roles.
const router = Router();

router.get('/', validate({ query: listAlertsQuery }), alerts.listAlerts);
router.patch('/:id/acknowledge', validate({ params: alertIdParams }), alerts.acknowledgeAlert);
router.patch('/:id/resolve', validate({ params: alertIdParams }), alerts.resolveAlert);

export default router;

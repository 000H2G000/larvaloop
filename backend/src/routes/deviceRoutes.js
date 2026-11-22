import { Router } from 'express';
import * as devices from '../controllers/deviceController.js';

// TODO(Phase 2): protect with JWT auth. Devices are registered with `npm run device:register`.
const router = Router();

router.get('/', devices.listDevices);

export default router;

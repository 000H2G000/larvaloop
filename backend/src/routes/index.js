import { Router } from 'express';
import healthRoutes from './healthRoutes.js';
import imageRoutes from './imageRoutes.js';
import telemetryRoutes from './telemetryRoutes.js';
import alertRoutes from './alertRoutes.js';
import deviceRoutes from './deviceRoutes.js';

const router = Router();

router.use('/health', healthRoutes);
router.use('/images', imageRoutes);
router.use('/telemetry', telemetryRoutes);
router.use('/alerts', alertRoutes);
router.use('/devices', deviceRoutes);

// Later phases mount here:
// router.use('/auth', authRoutes);
// router.use('/devices', deviceRoutes);
// ...

export default router;

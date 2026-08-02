import { Router } from 'express';

import HealthController from '../controllers/HealthController.js';
import userRoutes from './userRoutes.js';

const router = Router();
const healthController = new HealthController();

router.get('/health', healthController.health);
router.use('/api', userRoutes);

export default router;

import { Router } from 'express';
import { getMyAssignedServices, updateMyServiceStatus } from '../controllers/mechanicController';
import { authMiddleware, mechanicMiddleware } from '../middleware/auth';

const router = Router();

router.use(authMiddleware);
router.use(mechanicMiddleware);

router.get('/services', getMyAssignedServices);
router.patch('/services/:type/:id/status', updateMyServiceStatus);

export default router;

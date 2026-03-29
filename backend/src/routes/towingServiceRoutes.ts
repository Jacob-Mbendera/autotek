import { Router } from 'express';
import {
  createTowingService,
  getTowingServices,
  getTowingService,
  updateTowingService,
  cancelTowingService,
} from '../controllers/towingServiceController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createTowingService);
router.get('/', optionalAuthMiddleware, getTowingServices);
router.put('/:id/cancel', authMiddleware, cancelTowingService); // Cancel service - MUST be before /:id
router.get('/:id', optionalAuthMiddleware, getTowingService);
router.put('/:id', authMiddleware, updateTowingService); // Admin only

export default router;

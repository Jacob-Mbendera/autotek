import { Router } from 'express';
import {
  createTowingService,
  getTowingServices,
  getTowingService,
  updateTowingService,
} from '../controllers/towingServiceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createTowingService);
router.get('/', authMiddleware, getTowingServices);
router.get('/:id', authMiddleware, getTowingService);
router.put('/:id', authMiddleware, updateTowingService);

export default router;

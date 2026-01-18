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
router.get('/', getTowingServices); // Public - browsing allowed
router.get('/:id', getTowingService); // Public - browsing allowed
router.put('/:id', authMiddleware, updateTowingService);

export default router;

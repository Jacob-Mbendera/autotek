import { Router } from 'express';
import {
  createCarService,
  getCarServices,
  getCarService,
  updateCarService,
  cancelCarService,
} from '../controllers/carServiceController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createCarService);
router.get('/', optionalAuthMiddleware, getCarServices);
router.put('/:id/cancel', authMiddleware, cancelCarService); // Cancel service - MUST be before /:id
router.get('/:id', optionalAuthMiddleware, getCarService);
router.put('/:id', authMiddleware, updateCarService); // Admin only

export default router;

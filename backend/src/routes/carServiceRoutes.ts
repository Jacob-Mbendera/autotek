import { Router } from 'express';
import {
  createCarService,
  getCarServices,
  getCarService,
  updateCarService,
} from '../controllers/carServiceController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createCarService);
router.get('/', authMiddleware, getCarServices);
router.get('/:id', authMiddleware, getCarService);
router.put('/:id', authMiddleware, updateCarService);

export default router;

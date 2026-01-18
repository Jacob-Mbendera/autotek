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
router.get('/', getCarServices); // Public - browsing allowed
router.get('/:id', getCarService); // Public - browsing allowed
router.put('/:id', authMiddleware, updateCarService);

export default router;

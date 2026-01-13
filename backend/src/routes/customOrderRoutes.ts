import { Router } from 'express';
import {
  createCustomOrder,
  getCustomOrders,
  getCustomOrder,
  updateCustomOrder,
} from '../controllers/customOrderController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createCustomOrder);
router.get('/', authMiddleware, getCustomOrders);
router.get('/:id', authMiddleware, getCustomOrder);
router.put('/:id', authMiddleware, adminMiddleware, updateCustomOrder);

export default router;

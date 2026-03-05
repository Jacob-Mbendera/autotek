import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Allow guest checkout - optional auth
router.post('/', optionalAuthMiddleware, createOrder);
router.get('/', authMiddleware, getOrders); // User orders require auth
router.get('/:id', optionalAuthMiddleware, getOrder); // Allow guest lookup with email
router.put('/:id/cancel', optionalAuthMiddleware, cancelOrder); // Allow guest cancellation with email
router.put('/:id/status', authMiddleware, adminMiddleware, updateOrderStatus);

export default router;

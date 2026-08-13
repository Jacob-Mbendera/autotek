import { Router } from 'express';
import {
  createOrder,
  getOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { validateUpdateOrderStatus } from '../middleware/adminValidation';

const router = Router();

// Allow guest checkout - optional auth
router.post('/', optionalAuthMiddleware, createOrder);
router.get('/', authMiddleware, getOrders); // User orders require auth
router.get('/:id', optionalAuthMiddleware, getOrder); // Allow guest lookup with email
router.put('/:id/cancel', optionalAuthMiddleware, cancelOrder); // Allow guest cancellation with email
router.put('/:id/status', authMiddleware, adminMiddleware, validate(validateUpdateOrderStatus), updateOrderStatus);

export default router;

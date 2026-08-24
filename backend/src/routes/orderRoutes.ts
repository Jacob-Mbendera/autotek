import { Router } from 'express';
import {
  createOrder,
  createBankTransferOrder,
  confirmBankTransferPayment,
  rejectBankTransferPayment,
  getOrders,
  getOrder,
  cancelOrder,
  updateOrderStatus,
} from '../controllers/orderController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import { validateUpdateOrderStatus, validateRejectBankTransferPayment } from '../middleware/adminValidation';
import { uploadPaymentProof } from '../middleware/upload';

const router = Router();

// Allow guest checkout - optional auth
router.post('/', optionalAuthMiddleware, createOrder);
router.post('/bank-transfer', optionalAuthMiddleware, uploadPaymentProof, createBankTransferOrder);
router.get('/', authMiddleware, getOrders); // User orders require auth
router.get('/:id', optionalAuthMiddleware, getOrder); // Allow guest lookup with email
router.put('/:id/cancel', optionalAuthMiddleware, cancelOrder); // Allow guest cancellation with email
router.put('/:id/status', authMiddleware, adminMiddleware, validate(validateUpdateOrderStatus), updateOrderStatus);
router.put('/:id/payment/confirm', authMiddleware, adminMiddleware, confirmBankTransferPayment);
router.put('/:id/payment/reject', authMiddleware, adminMiddleware, validate(validateRejectBankTransferPayment), rejectBankTransferPayment);

export default router;

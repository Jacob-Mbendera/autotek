import { Router } from 'express';
import {
  initiatePaymentRequest,
  getPayment,
  getPaymentByOrder,
  getPaymentByTowingService,
  getPaymentByCarService,
  payChanguWebhook,
  verifyPaymentByTxRef,
} from '../controllers/paymentController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { paymentLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/initiate', paymentLimiter, optionalAuthMiddleware, initiatePaymentRequest);
router.get('/order/:orderId', authMiddleware, getPaymentByOrder);
router.get('/towing-service/:serviceId', authMiddleware, getPaymentByTowingService);
router.get('/car-service/:serviceId', authMiddleware, getPaymentByCarService);
router.get('/verify-txref', verifyPaymentByTxRef as any); // Public endpoint for PayChangu callback verification
router.get('/:id', authMiddleware, getPayment);
router.post('/webhook/paychangu', payChanguWebhook as any); // PayChangu webhook endpoint

export default router;

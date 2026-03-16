import { Router } from 'express';
import {
  initiatePaymentRequest,
  getPayment,
  getPaymentByOrder,
  paymentCallback,
  payChanguWebhook,
  verifyPayment,
  verifyPaymentByTxRef,
} from '../controllers/paymentController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/initiate', authMiddleware, initiatePaymentRequest);
router.get('/order/:orderId', authMiddleware, getPaymentByOrder);
router.get('/verify-txref', verifyPaymentByTxRef as any); // Public endpoint for PayChangu callback verification
router.get('/:id', authMiddleware, getPayment);
router.post('/callback', paymentCallback as any); // Public endpoint for webhooks (Airtel Money, etc.)
router.post('/webhook/paychangu', payChanguWebhook as any); // PayChangu webhook endpoint
router.post('/verify', authMiddleware, adminMiddleware, verifyPayment);

export default router;

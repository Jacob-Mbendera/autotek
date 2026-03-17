import { Router } from 'express';
import {
  initiatePaymentRequest,
  getPayment,
  getPaymentByOrder,
  payChanguWebhook,
  verifyPaymentByTxRef,
} from '../controllers/paymentController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/initiate', authMiddleware, initiatePaymentRequest);
router.get('/order/:orderId', authMiddleware, getPaymentByOrder);
router.get('/verify-txref', verifyPaymentByTxRef as any); // Public endpoint for PayChangu callback verification
router.get('/:id', authMiddleware, getPayment);
router.post('/webhook/paychangu', payChanguWebhook as any); // PayChangu webhook endpoint

export default router;

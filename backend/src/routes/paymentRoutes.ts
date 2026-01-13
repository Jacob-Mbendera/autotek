import { Router } from 'express';
import {
  initiatePaymentRequest,
  getPayment,
  paymentCallback,
  verifyPayment,
} from '../controllers/paymentController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';

const router = Router();

router.post('/initiate', authMiddleware, initiatePaymentRequest);
router.get('/:id', authMiddleware, getPayment);
router.post('/callback', paymentCallback); // Public endpoint for webhooks
router.post('/verify', authMiddleware, adminMiddleware, verifyPayment);

export default router;

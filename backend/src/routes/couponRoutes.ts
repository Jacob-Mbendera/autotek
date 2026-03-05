import { Router } from 'express';
import {
  validateCoupon,
  getAllCoupons,
  getCoupon,
  createCoupon,
  updateCoupon,
  deleteCoupon,
} from '../controllers/couponController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

// Public endpoint - validate coupon (optional auth for user limit checking)
router.post('/validate', optionalAuthMiddleware, validateCoupon);

// Admin endpoints
router.get('/admin', authMiddleware, adminMiddleware, getAllCoupons);
router.get('/admin/:id', authMiddleware, adminMiddleware, getCoupon);
router.post('/admin', authMiddleware, adminMiddleware, createCoupon);
router.put('/admin/:id', authMiddleware, adminMiddleware, updateCoupon);
router.delete('/admin/:id', authMiddleware, adminMiddleware, deleteCoupon);

export default router;

import { Router } from 'express';
import {
  createReturn,
  getUserReturns,
  getReturn,
  cancelReturn,
  getAllReturns,
  approveReturn,
  rejectReturn,
  processRefund,
} from '../controllers/returnController';
import { completeAdminReturnRefund } from '../controllers/adminRefundController';
import { authMiddleware, adminMiddleware, optionalAuthMiddleware } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';

const router = Router();

// User endpoints (optional auth for guest support)
router.post('/', optionalAuthMiddleware, uploadMultiple, createReturn);
router.get('/', optionalAuthMiddleware, getUserReturns);
router.get('/:id', optionalAuthMiddleware, getReturn);
router.put('/:id/cancel', optionalAuthMiddleware, cancelReturn);

export default router;

// Admin router (separate export for admin routes)
export const adminReturnRouter = Router();

adminReturnRouter.get('/', authMiddleware, adminMiddleware, getAllReturns);
adminReturnRouter.put('/:id/approve', authMiddleware, adminMiddleware, approveReturn);
adminReturnRouter.put('/:id/reject', authMiddleware, adminMiddleware, rejectReturn);
adminReturnRouter.post('/:id/refund', authMiddleware, adminMiddleware, processRefund);
adminReturnRouter.patch('/:id/complete-refund', authMiddleware, adminMiddleware, completeAdminReturnRefund);

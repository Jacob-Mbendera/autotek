import { Router } from 'express';
import {
  createCarService,
  getCarServices,
  getCarService,
  updateCarService,
  cancelCarService,
  requestCarServiceQuote,
} from '../controllers/carServiceController';
import { rateCarServiceProvider } from '../controllers/serviceRatingController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createCarService);
router.get('/', optionalAuthMiddleware, getCarServices);
router.put('/:id/cancel', authMiddleware, cancelCarService); // Cancel service - MUST be before /:id
router.post('/:id/quote-request', authMiddleware, requestCarServiceQuote);
router.post('/:id/provider-rating', authMiddleware, rateCarServiceProvider);
router.get('/:id', optionalAuthMiddleware, getCarService);
router.put('/:id', authMiddleware, updateCarService); // Admin only

export default router;

import { Router } from 'express';
import {
  createTowingService,
  getTowingServices,
  getTowingService,
  updateTowingService,
  cancelTowingService,
  requestTowingQuote,
} from '../controllers/towingServiceController';
import { rateTowingProvider } from '../controllers/serviceRatingController';
import { authMiddleware, optionalAuthMiddleware } from '../middleware/auth';

const router = Router();

router.post('/', authMiddleware, createTowingService);
router.get('/', optionalAuthMiddleware, getTowingServices);
router.put('/:id/cancel', authMiddleware, cancelTowingService); // Cancel service - MUST be before /:id
router.post('/:id/quote-request', authMiddleware, requestTowingQuote);
router.post('/:id/provider-rating', authMiddleware, rateTowingProvider);
router.get('/:id', optionalAuthMiddleware, getTowingService);
router.put('/:id', authMiddleware, updateTowingService); // Admin only

export default router;

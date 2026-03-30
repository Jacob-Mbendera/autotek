import { Router } from 'express';
import { reverseGeocodeHandler } from '../controllers/geocodingController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

router.post('/reverse', authMiddleware, reverseGeocodeHandler);

export default router;

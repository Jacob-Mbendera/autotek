import { Router } from 'express';
import { submitContactMessage } from '../controllers/contactController';
import { validate } from '../middleware/validation';
import { validateContactMessage } from '../middleware/contactValidation';
import { authLimiter } from '../middleware/rateLimiter';

const router = Router();

router.post('/', authLimiter, validate(validateContactMessage), submitContactMessage);

export default router;

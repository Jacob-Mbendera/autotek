import { Router } from 'express';
import {
  createCustomOrder,
  getCustomOrders,
  getCustomOrder,
  updateCustomOrder,
} from '../controllers/customOrderController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { uploadCustomOrderImages } from '../middleware/upload';
import { validateCreateCustomOrderRequest } from '../middleware/customOrderValidation';
import { validate } from '../middleware/validation';
import { validateUpdateCustomOrder } from '../middleware/adminValidation';

const router = Router();

router.post(
  '/',
  authMiddleware,
  uploadCustomOrderImages,
  validateCreateCustomOrderRequest,
  createCustomOrder
);
router.get('/', authMiddleware, getCustomOrders);
router.get('/:id', authMiddleware, getCustomOrder);
router.put('/:id', authMiddleware, adminMiddleware, validate(validateUpdateCustomOrder), updateCustomOrder);

export default router;

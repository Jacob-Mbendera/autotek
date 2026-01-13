import { Router } from 'express';
import {
  getStats,
  getAllOrders,
  getAllCustomOrders,
  getAllServices,
} from '../controllers/adminController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  validateGetAllOrders,
  validateGetAllCustomOrders,
  validateGetAllServices,
} from '../middleware/adminValidation';

const router = Router();

// All admin routes require authentication and admin role
router.use(authMiddleware);
router.use(adminMiddleware);

router.get('/stats', getStats);
router.get('/orders', validate(validateGetAllOrders), getAllOrders);
router.get('/custom-orders', validate(validateGetAllCustomOrders), getAllCustomOrders);
router.get('/services', validate(validateGetAllServices), getAllServices);

export default router;

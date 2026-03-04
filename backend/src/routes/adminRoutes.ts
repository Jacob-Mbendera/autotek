import { Router } from 'express';
import {
  getStats,
  getAllOrders,
  getOrder,
  getAllCustomOrders,
  getAllServices,
  getAllUsers,
  getUser,
  updateUserRole,
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
router.get('/orders/:id', getOrder);
router.get('/custom-orders', validate(validateGetAllCustomOrders), getAllCustomOrders);
router.get('/services', validate(validateGetAllServices), getAllServices);
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/role', updateUserRole);

export default router;

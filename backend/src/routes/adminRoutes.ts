import { Router } from 'express';
import {
  getStats,
  getAllOrders,
  getOrder,
  getAllCustomOrders,
  getCustomOrder,
  getAllServices,
  getAllUsers,
  getUser,
  updateUserRole,
} from '../controllers/adminController';
import {
  listGarages,
  createGarage,
  updateGarage,
  deleteGarage,
  listServiceProviders,
  listProvidersForAssignment,
  createServiceProvider,
  updateServiceProvider,
  listAdminPayouts,
  markPayoutPaid,
} from '../controllers/providerAdminController';
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
router.get('/custom-orders/:id', getCustomOrder);
router.get('/services', validate(validateGetAllServices), getAllServices);
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.patch('/users/:id/role', updateUserRole);

router.get('/garages', listGarages);
router.post('/garages', createGarage);
router.patch('/garages/:id', updateGarage);
router.delete('/garages/:id', deleteGarage);

router.get('/service-providers', listServiceProviders);
router.get('/service-providers/for-assignment', listProvidersForAssignment);
router.post('/service-providers', createServiceProvider);
router.patch('/service-providers/:id', updateServiceProvider);

router.get('/service-payouts', listAdminPayouts);
router.patch('/service-payouts/:id/mark-paid', markPayoutPaid);

export default router;

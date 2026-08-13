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
import { listMediaAssets, uploadMediaLibrary, deleteMediaAsset } from '../controllers/mediaAssetController';
import { uploadLibraryFiles } from '../middleware/upload';
import {
  listGarages,
  createGarage,
  updateGarage,
  deleteGarage,
  listServiceProviders,
  listProvidersForAssignment,
  createServiceProvider,
  updateServiceProvider,
  inviteServiceProviderAsMechanic,
  listAdminPayouts,
  markPayoutPaid,
} from '../controllers/providerAdminController';
import {
  getAdminRefunds,
  completeAdminRefund,
} from '../controllers/adminRefundController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { validate } from '../middleware/validation';
import {
  validateGetAllOrders,
  validateGetAllCustomOrders,
  validateGetAllServices,
  validateCreateGarage,
  validateUpdateGarage,
  validateCreateServiceProvider,
  validateUpdateServiceProvider,
  validateInviteServiceProvider,
  validateMarkPayoutPaid,
  validateCompleteAdminRefund,
  validateDeleteMediaAsset,
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
router.post('/garages', validate(validateCreateGarage), createGarage);
router.patch('/garages/:id', validate(validateUpdateGarage), updateGarage);
router.delete('/garages/:id', deleteGarage);

router.get('/service-providers', listServiceProviders);
router.get('/service-providers/for-assignment', listProvidersForAssignment);
router.post('/service-providers', validate(validateCreateServiceProvider), createServiceProvider);
router.patch('/service-providers/:id', validate(validateUpdateServiceProvider), updateServiceProvider);
router.post(
  '/service-providers/:id/invite',
  validate(validateInviteServiceProvider),
  inviteServiceProviderAsMechanic
);

router.get('/service-payouts', listAdminPayouts);
router.patch('/service-payouts/:id/mark-paid', validate(validateMarkPayoutPaid), markPayoutPaid);

router.get('/refunds', getAdminRefunds);
router.patch('/refunds/:id/complete', validate(validateCompleteAdminRefund), completeAdminRefund);

router.get('/media-assets', listMediaAssets);
router.post('/media-assets', uploadLibraryFiles, uploadMediaLibrary);
router.delete('/media-assets/:id', validate(validateDeleteMediaAsset), deleteMediaAsset);

export default router;

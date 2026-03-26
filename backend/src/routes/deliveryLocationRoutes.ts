import express from 'express';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import {
  getDeliveryLocations,
  createTown,
  updateTown,
  deleteTown,
  createLandmark,
  updateLandmark,
  deleteLandmark,
} from '../controllers/deliveryLocationController';

const router = express.Router();

// Public routes
router.get('/', getDeliveryLocations);

// Admin routes - require both authentication and admin role
router.post('/', authMiddleware, adminMiddleware, createTown);
router.put('/:id', authMiddleware, adminMiddleware, updateTown);
router.delete('/:id', authMiddleware, adminMiddleware, deleteTown);
router.post('/:id/landmarks', authMiddleware, adminMiddleware, createLandmark);
router.put('/:id/landmarks/:landmarkId', authMiddleware, adminMiddleware, updateLandmark);
router.delete('/:id/landmarks/:landmarkId', authMiddleware, adminMiddleware, deleteLandmark);

export default router;

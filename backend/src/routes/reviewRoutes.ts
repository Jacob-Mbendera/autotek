import { Router } from 'express';
import {
  getProductReviews,
  createReview,
  updateReview,
  deleteReview,
  markHelpful,
  getUserReview,
} from '../controllers/reviewController';
import { authMiddleware } from '../middleware/auth';

const router = Router();

// Public routes
router.get('/product/:productId', getProductReviews);

// Protected routes
router.get('/product/:productId/user', authMiddleware, getUserReview);
router.post('/product/:productId', authMiddleware, createReview);
router.put('/:reviewId', authMiddleware, updateReview);
router.delete('/:reviewId', authMiddleware, deleteReview);
router.post('/:reviewId/helpful', authMiddleware, markHelpful);

export default router;

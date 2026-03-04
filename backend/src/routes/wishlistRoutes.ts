import { Router } from 'express';
import {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
  clearWishlist,
} from '../controllers/wishlistController';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All wishlist routes require authentication
router.use(authMiddleware);

router.get('/', getWishlist);

router.post(
  '/',
  validate([
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID'),
  ]),
  addToWishlist
);

router.delete(
  '/:productId',
  validate([
    param('productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
  ]),
  removeFromWishlist
);

router.delete('/', clearWishlist);

export default router;

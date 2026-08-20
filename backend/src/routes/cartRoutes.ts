import { Router } from 'express';
import {
  getCart,
  addToCart,
  updateCartItem,
  removeFromCart,
  clearCart,
  mergeCart,
} from '../controllers/cartController';
import { authMiddleware } from '../middleware/auth';
import { body, param } from 'express-validator';
import { validate } from '../middleware/validation';

const router = Router();

// All cart routes require authentication
router.use(authMiddleware);

router.get('/', getCart);

router.post(
  '/',
  validate([
    body('productId')
      .notEmpty()
      .withMessage('Product ID is required')
      .isMongoId()
      .withMessage('Invalid product ID'),
    body('quantity')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Quantity must be a positive integer'),
  ]),
  addToCart
);

router.post(
  '/merge',
  validate([
    body('items').isArray().withMessage('Items must be an array'),
    body('items.*.productId').isMongoId().withMessage('Invalid product ID'),
    body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be a positive integer'),
    body('items.*.price').isFloat({ min: 0 }).withMessage('Invalid price'),
  ]),
  mergeCart
);

router.patch(
  '/:productId',
  validate([
    param('productId').isMongoId().withMessage('Invalid product ID'),
    body('quantity').isInt({ min: 0 }).withMessage('Quantity must be a non-negative integer'),
  ]),
  updateCartItem
);

router.delete(
  '/:productId',
  validate([
    param('productId')
      .isMongoId()
      .withMessage('Invalid product ID'),
  ]),
  removeFromCart
);

router.delete('/', clearCart);

export default router;

import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  getProductSuggestions,
  assignMediaToProduct,
  setPrimaryProductImage,
} from '../controllers/productController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { uploadMultiple } from '../middleware/upload';

const router = Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.get('/suggestions', getProductSuggestions);
router.post('/:id/assign-media', authMiddleware, adminMiddleware, assignMediaToProduct);
router.patch('/:id/primary-image', authMiddleware, adminMiddleware, setPrimaryProductImage);
router.get('/:id', getProduct);
router.post('/', authMiddleware, adminMiddleware, uploadMultiple, createProduct);
router.put('/:id', authMiddleware, adminMiddleware, uploadMultiple, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;

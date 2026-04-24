import { Router } from 'express';
import {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  getCategories,
  batchImportProductImages,
  assignMediaToProduct,
} from '../controllers/productController';
import { authMiddleware, adminMiddleware } from '../middleware/auth';
import { uploadMultiple, uploadBatchImageFiles } from '../middleware/upload';

const router = Router();

router.get('/', getProducts);
router.get('/categories', getCategories);
router.post(
  '/batch-images',
  authMiddleware,
  adminMiddleware,
  uploadBatchImageFiles,
  batchImportProductImages
);
router.post('/:id/assign-media', authMiddleware, adminMiddleware, assignMediaToProduct);
router.get('/:id', getProduct);
router.post('/', authMiddleware, adminMiddleware, uploadMultiple, createProduct);
router.put('/:id', authMiddleware, adminMiddleware, uploadMultiple, updateProduct);
router.delete('/:id', authMiddleware, adminMiddleware, deleteProduct);

export default router;

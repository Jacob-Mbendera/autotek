import { Request, Response } from 'express';
import Product from '../models/Product';
import { uploadImage, uploadMultipleImages, deleteImage, extractPublicId } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import path from 'path';

// Extend Request type to include files
interface MulterRequest extends Request {
  files?: Express.Multer.File[] | { [fieldname: string]: Express.Multer.File[] };
}

export const getProducts = async (req: Request, res: Response): Promise<void> => {
  try {
    const {
      category,
      status,
      minPrice,
      maxPrice,
      search,
      stockStatus,
      page = '1',
      limit = '20',
    } = req.query;

    const query: any = {};

    if (category) {
      query.category = category;
    }

    if (status) {
      query.status = status;
    }

    if (minPrice || maxPrice) {
      query.price = {};
      if (minPrice) query.price.$gte = Number(minPrice);
      if (maxPrice) query.price.$lte = Number(maxPrice);
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    // Stock status filter
    if (stockStatus && stockStatus !== 'all') {
      if (stockStatus === 'out-of-stock') {
        query.$or = [
          { status: 'out-of-stock' },
          { stock: 0 },
        ];
      } else if (stockStatus === 'low-stock') {
        query.stock = { $gt: 0, $lte: 10 };
        query.status = 'available';
      } else if (stockStatus === 'in-stock') {
        query.stock = { $gt: 10 };
        query.status = 'available';
      }
    }

    const pageNum = parseInt(page as string, 10);
    const limitNum = parseInt(limit as string, 10);
    const skip = (pageNum - 1) * limitNum;

    const products = await Product.find(query)
      .skip(skip)
      .limit(limitNum)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      products,
      pagination: {
        page: pageNum,
        limit: limitNum,
        total,
        totalPages: Math.ceil(total / limitNum),
        pages: Math.ceil(total / limitNum), // Keep for backward compatibility
      },
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch products' });
  }
};

export const getProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    res.json({ product });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch product' });
  }
};

export const createProduct = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const { name, description, category, price, stock, supplier } = req.body;
    const uploadedImages: string[] = [];

    // Handle image uploads if files are present
    if (req.files) {
      const files = Array.isArray(req.files) 
        ? req.files 
        : (typeof req.files === 'object' ? Object.values(req.files).flat() : []);
      const filePaths = files.map((file: Express.Multer.File) => path.join(process.cwd(), 'uploads', file.filename));

      try {
        const uploadResults = await uploadMultipleImages(filePaths, 'autotek/products');
        uploadedImages.push(...uploadResults.map((result) => result.secure_url));

        // Clean up local files after upload
        filePaths.forEach((filePath) => cleanupFile(filePath));
      } catch (uploadError: any) {
        // Clean up local files on error
        filePaths.forEach((filePath) => cleanupFile(filePath));
        res.status(500).json({ message: `Image upload failed: ${uploadError.message}` });
        return;
      }
    }

    // If images are provided as URLs in request body, use those
    const imageUrls = req.body.images ? (Array.isArray(req.body.images) ? req.body.images : [req.body.images]) : [];
    const allImages = [...uploadedImages, ...imageUrls];

    const product = new Product({
      name,
      description,
      category,
      price: Number(price),
      stock: Number(stock) || 0,
      supplier,
      images: allImages,
    });

    await product.save();
    res.status(201).json(product);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create product' });
  }
};

export const updateProduct = async (req: MulterRequest, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    const uploadedImages: string[] = [];
    const imagesToDelete: string[] = [];

    // Handle new image uploads if files are present
    if (req.files) {
      const files = Array.isArray(req.files) 
        ? req.files 
        : (typeof req.files === 'object' ? Object.values(req.files).flat() : []);
      const filePaths = files.map((file: Express.Multer.File) => path.join(process.cwd(), 'uploads', file.filename));

      try {
        const uploadResults = await uploadMultipleImages(filePaths, 'autotek/products');
        uploadedImages.push(...uploadResults.map((result) => result.secure_url));

        // Clean up local files after upload
        filePaths.forEach((filePath) => cleanupFile(filePath));
      } catch (uploadError: any) {
        // Clean up local files on error
        filePaths.forEach((filePath) => cleanupFile(filePath));
        res.status(500).json({ message: `Image upload failed: ${uploadError.message}` });
        return;
      }
    }

    // Handle image deletion if imagesToDelete is provided
    if (req.body.imagesToDelete && Array.isArray(req.body.imagesToDelete)) {
      imagesToDelete.push(...req.body.imagesToDelete);
    }

    // Delete old images from Cloudinary
    for (const imageUrl of imagesToDelete) {
      const publicId = extractPublicId(imageUrl);
      if (publicId) {
        try {
          await deleteImage(publicId);
        } catch (error) {
          console.error(`Failed to delete image ${publicId}:`, error);
        }
      }
    }

    // Update images array
    let updatedImages = product.images.filter((img) => !imagesToDelete.includes(img));
    
    // Add new uploaded images
    if (uploadedImages.length > 0) {
      updatedImages = [...updatedImages, ...uploadedImages];
    }

    // If images are provided as URLs in request body, use those
    if (req.body.images && Array.isArray(req.body.images)) {
      updatedImages = req.body.images;
    }

    // Update product
    const updateData: any = { ...req.body };
    if (uploadedImages.length > 0 || imagesToDelete.length > 0) {
      updateData.images = updatedImages;
    }

    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, updateData, {
      new: true,
      runValidators: true,
    });

    res.json(updatedProduct);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update product' });
  }
};

export const deleteProduct = async (req: Request, res: Response): Promise<void> => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    // Delete images from Cloudinary
    if (product.images && product.images.length > 0) {
      for (const imageUrl of product.images) {
        const publicId = extractPublicId(imageUrl);
        if (publicId) {
          try {
            await deleteImage(publicId);
          } catch (error) {
            console.error(`Failed to delete image ${publicId}:`, error);
          }
        }
      }
    }

    // Delete product from database
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Product deleted successfully' });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to delete product' });
  }
};

export const getCategories = async (req: Request, res: Response): Promise<void> => {
  try {
    const categories = await Product.distinct('category');
    
    // Get product count for each category
    const categoriesWithCounts = await Promise.all(
      categories.map(async (category) => {
        const count = await Product.countDocuments({ category, status: 'available' });
        return { name: category, count };
      })
    );
    
    res.json({ categories: categoriesWithCounts });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch categories' });
  }
};

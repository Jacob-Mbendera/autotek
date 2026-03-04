import { Response } from 'express';
import Wishlist from '../models/Wishlist';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';

export const getWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    let wishlist = await Wishlist.findOne({ user: req.user!._id }).populate('products');
    
    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user!._id,
        products: [],
      });
      await wishlist.save();
    }

    res.json({ wishlist });
  } catch (error: any) {
    console.error('[Wishlist] Error fetching wishlist:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch wishlist' });
  }
};

export const addToWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.body;

    if (!productId) {
      res.status(400).json({ message: 'Product ID is required' });
      return;
    }

    // Verify product exists
    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }

    let wishlist = await Wishlist.findOne({ user: req.user!._id });

    if (!wishlist) {
      wishlist = new Wishlist({
        user: req.user!._id,
        products: [productId],
      });
    } else {
      // Check if product is already in wishlist
      if (wishlist.products.includes(productId as any)) {
        res.status(400).json({ message: 'Product already in wishlist' });
        return;
      }
      wishlist.products.push(productId as any);
    }

    await wishlist.save();
    await wishlist.populate('products');

    res.json({ wishlist, message: 'Product added to wishlist' });
  } catch (error: any) {
    console.error('[Wishlist] Error adding to wishlist:', error);
    res.status(500).json({ message: error.message || 'Failed to add to wishlist' });
  }
};

export const removeFromWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const wishlist = await Wishlist.findOne({ user: req.user!._id });

    if (!wishlist) {
      res.status(404).json({ message: 'Wishlist not found' });
      return;
    }

    wishlist.products = wishlist.products.filter(
      (id) => id.toString() !== productId
    ) as any;

    await wishlist.save();
    await wishlist.populate('products');

    res.json({ wishlist, message: 'Product removed from wishlist' });
  } catch (error: any) {
    console.error('[Wishlist] Error removing from wishlist:', error);
    res.status(500).json({ message: error.message || 'Failed to remove from wishlist' });
  }
};

export const clearWishlist = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const wishlist = await Wishlist.findOne({ user: req.user!._id });

    if (!wishlist) {
      res.status(404).json({ message: 'Wishlist not found' });
      return;
    }

    wishlist.products = [];
    await wishlist.save();

    res.json({ wishlist, message: 'Wishlist cleared' });
  } catch (error: any) {
    console.error('[Wishlist] Error clearing wishlist:', error);
    res.status(500).json({ message: error.message || 'Failed to clear wishlist' });
  }
};

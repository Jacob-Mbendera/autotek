import { Response } from 'express';
import Cart from '../models/Cart';
import Product from '../models/Product';
import { AuthRequest } from '../middleware/auth';

export const getCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await Cart.findOneAndUpdate(
      { user: req.user!._id },
      { $setOnInsert: { user: req.user!._id, items: [] } },
      { new: true, upsert: true }
    ).populate('items.product');

    res.json({ cart });
  } catch (error: any) {
    console.error('[Cart] Error fetching cart:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch cart' });
  }
};

export const addToCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId, quantity } = req.body;
    const qty = quantity ? Number(quantity) : 1;

    const product = await Product.findById(productId);
    if (!product) {
      res.status(404).json({ message: 'Product not found' });
      return;
    }
    if (product.status === 'out-of-stock') {
      res.status(400).json({ message: 'Product is out of stock' });
      return;
    }

    const cart = await Cart.findOneAndUpdate(
      { user: req.user!._id },
      { $setOnInsert: { user: req.user!._id, items: [] } },
      { new: true, upsert: true }
    );

    const existingItem = cart.items.find(
      (item) => item.product.toString() === productId
    );

    if (existingItem) {
      existingItem.quantity += qty;
    } else {
      cart.items.push({
        product: productId,
        quantity: qty,
        priceAtAdd: product.price,
      } as any);
    }

    await cart.save();
    await cart.populate('items.product');

    res.json({ cart, message: 'Product added to cart' });
  } catch (error: any) {
    console.error('[Cart] Error adding to cart:', error);
    res.status(500).json({ message: error.message || 'Failed to add to cart' });
  }
};

export const updateCartItem = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;
    const { quantity } = req.body;

    const cart = await Cart.findOne({ user: req.user!._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    if (Number(quantity) <= 0) {
      cart.items = cart.items.filter(
        (item) => item.product.toString() !== productId
      );
    } else {
      const item = cart.items.find(
        (item) => item.product.toString() === productId
      );
      if (!item) {
        res.status(404).json({ message: 'Item not found in cart' });
        return;
      }
      item.quantity = Number(quantity);
    }

    await cart.save();
    await cart.populate('items.product');

    res.json({ cart, message: 'Cart updated' });
  } catch (error: any) {
    console.error('[Cart] Error updating cart item:', error);
    res.status(500).json({ message: error.message || 'Failed to update cart' });
  }
};

export const removeFromCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { productId } = req.params;

    const cart = await Cart.findOne({ user: req.user!._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    cart.items = cart.items.filter(
      (item) => item.product.toString() !== productId
    );

    await cart.save();
    await cart.populate('items.product');

    res.json({ cart, message: 'Product removed from cart' });
  } catch (error: any) {
    console.error('[Cart] Error removing from cart:', error);
    res.status(500).json({ message: error.message || 'Failed to remove from cart' });
  }
};

export const clearCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const cart = await Cart.findOne({ user: req.user!._id });

    if (!cart) {
      res.status(404).json({ message: 'Cart not found' });
      return;
    }

    cart.items = [];
    await cart.save();

    res.json({ cart, message: 'Cart cleared' });
  } catch (error: any) {
    console.error('[Cart] Error clearing cart:', error);
    res.status(500).json({ message: error.message || 'Failed to clear cart' });
  }
};

export const mergeCart = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items } = req.body as {
      items: Array<{ productId: string; quantity: number; price: number }>;
    };

    if (!Array.isArray(items) || items.length === 0) {
      const cart = await Cart.findOne({ user: req.user!._id }).populate('items.product');
      res.json({ cart, message: 'Nothing to merge' });
      return;
    }

    const productIds = items.map((i) => i.productId);
    const existingProducts = await Product.find({ _id: { $in: productIds } });
    const validProductIds = new Set(existingProducts.map((p) => p._id.toString()));

    const cart = await Cart.findOneAndUpdate(
      { user: req.user!._id },
      { $setOnInsert: { user: req.user!._id, items: [] } },
      { new: true, upsert: true }
    );

    for (const incoming of items) {
      if (!validProductIds.has(incoming.productId)) continue;

      const existingItem = cart.items.find(
        (item) => item.product.toString() === incoming.productId
      );

      if (existingItem) {
        existingItem.quantity += incoming.quantity;
      } else {
        cart.items.push({
          product: incoming.productId,
          quantity: incoming.quantity,
          priceAtAdd: incoming.price,
        } as any);
      }
    }

    await cart.save();
    await cart.populate('items.product');

    res.json({ cart, message: 'Cart merged' });
  } catch (error: any) {
    console.error('[Cart] Error merging cart:', error);
    res.status(500).json({ message: error.message || 'Failed to merge cart' });
  }
};

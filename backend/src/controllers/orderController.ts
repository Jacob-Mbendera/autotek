import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import Product from '../models/Product';
import { OrderStatus } from '../types/shared';

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { items, shippingAddress, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'Order items are required' });
      return;
    }

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await Product.findById(item.productId);
      if (!product) {
        res.status(400).json({ message: `Product ${item.productId} not found` });
        return;
      }

      if (product.stock < item.quantity) {
        res.status(400).json({
          message: `Insufficient stock for ${product.name}. Available: ${product.stock}`,
        });
        return;
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      // Update stock
      product.stock -= item.quantity;
      if (product.stock === 0) {
        product.status = 'out-of-stock';
      }
      await product.save();
    }

    const order = new Order({
      user: req.user!._id,
      items: orderItems,
      totalAmount,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
    });

    await order.save();
    await order.populate('items.product', 'name images price');

    res.status(201).json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
};

export const getOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const query: any = { user: req.user!._id };
    const { status } = req.query;

    if (status) {
      query.status = status;
    }

    const orders = await Order.find(query)
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 });

    res.json(orders);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const order = await Order.findOne({
      _id: req.params.id,
      user: req.user!._id,
    }).populate('items.product', 'name images price description');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch order' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.body;

    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    order.status = status;
    await order.save();

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update order' });
  }
};

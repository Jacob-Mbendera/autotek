import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { IShippingAddress } from '../models/Order';
import Product from '../models/Product';
import Coupon from '../models/Coupon';
import User from '../models/User';
import Payment from '../models/Payment';
import DeliveryLocation from '../models/DeliveryLocation';
import { OrderStatus, UserRole, PaymentStatus } from '../types/shared';
import { emailService } from '../services/emailService';
import { hashPassword } from '../utils/password';
import { generateToken } from '../utils/jwt';
import { processPayChanguRefund } from '../utils/paymentRefunds';
import { log } from '../utils/logger';

// Helper function to format address for display
const formatShippingAddress = (address: IShippingAddress | string): string => {
  if (typeof address === 'string') {
    return address;
  }

  if (address.customAddress) {
    return address.town ? `${address.town} - ${address.customAddress}` : address.customAddress;
  }

  if (address.legacyAddress) {
    return address.legacyAddress;
  }

  if (address.town && address.landmark) {
    return `${address.town}, ${address.landmark}`;
  }

  return 'Address not specified';
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot place customer orders' });
      return;
    }

    const { items, shippingAddress, paymentMethod, guestInfo, couponCode, password } = req.body;

    if (!items || items.length === 0) {
      res.status(400).json({ message: 'Order items are required' });
      return;
    }

    // Validate guest info if no user
    if (!req.user && !guestInfo) {
      res.status(400).json({ message: 'User authentication or guest information is required' });
      return;
    }

    if (!req.user && guestInfo) {
      if (!guestInfo.email || !guestInfo.name || !guestInfo.phone) {
        res.status(400).json({ message: 'Guest email, name, and phone are required' });
        return;
      }
    }

    // Validate shipping address
    if (!shippingAddress) {
      res.status(400).json({ message: 'Shipping address is required' });
      return;
    }

    // If structured address, validate that town and landmark exist
    if (typeof shippingAddress === 'object' && !shippingAddress.customAddress) {
      const { town, landmark } = shippingAddress;

      if (!town || !landmark) {
        res.status(400).json({ message: 'Town and landmark are required for structured address' });
        return;
      }

      // Verify town and landmark exist in database
      const deliveryLocation = await DeliveryLocation.findOne({ town, active: true });

      if (!deliveryLocation) {
        res.status(400).json({ message: `Town "${town}" not found in available delivery locations` });
        return;
      }

      const landmarkExists = deliveryLocation.landmarks.some(
        (l: any) => l.name === landmark && l.active
      );

      if (!landmarkExists) {
        res.status(400).json({ message: `Landmark "${landmark}" not found in ${town}` });
        return;
      }
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

    // Apply coupon if provided
    let discount = 0;
    let finalTotal = totalAmount;
    
    if (couponCode) {
      const coupon = await Coupon.findOne({
        code: couponCode.toUpperCase().trim(),
        active: true,
      });

      if (coupon) {
        const now = new Date();
        // Validate coupon
        if (now >= coupon.validFrom && now <= coupon.validTo) {
          if (!coupon.usageLimit || coupon.usageCount < coupon.usageLimit) {
            if (!coupon.minOrderValue || totalAmount >= coupon.minOrderValue) {
              // Calculate discount
              if (coupon.type === 'percentage') {
                discount = (totalAmount * coupon.value) / 100;
                if (coupon.maxDiscount) {
                  discount = Math.min(discount, coupon.maxDiscount);
                }
              } else if (coupon.type === 'fixed') {
                discount = Math.min(coupon.value, totalAmount);
              } else if (coupon.type === 'free-shipping') {
                discount = 0; // Free shipping (shipping is already 0)
              }

              finalTotal = Math.max(0, totalAmount - discount);

              // Increment coupon usage count
              coupon.usageCount += 1;
              await coupon.save();
            }
          }
        }
      }
    }

    const orderData: any = {
      items: orderItems,
      totalAmount: finalTotal,
      discount,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
    };

    // Add coupon code if applied
    if (couponCode && discount > 0) {
      orderData.couponCode = couponCode.toUpperCase().trim();
    }

    // Handle account creation for guests with password
    let createdUser: any = null;
    let authToken: string | undefined = undefined;

    if (!req.user && guestInfo && password) {
      // Check if user already exists
      const existingUser = await User.findOne({ 
        email: guestInfo.email.trim().toLowerCase() 
      });

      if (existingUser) {
        // User already exists, link order to existing user
        orderData.user = existingUser._id;
        createdUser = existingUser;
      } else {
        // Create new user account
        try {
          const hashedPassword = await hashPassword(password);
          const newUser = new User({
            email: guestInfo.email.trim().toLowerCase(),
            password: hashedPassword,
            name: guestInfo.name.trim(),
            phone: guestInfo.phone.trim(),
            address: shippingAddress ? (
              typeof shippingAddress === 'string'
                ? shippingAddress.trim()
                : shippingAddress
            ) : undefined,
            role: UserRole.CUSTOMER,
          });
          await newUser.save();
          createdUser = newUser;
          orderData.user = newUser._id;
          
          // Generate authentication token
          authToken = generateToken({
            userId: newUser._id.toString(),
            email: newUser.email,
            role: newUser.role,
          });
        } catch (userError: any) {
          console.error('Failed to create user account:', userError);
          // If user creation fails, continue with guest order
          // Don't fail the entire order creation
        }
      }
    }

    // Add user or guest info
    if (req.user) {
      orderData.user = req.user._id;
    } else if (guestInfo && !createdUser) {
      // Only use guestInfo if we didn't create a user account
      orderData.guestInfo = {
        email: guestInfo.email.trim().toLowerCase(),
        name: guestInfo.name.trim(),
        phone: guestInfo.phone.trim(),
      };
    }

    const order = new Order(orderData);
    await order.save();
    await order.populate('items.product', 'name images price');

    // Send order confirmation email
    try {
      if (req.user) {
        const user = await User.findById(req.user._id);
        if (user) {
          await emailService.sendOrderConfirmation(order, user);
        }
      } else if (createdUser) {
        // Send welcome email for newly created account
        await emailService.sendWelcomeEmail(createdUser);
        await emailService.sendOrderConfirmation(order, createdUser);
      } else if (guestInfo) {
        await emailService.sendOrderConfirmation(order, undefined, guestInfo.email);
      }
    } catch (emailError) {
      console.error('Failed to send email:', emailError);
      // Don't fail the order creation if email fails
    }

    // Prepare response
    const response: any = { order };
    if (authToken) {
      response.token = authToken;
      response.user = {
        id: createdUser._id,
        email: createdUser.email,
        name: createdUser.name,
        phone: createdUser.phone,
        role: createdUser.role,
        address: createdUser.address,
      };
    }

    res.status(201).json(response);
  } catch (error: any) {
    console.error('Order creation error:', error);
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

    console.log('[Orders] Fetching orders for user:', req.user!._id, 'with query:', query);

    const orders = await Order.find(query)
      .populate('items.product', 'name images price')
      .sort({ createdAt: -1 });

    console.log('[Orders] Found orders:', orders.length);

    res.json({ orders });
  } catch (error: any) {
    console.error('[Orders] Error fetching orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const orderId = req.params.id;
    const { email } = req.query; // For guest order lookup

    console.log('[Order Detail] Fetching order:', orderId, 'for user:', req.user?._id || 'guest');

    let order;

    if (req.user) {
      // Authenticated user - can access their own orders
      order = await Order.findOne({
        _id: orderId,
        user: req.user._id,
      }).populate('items.product', 'name images price description');
    } else if (email) {
      // Guest order lookup by email
      order = await Order.findOne({
        _id: orderId,
        'guestInfo.email': email.toString().trim().toLowerCase(),
      }).populate('items.product', 'name images price description');
    } else {
      res.status(401).json({ message: 'Authentication required or email query parameter needed' });
      return;
    }

    if (!order) {
      console.log('[Order Detail] Order not found');
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    console.log('[Order Detail] Order found:', order._id);
    res.json({ order });
  } catch (error: any) {
    console.error('[Order Detail] Error:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch order' });
  }
};

export const cancelOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { email } = req.query; // For guest order cancellation

    let order;

    if (req.user) {
      // Authenticated user - can cancel their own orders
      order = await Order.findOne({
        _id: id,
        user: req.user._id,
      });
    } else if (email) {
      // Guest order cancellation by email
      order = await Order.findOne({
        _id: id,
        'guestInfo.email': email.toString().trim().toLowerCase(),
      });
    } else {
      res.status(401).json({ message: 'Authentication required or email query parameter needed' });
      return;
    }

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    // Only allow cancellation if order is pending or processing
    if (order.status === OrderStatus.COMPLETED || order.status === OrderStatus.CANCELLED) {
      res.status(400).json({ message: 'Order cannot be cancelled' });
      return;
    }

    // Update order status to cancelled
    order.status = OrderStatus.CANCELLED;
    await order.save();

    // Process refund if payment was completed
    let refundResult = null;
    try {
      // Find associated payment
      const payment = await Payment.findOne({
        order: order._id,
        status: 'completed',
      });

      if (payment && payment.transactionId) {
        log.info(`Order cancelled - processing refund`, {
          orderId: order._id,
          transactionId: payment.transactionId,
          amount: payment.amount
        });

        // Process refund through PayChangu
        refundResult = await processPayChanguRefund({
          transactionId: payment.transactionId,
          amount: payment.amount,
          reason: 'Order cancelled by customer',
          orderId: order._id.toString(),
        });

        if (refundResult.success) {
          // Update payment status to refunded
          payment.status = PaymentStatus.REFUNDED;
          payment.refundId = refundResult.refundId;
          await payment.save();

          log.payment.refund(order._id.toString(), payment.amount, true, {
            refundId: refundResult.refundId,
            message: refundResult.message
          });

          // Send refund confirmation email
          try {
            const customerEmail = order.user
              ? (await User.findById(order.user))?.email
              : order.guestInfo?.email;

            if (customerEmail) {
              await emailService.sendRefundProcessedEmail({
                email: customerEmail,
                orderNumber: order._id.toString(),
                refundAmount: payment.amount,
                currency: 'MWK',
              });
            }
          } catch (emailError) {
            log.error('Failed to send refund email', emailError);
            // Don't fail the cancellation if email fails
          }
        } else {
          log.payment.refund(order._id.toString(), payment.amount, false, {
            error: refundResult.message
          });
          // Continue with cancellation even if refund fails - admin can process manually
        }
      }
    } catch (refundError: any) {
      log.error('Error processing refund', refundError);
      // Continue with cancellation even if refund processing fails
    }

    // Return success response with refund info
    const message = refundResult?.success
      ? `Order cancelled successfully. Refund of MWK ${order.totalAmount} processed.`
      : 'Order cancelled successfully.';

    res.json({
      order,
      message,
      refundProcessed: refundResult?.success || false,
      refundMessage: refundResult?.message,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel order' });
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

    // Send order status update email
    try {
      if (order.user) {
        const user = await User.findById(order.user);
        if (user) {
          await emailService.sendOrderStatusUpdate(order, user);
        }
      } else if (order.guestInfo) {
        await emailService.sendOrderStatusUpdate(order, undefined, order.guestInfo.email);
      }
    } catch (emailError) {
      console.error('Failed to send order status update email:', emailError);
      // Don't fail the status update if email fails
    }

    res.json(order);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to update order' });
  }
};

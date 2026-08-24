import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order, { IShippingAddress } from '../models/Order';
import Coupon from '../models/Coupon';
import User from '../models/User';
import DeliveryLocation from '../models/DeliveryLocation';
import { OrderStatus, PaymentMethod, PaymentStatus, UserRole } from '../types/shared';
import { emailService } from '../services/emailService';
import { hashPassword, comparePassword } from '../utils/password';
import { generateToken, setAuthCookie } from '../utils/jwt';
import { applyOrderCancellation } from '../utils/orderCancelSideEffects';
import { assertCustomerCanCancelOrder, assertValidOrderStatusTransition } from '../utils/orderStatusTransitions';
import { recordCouponUsageForPaidOrder } from '../utils/couponUsage';
import { uploadPaymentProofFile } from '../config/cloudinary';
import { cleanupFile } from '../middleware/upload';
import {
  assertSufficientStock,
  deductStockForOrderItem,
  InsufficientStockError,
  loadProductForStockCheck,
} from '../utils/orderStock';

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

/**
 * Shared order-creation logic used by both the JSON create-order route (PayChangu /
 * pay-later methods) and the bank-transfer multipart route. `extraOrderData` lets the
 * caller force fields (e.g. bank transfer forces paymentMethod/paymentStatus and attaches
 * the uploaded proof URL) after the normal validation/stock/coupon pipeline runs, but
 * before the order is saved.
 */
const buildAndSaveOrder = async (
  req: AuthRequest,
  res: Response,
  extraOrderData: Record<string, any> = {}
): Promise<void> => {
    if (req.user?.role === UserRole.ADMIN) {
      res.status(403).json({ message: 'Admin accounts cannot place customer orders' });
      return;
    }

    if (req.user && !req.user.isEmailVerified) {
      res.status(403).json({ message: 'Please verify your email before placing an order', code: 'EMAIL_NOT_VERIFIED' });
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

    // Resolve the delivery fee from the selected town — a structured or a
    // custom address both always carry a `town` (see DeliveryLocationSelector),
    // so this lookup covers every real shipping address, not just the
    // fully-structured case.
    let deliveryLocation = null;

    if (typeof shippingAddress === 'object' && !shippingAddress.customAddress) {
      const { town, landmark } = shippingAddress;

      if (!town || !landmark) {
        res.status(400).json({ message: 'Town and landmark are required for structured address' });
        return;
      }

      // Verify town and landmark exist in database
      deliveryLocation = await DeliveryLocation.findOne({ town, active: true });

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
    } else if (typeof shippingAddress === 'object' && shippingAddress.customAddress && shippingAddress.town) {
      // Custom address within a known town — still look up the fee, but
      // don't block checkout if the town isn't found (defensive, shouldn't
      // happen given the selector always sources towns from this list).
      deliveryLocation = await DeliveryLocation.findOne({ town: shippingAddress.town, active: true });
    }

    const deliveryFee = deliveryLocation?.deliveryFee ?? 0;

    // Validate products and calculate total
    let totalAmount = 0;
    const orderItems = [];

    for (const item of items) {
      const product = await loadProductForStockCheck(item.productId);
      if (!product) {
        res.status(400).json({ message: `Product ${item.productId} not found` });
        return;
      }

      try {
        assertSufficientStock(product, item.quantity);
      } catch (error) {
        if (error instanceof InsufficientStockError) {
          res.status(400).json({ message: error.message });
          return;
        }
        throw error;
      }

      const itemTotal = product.price * item.quantity;
      totalAmount += itemTotal;

      orderItems.push({
        product: product._id,
        quantity: item.quantity,
        price: product.price,
      });

      await deductStockForOrderItem(product, item.quantity);
    }

    // Apply coupon if provided
    let discount = 0;
    let waiveDeliveryFee = false;

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
                waiveDeliveryFee = true;
              }

              // BR-05: do not increment usageCount here — only on payment success
            }
          }
        }
      }
    }

    const appliedDeliveryFee = waiveDeliveryFee ? 0 : deliveryFee;
    const finalTotal = Math.max(0, totalAmount - discount) + appliedDeliveryFee;

    const orderData: any = {
      items: orderItems,
      totalAmount: finalTotal,
      discount,
      deliveryFee: appliedDeliveryFee,
      shippingAddress,
      paymentMethod,
      paymentStatus: 'pending',
      ...extraOrderData,
    };

    // Add coupon code if it actually did something (discount or waived fee)
    if (couponCode && (discount > 0 || waiveDeliveryFee)) {
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
        // User already exists — only link the order if the supplied password
        // actually matches the account. Otherwise this is a guest checkout
        // whose email happens to collide with someone else's account; do not
        // attach the order to that account without proof of ownership.
        const passwordMatches = await comparePassword(password, existingUser.password);
        if (passwordMatches) {
          orderData.user = existingUser._id;
          createdUser = existingUser;
          authToken = generateToken({
            userId: existingUser._id.toString(),
            email: existingUser.email,
            role: existingUser.role,
            tokenVersion: existingUser.tokenVersion,
          });
        }
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
            tokenVersion: newUser.tokenVersion,
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
      setAuthCookie(res, authToken);
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
};

export const createOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    await buildAndSaveOrder(req, res);
  } catch (error: any) {
    console.error('Order creation error:', error);
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
};

/**
 * Bank transfer orders: the proof of payment is required at checkout, uploaded in the
 * same multipart request as the order itself (see uploadPaymentProof middleware). The
 * order is created with paymentStatus 'pending' — an admin must manually verify the
 * transfer really landed (confirmBankTransferPayment) before it can be processed.
 */
export const createBankTransferOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  const file = req.file;

  if (!file) {
    res.status(400).json({ message: 'Proof of payment is required for bank transfer orders' });
    return;
  }

  // multipart/form-data arrives as strings — parse the JSON-shaped fields back into
  // objects the same way createOrder's JSON route already expects them.
  try {
    if (typeof req.body.items === 'string') {
      req.body.items = JSON.parse(req.body.items);
    }
    if (typeof req.body.shippingAddress === 'string') {
      req.body.shippingAddress = JSON.parse(req.body.shippingAddress);
    }
    if (typeof req.body.guestInfo === 'string') {
      req.body.guestInfo = JSON.parse(req.body.guestInfo);
    }
  } catch {
    cleanupFile(file.path);
    res.status(400).json({ message: 'Invalid order data' });
    return;
  }

  try {
    const uploadResult = await uploadPaymentProofFile(file.path, file.mimetype);
    cleanupFile(file.path);

    await buildAndSaveOrder(req, res, {
      paymentMethod: PaymentMethod.BANK_TRANSFER,
      paymentStatus: PaymentStatus.PENDING,
      paymentProofUrl: uploadResult.secure_url,
    });
  } catch (error: any) {
    cleanupFile(file.path);
    console.error('Bank transfer order creation error:', error);
    res.status(500).json({ message: error.message || 'Failed to create order' });
  }
};

/**
 * Admin confirms a bank transfer payment after manually checking the real bank account.
 */
export const confirmBankTransferPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER || order.paymentStatus !== PaymentStatus.PENDING) {
      res.status(400).json({ message: 'This order is not awaiting bank transfer verification' });
      return;
    }

    order.paymentStatus = PaymentStatus.COMPLETED;
    await order.save();
    await recordCouponUsageForPaidOrder(order);

    try {
      const user = order.user ? await User.findById(order.user) : undefined;
      await emailService.sendPaymentConfirmation(
        order,
        { amount: order.totalAmount, method: 'bank_transfer' },
        user || undefined,
        order.guestInfo?.email
      );
    } catch (emailError) {
      console.error('Failed to send payment confirmation email:', emailError);
    }

    res.json({ order, message: 'Payment verified successfully' });
  } catch (error: any) {
    console.error('Error confirming bank transfer payment:', error);
    res.status(500).json({ message: error.message || 'Failed to confirm payment' });
  }
};

/**
 * Admin rejects a bank transfer payment (forged/incomplete/reversed proof). The order
 * stays blocked from processing — paymentStatus FAILED never satisfies the transition
 * gate that requires COMPLETED.
 */
export const rejectBankTransferPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { reason } = req.body;

    const order = await Order.findById(id);

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    if (order.paymentMethod !== PaymentMethod.BANK_TRANSFER || order.paymentStatus !== PaymentStatus.PENDING) {
      res.status(400).json({ message: 'This order is not awaiting bank transfer verification' });
      return;
    }

    order.paymentStatus = PaymentStatus.FAILED;
    order.paymentRejectionReason = reason;
    await order.save();

    try {
      const user = order.user ? await User.findById(order.user) : undefined;
      await emailService.sendPaymentRejected(order, reason, user || undefined, order.guestInfo?.email);
    } catch (emailError) {
      console.error('Failed to send payment rejection email:', emailError);
    }

    res.json({ order, message: 'Payment rejected' });
  } catch (error: any) {
    console.error('Error rejecting bank transfer payment:', error);
    res.status(500).json({ message: error.message || 'Failed to reject payment' });
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

    if (req.user?.role === UserRole.ADMIN) {
      // Admin - can access any order, including guest orders
      order = await Order.findById(orderId).populate('items.product', 'name images price description');
    } else if (req.user) {
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

    // Customer cancel only while pending or processing (before dispatch)
    const cancelCheck = assertCustomerCanCancelOrder(order.status);
    if (!cancelCheck.ok) {
      res.status(400).json({ message: cancelCheck.message });
      return;
    }

    const result = await applyOrderCancellation({
      order,
      reason: 'Order cancelled by customer',
    });

    try {
      if (result.order.user) {
        const user = await User.findById(result.order.user);
        if (user) {
          await emailService.sendOrderStatusUpdate(result.order, user);
        }
      } else if (result.order.guestInfo) {
        await emailService.sendOrderStatusUpdate(
          result.order,
          undefined,
          result.order.guestInfo.email
        );
      }
    } catch (emailError) {
      console.error('Failed to send order status update email:', emailError);
    }

    res.json({
      order: result.order,
      message: result.message,
      refundProcessed: result.refundProcessed,
      refundPending: result.refundPending,
      refundMessage: result.refundMessage,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to cancel order' });
  }
};

export const updateOrderStatus = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status, cancelReason } = req.body;

    if (!Object.values(OrderStatus).includes(status)) {
      res.status(400).json({ message: 'Invalid status' });
      return;
    }

    const order = await Order.findById(req.params.id);
    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    const transition = assertValidOrderStatusTransition(
      order.status,
      status,
      order.paymentStatus
    );
    if (!transition.ok) {
      res.status(400).json({ message: transition.message });
      return;
    }

    // BR-11: admin cancel must use same stock restore + refund queue as cancelOrder
    if (status === OrderStatus.CANCELLED) {
      const trimmedReason =
        typeof cancelReason === 'string' ? cancelReason.trim() : '';
      if (trimmedReason.length < 3) {
        res.status(400).json({
          message: 'Cancellation reason is required (at least 3 characters)',
        });
        return;
      }
      if (trimmedReason.length > 500) {
        res.status(400).json({
          message: 'Cancellation reason must be 500 characters or less',
        });
        return;
      }

      const result = await applyOrderCancellation({
        order,
        reason: `Admin: ${trimmedReason}`,
        cancelReason: trimmedReason,
      });

      try {
        if (result.order.user) {
          const user = await User.findById(result.order.user);
          if (user) {
            await emailService.sendOrderStatusUpdate(result.order, user);
          }
        } else if (result.order.guestInfo) {
          await emailService.sendOrderStatusUpdate(
            result.order,
            undefined,
            result.order.guestInfo.email
          );
        }
      } catch (emailError) {
        console.error('Failed to send order status update email:', emailError);
      }

      const orderDoc = result.order;
      const orderPayload =
        typeof (orderDoc as { toObject?: () => Record<string, unknown> }).toObject === 'function'
          ? (orderDoc as { toObject: () => Record<string, unknown> }).toObject()
          : orderDoc;

      res.json({
        ...orderPayload,
        message: result.message,
        refundProcessed: result.refundProcessed,
        refundPending: result.refundPending,
        refundMessage: result.refundMessage,
      });
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

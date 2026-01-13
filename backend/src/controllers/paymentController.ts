import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Payment from '../models/Payment';
import Order from '../models/Order';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import { PaymentMethod, PaymentStatus } from '../../shared/types';
import { initiatePayment } from '../utils/paymentGateways';

export const initiatePaymentRequest = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { orderId, towingServiceId, carServiceId, method, phoneNumber } = req.body;

    if (!method || !Object.values(PaymentMethod).includes(method)) {
      res.status(400).json({ message: 'Valid payment method is required' });
      return;
    }

    let entity: any;
    let type: 'order' | 'towing' | 'car-service';
    let amount = 0;
    let entityId: string;

    // Determine which entity is being paid for
    if (orderId) {
      entity = await Order.findOne({ _id: orderId, user: req.user!._id });
      if (!entity) {
        res.status(404).json({ message: 'Order not found' });
        return;
      }
      type = 'order';
      amount = entity.totalAmount;
      entityId = orderId;
    } else if (towingServiceId) {
      entity = await TowingService.findOne({
        _id: towingServiceId,
        user: req.user!._id,
      });
      if (!entity) {
        res.status(404).json({ message: 'Towing service not found' });
        return;
      }
      type = 'towing';
      amount = entity.price || 0;
      entityId = towingServiceId;
    } else if (carServiceId) {
      entity = await CarService.findOne({
        _id: carServiceId,
        user: req.user!._id,
      });
      if (!entity) {
        res.status(404).json({ message: 'Car service not found' });
        return;
      }
      type = 'car-service';
      amount = entity.price || 0;
      entityId = carServiceId;
    } else {
      res.status(400).json({
        message: 'Either orderId, towingServiceId, or carServiceId is required',
      });
      return;
    }

    if (amount === 0) {
      res.status(400).json({ message: 'Amount must be greater than 0' });
      return;
    }

    // Check if payment already exists
    const existingPayment = await Payment.findOne({
      [type === 'order' ? 'order' : type === 'towing' ? 'towingService' : 'carService']:
        entityId,
      status: PaymentStatus.PENDING,
    });

    if (existingPayment) {
      res.status(400).json({ message: 'Payment already initiated' });
      return;
    }

    // Initiate payment with gateway
    const reference = `${type.toUpperCase()}_${entityId}_${Date.now()}`;
    const paymentResponse = await initiatePayment(method, {
      amount,
      phoneNumber: phoneNumber || req.user!.phone,
      reference,
      description: `Payment for ${type}`,
    });

    if (!paymentResponse.success) {
      res.status(400).json({ message: paymentResponse.message });
      return;
    }

    // Create payment record
    const paymentData: any = {
      type,
      amount,
      method,
      transactionId: paymentResponse.transactionId,
      status: PaymentStatus.PENDING,
    };

    if (type === 'order') paymentData.order = entityId;
    if (type === 'towing') paymentData.towingService = entityId;
    if (type === 'car-service') paymentData.carService = entityId;

    const payment = new Payment(paymentData);
    await payment.save();

    res.status(201).json({
      payment,
      paymentInstructions: paymentResponse.paymentInstructions,
      transactionId: paymentResponse.transactionId,
    });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to initiate payment' });
  }
};

export const getPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const payment = await Payment.findById(req.params.id)
      .populate('order')
      .populate('towingService')
      .populate('carService');

    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Check if user has access to this payment
    let hasAccess = false;
    if (payment.type === 'order' && payment.order) {
      hasAccess = (payment.order as any).user.toString() === req.user!._id.toString();
    } else if (payment.type === 'towing' && payment.towingService) {
      hasAccess =
        (payment.towingService as any).user.toString() === req.user!._id.toString();
    } else if (payment.type === 'car-service' && payment.carService) {
      hasAccess =
        (payment.carService as any).user.toString() === req.user!._id.toString();
    }

    if (!hasAccess && req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Access denied' });
      return;
    }

    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to fetch payment' });
  }
};

export const paymentCallback = async (req: Request, res: Response): Promise<void> => {
  try {
    // This endpoint will be called by payment gateways via webhook
    const { transactionId, status, reference } = req.body;

    if (!transactionId) {
      res.status(400).json({ message: 'Transaction ID is required' });
      return;
    }

    const payment = await Payment.findOne({ transactionId });
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    // Update payment status
    if (status === 'success' || status === 'completed') {
      payment.status = PaymentStatus.COMPLETED;

      // Update related entity payment status
      if (payment.type === 'order' && payment.order) {
        const order = await Order.findById(payment.order);
        if (order) {
          order.paymentStatus = 'completed';
          await order.save();
        }
      } else if (payment.type === 'towing' && payment.towingService) {
        const towingService = await TowingService.findById(payment.towingService);
        if (towingService) {
          towingService.paymentStatus = 'completed';
          await towingService.save();
        }
      } else if (payment.type === 'car-service' && payment.carService) {
        const carService = await CarService.findById(payment.carService);
        if (carService) {
          carService.paymentStatus = 'completed';
          await carService.save();
        }
      }
    } else if (status === 'failed') {
      payment.status = PaymentStatus.FAILED;
    }

    await payment.save();

    res.json({ success: true, payment });
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to process callback' });
  }
};

export const verifyPayment = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    // Manual verification for bank transfers
    const { paymentId, verified } = req.body;

    if (req.user!.role !== 'admin') {
      res.status(403).json({ message: 'Admin access required' });
      return;
    }

    const payment = await Payment.findById(paymentId);
    if (!payment) {
      res.status(404).json({ message: 'Payment not found' });
      return;
    }

    if (verified) {
      payment.status = PaymentStatus.COMPLETED;

      // Update related entity
      if (payment.type === 'order' && payment.order) {
        const order = await Order.findById(payment.order);
        if (order) {
          order.paymentStatus = 'completed';
          await order.save();
        }
      } else if (payment.type === 'towing' && payment.towingService) {
        const towingService = await TowingService.findById(payment.towingService);
        if (towingService) {
          towingService.paymentStatus = 'completed';
          await towingService.save();
        }
      } else if (payment.type === 'car-service' && payment.carService) {
        const carService = await CarService.findById(payment.carService);
        if (carService) {
          carService.paymentStatus = 'completed';
          await carService.save();
        }
      }
    } else {
      payment.status = PaymentStatus.FAILED;
    }

    await payment.save();
    res.json(payment);
  } catch (error: any) {
    res.status(500).json({ message: error.message || 'Failed to verify payment' });
  }
};

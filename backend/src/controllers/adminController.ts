import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import CustomOrder from '../models/CustomOrder';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import Payment from '../models/Payment';
import Product from '../models/Product';
import User from '../models/User';
import { OrderStatus, CustomOrderStatus, ServiceStatus, PaymentStatus } from '../types/shared';
import { parsePagination, createPaginationResponse } from '../utils/pagination';

/**
 * Get dashboard statistics for admin
 * Aggregates counts and revenue data from various collections
 */
export const getStats = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    console.log(`[Admin] Fetching dashboard stats for user: ${req.user!._id}`);

    const [
      totalOrders,
      pendingOrders,
      totalProducts,
      outOfStockProducts,
      totalUsers,
      totalTowingServices,
      totalCarServices,
      totalRevenue,
      pendingPayments,
    ] = await Promise.all([
      Order.countDocuments(),
      Order.countDocuments({ status: OrderStatus.PENDING }),
      Product.countDocuments(),
      Product.countDocuments({ status: 'out-of-stock' }),
      User.countDocuments({ role: 'customer' }),
      TowingService.countDocuments(),
      CarService.countDocuments(),
      Payment.aggregate([
        { $match: { status: PaymentStatus.COMPLETED } },
        { $group: { _id: null, total: { $sum: '$amount' } } },
      ]),
      Payment.countDocuments({ status: PaymentStatus.PENDING }),
    ]);

    const stats = {
      orders: {
        total: totalOrders,
        pending: pendingOrders,
      },
      products: {
        total: totalProducts,
        outOfStock: outOfStockProducts,
      },
      users: {
        total: totalUsers,
      },
      services: {
        towing: totalTowingServices,
        carService: totalCarServices,
      },
      revenue: {
        total: totalRevenue[0]?.total || 0,
      },
      payments: {
        pending: pendingPayments,
      },
    };

    console.log(`[Admin] Stats fetched successfully`);
    res.json(stats);
  } catch (error: any) {
    console.error('[Admin] Error fetching stats:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch stats' });
  }
};

/**
 * Get all orders with pagination and optional status filter
 * @param status - Optional order status filter
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20, max: 100)
 */
export const getAllOrders = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build query with type safety
    const query: { status?: OrderStatus } = {};
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      query.status = status as OrderStatus;
    }

    console.log(`[Admin] Fetching orders - page: ${page}, limit: ${limit}, status: ${status || 'all'}`);

    const [orders, total] = await Promise.all([
      Order.find(query)
        .populate('user', 'name email phone')
        .populate('items.product', 'name images price')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      Order.countDocuments(query),
    ]);

    res.json({
      orders,
      pagination: createPaginationResponse(page, limit, total),
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch orders' });
  }
};

/**
 * Get all custom orders with pagination and optional status filter
 * @param status - Optional custom order status filter
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20, max: 100)
 */
export const getAllCustomOrders = async (
  req: AuthRequest,
  res: Response
): Promise<void> => {
  try {
    const { status } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build query with type safety
    const query: { status?: CustomOrderStatus } = {};
    if (status && Object.values(CustomOrderStatus).includes(status as CustomOrderStatus)) {
      query.status = status as CustomOrderStatus;
    }

    console.log(`[Admin] Fetching custom orders - page: ${page}, limit: ${limit}, status: ${status || 'all'}`);

    const [customOrders, total] = await Promise.all([
      CustomOrder.find(query)
        .populate('user', 'name email phone')
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      CustomOrder.countDocuments(query),
    ]);

    res.json({
      customOrders,
      pagination: createPaginationResponse(page, limit, total),
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching custom orders:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch custom orders' });
  }
};

/**
 * Get all services (towing and car services) with pagination and optional filters
 * @param type - Optional service type filter ('towing' or 'car-service')
 * @param status - Optional service status filter
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20, max: 100)
 */
export const getAllServices = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { type, status } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build queries with type safety
    const towingQuery: { status?: ServiceStatus } = {};
    const carServiceQuery: { status?: ServiceStatus } = {};

    if (status && Object.values(ServiceStatus).includes(status as ServiceStatus)) {
      towingQuery.status = status as ServiceStatus;
      carServiceQuery.status = status as ServiceStatus;
    }

    const serviceType = type as string | undefined;
    const shouldFetchTowing = !serviceType || serviceType === 'towing';
    const shouldFetchCarService = !serviceType || serviceType === 'car-service';

    console.log(`[Admin] Fetching services - type: ${serviceType || 'all'}, status: ${status || 'all'}, page: ${page}, limit: ${limit}`);

    // Fetch services in parallel based on type filter
    const [towingResult, carServiceResult] = await Promise.all([
      shouldFetchTowing
        ? Promise.all([
            TowingService.find(towingQuery)
              .populate('user', 'name email phone')
              .populate('assignedDriver', 'name phone')
              .skip(skip)
              .limit(limit)
              .sort({ createdAt: -1 }),
            TowingService.countDocuments(towingQuery),
          ])
        : Promise.resolve([[], 0]),
      shouldFetchCarService
        ? Promise.all([
            CarService.find(carServiceQuery)
              .populate('user', 'name email phone')
              .populate('assignedMechanic', 'name phone')
              .skip(skip)
              .limit(limit)
              .sort({ createdAt: -1 }),
            CarService.countDocuments(carServiceQuery),
          ])
        : Promise.resolve([[], 0]),
    ]);

    const [towingServices, towingTotal] = towingResult as [any[], number];
    const [carServices, carServiceTotal] = carServiceResult as [any[], number];

    res.json({
      towingServices,
      carServices,
      pagination: {
        page,
        limit,
        towingTotal,
        carServiceTotal,
        total: towingTotal + carServiceTotal,
        pages: Math.ceil((towingTotal + carServiceTotal) / limit),
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching services:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch services' });
  }
};

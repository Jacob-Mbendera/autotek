import { Response } from 'express';
import { AuthRequest } from '../middleware/auth';
import Order from '../models/Order';
import CustomOrder from '../models/CustomOrder';
import TowingService from '../models/TowingService';
import CarService from '../models/CarService';
import Payment from '../models/Payment';
import Product from '../models/Product';
import User from '../models/User';
import { OrderStatus, CustomOrderStatus, ServiceStatus, PaymentStatus, UserRole } from '../types/shared';
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
    const { status, startDate, endDate } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build query with type safety
    const query: { status?: OrderStatus; createdAt?: { $gte?: Date; $lte?: Date } } = {};
    if (status && Object.values(OrderStatus).includes(status as OrderStatus)) {
      query.status = status as OrderStatus;
    }

    // Date range filter
    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) {
        query.createdAt.$gte = new Date(startDate as string);
      }
      if (endDate) {
        const endDateObj = new Date(endDate as string);
        endDateObj.setHours(23, 59, 59, 999); // Set to end of day
        query.createdAt.$lte = endDateObj;
      }
    }

    console.log(`[Admin] Fetching orders - page: ${page}, limit: ${limit}, status: ${status || 'all'}, dateRange: ${startDate || 'none'} to ${endDate || 'none'}`);

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
 * Get a single order by ID (admin only)
 * @param id - Order ID
 */
export const getOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    console.log(`[Admin] Fetching order: ${id}`);

    const order = await Order.findById(id)
      .populate('user', 'name email phone address')
      .populate('items.product', 'name images price description');

    if (!order) {
      res.status(404).json({ message: 'Order not found' });
      return;
    }

    res.json({ order });
  } catch (error: any) {
    console.error('[Admin] Error fetching order:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch order' });
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
    const { status, search } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build query with type safety
    const query: any = {};
    if (status && Object.values(CustomOrderStatus).includes(status as CustomOrderStatus)) {
      query.status = status as CustomOrderStatus;
    }

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { productName: searchRegex },
        { description: searchRegex },
        { category: searchRegex },
        { 'vehicleDetails.make': searchRegex },
        { 'vehicleDetails.model': searchRegex },
        { 'vehicleDetails.engine': searchRegex },
        { 'vehicleDetails.vinOrChassis': searchRegex },
        { 'partDetails.partNumber': searchRegex },
      ];
    }

    console.log(`[Admin] Fetching custom orders - page: ${page}, limit: ${limit}, status: ${status || 'all'}, search: ${search || 'none'}`);

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
 * Get a single custom order by ID for admin (no user filter)
 */
export const getCustomOrder = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const customOrder = await CustomOrder.findById(req.params.id)
      .populate('user', 'name email phone address');

    if (!customOrder) {
      res.status(404).json({ message: 'Custom order not found' });
      return;
    }

    res.json({ customOrder });
  } catch (error: any) {
    console.error(`[Admin] Error fetching custom order ${req.params.id}:`, error);
    res.status(500).json({ message: error.message || 'Failed to fetch custom order' });
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
    const { type, status, search } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build queries with type safety
    const towingQuery: any = {};
    const carServiceQuery: any = {};

    if (status && Object.values(ServiceStatus).includes(status as ServiceStatus)) {
      towingQuery.status = status as ServiceStatus;
      carServiceQuery.status = status as ServiceStatus;
    }

    // Add search functionality
    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      const searchOr = [
        { 'vehicleDetails.make': searchRegex },
        { 'vehicleDetails.model': searchRegex },
        { 'vehicleDetails.licensePlate': searchRegex },
        { pickupLocation: searchRegex },
        { destination: searchRegex },
      ];
      towingQuery.$or = searchOr;
      
      const carSearchOr = [
        { serviceType: searchRegex },
        { serviceTypes: searchRegex },
        { address: searchRegex },
        { notes: searchRegex },
        { 'vehicleDetails.make': searchRegex },
        { 'vehicleDetails.model': searchRegex },
        { 'vehicleDetails.licensePlate': searchRegex },
      ];
      carServiceQuery.$or = carSearchOr;
    }

    const serviceType = type as string | undefined;
    const shouldFetchTowing = !serviceType || serviceType === 'towing';
    const shouldFetchCarService = !serviceType || serviceType === 'car-service';

    console.log(`[Admin] Fetching services - type: ${serviceType || 'all'}, status: ${status || 'all'}, search: ${search || 'none'}, page: ${page}, limit: ${limit}`);

    // Fetch all services (without pagination) to combine and sort, then paginate
    const [towingResult, carServiceResult] = await Promise.all([
      shouldFetchTowing
        ? Promise.all([
            TowingService.find(towingQuery)
              .populate('user', 'name email phone')
              .populate({
                path: 'assignedDriver',
                select: 'name phone whatsAppPhone providerType garage averageRating ratingCount',
                populate: { path: 'garage', select: 'name town verificationStatus' },
              })
              .sort({ createdAt: -1 })
              .lean(),
            TowingService.countDocuments(towingQuery),
          ])
        : Promise.resolve([[], 0]),
      shouldFetchCarService
        ? Promise.all([
            CarService.find(carServiceQuery)
              .populate('user', 'name email phone')
              .populate({
                path: 'assignedMechanic',
                select: 'name phone whatsAppPhone providerType garage averageRating ratingCount',
                populate: { path: 'garage', select: 'name town verificationStatus' },
              })
              .sort({ createdAt: -1 })
              .lean(),
            CarService.countDocuments(carServiceQuery),
          ])
        : Promise.resolve([[], 0]),
    ]);

    const [towingServices, towingTotal] = towingResult as [any[], number];
    const [carServices, carServiceTotal] = carServiceResult as [any[], number];

    // Combine services into a single array with type field
    const allServices = [
      ...towingServices.map((service) => ({
        ...service,
        type: 'towing',
        location: service.pickupLocation,
        vehicleMake: service.vehicleDetails?.make,
        vehicleModel: service.vehicleDetails?.model,
      })),
      ...carServices.map((service) => ({
        ...service,
        type: 'car-service',
        location: service.address,
      })),
    ].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    // Apply pagination to combined results
    const total = towingTotal + carServiceTotal;
    const paginatedServices = allServices.slice(skip, skip + limit);

    res.json({
      services: paginatedServices,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching services:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch services' });
  }
};

/**
 * Get all users with pagination and optional filters
 * @param role - Optional user role filter
 * @param search - Optional search term (name, email, phone)
 * @param page - Page number (default: 1)
 * @param limit - Items per page (default: 20, max: 100)
 */
export const getAllUsers = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { role, search } = req.query;
    const { page, limit, skip } = parsePagination({
      page: req.query.page as string | undefined,
      limit: req.query.limit as string | undefined,
    });

    // Build query
    const query: any = {};
    
    if (role && Object.values(UserRole).includes(role as UserRole)) {
      query.role = role;
    }

    if (search) {
      const searchRegex = new RegExp(search as string, 'i');
      query.$or = [
        { name: searchRegex },
        { email: searchRegex },
        { phone: searchRegex },
      ];
    }

    console.log(`[Admin] Fetching users - page: ${page}, limit: ${limit}, role: ${role || 'all'}, search: ${search || 'none'}`);

    const [users, total] = await Promise.all([
      User.find(query)
        .select('-password') // Exclude password from response
        .skip(skip)
        .limit(limit)
        .sort({ createdAt: -1 }),
      User.countDocuments(query),
    ]);

    res.json({
      users,
      pagination: createPaginationResponse(page, limit, total),
    });
  } catch (error: any) {
    console.error('[Admin] Error fetching users:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch users' });
  }
};

/**
 * Get user by ID
 */
export const getUser = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;

    const user = await User.findById(id).select('-password');
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    res.json({ user });
  } catch (error: any) {
    console.error('[Admin] Error fetching user:', error);
    res.status(500).json({ message: error.message || 'Failed to fetch user' });
  }
};

/**
 * Update user role
 */
export const updateUserRole = async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { role } = req.body;

    if (!role || !Object.values(UserRole).includes(role as UserRole)) {
      res.status(400).json({ message: 'Invalid role' });
      return;
    }

    // Prevent changing own role
    if (id === req.user!._id.toString()) {
      res.status(400).json({ message: 'Cannot change your own role' });
      return;
    }

    const user = await User.findById(id);
    
    if (!user) {
      res.status(404).json({ message: 'User not found' });
      return;
    }

    user.role = role as any;
    await user.save();

    const updatedUser = await User.findById(id).select('-password');
    res.json({ user: updatedUser });
  } catch (error: any) {
    console.error('[Admin] Error updating user role:', error);
    res.status(500).json({ message: error.message || 'Failed to update user role' });
  }
};

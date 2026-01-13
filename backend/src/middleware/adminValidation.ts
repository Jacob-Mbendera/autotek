import { query } from 'express-validator';
import { OrderStatus, CustomOrderStatus, ServiceStatus } from '../../shared/types';

export const validateGetAllOrders = [
  query('status')
    .optional()
    .isIn(Object.values(OrderStatus))
    .withMessage('Invalid order status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const validateGetAllCustomOrders = [
  query('status')
    .optional()
    .isIn(Object.values(CustomOrderStatus))
    .withMessage('Invalid custom order status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const validateGetAllServices = [
  query('type')
    .optional()
    .isIn(['towing', 'car-service'])
    .withMessage('Service type must be either "towing" or "car-service"'),
  query('status')
    .optional()
    .isIn(Object.values(ServiceStatus))
    .withMessage('Invalid service status'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

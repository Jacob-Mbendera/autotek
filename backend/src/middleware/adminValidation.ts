import { body, query } from 'express-validator';
import {
  OrderStatus,
  CustomOrderStatus,
  ServiceStatus,
  GarageVerificationStatus,
  ProviderType,
  ProviderVettingStatus,
} from '../types/shared';

const MALAWI_PHONE = /^(\+265|0)[1-9]\d{8}$/;

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
  query('search')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Search must be 200 characters or fewer'),
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
  query('search')
    .optional()
    .isString()
    .isLength({ max: 200 })
    .withMessage('Search must be 200 characters or fewer'),
  query('page')
    .optional()
    .isInt({ min: 1 })
    .withMessage('Page must be a positive integer'),
  query('limit')
    .optional()
    .isInt({ min: 1, max: 100 })
    .withMessage('Limit must be between 1 and 100'),
];

export const validateCreateGarage = [
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 200 })
    .withMessage('Name must be 200 characters or fewer'),
  body('contactPhone')
    .trim()
    .notEmpty()
    .withMessage('Contact phone is required')
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('town')
    .trim()
    .notEmpty()
    .withMessage('Town is required')
    .isLength({ max: 100 })
    .withMessage('Town must be 100 characters or fewer'),
  body('addressLine')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Address line must be 300 characters or fewer'),
  body('verificationStatus')
    .optional({ values: 'falsy' })
    .isIn(Object.values(GarageVerificationStatus))
    .withMessage('Invalid verification status'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be 2000 characters or fewer'),
];

export const validateUpdateGarage = [
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Name must be 200 characters or fewer'),
  body('contactPhone')
    .optional()
    .trim()
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('email')
    .optional({ values: 'falsy' })
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('town')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Town cannot be empty')
    .isLength({ max: 100 })
    .withMessage('Town must be 100 characters or fewer'),
  body('addressLine')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 300 })
    .withMessage('Address line must be 300 characters or fewer'),
  body('verificationStatus')
    .optional({ values: 'falsy' })
    .isIn(Object.values(GarageVerificationStatus))
    .withMessage('Invalid verification status'),
  body('notes')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Notes must be 2000 characters or fewer'),
];

export const validateInviteServiceProvider = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

export const validateCreateServiceProvider = [
  body('garage')
    .trim()
    .notEmpty()
    .withMessage('Garage is required')
    .isMongoId()
    .withMessage('Invalid garage ID format'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ max: 200 })
    .withMessage('Name must be 200 characters or fewer'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone is required')
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('whatsAppPhone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('providerType')
    .trim()
    .notEmpty()
    .withMessage('Provider type is required')
    .isIn(Object.values(ProviderType))
    .withMessage('Invalid provider type'),
  body('vettingStatus')
    .optional({ values: 'falsy' })
    .isIn(Object.values(ProviderVettingStatus))
    .withMessage('Invalid vetting status'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
    .toBoolean(),
  body('certificationNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Certification note must be 2000 characters or fewer'),
];

export const validateUpdateServiceProvider = [
  body('garage')
    .optional()
    .trim()
    .isMongoId()
    .withMessage('Invalid garage ID format'),
  body('name')
    .optional()
    .trim()
    .notEmpty()
    .withMessage('Name cannot be empty')
    .isLength({ max: 200 })
    .withMessage('Name must be 200 characters or fewer'),
  body('phone')
    .optional()
    .trim()
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('whatsAppPhone')
    .optional({ values: 'falsy' })
    .trim()
    .matches(MALAWI_PHONE)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('providerType')
    .optional()
    .trim()
    .isIn(Object.values(ProviderType))
    .withMessage('Invalid provider type'),
  body('vettingStatus')
    .optional({ values: 'falsy' })
    .isIn(Object.values(ProviderVettingStatus))
    .withMessage('Invalid vetting status'),
  body('active')
    .optional()
    .isBoolean()
    .withMessage('Active must be a boolean')
    .toBoolean(),
  body('certificationNote')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max: 2000 })
    .withMessage('Certification note must be 2000 characters or fewer'),
];

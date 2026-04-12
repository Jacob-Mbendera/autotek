import Joi from 'joi';
import { Request, Response, NextFunction } from 'express';

/**
 * Validation middleware factory
 * Creates a middleware that validates request data against a Joi schema
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    const { error, value } = schema.validate(req.body, {
      abortEarly: false, // Return all errors, not just the first one
      stripUnknown: true, // Remove unknown fields
    });

    if (error) {
      const errors = error.details.map((detail) => ({
        field: detail.path.join('.'),
        message: detail.message,
      }));

      res.status(400).json({
        message: 'Validation error',
        errors,
      });
      return;
    }

    // Replace req.body with validated and sanitized data
    req.body = value;
    next();
  };
};

/**
 * Authentication Validation Schemas
 */
export const authSchemas = {
  register: Joi.object({
    name: Joi.string().trim().min(2).max(100).required().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
      'any.required': 'Name is required',
    }),
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .required()
      .messages({
        'string.min': 'Password must be at least 8 characters',
        'string.max': 'Password must not exceed 128 characters',
        'string.pattern.base':
          'Password must contain at least one uppercase letter, one lowercase letter, and one number',
        'any.required': 'Password is required',
      }),
    phone: Joi.string()
      .trim()
      .pattern(/^(\+265|0)?[18]\d{8}$/)
      .optional()
      .messages({
        'string.pattern.base':
          'Please provide a valid Malawian phone number (e.g., +265888123456 or 0888123456)',
      }),
  }),

  login: Joi.object({
    email: Joi.string().trim().lowercase().email().required().messages({
      'string.email': 'Please provide a valid email address',
      'any.required': 'Email is required',
    }),
    password: Joi.string().required().messages({
      'any.required': 'Password is required',
    }),
  }),

  updateProfile: Joi.object({
    name: Joi.string().trim().min(2).max(100).optional().messages({
      'string.min': 'Name must be at least 2 characters',
      'string.max': 'Name must not exceed 100 characters',
    }),
    phone: Joi.string()
      .trim()
      .pattern(/^(\+265|0)?[18]\d{8}$/)
      .optional()
      .messages({
        'string.pattern.base':
          'Please provide a valid Malawian phone number (e.g., +265888123456 or 0888123456)',
      }),
    currentPassword: Joi.string().optional(),
    newPassword: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/)
      .optional()
      .messages({
        'string.min': 'New password must be at least 8 characters',
        'string.max': 'New password must not exceed 128 characters',
        'string.pattern.base':
          'New password must contain at least one uppercase letter, one lowercase letter, and one number',
      }),
  }).custom((value, helpers) => {
    // If newPassword is provided, currentPassword must also be provided
    if (value.newPassword && !value.currentPassword) {
      return helpers.error('any.custom', {
        message: 'Current password is required when changing password',
      });
    }
    return value;
  }),
};

/**
 * Order Validation Schemas
 */
export const orderSchemas = {
  createOrder: Joi.object({
    items: Joi.array()
      .items(
        Joi.object({
          product: Joi.string()
            .pattern(/^[0-9a-fA-F]{24}$/)
            .required()
            .messages({
              'string.pattern.base': 'Invalid product ID format',
              'any.required': 'Product ID is required',
            }),
          quantity: Joi.number().integer().min(1).max(1000).required().messages({
            'number.min': 'Quantity must be at least 1',
            'number.max': 'Quantity must not exceed 1000',
            'any.required': 'Quantity is required',
          }),
          price: Joi.number().positive().required().messages({
            'number.positive': 'Price must be a positive number',
            'any.required': 'Price is required',
          }),
        })
      )
      .min(1)
      .required()
      .messages({
        'array.min': 'Order must contain at least one item',
        'any.required': 'Order items are required',
      }),
    shippingAddress: Joi.object({
      street: Joi.string().trim().max(200).required(),
      city: Joi.string().trim().max(100).required(),
      state: Joi.string().trim().max(100).optional(),
      country: Joi.string().trim().max(100).required(),
      zipCode: Joi.string().trim().max(20).optional(),
    }).required(),
    paymentMethod: Joi.string().valid('paychangu', 'airtel', 'cash').required().messages({
      'any.only': 'Payment method must be either paychangu, airtel, or cash',
      'any.required': 'Payment method is required',
    }),
  }),
};

/**
 * Service Validation Schemas
 */
export const serviceSchemas = {
  createService: Joi.object({
    serviceType: Joi.string()
      .valid('towing', 'car-service')
      .required()
      .messages({
        'any.only': 'Service type must be either towing or car-service',
        'any.required': 'Service type is required',
      }),
    location: Joi.object({
      latitude: Joi.number().min(-90).max(90).required(),
      longitude: Joi.number().min(-180).max(180).required(),
      address: Joi.string().trim().max(500).required(),
    }).required(),
    description: Joi.string().trim().max(1000).optional(),
    vehicleInfo: Joi.object({
      make: Joi.string().trim().max(100).optional(),
      model: Joi.string().trim().max(100).optional(),
      year: Joi.number().integer().min(1900).max(2100).optional(),
    }).optional(),
  }),
};

/**
 * Payment Validation Schemas
 */
export const paymentSchemas = {
  initiatePayment: Joi.object({
    amount: Joi.number().positive().min(100).max(10000000).required().messages({
      'number.positive': 'Amount must be a positive number',
      'number.min': 'Amount must be at least 100 MWK',
      'number.max': 'Amount must not exceed 10,000,000 MWK',
      'any.required': 'Amount is required',
    }),
    orderId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid order ID format',
      }),
    serviceId: Joi.string()
      .pattern(/^[0-9a-fA-F]{24}$/)
      .optional()
      .messages({
        'string.pattern.base': 'Invalid service ID format',
      }),
    email: Joi.string().trim().lowercase().email().optional().messages({
      'string.email': 'Please provide a valid email address',
    }),
  }).custom((value, helpers) => {
    // Either orderId or serviceId must be provided, but not both
    if (!value.orderId && !value.serviceId) {
      return helpers.error('any.custom', {
        message: 'Either orderId or serviceId must be provided',
      });
    }
    if (value.orderId && value.serviceId) {
      return helpers.error('any.custom', {
        message: 'Cannot provide both orderId and serviceId',
      });
    }
    return value;
  }),
};

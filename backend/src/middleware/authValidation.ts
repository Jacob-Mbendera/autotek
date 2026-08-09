import { body } from 'express-validator';

export const validateRegister = [
  body('email')
    .trim()
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .isLength({ min: 6 })
    .withMessage('Password must be at least 6 characters long')
    .isLength({ max: 128 })
    .withMessage('Password must be less than 128 characters'),
  body('name')
    .trim()
    .notEmpty()
    .withMessage('Name is required')
    .isLength({ min: 2, max: 100 })
    .withMessage('Name must be between 2 and 100 characters'),
  body('phone')
    .trim()
    .notEmpty()
    .withMessage('Phone number is required')
    .matches(/^(\+265|0)[1-9]\d{8}$/)
    .withMessage('Please provide a valid Malawi phone number (format: +265XXXXXXXXX or 0XXXXXXXXX)'),
  body('address')
    .optional()
    .trim()
    .isLength({ max: 500 })
    .withMessage('Address must be less than 500 characters'),
];

export const validateLogin = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
  body('password')
    .notEmpty()
    .withMessage('Password is required'),
];

export const validateForgotPassword = [
  body('email')
    .trim()
    .notEmpty()
    .withMessage('Email is required')
    .isEmail()
    .withMessage('Please provide a valid email address')
    .normalizeEmail(),
];

export const validateVerifyResetToken = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .isLength({ min: 10, max: 256 })
    .withMessage('Invalid reset token'),
];

export const validateResetPassword = [
  body('token')
    .trim()
    .notEmpty()
    .withMessage('Reset token is required')
    .isString()
    .isLength({ min: 10, max: 256 })
    .withMessage('Invalid reset token'),
  body('newPassword')
    .isString()
    .isLength({ min: 6, max: 128 })
    .withMessage('New password must be between 6 and 128 characters'),
];

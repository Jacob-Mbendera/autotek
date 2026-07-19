import path from 'path';
import { Request, Response, NextFunction } from 'express';
import { body, validationResult } from 'express-validator';
import {
  BODY_STYLES,
  DRIVETRAINS,
  PART_POSITIONS,
  PART_PREFERENCES,
  TRANSMISSIONS,
} from '../models/CustomOrder';
import { cleanupFile } from './upload';

const nextYear = () => new Date().getFullYear() + 1;

const cleanupUploadedFiles = (req: Request) => {
  if (!req.files) return;
  const files = Array.isArray(req.files) ? req.files : Object.values(req.files).flat();
  files.forEach((file) => {
    cleanupFile(path.join(process.cwd(), 'uploads', file.filename));
  });
};

const optionalTrimmedString = (field: string, max: number) =>
  body(field)
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ max })
    .withMessage(`${field} must be at most ${max} characters`);

export const validateCreateCustomOrder = [
  body('productName')
    .trim()
    .notEmpty()
    .withMessage('Part name is required')
    .isLength({ min: 2, max: 200 })
    .withMessage('Part name must be between 2 and 200 characters'),
  body('description')
    .trim()
    .notEmpty()
    .withMessage('Description is required')
    .isLength({ min: 10, max: 2000 })
    .withMessage('Description must be between 10 and 2000 characters'),
  body('category')
    .trim()
    .notEmpty()
    .withMessage('Category is required')
    .isLength({ max: 100 })
    .withMessage('Category must be at most 100 characters'),
  body('make')
    .trim()
    .notEmpty()
    .withMessage('Vehicle make is required')
    .isLength({ min: 1, max: 80 })
    .withMessage('Vehicle make must be between 1 and 80 characters'),
  body('model')
    .trim()
    .notEmpty()
    .withMessage('Vehicle model is required')
    .isLength({ min: 1, max: 80 })
    .withMessage('Vehicle model must be between 1 and 80 characters'),
  body('year')
    .notEmpty()
    .withMessage('Vehicle year is required')
    .isInt({ min: 1900, max: nextYear() })
    .withMessage(`Vehicle year must be between 1900 and ${nextYear()}`)
    .toInt(),
  body('engine')
    .trim()
    .notEmpty()
    .withMessage('Engine size or engine code is required')
    .isLength({ min: 1, max: 80 })
    .withMessage('Engine must be between 1 and 80 characters'),
  body('position')
    .trim()
    .notEmpty()
    .withMessage('Part position is required')
    .isIn(PART_POSITIONS)
    .withMessage('Invalid part position'),
  body('quantity')
    .notEmpty()
    .withMessage('Quantity is required')
    .isInt({ min: 1, max: 100 })
    .withMessage('Quantity must be a whole number between 1 and 100')
    .toInt(),
  optionalTrimmedString('trim', 80),
  body('transmission')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(TRANSMISSIONS)
    .withMessage('Invalid transmission'),
  body('drivetrain')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(DRIVETRAINS)
    .withMessage('Invalid drivetrain'),
  body('bodyStyle')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(BODY_STYLES)
    .withMessage('Invalid body style'),
  body('vinOrChassis')
    .optional({ values: 'falsy' })
    .trim()
    .isLength({ min: 5, max: 32 })
    .withMessage('VIN or chassis/frame number must be between 5 and 32 characters')
    .matches(/^[A-Za-z0-9-]+$/)
    .withMessage('VIN or chassis/frame number may only contain letters, numbers, and hyphens'),
  optionalTrimmedString('partNumber', 80),
  body('preference')
    .optional({ values: 'falsy' })
    .trim()
    .isIn(PART_PREFERENCES)
    .withMessage('Invalid part preference'),
  body('estimatedPrice')
    .optional({ values: 'falsy' })
    .isFloat({ min: 0 })
    .withMessage('Estimated budget must be a non-negative number')
    .toFloat(),
];

/** Runs create validations and removes temp uploads if validation fails. */
export const validateCreateCustomOrderRequest = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  await Promise.all(validateCreateCustomOrder.map((validation) => validation.run(req)));

  const errors = validationResult(req);
  if (errors.isEmpty()) {
    return next();
  }

  cleanupUploadedFiles(req);

  res.status(400).json({
    message: 'Validation failed',
    errors: errors.array(),
  });
};

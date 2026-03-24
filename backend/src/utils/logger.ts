/**
 * Logger Utility for AutoTek
 * Provides structured logging using Winston
 *
 * Features:
 * - Console output in development (colorized)
 * - File logging in production (with rotation)
 * - Error tracking to separate file
 * - JSON format for production log parsing
 * - Timestamp and log levels
 */

import winston from 'winston';
import path from 'path';

const isDevelopment = process.env.NODE_ENV !== 'production';

// Define log format
const consoleFormat = winston.format.combine(
  winston.format.colorize(),
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.printf(({ timestamp, level, message, ...meta }) => {
    let metaString = '';
    if (Object.keys(meta).length > 0) {
      metaString = '\n' + JSON.stringify(meta, null, 2);
    }
    return `[${timestamp}] ${level}: ${message}${metaString}`;
  })
);

const fileFormat = winston.format.combine(
  winston.format.timestamp(),
  winston.format.json()
);

// Create the logger
const logger = winston.createLogger({
  level: isDevelopment ? 'debug' : 'info',
  transports: [],
});

// Console transport (always enabled)
logger.add(
  new winston.transports.Console({
    format: consoleFormat,
  })
);

// File transports (production only)
if (!isDevelopment) {
  const logsDir = path.join(__dirname, '../../logs');

  // Combined logs
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'combined.log'),
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );

  // Error logs
  logger.add(
    new winston.transports.File({
      filename: path.join(logsDir, 'error.log'),
      level: 'error',
      format: fileFormat,
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    })
  );
}

// Helper methods for common logging patterns
export const log = {
  info: (message: string, meta?: any) => logger.info(message, meta),
  error: (message: string, error?: any) => {
    const errorMeta = error instanceof Error
      ? { errorMessage: error.message, stack: error.stack, ...error }
      : error;
    logger.error(message, errorMeta);
  },
  warn: (message: string, meta?: any) => logger.warn(message, meta),
  debug: (message: string, meta?: any) => logger.debug(message, meta),

  // Payment-specific logging
  payment: {
    webhook: (provider: string, status: string, meta?: any) => {
      logger.info(`[${provider}] Webhook received`, { status, ...meta });
    },
    refund: (orderId: string, amount: number, success: boolean, meta?: any) => {
      const level = success ? 'info' : 'error';
      logger.log(level, `Refund ${success ? 'successful' : 'failed'}`, {
        orderId,
        amount,
        ...meta,
      });
    },
  },

  // Email-specific logging
  email: {
    sent: (to: string, subject: string) => {
      logger.info('Email sent', { to, subject });
    },
    failed: (to: string, subject: string, error: any) => {
      logger.error('Email failed', { to, subject, error: error.message });
    },
  },

  // API request logging
  request: (method: string, path: string, userId?: string, meta?: any) => {
    logger.info(`${method} ${path}`, { userId, ...meta });
  },
};

export default logger;

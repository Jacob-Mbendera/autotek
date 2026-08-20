// Load environment variables FIRST before any other imports
import dotenv from 'dotenv';
dotenv.config();

import path from 'path';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
// import mongoSanitize from 'express-mongo-sanitize'; // Disabled due to Express 4.x compatibility issue
import connectDB from './config/database';
import { startStaleOrderCleanupScheduler } from './jobs/staleOrderCleanupScheduler';
import { errorHandler } from './middleware/errorHandler';
import { generalLimiter } from './middleware/rateLimiter';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import customOrderRoutes from './routes/customOrderRoutes';
import towingServiceRoutes from './routes/towingServiceRoutes';
import carServiceRoutes from './routes/carServiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import cartRoutes from './routes/cartRoutes';
import reviewRoutes from './routes/reviewRoutes';
import couponRoutes from './routes/couponRoutes';
import returnRoutes, { adminReturnRouter } from './routes/returnRoutes';
import deliveryLocationRoutes from './routes/deliveryLocationRoutes';
import geocodingRoutes from './routes/geocodingRoutes';
import mechanicRoutes from './routes/mechanicRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

if (process.env.NODE_ENV === 'production') {
  app.set('trust proxy', 1);
}

// Security middleware
// Disable CSP in development to allow CORS requests from frontend
app.use(
  helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", 'data:', 'https://res.cloudinary.com'],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    } : false, // Disable CSP in development
    crossOriginEmbedderPolicy: false, // Allow Cloudinary images
  })
);

// Middleware
// Allowlist the known frontend origin(s) instead of reflecting any origin.
// CORS_ALLOWED_ORIGINS supports a comma-separated list for multi-environment setups
// (e.g. staging + production); FRONTEND_URL alone covers the common single-origin case.
const allowedOrigins = (
  process.env.CORS_ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean) || [
    process.env.FRONTEND_URL || 'http://localhost:5173',
  ]
);

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow same-origin/non-browser requests (no Origin header) and any allowlisted origin.
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('Not allowed by CORS'));
    },
    credentials: true,
  })
);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// HTTP request logging
if (process.env.NODE_ENV === 'production') {
  app.use(morgan('combined')); // Apache-style combined log format
} else {
  app.use(morgan('dev')); // Colored concise output for development
}

// Data sanitization against NoSQL query injection
// Note: Temporarily disabled due to compatibility issue with Express 4.x
// The sanitization logic needs to be applied in controllers instead
// TODO: Migrate to manual sanitization or update when library is compatible
// app.use(
//   mongoSanitize({
//     replaceWith: '_',
//   })
// );

// Connect to MongoDB
connectDB();
startStaleOrderCleanupScheduler();

// Apply general rate limiter to all API routes
app.use('/api/', generalLimiter);

// Routes
app.get('/api/health', (_req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

// authLimiter is applied per-route inside authRoutes.ts, not to the whole
// router here — /me is called on every page load and must not share that budget.
app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/custom-orders', customOrderRoutes);
app.use('/api/towing', towingServiceRoutes);
app.use('/api/car-services', carServiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/admin/returns', adminReturnRouter);
app.use('/api/delivery-locations', deliveryLocationRoutes);
app.use('/api/geocoding', geocodingRoutes);
app.use('/api/mechanic', mechanicRoutes);

if (process.env.NODE_ENV === 'production') {
  const distPath = path.join(__dirname, '../../../../frontend/dist');
  app.use(express.static(distPath));
  app.get('/{*splat}', (req, res) => {
    if (req.path.startsWith('/api')) {
      res.status(404).json({
        message: 'Not found',
        path: req.originalUrl,
      });
      return;
    }
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

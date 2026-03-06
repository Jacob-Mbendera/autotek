import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/database';
import { errorHandler } from './middleware/errorHandler';
import authRoutes from './routes/authRoutes';
import productRoutes from './routes/productRoutes';
import orderRoutes from './routes/orderRoutes';
import customOrderRoutes from './routes/customOrderRoutes';
import towingServiceRoutes from './routes/towingServiceRoutes';
import carServiceRoutes from './routes/carServiceRoutes';
import paymentRoutes from './routes/paymentRoutes';
import adminRoutes from './routes/adminRoutes';
import wishlistRoutes from './routes/wishlistRoutes';
import reviewRoutes from './routes/reviewRoutes';
import couponRoutes from './routes/couponRoutes';
import returnRoutes, { adminReturnRouter } from './routes/returnRoutes';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Connect to MongoDB
connectDB();

// Routes
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Server is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/products', productRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/custom-orders', customOrderRoutes);
app.use('/api/towing', towingServiceRoutes);
app.use('/api/car-services', carServiceRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/wishlist', wishlistRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/coupons', couponRoutes);
app.use('/api/returns', returnRoutes);
app.use('/api/admin/returns', adminReturnRouter);

// Error handler
app.use(errorHandler);

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});

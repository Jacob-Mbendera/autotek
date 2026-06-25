import mongoose from 'mongoose';
import MediaAsset from '../models/MediaAsset';

const connectDB = async (): Promise<void> => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/autotek';
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      minPoolSize: 2,
    });
    console.log('MongoDB connected successfully');

    // Remove obsolete indexes (e.g. publicId_1) not present on current MediaAsset schema;
    // a unique index on publicId with nulls blocks multiple library uploads.
    try {
      const dropped = await MediaAsset.syncIndexes();
      if (dropped) {
        console.log('MediaAsset index sync: dropped/updated as needed', dropped);
      }
    } catch (syncError) {
      console.warn('MediaAsset syncIndexes:', syncError);
    }
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};

export default connectDB;

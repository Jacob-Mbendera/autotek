import mongoose, { Schema, Document } from 'mongoose';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: string[];
  supplier?: string;
  status: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductSchema = new Schema<IProduct>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
      min: 0,
    },
    stock: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    images: {
      type: [String],
      default: [],
    },
    supplier: {
      type: String,
    },
    status: {
      type: String,
      enum: ['available', 'out-of-stock'],
      default: 'available',
    },
    badge: {
      type: String,
      enum: ['new', 'sale', 'featured'],
    },
    averageRating: {
      type: Number,
      default: 0,
      min: 0,
      max: 5,
    },
    reviewCount: {
      type: Number,
      default: 0,
      min: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for performance
ProductSchema.index({ category: 1, status: 1 }); // Category + stock filtering
ProductSchema.index({ price: 1 }); // Price sorting
ProductSchema.index({ name: 'text', description: 'text' }); // Text search
ProductSchema.index({ createdAt: -1 }); // Latest products
ProductSchema.index({ averageRating: -1 }); // Top rated products

export default mongoose.model<IProduct>('Product', ProductSchema);

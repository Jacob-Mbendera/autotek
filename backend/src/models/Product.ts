import mongoose, { Schema, Document } from 'mongoose';
import type {
  ProductCompatibilityEntry,
  ProductFitmentStatus,
} from '../../../shared/types';
import type { ProductImageStored } from '../utils/productImages';
import { normalizeProductImage } from '../utils/productImages';

export interface IProduct extends Document {
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  images: ProductImageStored[];
  supplier?: string;
  brand?: string;
  oemPartNumber?: string;
  alternatePartNumbers: string[];
  isUniversal: boolean;
  compatibility: ProductCompatibilityEntry[];
  fitmentStatus: ProductFitmentStatus;
  status: 'available' | 'out-of-stock';
  badge?: 'new' | 'sale' | 'featured';
  averageRating: number;
  reviewCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ProductCompatibilitySchema = new Schema<ProductCompatibilityEntry>(
  {
    make: {
      type: String,
      required: true,
      trim: true,
    },
    model: {
      type: String,
      required: true,
      trim: true,
    },
    yearFrom: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    yearTo: {
      type: Number,
      min: 1900,
      max: 2100,
    },
    engine: {
      type: String,
      trim: true,
    },
    notes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
  },
  { _id: false }
);

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
      type: [Schema.Types.Mixed],
      default: [],
    },
    supplier: {
      type: String,
      trim: true,
    },
    brand: {
      type: String,
      trim: true,
    },
    oemPartNumber: {
      type: String,
      trim: true,
    },
    alternatePartNumbers: {
      type: [{ type: String, trim: true }],
      default: [],
    },
    isUniversal: {
      type: Boolean,
      default: false,
    },
    compatibility: {
      type: [ProductCompatibilitySchema],
      default: [],
    },
    fitmentStatus: {
      type: String,
      enum: ['none', 'partial', 'verified'],
      default: 'none',
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

function serializeImages(images: unknown): { url: string; blurDataUrl?: string }[] {
  if (!Array.isArray(images)) return [];
  return images.map((item) => normalizeProductImage(item));
}

ProductSchema.set('toJSON', {
  virtuals: true,
  transform(_doc, ret) {
    const plain = ret as unknown as Record<string, unknown>;
    if (Array.isArray(plain.images)) {
      plain.images = serializeImages(plain.images);
    }
    return plain;
  },
});

ProductSchema.set('toObject', {
  virtuals: true,
  transform(_doc, ret) {
    const plain = ret as unknown as Record<string, unknown>;
    if (Array.isArray(plain.images)) {
      plain.images = serializeImages(plain.images);
    }
    return plain;
  },
});

// Indexes for performance
ProductSchema.index({ category: 1, status: 1 }); // Category + stock filtering
ProductSchema.index({ 'compatibility.make': 1, 'compatibility.model': 1 });
ProductSchema.index({ price: 1 }); // Price sorting
ProductSchema.index({ name: 'text', description: 'text' }); // Text search
ProductSchema.index({ createdAt: -1 }); // Latest products
ProductSchema.index({ averageRating: -1 }); // Top rated products

export default mongoose.model<IProduct>('Product', ProductSchema);

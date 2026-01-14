import mongoose, { Schema, Document, Types } from 'mongoose';
import { CustomOrderStatus } from '../types/shared';

export interface ICustomOrder extends Document {
  user: Types.ObjectId;
  productName: string;
  description: string;
  category: string;
  estimatedPrice?: number;
  status: CustomOrderStatus;
  supplier?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CustomOrderSchema = new Schema<ICustomOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productName: {
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
    estimatedPrice: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CustomOrderStatus),
      default: CustomOrderStatus.PENDING,
    },
    supplier: {
      type: String,
    },
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICustomOrder>('CustomOrder', CustomOrderSchema);

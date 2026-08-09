import mongoose, { Schema, Document, Types } from 'mongoose';
import { ReturnStatus, ReturnReason, RefundMethod, RefundStatus } from '../types/shared';

export interface IReturnItem {
  product: Types.ObjectId;
  quantity: number;
  reason: string;
}

export interface IReturn extends Document {
  order: Types.ObjectId;
  user?: Types.ObjectId; // Optional for authenticated users
  guestInfo?: {
    email: string;
    name: string;
    phone: string;
  };
  items: IReturnItem[];
  returnReason: ReturnReason;
  comments?: string;
  images: string[]; // Cloudinary URLs
  status: ReturnStatus;
  refundAmount: number;
  refundMethod: RefundMethod;
  refundStatus: RefundStatus;
  refundCompletedAt?: Date;
  shippingLabel?: string;
  adminNotes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ReturnItemSchema = new Schema<IReturnItem>({
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true,
  },
  quantity: {
    type: Number,
    required: true,
    min: 1,
  },
  reason: {
    type: String,
    required: true,
    trim: true,
  },
});

const ReturnSchema = new Schema(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: false,
    },
    guestInfo: {
      email: {
        type: String,
        required: false,
        trim: true,
        lowercase: true,
      },
      name: {
        type: String,
        required: false,
        trim: true,
      },
      phone: {
        type: String,
        required: false,
        trim: true,
      },
    },
    items: {
      type: [ReturnItemSchema],
      required: true,
      validate: {
        validator: (items: IReturnItem[]) => items.length > 0,
        message: 'Return must have at least one item',
      },
    },
    returnReason: {
      type: String,
      enum: ['defective', 'wrong-item', 'not-as-described', 'changed-mind', 'other'],
      required: true,
    },
    comments: {
      type: String,
      trim: true,
    },
    images: {
      type: [String],
      default: [],
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'completed', 'cancelled'],
      default: 'pending',
    },
    refundAmount: {
      type: Number,
      required: true,
      min: 0,
      default: 0,
    },
    refundMethod: {
      type: String,
      enum: ['original-payment', 'store-credit'],
      default: 'original-payment',
    },
    refundStatus: {
      type: String,
      enum: ['pending', 'processing', 'completed', 'failed'],
      default: 'pending',
    },
    refundCompletedAt: {
      type: Date,
    },
    shippingLabel: {
      type: String,
      trim: true,
    },
    adminNotes: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
ReturnSchema.index({ order: 1 });
ReturnSchema.index({ user: 1, createdAt: -1 });
ReturnSchema.index({ status: 1 });
ReturnSchema.index({ 'guestInfo.email': 1, createdAt: -1 });

// Prevent two open (pending/approved) returns existing for the same order at once —
// guards against a double-click/race creating duplicate return requests (and downstream
// duplicate refunds) even if the application-level check-then-create is raced.
ReturnSchema.index(
  { order: 1 },
  {
    unique: true,
    partialFilterExpression: { status: { $in: ['pending', 'approved'] } },
    name: 'order_open_return_unique',
  }
);

export default mongoose.model<IReturn>('Return', ReturnSchema);

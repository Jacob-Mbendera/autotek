import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../types/shared';

export interface IPayment extends Document {
  order?: Types.ObjectId;
  towingService?: Types.ObjectId;
  carService?: Types.ObjectId;
  type: 'order' | 'towing' | 'car-service';
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
  chargeId?: string;
  refundId?: string;
  refundReason?: string;
  refundRequestedAt?: Date;
  refundCompletedAt?: Date;
  status: PaymentStatus;
  createdAt: Date;
  updatedAt: Date;
}

const PaymentSchema = new Schema<IPayment>(
  {
    order: {
      type: Schema.Types.ObjectId,
      ref: 'Order',
    },
    towingService: {
      type: Schema.Types.ObjectId,
      ref: 'TowingService',
    },
    carService: {
      type: Schema.Types.ObjectId,
      ref: 'CarService',
    },
    type: {
      type: String,
      enum: ['order', 'towing', 'car-service'],
      required: true,
    },
    amount: {
      type: Number,
      required: true,
      min: 0,
    },
    method: {
      type: String,
      enum: Object.values(PaymentMethod),
      required: true,
    },
    transactionId: {
      type: String,
    },
    chargeId: {
      type: String,
      index: true,
    },
    refundId: {
      type: String,
    },
    refundReason: {
      type: String,
    },
    refundRequestedAt: {
      type: Date,
    },
    refundCompletedAt: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(PaymentStatus),
      default: PaymentStatus.PENDING,
    },
  },
  {
    timestamps: true,
  }
);

PaymentSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IPayment>('Payment', PaymentSchema);

import mongoose, { Schema, Document, Types } from 'mongoose';
import { PaymentMethod, PaymentStatus } from '../../shared/types';

export interface IPayment extends Document {
  order?: Types.ObjectId;
  towingService?: Types.ObjectId;
  carService?: Types.ObjectId;
  type: 'order' | 'towing' | 'car-service';
  amount: number;
  method: PaymentMethod;
  transactionId?: string;
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

export default mongoose.model<IPayment>('Payment', PaymentSchema);

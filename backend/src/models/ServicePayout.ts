import mongoose, { Schema, Document, Types } from 'mongoose';
import { ServicePayoutStatus } from '../types/shared';

export interface IServicePayout extends Document {
  payment: Types.ObjectId;
  garage: Types.ObjectId;
  provider?: Types.ObjectId;
  serviceKind: 'towing' | 'car-service';
  service: Types.ObjectId;
  amountMwk: number;
  status: ServicePayoutStatus;
  paidAt?: Date;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServicePayoutSchema = new Schema<IServicePayout>(
  {
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
      required: true,
      unique: true,
    },
    garage: {
      type: Schema.Types.ObjectId,
      ref: 'Garage',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceProvider',
    },
    serviceKind: {
      type: String,
      enum: ['towing', 'car-service'],
      required: true,
    },
    service: {
      type: Schema.Types.ObjectId,
      required: true,
    },
    amountMwk: { type: Number, required: true, min: 0 },
    status: {
      type: String,
      enum: Object.values(ServicePayoutStatus),
      default: ServicePayoutStatus.PENDING,
    },
    paidAt: { type: Date },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

ServicePayoutSchema.index({ garage: 1, status: 1 });
ServicePayoutSchema.index({ status: 1, createdAt: -1 });

export default mongoose.model<IServicePayout>('ServicePayout', ServicePayoutSchema);

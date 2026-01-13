import mongoose, { Schema, Document, Types } from 'mongoose';
import { ServiceStatus } from '../../shared/types';

export interface ITowingService extends Document {
  user: Types.ObjectId;
  pickupLocation: string;
  destination: string;
  vehicleDetails: {
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string;
    color?: string;
  };
  status: ServiceStatus;
  assignedDriver?: Types.ObjectId;
  price?: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  updatedAt: Date;
}

const TowingServiceSchema = new Schema<ITowingService>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    pickupLocation: {
      type: String,
      required: true,
    },
    destination: {
      type: String,
      required: true,
    },
    vehicleDetails: {
      make: String,
      model: String,
      year: Number,
      licensePlate: String,
      color: String,
    },
    status: {
      type: String,
      enum: Object.values(ServiceStatus),
      default: ServiceStatus.PENDING,
    },
    assignedDriver: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    price: {
      type: Number,
      min: 0,
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'completed', 'failed'],
      default: 'pending',
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITowingService>('TowingService', TowingServiceSchema);

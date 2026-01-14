import mongoose, { Schema, Document, Types } from 'mongoose';
import { ServiceStatus, ServiceType } from '../types/shared';

export interface ICarService extends Document {
  user: Types.ObjectId;
  serviceType: ServiceType;
  vehicleDetails: {
    make?: string;
    model?: string;
    year?: number;
    licensePlate?: string;
  };
  address: string;
  preferredDate?: Date;
  status: ServiceStatus;
  assignedMechanic?: Types.ObjectId;
  price?: number;
  paymentStatus: 'pending' | 'completed' | 'failed';
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CarServiceSchema = new Schema<ICarService>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    serviceType: {
      type: String,
      enum: Object.values(ServiceType),
      required: true,
    },
    vehicleDetails: {
      make: String,
      model: String,
      year: Number,
      licensePlate: String,
    },
    address: {
      type: String,
      required: true,
    },
    preferredDate: {
      type: Date,
    },
    status: {
      type: String,
      enum: Object.values(ServiceStatus),
      default: ServiceStatus.PENDING,
    },
    assignedMechanic: {
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
    notes: {
      type: String,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICarService>('CarService', CarServiceSchema);

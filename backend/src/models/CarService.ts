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
  addressDescription?: string;
  serviceLatitude?: number;
  serviceLongitude?: number;
  serviceLocationMethod?: 'pin' | 'structured';
  preferredDate?: Date;
  status: ServiceStatus;
  assignedMechanic?: Types.ObjectId;
  estimatedArrivalAt?: Date;
  etaUpdatedAt?: Date;
  price?: number;
  quoteMobilePhone?: string;
  quoteWhatsAppPhone?: string;
  quoteRequestNotes?: string;
  quoteRequestSubmittedAt?: Date;
  payment?: Types.ObjectId;
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
    addressDescription: {
      type: String,
    },
    serviceLatitude: {
      type: Number,
    },
    serviceLongitude: {
      type: Number,
    },
    serviceLocationMethod: {
      type: String,
      enum: ['pin', 'structured'],
      default: 'structured',
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
      ref: 'ServiceProvider',
    },
    estimatedArrivalAt: {
      type: Date,
    },
    etaUpdatedAt: {
      type: Date,
    },
    price: {
      type: Number,
      min: 0,
    },
    quoteMobilePhone: {
      type: String,
      trim: true,
    },
    quoteWhatsAppPhone: {
      type: String,
      trim: true,
    },
    quoteRequestNotes: {
      type: String,
      trim: true,
      maxlength: 500,
    },
    quoteRequestSubmittedAt: {
      type: Date,
    },
    payment: {
      type: Schema.Types.ObjectId,
      ref: 'Payment',
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

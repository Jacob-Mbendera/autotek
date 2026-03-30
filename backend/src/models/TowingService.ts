import mongoose, { Schema, Document, Types } from 'mongoose';
import { ServiceStatus } from '../types/shared';

export interface ITowingService extends Document {
  user: Types.ObjectId;
  pickupLocation: string;
  pickupLocationDescription?: string;
  pickupLatitude?: number;
  pickupLongitude?: number;
  pickupLocationMethod?: 'pin' | 'structured';
  destination: string;
  destinationDescription?: string;
  destinationLatitude?: number;
  destinationLongitude?: number;
  destinationLocationMethod?: 'pin' | 'structured';
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
  quoteMobilePhone?: string;
  quoteWhatsAppPhone?: string;
  quoteRequestNotes?: string;
  quoteRequestSubmittedAt?: Date;
  payment?: Types.ObjectId;
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
    pickupLocationDescription: {
      type: String,
    },
    destination: {
      type: String,
      required: true,
    },
    destinationDescription: {
      type: String,
    },
    pickupLatitude: {
      type: Number,
    },
    pickupLongitude: {
      type: Number,
    },
    pickupLocationMethod: {
      type: String,
      enum: ['pin', 'structured'],
      default: 'structured',
    },
    destinationLatitude: {
      type: Number,
    },
    destinationLongitude: {
      type: Number,
    },
    destinationLocationMethod: {
      type: String,
      enum: ['pin', 'structured'],
      default: 'structured',
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
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ITowingService>('TowingService', TowingServiceSchema);

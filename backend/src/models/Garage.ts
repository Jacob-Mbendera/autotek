import mongoose, { Schema, Document, Types } from 'mongoose';
import { GarageVerificationStatus } from '../types/shared';

export interface IGarage extends Document {
  name: string;
  contactPhone: string;
  email?: string;
  town: string;
  addressLine?: string;
  verificationStatus: GarageVerificationStatus;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const GarageSchema = new Schema<IGarage>(
  {
    name: { type: String, required: true, trim: true },
    contactPhone: { type: String, required: true, trim: true },
    email: { type: String, trim: true, lowercase: true },
    town: { type: String, required: true, trim: true },
    addressLine: { type: String, trim: true },
    verificationStatus: {
      type: String,
      enum: Object.values(GarageVerificationStatus),
      default: GarageVerificationStatus.PENDING,
    },
    notes: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

GarageSchema.index({ name: 1, town: 1 });

export default mongoose.model<IGarage>('Garage', GarageSchema);

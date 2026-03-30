import mongoose, { Schema, Document, Types } from 'mongoose';
import { ProviderType, ProviderVettingStatus } from '../types/shared';

export interface IServiceProvider extends Document {
  garage: Types.ObjectId;
  name: string;
  phone: string;
  whatsAppPhone?: string;
  providerType: ProviderType;
  vettingStatus: ProviderVettingStatus;
  active: boolean;
  certificationNote?: string;
  averageRating: number;
  ratingCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceProviderSchema = new Schema<IServiceProvider>(
  {
    garage: {
      type: Schema.Types.ObjectId,
      ref: 'Garage',
      required: true,
    },
    name: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    whatsAppPhone: { type: String, trim: true },
    providerType: {
      type: String,
      enum: Object.values(ProviderType),
      required: true,
    },
    vettingStatus: {
      type: String,
      enum: Object.values(ProviderVettingStatus),
      default: ProviderVettingStatus.PENDING_REVIEW,
    },
    active: { type: Boolean, default: true },
    certificationNote: { type: String, trim: true, maxlength: 2000 },
    averageRating: { type: Number, default: 0, min: 0, max: 5 },
    ratingCount: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true }
);

ServiceProviderSchema.index({ garage: 1, providerType: 1 });
ServiceProviderSchema.index({ providerType: 1, vettingStatus: 1, active: 1 });

export default mongoose.model<IServiceProvider>('ServiceProvider', ServiceProviderSchema);

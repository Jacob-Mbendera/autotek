import mongoose, { Schema, Document, Types } from 'mongoose';
import { CustomOrderStatus } from '../types/shared';

export const PART_PREFERENCES = [
  'genuine-oem',
  'new-aftermarket',
  'used-reconditioned',
  'no-preference',
] as const;

export const PART_POSITIONS = [
  'front',
  'rear',
  'left',
  'right',
  'front-left',
  'front-right',
  'rear-left',
  'rear-right',
  'inner',
  'outer',
  'driver',
  'passenger',
  'not-applicable',
] as const;

export const TRANSMISSIONS = ['automatic', 'manual', 'cvt', 'not-sure'] as const;
export const DRIVETRAINS = ['fwd', 'rwd', 'awd-4wd', 'not-sure'] as const;
export const BODY_STYLES = [
  'sedan',
  'hatchback',
  'wagon',
  'pickup',
  'suv',
  'other',
  'not-sure',
] as const;

export type PartPreference = (typeof PART_PREFERENCES)[number];
export type PartPosition = (typeof PART_POSITIONS)[number];
export type Transmission = (typeof TRANSMISSIONS)[number];
export type Drivetrain = (typeof DRIVETRAINS)[number];
export type BodyStyle = (typeof BODY_STYLES)[number];

export interface IVehicleDetails {
  make?: string;
  model?: string;
  year?: number;
  engine?: string;
  trim?: string;
  transmission?: Transmission;
  drivetrain?: Drivetrain;
  bodyStyle?: BodyStyle;
  vinOrChassis?: string;
}

export interface IPartDetails {
  position?: PartPosition;
  partNumber?: string;
  quantity?: number;
  preference?: PartPreference;
}

export interface ICustomOrder extends Document {
  user: Types.ObjectId;
  productName: string;
  description: string;
  category: string;
  estimatedPrice?: number;
  status: CustomOrderStatus;
  supplier?: string;
  notes?: string;
  vehicleDetails?: IVehicleDetails;
  partDetails?: IPartDetails;
  images: string[];
  createdAt: Date;
  updatedAt: Date;
}

const VehicleDetailsSchema = new Schema<IVehicleDetails>(
  {
    make: { type: String, trim: true },
    model: { type: String, trim: true },
    year: { type: Number, min: 1900 },
    engine: { type: String, trim: true },
    trim: { type: String, trim: true },
    transmission: { type: String, enum: TRANSMISSIONS },
    drivetrain: { type: String, enum: DRIVETRAINS },
    bodyStyle: { type: String, enum: BODY_STYLES },
    vinOrChassis: { type: String, trim: true },
  },
  { _id: false }
);

const PartDetailsSchema = new Schema<IPartDetails>(
  {
    position: { type: String, enum: PART_POSITIONS },
    partNumber: { type: String, trim: true },
    quantity: { type: Number, min: 1, default: 1 },
    preference: { type: String, enum: PART_PREFERENCES },
  },
  { _id: false }
);

const CustomOrderSchema = new Schema<ICustomOrder>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    productName: {
      type: String,
      required: true,
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    category: {
      type: String,
      required: true,
    },
    estimatedPrice: {
      type: Number,
      min: 0,
    },
    status: {
      type: String,
      enum: Object.values(CustomOrderStatus),
      default: CustomOrderStatus.PENDING,
    },
    supplier: {
      type: String,
    },
    notes: {
      type: String,
    },
    vehicleDetails: {
      type: VehicleDetailsSchema,
      default: undefined,
    },
    partDetails: {
      type: PartDetailsSchema,
      default: undefined,
    },
    images: {
      type: [String],
      default: [],
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<ICustomOrder>('CustomOrder', CustomOrderSchema);

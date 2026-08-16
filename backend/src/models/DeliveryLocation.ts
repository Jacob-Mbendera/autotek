import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ILandmark {
  _id: Types.ObjectId;
  name: string;
  active: boolean;
}

export interface IDeliveryLocation extends Document {
  town: string;
  landmarks: ILandmark[];
  deliveryFee: number;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const LandmarkSchema = new Schema<ILandmark>(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  { _id: true }
);

const DeliveryLocationSchema = new Schema<IDeliveryLocation>(
  {
    town: {
      type: String,
      required: true,
      trim: true,
      unique: true,
    },
    landmarks: {
      type: [LandmarkSchema],
      default: [],
      validate: {
        validator: (landmarks: ILandmark[]) => landmarks.length > 0,
        message: 'Town must have at least one landmark',
      },
    },
    deliveryFee: {
      type: Number,
      required: true,
      default: 0,
      min: 0,
    },
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes for better query performance
DeliveryLocationSchema.index({ town: 1, active: 1 });
DeliveryLocationSchema.index({ 'landmarks.name': 1 });

export default mongoose.model<IDeliveryLocation>('DeliveryLocation', DeliveryLocationSchema);

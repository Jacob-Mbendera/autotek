import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IServiceRating extends Document {
  serviceKind: 'towing' | 'car-service';
  service: Types.ObjectId;
  user: Types.ObjectId;
  provider: Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
  updatedAt: Date;
}

const ServiceRatingSchema = new Schema<IServiceRating>(
  {
    serviceKind: {
      type: String,
      enum: ['towing', 'car-service'],
      required: true,
    },
    service: { type: Schema.Types.ObjectId, required: true },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    provider: {
      type: Schema.Types.ObjectId,
      ref: 'ServiceProvider',
      required: true,
    },
    rating: { type: Number, required: true, min: 1, max: 5 },
    comment: { type: String, trim: true, maxlength: 2000 },
  },
  { timestamps: true }
);

ServiceRatingSchema.index(
  { user: 1, serviceKind: 1, service: 1 },
  { unique: true }
);
ServiceRatingSchema.index({ provider: 1 });

export default mongoose.model<IServiceRating>('ServiceRating', ServiceRatingSchema);

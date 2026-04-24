import mongoose, { Schema, Document } from 'mongoose';

export interface IMediaAsset extends Document {
  url: string;
  blurDataUrl?: string;
  originalName?: string;
  createdAt: Date;
  updatedAt: Date;
}

const MediaAssetSchema = new Schema<IMediaAsset>(
  {
    url: {
      type: String,
      required: true,
      trim: true,
    },
    blurDataUrl: {
      type: String,
    },
    originalName: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true,
  }
);

MediaAssetSchema.index({ createdAt: -1 });
MediaAssetSchema.index({ originalName: 'text' });

export default mongoose.model<IMediaAsset>('MediaAsset', MediaAssetSchema);

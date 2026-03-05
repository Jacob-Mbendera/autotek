import mongoose, { Schema, Document, Types } from 'mongoose';

export interface ICoupon extends Document {
  code: string;
  type: 'percentage' | 'fixed' | 'free-shipping';
  value: number; // 10 for 10%, or 5000 for MWK 5000
  minOrderValue?: number;
  maxDiscount?: number;
  validFrom: Date;
  validTo: Date;
  usageLimit?: number; // Total uses allowed
  usageCount: number;
  userLimit?: number; // Per-user limit
  applicableCategories?: string[];
  excludedProducts?: Types.ObjectId[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const CouponSchema = new Schema<ICoupon>(
  {
    code: {
      type: String,
      required: true,
      unique: true,
      uppercase: true,
      trim: true,
    },
    type: {
      type: String,
      enum: ['percentage', 'fixed', 'free-shipping'],
      required: true,
    },
    value: {
      type: Number,
      required: true,
      min: 0,
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: 0,
    },
    maxDiscount: {
      type: Number,
      min: 0,
    },
    validFrom: {
      type: Date,
      required: true,
      default: Date.now,
    },
    validTo: {
      type: Date,
      required: true,
    },
    usageLimit: {
      type: Number,
      min: 0,
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0,
    },
    userLimit: {
      type: Number,
      min: 1,
    },
    applicableCategories: [{
      type: String,
    }],
    excludedProducts: [{
      type: Schema.Types.ObjectId,
      ref: 'Product',
    }],
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

// Indexes
CouponSchema.index({ code: 1 });
CouponSchema.index({ active: 1, validFrom: 1, validTo: 1 });

export default mongoose.model<ICoupon>('Coupon', CouponSchema);

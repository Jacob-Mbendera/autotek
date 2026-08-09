import mongoose, { Schema, Document } from 'mongoose';
import { UserRole } from '../types/shared';
import { IShippingAddress } from './Order';

export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  phone: string;
  role: UserRole;
  address?: IShippingAddress | string;
  resetToken?: string;
  resetTokenExpiry?: Date;
  tokenVersion: number;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: true,
      minlength: 6,
    },
    name: {
      type: String,
      required: true,
      trim: true,
    },
    phone: {
      type: String,
      required: true,
    },
    role: {
      type: String,
      enum: Object.values(UserRole),
      default: UserRole.CUSTOMER,
    },
    address: {
      type: Schema.Types.Mixed,
    },
    resetToken: {
      type: String,
    },
    resetTokenExpiry: {
      type: Date,
    },
    tokenVersion: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

export default mongoose.model<IUser>('User', UserSchema);

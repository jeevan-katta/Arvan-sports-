import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBankDetails {
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
}

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  phone?: string;
  avatar?: string;
  blocked: boolean;
  businessName?: string;
  commissionRate?: number;
  bankDetails?: IBankDetails;
  totalPayoutSent?: number;
  createdAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>({
  accountName: String,
  accountNumber: String,
  ifscCode: String,
  bankName: String,
  upiId: String,
}, { _id: false });

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, default: "user" },
  phone: String,
  avatar: String,
  blocked: { type: Boolean, default: false },
  businessName: String,
  commissionRate: { type: Number, default: 20 },
  bankDetails: BankDetailsSchema,
  totalPayoutSent: { type: Number, default: 0 },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

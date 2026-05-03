import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBankDetails {
  accountName?: string;
  accountNumber?: string;
  ifscCode?: string;
  bankName?: string;
  upiId?: string;
}

export interface IPayoutRecord {
  amount: number;
  date: Date;
  note?: string;
  method?: string;
  razorpayPayoutId?: string;
  razorpayStatus?: string;
  razorpayMode?: string;
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
  commissionHeld?: boolean;
  payoutSchedule?: string;
  bankDetails?: IBankDetails;
  totalPayoutSent?: number;
  payoutHistory?: IPayoutRecord[];
  razorpayContactId?: string;
  createdAt: Date;
}

const BankDetailsSchema = new Schema<IBankDetails>({
  accountName: String,
  accountNumber: String,
  ifscCode: String,
  bankName: String,
  upiId: String,
}, { _id: false });

const PayoutRecordSchema = new Schema<IPayoutRecord>({
  amount: { type: Number, required: true },
  date: { type: Date, default: Date.now },
  note: String,
  method: { type: String, default: "bank_transfer" },
  razorpayPayoutId: String,
  razorpayStatus: String,
  razorpayMode: String,
}, { _id: true, timestamps: false });

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
  commissionHeld: { type: Boolean, default: false },
  payoutSchedule: { type: String, default: "manual" },
  bankDetails: BankDetailsSchema,
  totalPayoutSent: { type: Number, default: 0 },
  payoutHistory: { type: [PayoutRecordSchema], default: [] },
  razorpayContactId: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IBooking extends Document {
  _id: mongoose.Types.ObjectId;
  turfId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  slotId: mongoose.Types.ObjectId;
  slotIds: mongoose.Types.ObjectId[];
  date: string;
  startTime: string;
  endTime: string;
  totalPrice: number;
  paidAmount?: number;
  playerCount: number;
  status: string;
  paymentType: string;
  paymentStatus: string;
  razorpayOrderId?: string;
  razorpayPaymentId?: string;
  expiresAt?: Date;
  createdAt: Date;
}

const BookingSchema = new Schema<IBooking>({
  turfId: { type: Schema.Types.ObjectId, ref: "Turf", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  slotId: { type: Schema.Types.ObjectId, ref: "TimeSlot", required: true },
  slotIds: { type: [Schema.Types.ObjectId], default: [] },
  date: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  totalPrice: { type: Number, required: true },
  paidAmount: Number,
  playerCount: { type: Number, default: 10 },
  status: { type: String, default: "pending" },
  paymentType: { type: String, default: "full" },
  paymentStatus: { type: String, default: "unpaid" },
  razorpayOrderId: String,
  razorpayPaymentId: String,
  expiresAt: Date,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Booking: Model<IBooking> = mongoose.models.Booking || mongoose.model<IBooking>("Booking", BookingSchema);

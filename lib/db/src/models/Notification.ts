import mongoose, { Schema, Document } from "mongoose";

export interface INotification extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  type: "payout_received" | "account_held" | "account_released" | "turf_approved" | "turf_rejected" | "general";
  title: string;
  message: string;
  read: boolean;
  amount?: number;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  userId:  { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  type:    { type: String, required: true },
  title:   { type: String, required: true },
  message: { type: String, required: true },
  read:    { type: Boolean, default: false },
  amount:  { type: Number },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Notification = mongoose.models.Notification || mongoose.model<INotification>("Notification", NotificationSchema);

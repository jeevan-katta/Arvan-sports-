import mongoose, { Schema, Document, Model } from "mongoose";

export interface ITimeSlot extends Document {
  _id: mongoose.Types.ObjectId;
  turfId: mongoose.Types.ObjectId;
  startTime: string;
  endTime: string;
  createdAt: Date;
}

export interface IReview extends Document {
  _id: mongoose.Types.ObjectId;
  turfId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  rating: number;
  comment?: string;
  createdAt: Date;
}

export interface ITurf extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  description?: string;
  pricePerHour: number;
  images: string[];
  rating: number;
  reviewCount: number;
  latitude?: number;
  longitude?: number;
  address?: string;
  area?: string;
  amenities: string[];
  status: string;
  featured: boolean;
  ownerId: mongoose.Types.ObjectId;
  createdAt: Date;
}

const TurfSchema = new Schema<ITurf>({
  name: { type: String, required: true },
  description: String,
  pricePerHour: { type: Number, required: true },
  images: { type: [String], default: [] },
  rating: { type: Number, default: 0 },
  reviewCount: { type: Number, default: 0 },
  latitude: Number,
  longitude: Number,
  address: String,
  area: String,
  amenities: { type: [String], default: [] },
  status: { type: String, default: "pending" },
  featured: { type: Boolean, default: false },
  ownerId: { type: Schema.Types.ObjectId, ref: "User", required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const TimeSlotSchema = new Schema<ITimeSlot>({
  turfId: { type: Schema.Types.ObjectId, ref: "Turf", required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

const ReviewSchema = new Schema<IReview>({
  turfId: { type: Schema.Types.ObjectId, ref: "Turf", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  rating: { type: Number, required: true },
  comment: String,
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Turf: Model<ITurf> = mongoose.models.Turf || mongoose.model<ITurf>("Turf", TurfSchema);
export const TimeSlot: Model<ITimeSlot> = mongoose.models.TimeSlot || mongoose.model<ITimeSlot>("TimeSlot", TimeSlotSchema);
export const Review: Model<IReview> = mongoose.models.Review || mongoose.model<IReview>("Review", ReviewSchema);

import mongoose, { Schema, Document, Model } from "mongoose";

export interface IAnnouncement extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  message: string;
  type: "general" | "event" | "maintenance" | "tournament";
  createdBy: mongoose.Types.ObjectId;
  createdByRole: "admin" | "owner";
  createdByName?: string;
  turfId?: mongoose.Types.ObjectId;
  turfName?: string;
  pinned: boolean;
  createdAt: Date;
}

const AnnouncementSchema = new Schema<IAnnouncement>({
  title:         { type: String, required: true },
  message:       { type: String, required: true },
  type:          { type: String, enum: ["general","event","maintenance","tournament"], default: "general" },
  createdBy:     { type: Schema.Types.ObjectId, ref: "User", required: true },
  createdByRole: { type: String, enum: ["admin","owner"], required: true },
  createdByName: String,
  turfId:        { type: Schema.Types.ObjectId, ref: "Turf" },
  turfName:      String,
  pinned:        { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Announcement: Model<IAnnouncement> =
  mongoose.models.Announcement ||
  mongoose.model<IAnnouncement>("Announcement", AnnouncementSchema);

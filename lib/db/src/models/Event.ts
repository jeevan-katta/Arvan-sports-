import mongoose, { Schema, Document, Model } from "mongoose";

export interface IEvent extends Document {
  _id: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  date: string;
  time?: string;
  venue?: string;
  area?: string;
  image?: string;
  prize?: string;
  entryFee: number;
  maxParticipants?: number;
  currentParticipants: number;
  featured: boolean;
  status: string;
  createdAt: Date;
}

export interface IEventParticipant extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
}

const EventSchema = new Schema<IEvent>({
  title: { type: String, required: true },
  description: String,
  date: { type: String, required: true },
  time: String,
  venue: String,
  area: String,
  image: String,
  prize: String,
  entryFee: { type: Number, default: 0 },
  maxParticipants: Number,
  currentParticipants: { type: Number, default: 0 },
  featured: { type: Boolean, default: false },
  status: { type: String, default: "upcoming" },
}, { timestamps: { createdAt: true, updatedAt: false } });

const EventParticipantSchema = new Schema<IEventParticipant>({
  eventId: { type: Schema.Types.ObjectId, ref: "Event", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  joinedAt: { type: Date, default: Date.now },
});

export const Event: Model<IEvent> = mongoose.models.Event || mongoose.model<IEvent>("Event", EventSchema);
export const EventParticipant: Model<IEventParticipant> = mongoose.models.EventParticipant || mongoose.model<IEventParticipant>("EventParticipant", EventParticipantSchema);

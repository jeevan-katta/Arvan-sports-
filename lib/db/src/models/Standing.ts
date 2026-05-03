import mongoose, { Schema, Document, Model } from "mongoose";

export interface IStanding extends Document {
  _id: mongoose.Types.ObjectId;
  eventId: mongoose.Types.ObjectId;
  position: number;
  teamName: string;
  played: number;
  won: number;
  lost: number;
  drawn: number;
  points: number;
  goalsFor: number;
  goalsAgainst: number;
  updatedAt: Date;
}

const StandingSchema = new Schema<IStanding>({
  eventId:      { type: Schema.Types.ObjectId, ref: "Event", required: true },
  position:     { type: Number, required: true },
  teamName:     { type: String, required: true },
  played:       { type: Number, default: 0 },
  won:          { type: Number, default: 0 },
  lost:         { type: Number, default: 0 },
  drawn:        { type: Number, default: 0 },
  points:       { type: Number, default: 0 },
  goalsFor:     { type: Number, default: 0 },
  goalsAgainst: { type: Number, default: 0 },
}, { timestamps: { createdAt: false, updatedAt: true } });

StandingSchema.index({ eventId: 1, position: 1 });
StandingSchema.index({ eventId: 1, teamName: 1 }, { unique: true });

export const Standing: Model<IStanding> =
  mongoose.models.Standing || mongoose.model<IStanding>("Standing", StandingSchema);

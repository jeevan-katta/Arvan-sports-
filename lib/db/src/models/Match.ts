import mongoose, { Schema, Document, Model } from "mongoose";

export interface IMatchPlayer {
  name: string;
  runs: number;
  balls: number;
  fours: number;
  sixes: number;
  isOut: boolean;
}

export interface IMatchBowler {
  name: string;
  legalBalls: number;
  runs: number;
  wickets: number;
}

export interface IMatch extends Document {
  _id: mongoose.Types.ObjectId;
  matchId: string;
  createdBy: string;
  turfId: string;
  turfName: string;
  teamA: string;
  teamB: string;
  scoreA: number;
  scoreB: number;
  wicketsA: number;
  wicketsB: number;
  overs: string;
  battingTeam: "A" | "B";
  balls: Array<{ result: string; team: string; over: number; ball: number; striker?: string; bowler?: string; }>;
  maxOvers: number;
  status: string;
  teamAPlayers: IMatchPlayer[];
  teamBPlayers: IMatchPlayer[];
  bowlers: IMatchBowler[];
  striker?: string;
  nonStriker?: string;
  currentBowler?: string;
  bookingId?: string;
  lat?: number;
  lng?: number;
  startedAt: Date;
  expireAt: Date;
}

const PlayerSchema = new Schema<IMatchPlayer>({ name: String, runs: { type: Number, default: 0 }, balls: { type: Number, default: 0 }, fours: { type: Number, default: 0 }, sixes: { type: Number, default: 0 }, isOut: { type: Boolean, default: false } }, { _id: false });
const BowlerSchema = new Schema<IMatchBowler>({ name: String, legalBalls: { type: Number, default: 0 }, runs: { type: Number, default: 0 }, wickets: { type: Number, default: 0 } }, { _id: false });

const MatchSchema = new Schema<IMatch>({
  matchId: { type: String, required: true, unique: true },
  createdBy: { type: String, required: true },
  turfId: String,
  turfName: String,
  teamA: String,
  teamB: String,
  scoreA: { type: Number, default: 0 },
  scoreB: { type: Number, default: 0 },
  wicketsA: { type: Number, default: 0 },
  wicketsB: { type: Number, default: 0 },
  overs: String,
  battingTeam: { type: String, default: "A" },
  balls: {
    type: [{
      result: String,
      team: String,
      over: Number,
      ball: Number,
      striker: String,
      bowler: String
    }],
    default: []
  },
  maxOvers: { type: Number, default: 8 },
  status: { type: String, default: "live" },
  teamAPlayers: { type: [PlayerSchema], default: [] },
  teamBPlayers: { type: [PlayerSchema], default: [] },
  bowlers: { type: [BowlerSchema], default: [] },
  striker: String,
  nonStriker: String,
  currentBowler: String,
  bookingId: String,
  lat: Number,
  lng: Number,
  startedAt: { type: Date, default: Date.now },
  expireAt: { type: Date, default: () => new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) },
});

MatchSchema.index({ expireAt: 1 }, { expireAfterSeconds: 0 });

export const Match: Model<IMatch> = mongoose.models.Match || mongoose.model<IMatch>("Match", MatchSchema);

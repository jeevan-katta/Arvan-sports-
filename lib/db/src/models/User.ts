import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  passwordHash: string;
  role: string;
  phone?: string;
  avatar?: string;
  blocked: boolean;
  createdAt: Date;
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  passwordHash: { type: String, required: true },
  role: { type: String, required: true, default: "user" },
  phone: String,
  avatar: String,
  blocked: { type: Boolean, default: false },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const User: Model<IUser> = mongoose.models.User || mongoose.model<IUser>("User", UserSchema);

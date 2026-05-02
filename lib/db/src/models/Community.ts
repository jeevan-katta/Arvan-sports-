import mongoose, { Schema, Document, Model } from "mongoose";

export interface IPost extends Document {
  _id: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  title: string;
  description?: string;
  playersNeeded: number;
  matchDate?: string;
  matchTime?: string;
  turfName?: string;
  area?: string;
  status: string;
  createdAt: Date;
}

export interface IPostJoin extends Document {
  _id: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  joinedAt: Date;
}

export interface IMessage extends Document {
  _id: mongoose.Types.ObjectId;
  postId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  content: string;
  createdAt: Date;
}

const PostSchema = new Schema<IPost>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  title: { type: String, required: true },
  description: String,
  playersNeeded: { type: Number, default: 1 },
  matchDate: String,
  matchTime: String,
  turfName: String,
  area: String,
  status: { type: String, default: "open" },
}, { timestamps: { createdAt: true, updatedAt: false } });

const PostJoinSchema = new Schema<IPostJoin>({
  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  joinedAt: { type: Date, default: Date.now },
});

const MessageSchema = new Schema<IMessage>({
  postId: { type: Schema.Types.ObjectId, ref: "Post", required: true },
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true },
  content: { type: String, required: true },
}, { timestamps: { createdAt: true, updatedAt: false } });

export const Post: Model<IPost> = mongoose.models.Post || mongoose.model<IPost>("Post", PostSchema);
export const PostJoin: Model<IPostJoin> = mongoose.models.PostJoin || mongoose.model<IPostJoin>("PostJoin", PostJoinSchema);
export const Message: Model<IMessage> = mongoose.models.Message || mongoose.model<IMessage>("Message", MessageSchema);
